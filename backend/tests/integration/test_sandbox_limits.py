"""Day 16: what happens when a player's code misbehaves. Needs a real Piston
with Python installed (same setup as test_submission_flow.py); skipped
otherwise. Every case must end in a normal answer, never a hang or a crash,
and never in ACCEPTED.

NOT YET RUN: written without access to a live Piston. Run it once on the
staging server (or locally with docker compose) and note the results in
README.md. Where Piston reports one cause as another (README: timeout, memory
kill and output limit all surface as TIME_LIMIT_EXCEEDED) the tests accept
either verdict, and say so.
"""

import time

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

pytestmark = pytest.mark.integration

PLAYER_FAULT = {"RUNTIME_ERROR", "TIME_LIMIT_EXCEEDED", "WRONG_ANSWER"}


@pytest.fixture(scope="module", autouse=True)
def _require_piston():
    base_url = get_settings().piston_base_url
    try:
        response = httpx.get(f"{base_url}/api/v2/runtimes", timeout=2.0)
        response.raise_for_status()
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError):
        pytest.skip(f"Piston not reachable at {base_url} - start it with docker compose")


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _submit(client, code):
    started = time.monotonic()
    response = client.post("/api/v1/submissions", json={"encounter_id": "py-001", "code": code})
    return response, time.monotonic() - started


def test_infinite_loop_is_stopped_and_reported_as_time_limit(client):
    response, seconds = _submit(client, "while True:\n    pass\n")
    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "TIME_LIMIT_EXCEEDED"
    assert body["score"]["earned"] == 0
    assert body["defeat"] is not None
    # 5 hidden tests x 2 s limit, plus slack. A hang would blow far past this.
    assert seconds < 30


def test_infinite_loop_on_run_returns_instead_of_hanging(client):
    started = time.monotonic()
    response = client.post(
        "/api/v1/executions/run",
        json={"encounter_id": "py-001", "code": "while True:\n    pass\n"},
    )
    assert response.status_code == 200
    assert not any(t["passed"] for t in response.json()["tests"])
    assert time.monotonic() - started < 30


def test_memory_hog_is_stopped(client):
    # Asks for about 2 GB; the limit is 256 MB. Either verdict is acceptable,
    # because the sandbox may report an out-of-memory kill as a timeout.
    response, seconds = _submit(client, "x = bytearray(2 * 1024 * 1024 * 1024)\nprint(len(x))\n")
    assert response.status_code == 200
    assert response.json()["verdict"] in {"RUNTIME_ERROR", "TIME_LIMIT_EXCEEDED"}
    assert seconds < 30


def test_huge_output_is_stopped_and_the_response_stays_small(client):
    response = client.post(
        "/api/v1/executions/run",
        json={"encounter_id": "py-001", "code": "print('a' * 500000)\n"},
    )
    assert response.status_code == 200
    body = response.json()
    assert not any(t["passed"] for t in body["tests"])
    limit = get_settings().run_output_char_limit
    assert all(len(t["stdout"]) <= limit + 100 and len(t["stderr"]) <= limit + 100 for t in body["tests"])


def test_code_cannot_reach_the_network(client):
    code = (
        "import urllib.request\n"
        "print(urllib.request.urlopen('http://example.com', timeout=2).status)\n"
    )
    response, _ = _submit(client, code)
    assert response.status_code == 200
    # If this fails, the sandbox has network access: tell Backend 2 / whoever owns the server.
    assert response.json()["verdict"] in PLAYER_FAULT


def test_backend_still_answers_after_all_of_the_above(client):
    assert client.get("/health").json() == {"status": "ok"}
    response, _ = _submit(client, "a, b = map(int, input().split())\nprint(a + b)\n")
    assert response.json()["verdict"] == "ACCEPTED"
