"""Presentation models for the analytics endpoints.

The hard psychometrics live in ``services/stats.py`` (p-value, point-biserial,
distractor efficiency, sitting reliability). This module turns those numbers
into the exact shapes the frontend renders in Item analysis, Paper detail and
Analytics — server-side so the client never has to guess a threshold.

No real IRT fit is produced yet (see the note in stats.py); IRT/ICC/fit fields
are therefore returned as null and the frontend falls back to classical stats.
When the girth pipeline lands, only the helpers that build IRTParams change.
"""

from app.models import ExamPaperQuestion, Question, StudentResponse
from app.services.serializers import paper_meta, serialize_question
from app.services.stats import paper_level_stats

MIN_ATTEMPTS = 30  # difficulty_tagging.MIN_IRT_RESPONSES


def quality_flags(discrimination_status, attempt_count, contradiction, nonfunctional_distractors):
    flags = []
    if contradiction:
        flags.append({
            "key": "contradiction",
            "tone": "warning",
            "label": "Signal contradiction",
            "detail": "Faculty and AI difficulty estimates disagree significantly before student data has stabilised.",
        })
    if attempt_count >= MIN_ATTEMPTS:
        if discrimination_status == "negative":
            flags.append({
                "key": "negative-discrimination",
                "tone": "critical",
                "label": "Negative discrimination",
                "detail": "Weaker students outperform stronger ones on this item — check the answer key, or retire it.",
            })
        elif discrimination_status == "poor":
            flags.append({
                "key": "poor-discriminator",
                "tone": "serious",
                "label": "Poor discriminator",
                "detail": f"The item does not effectively separate strong from weak students (a below {MIN_ATTEMPTS}).",
            })
        if nonfunctional_distractors and nonfunctional_distractors >= 2:
            flags.append({
                "key": "nonfunctional-distractors",
                "tone": "serious",
                "label": "Non-functional distractors",
                "detail": f"{nonfunctional_distractors} distractors were chosen by under 5% of students, so the item offers fewer real choices.",
            })
    return flags


def _discrimination_status(point_biserial, n):
    if n < MIN_ATTEMPTS or point_biserial is None:
        return None
    if point_biserial < 0:
        return "negative"
    if point_biserial < 0.15:
        return "poor"
    return "ok"


def _nonfunctional_distractors(option_picks, correct_position, n):
    if not option_picks or n < MIN_ATTEMPTS:
        return None
    threshold = 0.05 * n
    count = 0
    for i, picks in enumerate(option_picks):
        if i == correct_position:
            continue
        if picks < threshold:
            count += 1
    return count


def serialize_item_stat(db, link, paper_meta_cache):
    q = link.question
    p = link.p_value
    n = link.n_responses or 0
    correct_position = next((o.position for o in q.options if o.is_correct), None)
    return {
        "paperId": str(link.exam_paper_id),
        "questionId": str(link.question_id),
        "position": link.position,
        "nResponses": n,
        "pValue": round(p, 3) if p is not None else None,
        "discriminationIndex": None,
        "pointBiserial": round(link.point_biserial, 3) if link.point_biserial is not None else None,
        "distractorEfficiency": round(link.distractor_efficiency, 3) if link.distractor_efficiency is not None else None,
        "nonfunctionalDistractors": _nonfunctional_distractors(
            link.option_picks, correct_position, n
        ),
        "optionPicks": list(link.option_picks) if link.option_picks else [],
        "difficultyTag": link.difficulty_tag,
        "studentSignal": round(1 - p, 3) if p is not None else None,
        "discriminationStatus": _discrimination_status(link.point_biserial, n),
        "irt": None,
        "iccCurve": None,
        "fit": None,
        "empiricalIcc": None,
        "calibratedAt": link.calibrated_at.isoformat() if link.calibrated_at else None,
    }


def paper_summaries(db):
    summaries = []
    from app.models import ExamPaper
    for paper in db.query(ExamPaper).order_by(ExamPaper.exam_date.desc().nullslast(), ExamPaper.id.desc()).all():
        stats = paper_level_stats(db, paper.id)
        summaries.append({**paper_meta(paper, db), "stats": stats})
    return summaries


def paper_analytics(db, paper_id, viewer=None):
    from app.models import ExamPaper
    paper = db.get(ExamPaper, paper_id)
    if not paper:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Paper not found")

    stats = paper_level_stats(db, paper.id)
    links = paper.questions  # already ordered by position
    items = []
    difficulty_counts = {"Easy": 0, "Medium": 0, "Hard": 0, "Not calibrated": 0}
    needs_attention = []
    attempts_total = 0

    from app.services.stats import attempt_aggregates
    qids = [link.question_id for link in links]
    attempt_map = attempt_aggregates(db, qids)
    for link in links:
        q = link.question
        sitting = serialize_item_stat(db, link, None)
        items.append({
            "position": link.position,
            "question": serialize_question(q, viewer=viewer, attempts=attempt_map),
            "sitting": sitting,
        })
        attempts_total += q.attempt_count or 0
        tag = link.difficulty_tag
        label = tag if tag in difficulty_counts else "Not calibrated"
        difficulty_counts[label] += 1

        if link.n_responses:
            flags = quality_flags(
                sitting["discriminationStatus"],
                link.n_responses,
                q.contradiction,
                sitting["nonfunctionalDistractors"],
            )
            if flags:
                needs_attention.append({
                    "question": serialize_question(q, viewer=viewer, attempts=attempt_map),
                    "sitting": sitting,
                    "flags": flags,
                })

    difficulty_distribution = [{"label": k, "value": v} for k, v in difficulty_counts.items() if v]

    return {
        "paper": paper_meta(paper, db),
        "stats": stats,
        "totalQuestions": len(links),
        "totalAttempts": attempts_total,
        "withData": sum(1 for link in links if link.n_responses),
        "calibrated": sum(1 for link in links if link.n_responses),
        "difficultyDistribution": difficulty_distribution,
        "items": items,
        "needsAttention": needs_attention,
    }


def item_detail(db, question_id, viewer=None):
    from app.models import ExamPaperQuestion, StudentResponse
    from fastapi import HTTPException

    q = db.get(Question, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    from app.services.stats import attempt_aggregates
    agg = attempt_aggregates(db, [q.id]).get(q.id)
    nonfunctional = None
    if agg and agg["picks"]:
        correct_position = next((o.position for o in q.options if o.is_correct), None)
        picks = agg["picks"]
        nonfunctional = _nonfunctional_distractors(picks, correct_position, agg["n"])

    disc_status = None
    if agg and agg["n"] >= MIN_ATTEMPTS:
        p = agg["correct"] / agg["n"]
        disc_status = "negative" if p < 0 else ("poor" if p < 0.2 else "ok")

    flags = quality_flags(disc_status, agg["n"] if agg else 0, q.contradiction, nonfunctional)

    sittings = []
    for link in (
        db.query(ExamPaperQuestion)
        .filter(ExamPaperQuestion.question_id == q.id, ExamPaperQuestion.n_responses.isnot(None), ExamPaperQuestion.n_responses > 0)
        .all()
    ):
        from app.models import ExamPaper
        paper = db.get(ExamPaper, link.exam_paper_id)
        if not paper:
            continue
        sittings.append({**serialize_item_stat(db, link, None), "paper": paper_meta(paper, db)})
    sittings.sort(key=lambda s: (s["paper"]["examDate"] or "", s["paper"]["id"]))

    yearly = {}
    for s in sittings:
        year = s["paper"]["year"]
        if year is None:
            continue
        bucket = yearly.setdefault(year, {"sittings": 0, "nResponses": 0, "pValues": []})
        bucket["sittings"] += 1
        bucket["nResponses"] += s["nResponses"]
        if s["pValue"] is not None:
            bucket["pValues"].append(s["pValue"])
    yearly_history = [
        {
            "year": year,
            "sittings": b["sittings"],
            "nResponses": b["nResponses"],
            "pValue": round(sum(b["pValues"]) / len(b["pValues"]), 3) if b["pValues"] else None,
            "irt": None,
        }
        for year, b in sorted(yearly.items())
    ]

    base = serialize_question(q, viewer=viewer, attempts=agg)
    base["flags"] = flags
    base["examHistory"] = sittings
    base["yearlyHistory"] = yearly_history
    return base
