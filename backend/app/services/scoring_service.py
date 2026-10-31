from app.judge.harness import JudgeOutcome
from app.judge.verdicts import Verdict, worst_verdict
from app.schemas.execution import ExecutionStatus
from app.schemas.submission import Rating, ScoreBreakdown

# Par time per difficulty: clearing an encounter within this earns the time
# star. Generous on purpose - it rewards a steady pace, not speed-coding.
PAR_MS_BY_DIFFICULTY = {
    "easy": 5 * 60 * 1000,
    "medium": 10 * 60 * 1000,
    "hard": 20 * 60 * 1000,
}

_STATUS_TO_VERDICT = {
    ExecutionStatus.TIMEOUT: Verdict.TIME_LIMIT_EXCEEDED,
    ExecutionStatus.RUNTIME_ERROR: Verdict.RUNTIME_ERROR,
    ExecutionStatus.SYSTEM_ERROR: Verdict.SYSTEM_ERROR,
}


def score_outcomes(outcomes: list[JudgeOutcome]) -> tuple[ScoreBreakdown, Verdict]:
    """Pure scoring: points earned/total plus one overall verdict.

    The overall verdict is the worst per-test verdict - a single runtime
    error anywhere outranks an otherwise-correct run, which outranks a plain
    wrong answer.
    """

    if not outcomes:
        return ScoreBreakdown(earned=0, total=0), Verdict.SYSTEM_ERROR

    total = sum(o.points for o in outcomes)
    earned = sum(o.points for o in outcomes if o.passed)

    per_test_verdicts = [
        Verdict.ACCEPTED
        if o.passed
        else _STATUS_TO_VERDICT.get(o.status, Verdict.WRONG_ANSWER)
        for o in outcomes
    ]

    return ScoreBreakdown(earned=earned, total=total), worst_verdict(per_test_verdicts)


def rate_submission(
    *,
    verdict: Verdict,
    attempt_number: int,
    elapsed_ms: int | None,
    difficulty: str,
) -> Rating | None:
    """Pure rating from attempts and time, kept apart from the test score.

    Accepted: 1 star, +1 if it was the first try, +1 if elapsed_ms is within
    par. Any other player verdict: 0 stars. SYSTEM_ERROR is our failure, so
    it isn't rated at all (None).
    """

    if verdict == Verdict.SYSTEM_ERROR:
        return None

    par_ms = PAR_MS_BY_DIFFICULTY[difficulty]
    within_par = None if elapsed_ms is None else elapsed_ms <= par_ms

    if verdict != Verdict.ACCEPTED:
        return Rating(stars=0, par_ms=par_ms, within_par=within_par)

    stars = 1 + (attempt_number == 1) + (within_par is True)
    return Rating(stars=stars, par_ms=par_ms, within_par=within_par)
