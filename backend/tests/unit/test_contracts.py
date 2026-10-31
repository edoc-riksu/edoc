"""Contract tests: the shapes written down in contracts/ and the shapes the
service really returns must stay the same. If you change an API response, this
fails until contracts/ is updated too (and the change has been announced)."""

import json
from pathlib import Path

import jsonschema
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.mock_main import app as mock_app

CONTRACTS = Path(__file__).resolve().parents[3] / "contracts"

EXAMPLES = {
    "encounter": ["example-encounter"],
    "encounter-list": ["example-encounter-list"],
    "run-result": ["example-run-result"],
    "submission-result": ["example-submission-accepted", "example-submission-wrong-answer"],
    "hint": ["example-hint"],
}


def _schema(name: str) -> dict:
    return json.loads((CONTRACTS / f"{name}.schema.json").read_text())


@pytest.mark.parametrize("schema_name,example", [(s, e) for s, es in EXAMPLES.items() for e in es])
def test_every_example_matches_its_schema(schema_name, example):
    schema = _schema(schema_name)
    jsonschema.Draft202012Validator.check_schema(schema)
    jsonschema.validate(json.loads((CONTRACTS / f"{example}.json").read_text()), schema)


def test_real_encounter_responses_match_the_contract():
    with TestClient(app) as client:
        jsonschema.validate(client.get("/api/v1/encounters/py-001").json(), _schema("encounter"))
        jsonschema.validate(client.get("/api/v1/encounters").json(), _schema("encounter-list"))


def test_submission_and_run_shapes_match_the_contract():
    """Uses the mock API, which builds its answers from the same response models
    as the real service (and a defeat via the "#mock-fail" code marker)."""

    with TestClient(mock_app) as client:
        for code in ("print(1)", "#mock-fail"):
            body = {"encounter_id": "py-001", "code": code, "attempt_number": 2, "elapsed_ms": 900}
            jsonschema.validate(client.post("/api/v1/submissions", json=body).json(), _schema("submission-result"))
        run = client.post("/api/v1/executions/run", json={"encounter_id": "py-001", "code": "print(1)"})
        jsonschema.validate(run.json(), _schema("run-result"))


def test_run_never_carries_a_verdict_score_or_rating():
    """Day 26: Run is informational. If a verdict, score or rating ever appears
    on a run result, a client could start treating Run as a result that counts."""

    run_fields = set(_schema("run-result")["properties"])
    assert not run_fields & {"verdict", "score", "rating", "first_attempt_clear", "defeat"}
    with TestClient(mock_app) as client:
        run = client.post("/api/v1/executions/run", json={"encounter_id": "py-001", "code": "print(1)"}).json()
    assert not set(run) & {"verdict", "score", "rating", "first_attempt_clear", "defeat"}
