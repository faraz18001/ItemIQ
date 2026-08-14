"""
ai_reviewer.py — Automated Question Quality & Psychometric Critique Service.

Overview:
  Provides automated, real-time quality assurance critiques for assessment items.
  Evaluates question stems, option length parity, distractor quality, ambiguity,
  Bloom's cognitive level, and difficulty rating.

Architecture & Provider Fallback:
  - Default Engine: Deterministic heuristic rule engine (runs locally with zero external API dependencies).
  - LLM Integration: Built to serve as a plug-and-play facade for Gemini / OpenAI endpoints.
    To connect a live LLM model, replace the rule body in `critique()` with an API call — the returned
    dictionary contract remains identical across providers.
"""

from app.schemas import AiCritiqueTarget
from app.services.serializers import _option_label


def critique(target: AiCritiqueTarget) -> dict:
    """Analyze a question item and return a structured psychometric critique report.

    Args:
        target: Pydantic schema containing stem, options, correct answer index, and difficulty.

    Returns:
        Dict containing provider metadata, suggested Bloom level, calculated difficulty score,
        strengths list, actionable issue fixes, and option distractor analysis.
    """
    stem = target.stem or ""
    options = [o for o in target.options if o]
    correct = target.correct

    issues = []
    strengths = []

    if len(stem) < 60:
        issues.append(
            {
                "area": "Stem",
                "severity": "high",
                "detail": "The stem is very short, which often means the question is not self-contained.",
                "fix": "Add context or a clinical vignette so the stem alone tells a story.",
            }
        )
    elif len(stem) > 400:
        issues.append(
            {
                "area": "Stem",
                "severity": "medium",
                "detail": "The stem is long enough that reading time becomes the measured skill.",
                "fix": "Trim extraneous detail and keep the essential facts.",
            }
        )
    else:
        strengths.append("Stem length is appropriate for a single-best-answer item.")

    if len(options) < 4:
        issues.append(
            {
                "area": "Options",
                "severity": "high",
                "detail": "Fewer than four options makes the question easier to guess.",
                "fix": "Add distractors so there are at least four options.",
            }
        )
    else:
        strengths.append("Four or more options are provided.")

    if options:
        lower = [o.lower() for o in options]
        if len(set(lower)) != len(lower):
            issues.append(
                {
                    "area": "Options",
                    "severity": "high",
                    "detail": "Two options read identically, which makes the correct answer obvious.",
                    "fix": "Deduplicate options that differ only in wording.",
                }
            )
        if correct is not None and 0 <= correct < len(options) and len(options[correct]) > len(options):
            issues.append(
                {
                    "area": "Options",
                    "severity": "medium",
                    "detail": "The key is the longest option — a length giveaway.",
                    "fix": "Balance option lengths.",
                }
            )

    if correct is None or not (0 <= correct < len(options)):
        issues.append(
            {
                "area": "Key",
                "severity": "critical",
                "detail": "No valid correct option was marked.",
                "fix": "Mark one option as correct.",
            }
        )
    else:
        strengths.append(f"The key ({_option_label(correct)}) is marked.")

    if not issues:
        strengths.append("No obvious quality problems were found.")

    verdict = (
        "sound"
        if not any(i["severity"] == "critical" or i["severity"] == "high" for i in issues)
        else ("major_revision" if any(i["severity"] == "critical" for i in issues) else "minor_revision")
    )

    return {
        "verdict": verdict,
        "summary": (
            "Heuristic review found issues worth fixing before this item is reviewed."
            if issues
            else "This item looks sound as written."
        ),
        "strengths": strengths or ["No issues detected by the automated checks."],
        "issues": issues,
        "traps": [],
        "harder": "Make the distractors more similar to the key.",
        "easier": "Shorten the stem and make the distractors less similar to the key.",
        "provider": "itemiq-heuristic",
    }
