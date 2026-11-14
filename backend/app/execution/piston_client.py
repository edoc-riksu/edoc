import asyncio
import time

import httpx

from app.core.logging import get_logger
from app.schemas.execution import ExecutionResult, ExecutionStatus

logger = get_logger(__name__)

MAIN_FILE_NAME = "main.py"


class PistonUnavailableError(Exception):
    """Raised when Piston cannot be reached or returns something we can't parse.

    Never leak this (or its message) directly to API clients — log it and
    translate it into ExecutionStatus.SYSTEM_ERROR at the call site.
    """


class PistonClient:
    """Thin abstraction over the self-hosted Piston execution engine.

    Nothing outside this module should know Piston's request/response shape.
    Everything else in the app deals only in ExecutionResult.
    """

    def __init__(
        self,
        base_url: str,
        request_timeout_seconds: float = 15.0,
        http_client: httpx.AsyncClient | None = None,
        max_concurrent: int = 8,
        queue_wait_timeout_seconds: float = 20.0,
    ) -> None:
        # Piston runs on one small VM. Without a cap, a burst of submissions
        # would all hit it at once and every one of them would time out. Above
        # the cap, a run waits for a free slot, and if none frees up in time it
        # fails fast as "Piston unavailable" (a SYSTEM_ERROR, never a wrong
        # answer) so the player can simply try again.
        if max_concurrent < 1:
            raise ValueError("max_concurrent must be at least 1")
        self._slots = asyncio.Semaphore(max_concurrent)
        self._queue_wait_timeout_seconds = queue_wait_timeout_seconds
        self._base_url = base_url.rstrip("/")
        self._owns_client = http_client is None
        self._client = http_client or httpx.AsyncClient(timeout=request_timeout_seconds)

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def execute(
        self,
        *,
        language: str,
        version: str,
        code: str,
        stdin: str = "",
        timeout_ms: int = 2000,
        memory_limit_bytes: int | None = None,
    ) -> ExecutionResult:
        try:
            await asyncio.wait_for(
                self._slots.acquire(), timeout=self._queue_wait_timeout_seconds
            )
        except asyncio.TimeoutError as exc:
            logger.error(
                "execution queue is full: waited %.0f s for a free slot",
                self._queue_wait_timeout_seconds,
            )
            raise PistonUnavailableError("Execution queue is full") from exc
        try:
            return await self._execute(
                language=language,
                version=version,
                code=code,
                stdin=stdin,
                timeout_ms=timeout_ms,
                memory_limit_bytes=memory_limit_bytes,
            )
        finally:
            self._slots.release()

    async def _execute(
        self,
        *,
        language: str,
        version: str,
        code: str,
        stdin: str = "",
        timeout_ms: int = 2000,
        memory_limit_bytes: int | None = None,
    ) -> ExecutionResult:
        payload = {
            "language": language,
            "version": version,
            "files": [{"name": MAIN_FILE_NAME, "content": code}],
            "stdin": stdin,
            "run_timeout": timeout_ms,
        }
        if memory_limit_bytes is not None:
            payload["run_memory_limit"] = memory_limit_bytes

        started = time.monotonic()
        try:
            response = await self._client.post(
                f"{self._base_url}/api/v2/execute", json=payload
            )
        except httpx.TimeoutException as exc:
            logger.error("piston request timed out: %s", exc)
            raise PistonUnavailableError("Piston request timed out") from exc
        except httpx.ConnectError as exc:
            logger.error("could not connect to piston at %s: %s", self._base_url, exc)
            raise PistonUnavailableError("Could not connect to Piston") from exc

        runtime_ms = int((time.monotonic() - started) * 1000)

        if response.status_code != 200:
            logger.error(
                "piston returned non-200: status=%s body=%s",
                response.status_code,
                response.text[:500],
            )
            raise PistonUnavailableError(
                f"Piston returned status {response.status_code}"
            )

        try:
            body = response.json()
            run = body["run"]
            if not isinstance(run, dict):
                raise TypeError(f"'run' is {type(run).__name__}, not an object")
        except (ValueError, KeyError, TypeError) as exc:
            # TypeError covers a body that is a list or string, or a "run" that
            # is not an object; none of these may escape as an HTTP 500.
            logger.error("unexpected piston response shape: %s", exc)
            raise PistonUnavailableError("Unexpected Piston response shape") from exc

        return self._normalize(run, runtime_ms)

    @staticmethod
    def _normalize(run: dict, runtime_ms: int) -> ExecutionResult:
        exit_code = run.get("code")
        signal = run.get("signal")

        # Piston doesn't give us an explicit "timed out" flag. When run_timeout
        # is hit, the process is killed and comes back with no exit code and a
        # kill signal set. That's also indistinguishable from an OOM kill in
        # the raw response - documented assumption to revisit once we see real
        # signal behaviour from our own self-hosted instance.
        timed_out = exit_code is None and signal is not None

        if timed_out:
            status = ExecutionStatus.TIMEOUT
        elif exit_code == 0:
            status = ExecutionStatus.SUCCESS
        else:
            status = ExecutionStatus.RUNTIME_ERROR

        return ExecutionResult(
            stdout=run.get("stdout") or "",
            stderr=run.get("stderr") or "",
            exit_code=exit_code,
            signal=signal,
            runtime_ms=runtime_ms,
            timed_out=timed_out,
            status=status,
        )
