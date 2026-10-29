from typing import Annotated

from pydantic import BaseModel, Field

from app.judge.verdicts import Verdict
from app.services.concepts import ConceptInfo

# EncounterService builds a glob() from encounter_id, so this pattern is a
# security boundary, not just input hygiene - it must stay restrictive
# enough to rule out path traversal and glob metacharacters.
EncounterId = Annotated[str, Field(pattern=r"^[a-z]+-\d{3}$")]
Code = Annotated[str, Field(max_length=20_000)]


class SubmissionRequest(BaseModel):
    encounter_id: EncounterId
    code: Code
    # Which try this is for this player on this encounter (1 = first). The
    # service does not store attempts; the caller (Backend 2) knows the count
    # and passes it in, and the result repeats it back.
    attempt_number: int = Field(default=1, ge=1, le=10_000)
    # Time the player spent on the encounter before submitting, measured by
    # the console. Reported back unchanged; it does not change the score.
    elapsed_ms: int | None = Field(default=None, ge=0, le=86_400_000)


class TestResult(BaseModel):
    test_id: str
    passed: bool


class ScoreBreakdown(BaseModel):
    earned: int
    total: int


class ExecutionMeta(BaseModel):
    runtime_ms: int


class Defeat(BaseModel):
    """Why the player lost, in teaching terms: the encounter's main concept
    and the explanation written for it. Only sent when the player's code was
    wrong, never for an accepted run or for our own failures."""

    concept: ConceptInfo
    explanation: str


class SubmissionResult(BaseModel):
    submission_id: str
    encounter_id: str
    verdict: Verdict
    score: ScoreBreakdown
    tests: list[TestResult]
    execution: ExecutionMeta
    attempt_number: int = 1
    # True only when this was attempt 1 and it was accepted: the number Backend 2
    # counts for the first-attempt rate.
    first_attempt_clear: bool = False
    elapsed_ms: int | None = None
    defeat: Defeat | None = None


class RunRequest(BaseModel):
    encounter_id: EncounterId
    code: Code


class RunTestResult(BaseModel):
    test_id: str
    passed: bool
    stdout: str
    stderr: str


class RunResponse(BaseModel):
    """RUN is informational only - never a scored/authoritative result."""

    encounter_id: str
    tests: list[RunTestResult]
    execution: ExecutionMeta
