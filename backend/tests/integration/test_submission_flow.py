"""Full-stack integration test: API -> JudgeService -> TestHarness -> Piston.

Requires a real, reachable Piston instance with the configured Python
version installed. Run:

    docker compose up -d piston
    curl -X POST http://localhost:2000/api/v2/packages \\
        -H "Content-Type: application/json" \\
        -d '{"language":"python","version":"3.10.0"}'
    pytest -m integration

If Piston isn't reachable, every test in this module is skipped rather than
failed, since that's an environment gap, not a code defect.
"""

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

pytestmark = pytest.mark.integration


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


def test_correct_solution_is_accepted(client):
    response = client.post(
        "/api/v1/submissions",
        json={
            "encounter_id": "py-001",
            "code": "a, b = map(int, input().split())\nprint(a + b)\n",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "ACCEPTED"
    assert body["score"] == {"earned": 100, "total": 100}
    assert all(t["passed"] for t in body["tests"])


def test_incorrect_solution_is_wrong_answer(client):
    response = client.post(
        "/api/v1/submissions",
        json={
            "encounter_id": "py-001",
            "code": "a, b = map(int, input().split())\nprint(a - b)\n",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "WRONG_ANSWER"
    assert body["score"]["earned"] < body["score"]["total"]


def test_runtime_error_is_reported():
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/submissions",
            json={"encounter_id": "py-001", "code": "raise ValueError('boom')\n"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "RUNTIME_ERROR"
    assert body["score"]["earned"] == 0


def test_hidden_test_data_never_leaks(client):
    response = client.get("/api/v1/encounters/py-001")
    assert response.status_code == 200
    body = response.json()

    sample_ids = {t["id"] for t in body["sample_tests"]}
    assert sample_ids == {"sample-1", "sample-2"}
    assert "hidden" not in body
    assert "hints" not in body
    assert "failure_explanation" not in body
