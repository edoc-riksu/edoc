from app.judge.harness import JudgeOutcome
from app.judge.verdicts import Verdict, worst_verdict
from app.schemas.execution import ExecutionStatus
from app.schemas.submission import ScoreBreakdown

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
