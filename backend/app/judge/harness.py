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
    # True when this test was never run because an earlier one timed out. It
    # counts as not passed (and its points as not earned) but says nothing
    # about the player's code, so it never changes the verdict.
    skipped: bool = False


class HarnessRun(BaseModel):
    outcomes: list[JudgeOutcome]
    max_runtime_ms: int
    # Sum of every test's sandbox time: what this submission cost to run.
    total_runtime_ms: int = 0


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
        memory_limit_bytes: int,
    ) -> HarnessRun:
        outcomes: list[JudgeOutcome] = []
        max_runtime_ms = 0
        total_runtime_ms = 0

        timed_out = False

        for test in tests:
            if timed_out:
                # One timeout already tells the player what they need to know,
                # and every further test would just wait out the limit again.
                outcomes.append(
                    JudgeOutcome(
                        test_id=test.id,
                        passed=False,
                        status=ExecutionStatus.TIMEOUT,
                        points=test.points,
                        skipped=True,
                    )
                )
                continue

            result = await self._piston.execute(
                language=language,
                version=version,
                code=code,
                stdin=test.input,
                timeout_ms=timeout_ms,
                memory_limit_bytes=memory_limit_bytes,
            )
            max_runtime_ms = max(max_runtime_ms, result.runtime_ms)
            total_runtime_ms += result.runtime_ms
            timed_out = result.status == ExecutionStatus.TIMEOUT

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

        return HarnessRun(
            outcomes=outcomes,
            max_runtime_ms=max_runtime_ms,
            total_runtime_ms=total_runtime_ms,
        )
