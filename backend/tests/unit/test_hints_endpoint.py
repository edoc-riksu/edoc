"""Day 19: hints are served when requested, in order, from the encounter file.
The caller (Backend 2) says which level the player already has."""

import json
import logging
from pathlib import Path

import jsonschema
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.mock_main import app as mock_app
from app.services.encounter_service import EncounterService

CONTRACTS = Path(__file__).resolve().parents[3] / "contracts"
HINT_SCHEMA = json.loads((CONTRACTS / "hint.schema.json").read_text())


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _ask(client, level, highest=None, encounter_id="py-001"):
    body = {"level": level}
    if highest is not None:
        body["highest_level_asked"] = highest
    return client.post(f"/api/v1/encounters/{encounter_id}/hints", json=body)


@pytest.mark.parametrize("level", [1, 2, 3])
def test_each_level_is_served_in_order_with_the_encounter_text(client, encounters_dir, level):
    hints = EncounterService(encounters_dir).get("py-001").hints
    res = _ask(client, level, highest=level - 1)
    assert res.status_code == 200
    body = res.json()
    assert body == {
        "encounter_id": "py-001",
        "level": level,
        "levels_total": 3,
        "text": hints[str(level)],
        "cost": {"fuel": 0},
    }
    jsonschema.validate(body, HINT_SCHEMA)


def test_first_hint_needs_no_history(client):
    assert _ask(client, 1).status_code == 200


@pytest.mark.parametrize("level,highest,next_level", [(2, None, 1), (3, 0, 1), (3, 1, 2)])
def test_skipping_ahead_is_refused_with_the_level_to_ask_first(client, level, highest, next_level):
    res = _ask(client, level, highest)
    assert res.status_code == 409
    assert res.json() == {"detail": f"Ask hint level {next_level} first"}


def test_asking_an_earlier_level_again_returns_the_same_text(client):
    first = _ask(client, 1).json()
    again = _ask(client, 1, highest=3).json()
    assert again == first


def test_unknown_encounter_is_404(client):
    assert _ask(client, 1, encounter_id="py-999").status_code == 404


@pytest.mark.parametrize(
    "body",
    [{}, {"level": 0}, {"level": 4}, {"level": 1, "highest_level_asked": -1}, {"level": 1, "highest_level_asked": 4}],
)
def test_bad_request_is_422(client, body):
    assert client.post("/api/v1/encounters/py-001/hints", json=body).status_code == 422


def test_bad_encounter_id_is_422(client):
    assert client.post("/api/v1/encounters/../hints", json={"level": 1}).status_code in (404, 422)
    assert client.post("/api/v1/encounters/PY-001/hints", json={"level": 1}).status_code == 422


def test_hint_is_logged_without_its_text(client, encounters_dir, caplog):
    text = EncounterService(encounters_dir).get("py-001").hints["1"]
    with caplog.at_level(logging.INFO, logger="app.api.hints"):
        _ask(client, 1)
    line = next(r.getMessage() for r in caplog.records if "hint served" in r.getMessage())
    assert "encounter=py-001" in line and "level=1" in line
    assert text not in line


def test_mock_serves_the_same_hints_and_rule(client):
    with TestClient(mock_app) as mock:
        assert _ask(mock, 2, highest=1).json() == _ask(client, 2, highest=1).json()
        assert _ask(mock, 3, highest=1).status_code == 409


def test_public_encounter_still_has_no_hint_text(client):
    body = client.get("/api/v1/encounters/py-001").json()
    assert "hints" not in body and body["hint_levels"] == 3
