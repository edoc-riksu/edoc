from app.core.config import get_settings
from app.core.logging import get_logger
from app.execution.piston_client import PistonClient, PistonUnavailableError
from app.schemas.encounter import Encounter
from app.schemas.submission import ExecutionMeta, RunResponse, RunTestResult
from app.judge.comparator import compare_output

logger = get_logger(__name__)


class ExecutionError(Exception):
    """Raised when the execution backend itself is unavailable for a RUN."""


class ExecutionService:
    """Handles RUN: a player testing their code against sample tests only.

    Never scored, never authoritative, never touches hidden tests. Separate
    from JudgeService on purpose so SUBMIT stays the only path that can
    produce a verdict that counts.
    """

    def __init__(self, piston_client: PistonClient) -> None:
        self._piston = piston_client

    async def run_against_samples(self, *, encounter: Encounter, code: str) -> RunResponse:
        settings = get_settings()
        results: list[RunTestResult] = []
        max_runtime_ms = 0

        try:
            for test in encounter.tests.sample:
                result = await self._piston.execute(
                    language=encounter.language,
                    version=settings.python_runtime_version,
                    code=code,
                    stdin=test.input,
                    timeout_ms=encounter.limits.timeout_ms,
                )
                max_runtime_ms = max(max_runtime_ms, result.runtime_ms)
                results.append(
                    RunTestResult(
                        test_id=test.id,
                        passed=compare_output(result.stdout, test.expected_output),
                        stdout=result.stdout,
                        stderr=result.stderr,
                    )
                )
        except PistonUnavailableError as exc:
            logger.error("run request failed, execution backend unavailable: %s", exc)
            raise ExecutionError("Execution backend is currently unavailable") from exc

        return RunResponse(
            encounter_id=encounter.id,
            tests=results,
            execution=ExecutionMeta(runtime_ms=max_runtime_ms),
        )
