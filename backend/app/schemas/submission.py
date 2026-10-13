from typing import Annotated

from pydantic import BaseModel, Field

from app.judge.verdicts import Verdict

# EncounterService builds a glob() from encounter_id, so this pattern is a
# security boundary, not just input hygiene - it must stay restrictive
# enough to rule out path traversal and glob metacharacters.
EncounterId = Annotated[str, Field(pattern=r"^[a-z]+-\d{3}$")]
Code = Annotated[str, Field(max_length=20_000)]


class SubmissionRequest(BaseModel):
    encounter_id: EncounterId
    code: Code


class TestResult(BaseModel):
    test_id: str
    passed: bool


class ScoreBreakdown(BaseModel):
    earned: int
    total: int


class ExecutionMeta(BaseModel):
    runtime_ms: int


class SubmissionResult(BaseModel):
    submission_id: str
    encounter_id: str
    verdict: Verdict
    score: ScoreBreakdown
    tests: list[TestResult]
    execution: ExecutionMeta


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
