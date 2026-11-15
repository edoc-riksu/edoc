"""Day 47 bug fixes.

1. A practice Run must agree with Submit: output that matches but came from a
   program that then crashed or ran out of time is not a pass.
2. Any way Piston can drop a connection is "Piston unavailable" (a SYSTEM_ERROR
   for a submission, a 503 for a run), never an HTTP 500.
"""

import httpx
import pytest

from app.execution.piston_client import PistonClient, PistonUnavailableError
from app.schemas.execution import ExecutionResult, ExecutionStatus
from app.services.encounter_service import EncounterService
from app.services.execution_service import ExecutionService


class FakePistonWithStatus:
    """Prints the right answer for every sample test, then ends with `status`."""

    def __init__(self, status: ExecutionStatus):
        self._status = status

    async def execute(self, *, stdin, **_):
        return ExecutionResult(
            stdout="5\n" if stdin == "2 3" else "9\n",
            stderr="Traceback ...",
            exit_code=0 if self._status == ExecutionStatus.SUCCESS else 1,
            signal=None,
            runtime_ms=10,
            timed_out=self._status == ExecutionStatus.TIMEOUT,
            status=self._status,
        )


@pytest.mark.parametrize(
    "status", [ExecutionStatus.RUNTIME_ERROR, ExecutionStatus.TIMEOUT]
)
async def test_run_does_not_pass_a_program_that_failed_after_printing(
    encounters_dir, status
):
    encounter = EncounterService(encounters_dir).get("py-001")
    samples = encounter.tests.sample
    # Only meaningful if the fake's output matches the expected output.
    assert samples[0].input == "2 3"
    assert samples[0].expected_output.strip() == "5"

    response = await ExecutionService(FakePistonWithStatus(status)).run_against_samples(
        encounter=encounter, code="print(5); raise SystemExit(1)"
    )

    assert response.tests[0].passed is False
    # The player can still see why.
    assert response.tests[0].stderr


async def test_run_still_passes_a_clean_run(encounters_dir):
    encounter = EncounterService(encounters_dir).get("py-001")
    response = await ExecutionService(
        FakePistonWithStatus(ExecutionStatus.SUCCESS)
    ).run_against_samples(encounter=encounter, code="print(5)")
    assert response.tests[0].passed is True


def _client_raising(exc_factory) -> PistonClient:
    def handler(request: httpx.Request) -> httpx.Response:
        raise exc_factory(request)

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return PistonClient(base_url="http://fake-piston:2000", http_client=http_client)


@pytest.mark.parametrize(
    "exc_factory",
    [
        lambda r: httpx.RemoteProtocolError("Server disconnected", request=r),
        lambda r: httpx.ReadError("connection reset", request=r),
        lambda r: httpx.WriteError("broken pipe", request=r),
        lambda r: httpx.ReadTimeout("slow", request=r),
        lambda r: httpx.ConnectTimeout("slow", request=r),
        lambda r: httpx.PoolTimeout("no free connection", request=r),
        lambda r: httpx.ConnectError("refused", request=r),
    ],
    ids=[
        "server-disconnected",
        "read-error",
        "write-error",
        "read-timeout",
        "connect-timeout",
        "pool-timeout",
        "connect-error",
    ],
)
async def test_every_transport_failure_is_piston_unavailable(exc_factory):
    client = _client_raising(exc_factory)
    with pytest.raises(PistonUnavailableError):
        await client.execute(language="python", version="3.10.0", code="print(1)")
