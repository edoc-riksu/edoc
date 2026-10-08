from pydantic import BaseModel

from app.judge.verdicts import Verdict


class SubmissionRequest(BaseModel):
    encounter_id: str
    code: str


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
    encounter_id: str
    code: str


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
