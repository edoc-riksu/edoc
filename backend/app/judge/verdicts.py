from enum import Enum


class Verdict(str, Enum):
    ACCEPTED = "ACCEPTED"
    WRONG_ANSWER = "WRONG_ANSWER"
    RUNTIME_ERROR = "RUNTIME_ERROR"
    TIME_LIMIT_EXCEEDED = "TIME_LIMIT_EXCEEDED"
    COMPILATION_ERROR = "COMPILATION_ERROR"
    SYSTEM_ERROR = "SYSTEM_ERROR"


# Lower index = higher priority when aggregating per-test verdicts into one
# overall verdict. A single system error anywhere outranks a wrong answer,
# which outranks an otherwise-clean accepted run.
_PRIORITY = [
    Verdict.SYSTEM_ERROR,
    Verdict.COMPILATION_ERROR,
    Verdict.TIME_LIMIT_EXCEEDED,
    Verdict.RUNTIME_ERROR,
    Verdict.WRONG_ANSWER,
    Verdict.ACCEPTED,
]


def worst_verdict(verdicts: list[Verdict]) -> Verdict:
    if not verdicts:
        return Verdict.SYSTEM_ERROR
    return min(verdicts, key=_PRIORITY.index)
