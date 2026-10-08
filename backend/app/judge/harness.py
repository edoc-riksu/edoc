from pydantic import BaseModel

from app.execution.piston_client import PistonClient
from app.judge.comparator import compare_output
from app.schemas.encounter import TestCase
from app.schemas.execution import ExecutionStatus


class JudgeOutcome(BaseModel):
    test_id: str
    passed: bool
    status: ExecutionStatus
    points: int


class HarnessRun(BaseModel):
    outcomes: list[JudgeOutcome]
    max_runtime_ms: int


class TestHarness:
    """Owns running a submission against a set of test cases and judging
    each one. Piston only executes code - everything about what counts as
    a pass belongs here and in the comparator, never in Piston itself."""

    def __init__(self, piston_client: PistonClient) -> None:
        self._piston = piston_client

    async def run_tests(
        self,
        *,
        code: str,
        tests: list[TestCase],
        language: str,
        version: str,
        timeout_ms: int,
    ) -> HarnessRun:
        outcomes: list[JudgeOutcome] = []
        max_runtime_ms = 0

        for test in tests:
            result = await self._piston.execute(
                language=language,
                version=version,
                code=code,
                stdin=test.input,
                timeout_ms=timeout_ms,
            )
            max_runtime_ms = max(max_runtime_ms, result.runtime_ms)

            passed = result.status == ExecutionStatus.SUCCESS and compare_output(
                result.stdout, test.expected_output
            )

            outcomes.append(
                JudgeOutcome(
                    test_id=test.id,
                    passed=passed,
                    status=result.status,
                    points=test.points,
                )
            )

        return HarnessRun(outcomes=outcomes, max_runtime_ms=max_runtime_ms)
