import time

from app.core.config import get_settings
from app.core.logging import get_logger
from app.execution.piston_client import PistonClient, PistonUnavailableError
from app.schemas.encounter import Encounter
from app.schemas.submission import ExecutionMeta, RunResponse, RunTestResult
from app.judge.comparator import compare_output

logger = get_logger(__name__)


class ExecutionError(Exception):
    """Raised when the execution backend itself is unavailable for a RUN."""


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n...(truncated, {len(text) - limit} more characters)"


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
        total_runtime_ms = 0
        started = time.monotonic()

        try:
            for test in encounter.tests.sample:
                result = await self._piston.execute(
                    language=encounter.language,
                    version=settings.python_runtime_version,
                    code=code,
                    stdin=test.input,
                    timeout_ms=encounter.limits.timeout_ms,
                    memory_limit_bytes=settings.run_memory_limit_bytes,
                )
                max_runtime_ms = max(max_runtime_ms, result.runtime_ms)
                total_runtime_ms += result.runtime_ms
                results.append(
                    RunTestResult(
                        test_id=test.id,
                        # Compared against the full, untruncated output -
                        # truncation below is for response size only and
                        # must never affect correctness.
                        passed=compare_output(result.stdout, test.expected_output),
                        stdout=_truncate(result.stdout, settings.run_output_char_limit),
                        stderr=_truncate(result.stderr, settings.run_output_char_limit),
                    )
                )
        except PistonUnavailableError as exc:
            logger.error("run request failed, execution backend unavailable: %s", exc)
            raise ExecutionError("Execution backend is currently unavailable") from exc

        # Same cost line as a submission, so every attempt - practice or scored -
        # leaves one. Never the player's code or their output.
        logger.info(
            "run finished: encounter=%s passed=%s/%s runtime_ms=%s cost_runtime_ms=%s wall_ms=%s",
            encounter.id,
            sum(r.passed for r in results),
            len(results),
            max_runtime_ms,
            total_runtime_ms,
            int((time.monotonic() - started) * 1000),
        )

        return RunResponse(
            encounter_id=encounter.id,
            tests=results,
            execution=ExecutionMeta(runtime_ms=max_runtime_ms),
        )
