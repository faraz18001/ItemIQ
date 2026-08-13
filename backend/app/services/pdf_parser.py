"""
pdf_parser.py — bounding-box (BBox) PDF ingestion and question extraction.

Reads the PDF line-by-line, groups text into 5-point vertical buckets to fix
misalignments, and uses an ``x < 85`` "left margin fence" to find question
numbers. Ported from the root ``pdf_parser.py`` into the service layer.
"""

import os
import re
from typing import Any, Dict, List, Optional

import fitz  # PyMuPDF

MARGIN_TOP: float = 60.0
MARGIN_BOTTOM: float = 788.0
Q_NUM_MAX_X: float = 85.0


def parse_paper(pdf_path: str) -> List[Dict[str, Any]]:
    """Parse a Cambridge past-paper PDF and extract questions as records.

    Expects the PapaCambridge naming convention: ``{subject}_{session}_qp_{variant}.pdf``.
    """
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
        print(f"Warning: Filename '{file_name}' does not match PapaCambridge standard.")
        return []

    q_num_pattern = re.compile(r"^(\d{1,2})(?:\s+\S|\s*$)")

    doc = fitz.open(pdf_path)
    questions: List[Dict[str, Any]] = []
    current_q: Optional[Dict[str, Any]] = None
    expected_q = 1

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_dict = page.get_text("dict")
        page_width = page.rect.width

        all_lines: List[tuple] = []
        for block in page_dict["blocks"]:
            if block.get("type") != 0:
                continue
            for line in block["lines"]:
                x0, y0, x1, y1 = line["bbox"]
                line_text = " ".join(span["text"] for span in line["spans"]).strip()
                if line_text:
                    all_lines.append((x0, y0, x1, y1, line_text))

        def visual_row_sort_key(line_tuple: tuple) -> tuple:
            x_pos, y_pos = line_tuple[0], line_tuple[1]
            return (round(y_pos / 5) * 5, x_pos)

        all_lines.sort(key=visual_row_sort_key)

        for x0, y0, x1, y1, line_text in all_lines:
            if y0 < MARGIN_TOP or y0 > MARGIN_BOTTOM:
                continue

            if x0 < Q_NUM_MAX_X:
                match = q_num_pattern.match(line_text)
                if match and int(match.group(1)) == expected_q:
                    if current_q:
                        questions.append(current_q)
                    current_q = {
                        "id": f"{subject_code}_{session_year}_{paper_type}_q{expected_q}",
                        "subject": subject_code,
                        "paper_type": paper_type,
                        "session": session_year,
                        "year": actual_year,
                        "topic": "Unknown",
                        "marks": 0,
                        "pdf": os.path.abspath(pdf_path),
                        "text": "",
                        "regions": [],
                    }
                    expected_q += 1

            if current_q is None:
                continue

            current_q["text"] += line_text + "\n"
            for m in re.findall(r"\[\s*(\d+)\s*\]", line_text):
                current_q["marks"] += int(m)

            if not current_q["regions"] or current_q["regions"][-1]["page"] != page_num:
                current_q["regions"].append(
                    {"page": page_num, "rect": [0, max(0.0, y0 - 10), page_width, y1 + 10]}
                )
            else:
                current_q["regions"][-1]["rect"][3] = max(
                    current_q["regions"][-1]["rect"][3], y1 + 10
                )

    if current_q:
        questions.append(current_q)

    for q in questions:
        if q["marks"] == 0 and paper_type.startswith("p1"):
            q["marks"] = 1

    doc.close()
    return questions


def parse_all_papers(papers_dir: str, subject_code: str) -> List[Dict[str, Any]]:
    """Walk ``papers_dir`` recursively and parse every PDF found."""
    all_questions: List[Dict[str, Any]] = []
    for root, _, files in os.walk(papers_dir):
        for file in files:
            if file.endswith(".pdf"):
                all_questions.extend(parse_paper(os.path.join(root, file)))
    return all_questions