"""
pdf_parser.py — Structured PDF ingestion for Cambridge past papers.

Pipeline:
  1. parse_question_paper(qp_path)   → list of raw question records
  2. parse_mark_scheme(ms_path)      → dict  { q_num → answer / rubric }
  3. parse_paper(qp_path, ms_path)   → merged, structured question list

Each merged question record shape:
  {
    "id":        "9700_s23_p12_q1",
    "q_num":     1,
    "q_type":    "MCQ" | "SAQ",
    "subject":   "9700",
    "session":   "s23",
    "paper_type":"p12",
    "year":      2023,
    "topic":     "Unknown",
    "marks":     1,
    "stem":      "Which of the following ...",
    "options":   [               # populated for MCQ only
        {"label": "A", "text": "20 ms", "is_correct": False},
        ...
    ],
    "sub_parts": [               # populated for SAQ only
        {"label": "(a)", "text": "State...", "marks": 1, "rubric": "..."},
        ...
    ],
    "marking_scheme": "B",       # raw MS answer / rubric text
    "images":    [               # relative paths under uploads/extracted_images/
        "9700_s23_p12_q1_fig1.png",
    ],
    "regions":   [               # bounding boxes on source PDF pages
        {"page": 0, "rect": [x0, y0, x1, y1]},
    ],
    "pdf":       "/abs/path/to/qp.pdf",
  }
"""

from __future__ import annotations

import os
import re
import uuid
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF

# ── Layout constants ─────────────────────────────────────────────────────────

MARGIN_TOP: float = 60.0
MARGIN_BOTTOM: float = 788.0
Q_NUM_MAX_X: float = 85.0      # anything left of this column is a candidate question number

# Patterns
_Q_NUM_RE = re.compile(r"^\s*(\d{1,2})(?:\s|$)")
_MARK_RE   = re.compile(r"\[\s*(\d+)\s*\]")
_MCQ_OPT_RE = re.compile(r"^\s*([A-D])(?:\s+(.*)|$)")          # "A" or "A  some text"
_SUBPART_RE = re.compile(r"^\s*(\([a-z]+\)|[ivx]+\))\s+(.+)")  # "(a) explain..."
_MS_MCQ_ANS_RE = re.compile(r"^\s*(\d{1,2})\s+([A-D])\b")     # "1  B" in MS
_MS_ALLOW_RE   = re.compile(r"(?i)allow|accept|credit")

# Where to write cropped images (relative to backend root)
_IMAGES_SUBDIR = "uploads/extracted_images"


def _paper_meta(pdf_path: str) -> dict:
    """Derive subject / session / variant from Cambridge filename or fall back."""
    file_name = os.path.basename(pdf_path)
    name_no_ext = os.path.splitext(file_name)[0]
    parts = name_no_ext.split("_")

    if len(parts) >= 4:
        subject_code = parts[0]
        session_year = parts[1]
        variant = parts[3]
        paper_type = f"p{variant}"
        try:
            actual_year = 2000 + int(session_year[1:])
        except ValueError:
            actual_year = 2025
    else:
        subject_code = "9700"
        session_year = "s23"
        paper_type = "p12"
        actual_year = 2023

    return {
        "subject": subject_code,
        "session": session_year,
        "paper_type": paper_type,
        "year": actual_year,
    }


def parse_question_paper(qp_path: str, images_root: str | None = None) -> list[dict[str, Any]]:
    """Parse the Question Paper PDF using pymupdf4llm.

    Returns a list of raw question records.  Each record has:
      id, q_num, subject, session, paper_type, year, marks,
      stem, options (MCQ), sub_parts (SAQ), images, regions, pdf.
    """
    import pymupdf4llm
    
    meta = _paper_meta(qp_path)
    prefix = f"{meta['subject']}_{meta['session']}_{meta['paper_type']}"

    img_out_dir = None
    if images_root:
        img_out_dir = str(Path(images_root) / _IMAGES_SUBDIR)
        os.makedirs(img_out_dir, exist_ok=True)

    # Convert the PDF to Markdown with images
    md_text = pymupdf4llm.to_markdown(
        qp_path,
        write_images=bool(images_root),
        image_path=img_out_dir,
        image_format="png",
        dpi=150
    )

    # Match: "- **1** " OR "**1** " (but not followed by a newline, to avoid page numbers)
    start_pattern = r'(?:^|\n)[ \t]*(?:-[ \t]*\*\*(\d{1,2})\*\*\s+|\*\*(\d{1,2})\*\*[ \t]+(?!\n))'
    matches = list(re.finditer(start_pattern, md_text))
    
    questions: list[dict[str, Any]] = []
    
    for i, m in enumerate(matches):
        q_num = int(m.group(1) or m.group(2))
        start_idx = m.end()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else len(md_text)
        content = md_text[start_idx:end_idx].strip()
        
        # Clean up picture text tags immediately
        content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
        
        options = []
        
        # 1. Try to find a Markdown table that contains options
        table_opt_pattern = re.compile(r'\|\s*\*\*([A-D])\*\*\s*\|(.*?)(?=\n|$)', re.DOTALL)
        table_matches = table_opt_pattern.findall(content)
        if table_matches:
            for opt_char, opt_text in table_matches:
                clean_text = opt_text.replace('|', ' ').replace('<br>', ' ').strip()
                options.append({'label': opt_char, 'text': clean_text, 'is_correct': False})
            content = re.sub(r'\|.*?\n?', '', content)
        else:
            # 2. Try to find bulleted list options
            list_opt_pattern = re.compile(r'(?:^|\n)\s*(?:-\s*)?\*\*([A-D])\*\*\s+(.*?)(?=(?:\n\s*(?:-\s*)?\*\*[A-D]\*\*)|$)', re.DOTALL)
            list_matches = list_opt_pattern.findall(content)
            if list_matches:
                for opt_char, opt_text in list_matches:
                    options.append({'label': opt_char, 'text': opt_text.strip(), 'is_correct': False})
                content = list_opt_pattern.sub('', content)
            else:
                # 3. Try inline options (e.g., A 20 m B 25 m C 30 m D 40 m)
                inline_match = re.search(r'\bA\s+(.*?)\bB\s+(.*?)\bC\s+(.*?)\bD\s+(.*)', content, re.DOTALL)
                if inline_match:
                    options.append({'label': 'A', 'text': inline_match.group(1).strip(), 'is_correct': False})
                    options.append({'label': 'B', 'text': inline_match.group(2).strip(), 'is_correct': False})
                    options.append({'label': 'C', 'text': inline_match.group(3).strip(), 'is_correct': False})
                    options.append({'label': 'D', 'text': inline_match.group(4).strip(), 'is_correct': False})
                    content = content[:inline_match.start()].strip()
                    
        # Extract Images
        images = []
        img_pattern = re.compile(r'!\[.*?\]\((.*?)\)')
        for img_match in img_pattern.findall(content):
            basename = os.path.basename(img_match)
            images.append(basename)
        content = img_pattern.sub('', content)
        
        # Clean up any trailing text like page numbers
        content = re.sub(r'(?:^|\n)© UCLES.*', '', content, flags=re.DOTALL)
        content = content.strip()
            
        questions.append({
            "id":         f"{prefix}_q{q_num}",
            "q_num":      q_num,
            "q_type":     "MCQ" if options else "SAQ",
            "subject":    meta["subject"],
            "session":    meta["session"],
            "paper_type": meta["paper_type"],
            "year":       meta["year"],
            "topic":      "Unknown",
            "marks":      1 if options else 0,
            "stem":       content,
            "options":    options,
            "sub_parts":  [],
            "images":     images,
            "regions":    [],
            "pdf":        os.path.abspath(qp_path),
        })

    return questions


# ── Mark Scheme Parser ───────────────────────────────────────────────────────


def parse_mark_scheme(ms_path: str) -> dict[int, str]:
    """Parse the Mark Scheme PDF.

    Returns a dict mapping question number → answer string.
    For MCQs this is a single letter ("B").
    For SAQs this is the full rubric text.

    Handles two layouts:
      1. Inline: "1  B"  (Cambridge printed MS PDFs)
      2. Table:  q-number at x≈44, answer letter at x≈180 same y-row
                 (generated / structured MS PDFs)
    """
    answers: dict[int, str] = {}
    if not ms_path or not os.path.exists(ms_path):
        return answers

    _SINGLE_INT  = re.compile(r"^\d{1,2}$")
    _SINGLE_ABCD = re.compile(r"^[A-D]$")

    doc = fitz.open(ms_path)
    current_q_num: int | None = None
    current_rubric: list[str] = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_dict = page.get_text("dict")

        all_spans: list[tuple] = []   # (x0, y0, text)
        for block in page_dict["blocks"]:
            if block.get("type") != 0:
                continue
            for line in block["lines"]:
                x0, y0, x1, y1 = line["bbox"]
                text = " ".join(span["text"] for span in line["spans"]).strip()
                if text:
                    all_spans.append((x0, y0, text))

        all_spans.sort(key=lambda t: (round(t[1] / 5) * 5, t[0]))

        # ── Group tokens into y-rows (bucket size 8 px) ──
        rows: list[list[tuple]] = []
        for span in all_spans:
            x0, y0, text = span
            if not rows or abs(rows[-1][0][1] - y0) > 8:
                rows.append([(x0, y0, text)])
            else:
                rows[-1].append((x0, y0, text))

        for row in rows:
            tokens = [t[2] for t in row]

            # ── Layout 1: inline "1  B" in a single span ──
            for tok in tokens:
                mcq_m = _MS_MCQ_ANS_RE.match(tok)
                if mcq_m:
                    answers[int(mcq_m.group(1))] = mcq_m.group(2).strip()

            # ── Layout 2: table cell – integer + single ABCD on same row ──
            ints  = [int(t) for t in tokens if _SINGLE_INT.match(t)]
            abcds = [t for t in tokens if _SINGLE_ABCD.match(t)]
            if ints and abcds and not any(_MS_MCQ_ANS_RE.match(t) for t in tokens):
                for q_num, ans in zip(ints, abcds):
                    if 1 <= q_num <= 100:
                        answers[q_num] = ans

            # ── SAQ rubric: standalone q-number in left margin ──
            for x0, y0, text in row:
                num_m = _Q_NUM_RE.match(text)
                if num_m and x0 < Q_NUM_MAX_X and not _SINGLE_INT.match(text.strip()):
                    if current_q_num is not None and current_rubric:
                        existing = answers.get(current_q_num, "")
                        rubric_text = " ".join(current_rubric).strip()
                        answers[current_q_num] = (existing + " " + rubric_text).strip() if existing else rubric_text
                    current_q_num = int(num_m.group(1))
                    current_rubric = [_Q_NUM_RE.sub("", text, count=1).strip()]
                elif current_q_num is not None and x0 > Q_NUM_MAX_X:
                    if text not in abcds:  # don't duplicate answer
                        current_rubric.append(text.strip())

    # Flush last SAQ rubric
    if current_q_num is not None and current_rubric:
        existing = answers.get(current_q_num, "")
        rubric_text = " ".join(current_rubric).strip()
        answers[current_q_num] = (existing + " " + rubric_text).strip() if existing else rubric_text

    doc.close()
    return answers


# ── Merge QP + MS ────────────────────────────────────────────────────────────


def _merge_answers(questions: list[dict], ms_answers: dict[int, str]) -> list[dict]:
    """Match mark scheme answers to QP questions."""
    for q in questions:
        q_num = q["q_num"]
        answer = ms_answers.get(q_num, "")
        q["marking_scheme"] = answer

        if q["q_type"] == "MCQ" and len(answer) == 1 and answer.upper() in "ABCD":
            # Mark the correct option
            for opt in q["options"]:
                opt["is_correct"] = opt["label"].upper() == answer.upper()
        elif q["sub_parts"]:
            # Distribute rubric text into sub-parts if we have matching count
            # For now attach the whole rubric to the first sub-part
            if q["sub_parts"]:
                q["sub_parts"][0]["rubric"] = answer

    return questions


# ── Public Entry Points ──────────────────────────────────────────────────────


def parse_paper(qp_path: str, ms_path: str | None = None, images_root: str | None = None) -> list[dict[str, Any]]:
    """Full pipeline: parse QP + optional MS, return merged structured records."""
    questions = parse_question_paper(qp_path, images_root=images_root)
    if ms_path:
        ms_answers = parse_mark_scheme(ms_path)
        questions = _merge_answers(questions, ms_answers)
    return questions


def parse_all_papers(papers_dir: str, subject_code: str) -> list[dict[str, Any]]:
    """Walk ``papers_dir`` recursively and parse every PDF found (QP only, no MS)."""
    all_questions: list[dict[str, Any]] = []
    for root, _, files in os.walk(papers_dir):
        for file in files:
            if file.endswith(".pdf"):
                all_questions.extend(parse_paper(os.path.join(root, file)))
    return all_questions
