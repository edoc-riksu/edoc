"""Day 52: /health/ready says whether this service can really judge code.
/health stays a cheap liveness check that does not depend on Piston."""

import httpx
import pytest
from fastapi.testclient import TestClient

from app.execution.piston_client import PistonClient, PistonUnavailableError
from app.main import app
from app.schemas.execution import ExecutionStatus
from app.services.encounter_service import EncounterService


class FakePiston:
    def __init__(self, runtimes=None, error=None, in_use=0, max_concurrent=8):
        self._runtimes, self._error = runtimes, error
        self.in_use, self.max_concurrent = in_use, max_concurrent

    async def runtimes(self):
        if self._error:
            raise self._error
        return self._runtimes


PYTHON = [{"language": "python", "version": "3.10.0", "aliases": ["py"]}]


def _ready(piston, encounter_service=None):
    with TestClient(app) as client:
        app.state.piston_client = piston
        if encounter_service is not None:
            app.state.encounter_service = encounter_service
        return client.get("/health/ready"), client.get("/health")


def test_ready_when_piston_has_python_and_encounters_are_loaded():
    ready, _ = _ready(FakePiston(PYTHON, in_use=3))
    assert ready.status_code == 200
    body = ready.json()
    assert body["status"] == "ok" and body["piston"] == "ok"
    assert body["python_version"] == "3.10.0"
    assert body["encounters"] >= 40
    assert body["executions"] == {"running": 3, "max": 8}


def test_not_ready_when_piston_cannot_be_reached():
    ready, health = _ready(FakePiston(error=PistonUnavailableError("down")))
    assert ready.status_code == 503
    assert ready.json()["status"] == "degraded" and ready.json()["piston"] == "unreachable"
    # Liveness must not depend on Piston, or Docker would restart us for nothing.
    assert health.status_code == 200


@pytest.mark.parametrize(
    "runtimes",
    [[], [{"language": "javascript", "version": "3.10.0"}], [{"language": "python", "version": "3.9.1"}]],
    ids=["nothing installed", "other language only", "other python version"],
)
def test_not_ready_when_the_python_runtime_is_missing(runtimes):
    ready, health = _ready(FakePiston(runtimes))
    assert ready.status_code == 503
    assert ready.json()["piston"] == "python_missing"
    assert health.status_code == 200


def test_not_ready_when_no_encounters_are_loaded(tmp_path):
    ready, _ = _ready(FakePiston(PYTHON), EncounterService(tmp_path))
    assert ready.status_code == 503
    body = ready.json()
    assert body["encounters"] == 0 and body["piston"] == "ok"


# --- the probe itself ---------------------------------------------------------


def _client(handler) -> PistonClient:
    return PistonClient(
        base_url="http://fake-piston:2000",
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
        max_concurrent=2,
    )


async def test_runtimes_returns_the_installed_list():
    client = _client(lambda r: httpx.Response(200, json=PYTHON))
    assert await client.runtimes() == PYTHON


@pytest.mark.parametrize(
    "handler",
    [
        lambda r: httpx.Response(500, json={"message": "boom"}),
        lambda r: httpx.Response(200, content=b"not json"),
        lambda r: httpx.Response(200, json={"python": "3.10.0"}),
        lambda r: (_ for _ in ()).throw(httpx.ReadTimeout("slow", request=r)),
        lambda r: (_ for _ in ()).throw(httpx.RemoteProtocolError("closed", request=r)),
        lambda r: (_ for _ in ()).throw(httpx.ConnectError("refused", request=r)),
    ],
    ids=["500", "not-json", "not-a-list", "read-timeout", "disconnect", "refused"],
)
async def test_runtimes_failures_are_piston_unavailable(handler):
    with pytest.raises(PistonUnavailableError):
        await _client(handler).runtimes()


async def test_in_use_counts_runs_in_piston_and_returns_to_zero():
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(client.in_use)
        return httpx.Response(200, json={"run": {"stdout": "1\n", "stderr": "", "code": 0, "signal": None}})

    client = _client(handler)
    assert (client.in_use, client.max_concurrent) == (0, 2)
    result = await client.execute(language="python", version="3.10.0", code="print(1)")
    assert result.status == ExecutionStatus.SUCCESS
    assert seen == [1] and client.in_use == 0


async def test_in_use_returns_to_zero_after_a_failed_run():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused", request=request)

    client = _client(handler)
    with pytest.raises(PistonUnavailableError):
        await client.execute(language="python", version="3.10.0", code="print(1)")
    assert client.in_use == 0
