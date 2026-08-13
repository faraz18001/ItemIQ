"""Statistics helpers.

Real IRT calibration (the ``girth`` library) is deliberately not wired up yet;
this module computes the classical measurements the frontend renders — p-value,
point-biserial, distractor efficiency — and leaves ``irt`` null until the
engine is implemented. Keeping the computations here means swapping in girth
later touches one file.
"""

from app.models import Attempt, ExamPaperQuestion, Question, StudentResponse
from sqlalchemy import Integer, func
from sqlalchemy.orm import Session


def attempt_aggregates(db: Session, question_ids: list[int]) -> dict[int, dict]:
    """Per-question rollup of every practice attempt, for question serialization."""
    if not question_ids:
        return {}
    rows = (
        db.query(
            Attempt.question_id,
            func.count(Attempt.id),
            func.sum(func.cast(Attempt.is_correct, Integer)),
        )
        .filter(Attempt.question_id.in_(question_ids))
        .group_by(Attempt.question_id)
        .all()
    )
    out: dict[int, dict] = {}
    for question_id, n, correct in rows:
        out[question_id] = {"n": int(n), "correct": int(correct or 0), "picks": []}
    return out


def difficulty_from_pvalue(p: float | None) -> str:
    if p is None:
        return "Medium"
    if p >= 0.75:
        return "Easy"
    if p >= 0.4:
        return "Medium"
    return "Hard"


def sitting_stats(db: Session, paper_id: int) -> None:
    """Recompute per-item sitting statistics after a response import."""
    links = (
        db.query(ExamPaperQuestion)
        .filter(ExamPaperQuestion.exam_paper_id == paper_id)
        .order_by(ExamPaperQuestion.position)
        .all()
    )
    for link in links:
        responses = (
            db.query(StudentResponse)
            .filter(
                StudentResponse.exam_paper_id == paper_id,
                StudentResponse.question_id == link.question_id,
            )
            .all()
        )
        n = len(responses)
        if n == 0:
            continue
        correct = sum(1 for r in responses if r.is_correct)
        p = correct / n
        picks: dict[int, int] = {}
        for r in responses:
            if r.selected_position is not None:
                picks[r.selected_position] = picks.get(r.selected_position, 0) + 1
        option_picks = [picks.get(i, 0) for i in range(len(link.question.options))]

        point_biserial = _point_biserial(responses, correct, n)

        link.n_responses = n
        link.p_value = round(p, 3)
        link.point_biserial = round(point_biserial, 3) if point_biserial is not None else None
        link.difficulty_tag = difficulty_from_pvalue(p)
        link.option_picks = option_picks
        link.distractor_efficiency = round(_distractor_efficiency(option_picks, correct), 3) if n else None
        link.calibrated_at = func.now()
    db.commit()


def _mean_others(responses, link) -> float:
    """Mean proportion-correct on the rest of the paper, per response — needed
    for a point-biserial against the whole-sitting score."""
    totals: dict[int, tuple[int, int]] = {}
    for r in responses:
        key = r.candidate_key
        correct, count = totals.get(key, (0, 0))
        totals[key] = (correct + (1 if r.is_correct else 0), count + 1)
    return sum(c / n for c, n in totals.values()) / len(totals) if totals else 0.0


def _point_biserial(responses, correct_count: int, n: int) -> float | None:
    if correct_count in (0, n):
        return None
    total_score = {r.candidate_key: 0 for r in responses}
    for r in responses:
        total_score[r.candidate_key] += 1 if r.is_correct else 0
    scores = [total_score[r.candidate_key] for r in responses]
    mean = sum(scores) / n
    top = sum((s - mean) for s in scores)
    if top == 0:
        return None
    # Approximate the point-biserial correlation against the total score.
    correct_score = sum(total_score[r.candidate_key] for r in responses if r.is_correct)
    diff = (correct_score / correct_count) - (sum(scores) - correct_score) / max(n - correct_count, 1)
    sd = _std(scores, mean, n)
    if not sd:
        return None
    return diff * ((correct_count * (n - correct_count)) ** 0.5 / n) / sd


def _std(values: list[float], mean: float, n: int) -> float:
    if n <= 1:
        return 0.0
    return (sum((v - mean) ** 2 for v in values) / (n - 1)) ** 0.5


def _distractor_efficiency(option_picks: list[int], correct: int) -> float:
    functioning = sum(1 for picks in option_picks if picks > 0)
    if len(option_picks) <= 1:
        return 0.0
    return functioning / (len(option_picks) - 1)


def paper_level_stats(db: Session, paper_id: int) -> dict:
    links = db.query(ExamPaperQuestion).filter(ExamPaperQuestion.exam_paper_id == paper_id).all()
    responses = db.query(StudentResponse).filter(StudentResponse.exam_paper_id == paper_id).all()
    candidates = {r.candidate_key for r in responses}
    per_item = [link for link in links if link.n_responses]
    p_values = [link.p_value for link in per_item if link.p_value is not None]
    point_biserials = [link.point_biserial for link in per_item if link.point_biserial is not None]

    if not candidates or not p_values:
        return {
            "nCandidates": len(candidates),
            "nItems": len(links),
            "meanScore": None,
            "sdScore": None,
            "reliability": None,
            "meanPValue": None,
            "meanDiscrimination": None,
            "calibrated": len(per_item),
            "flagged": 0,
            "misfitting": 0,
            "logLikelihood": None,
            "aic": None,
            "bic": None,
            "calibratedAt": None,
        }

    mean_p = sum(p_values) / len(p_values)
    mean_disc = sum(point_biserials) / len(point_biserials) if point_biserials else None
    per_candidate = {c: [r for r in responses if r.candidate_key == c] for c in candidates}
    scores = [sum(1 for r in rows if r.is_correct) / len(rows) for rows in per_candidate.values()]
    mean_score = sum(scores) / len(scores)
    sd = _std(scores, mean_score, len(scores))

    return {
        "nCandidates": len(candidates),
        "nItems": len(links),
        "meanScore": round(mean_score, 3),
        "sdScore": round(sd, 3),
        "reliability": None,
        "meanPValue": round(mean_p, 3),
        "meanDiscrimination": round(mean_disc, 3) if mean_disc is not None else None,
        "calibrated": len(per_item),
        "flagged": 0,
        "misfitting": 0,
        "logLikelihood": None,
        "aic": None,
        "bic": None,
        "calibratedAt": None,
    }


def question_stats_for(db: Session, question: Question) -> dict | None:
    agg = attempt_aggregates(db, [question.id]).get(question.id)
    if not agg:
        return None
    from app.services.serializers import _question_stats

    return _question_stats(agg)
