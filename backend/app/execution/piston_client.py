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
    ) -> None:
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
    ) -> ExecutionResult:
        payload = {
            "language": language,
            "version": version,
            "files": [{"name": MAIN_FILE_NAME, "content": code}],
            "stdin": stdin,
            "run_timeout": timeout_ms,
        }

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
        except (ValueError, KeyError) as exc:
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
            stdout=run.get("stdout", ""),
            stderr=run.get("stderr", ""),
            exit_code=exit_code,
            signal=signal,
            runtime_ms=runtime_ms,
            timed_out=timed_out,
            status=status,
        )
