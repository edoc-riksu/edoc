"""Day 11, 12, 18 and 20: encounters have a play order, a main concept tag
from the agreed list, and exactly three hint levels; the list endpoint serves
them in play order without leaking problem text or tests."""

import json

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.encounter import Encounter, EncounterPublic
from app.services.concepts import load_concept_ids
from app.services.encounter_service import EncounterService


def _raw(encounters_dir, encounter_id="py-001"):
    return json.loads((encounters_dir / "python" / encounter_id / "v1.json").read_text())


def test_every_encounter_uses_only_agreed_concepts(encounters_dir):
    known = load_concept_ids(encounters_dir)
    for encounter in EncounterService(encounters_dir).list_encounters():
        assert encounter.concepts, f"{encounter.id} has no concept tag"
        assert set(encounter.concepts) <= known, f"{encounter.id} uses an unknown concept"


def test_order_is_unique_inside_each_module(encounters_dir):
    seen = {}
    for e in EncounterService(encounters_dir).list_encounters():
        key = (e.module, e.order)
        assert key not in seen, f"{e.id} and {seen[key]} share order {e.order} in {e.module}"
        seen[key] = e.id


def test_list_is_sorted_by_module_then_order(encounters_dir):
    listed = EncounterService(encounters_dir).list_encounters(module="python-basics")
    assert [e.id for e in listed] == ["py-001", "py-002", "py-003", "py-004", "py-005", "py-006", "py-007"]
    assert [e.order for e in listed] == [1, 2, 3, 4, 5, 6, 7]


def test_missing_concept_is_rejected(encounters_dir):
    raw = _raw(encounters_dir)
    raw["concepts"] = []
    with pytest.raises(ValidationError):
        Encounter.model_validate(raw)


def test_unknown_difficulty_is_rejected(encounters_dir):
    raw = _raw(encounters_dir)
    raw["difficulty"] = "impossible"
    with pytest.raises(ValidationError):
        Encounter.model_validate(raw)


@pytest.mark.parametrize(
    "hints",
    [
        {"1": "a", "2": "b"},  # too few
        {"1": "a", "2": "b", "3": "c", "4": "d"},  # too many
        {"1": "a", "2": "b", "4": "c"},  # wrong level names
        {"1": "a", "2": " ", "3": "c"},  # empty text
    ],
)
def test_hints_must_be_exactly_three_filled_levels(encounters_dir, hints):
    raw = _raw(encounters_dir)
    raw["hints"] = hints
    with pytest.raises(ValidationError):
        Encounter.model_validate(raw)


def test_public_encounter_reports_hint_levels(encounters_dir):
    encounter = EncounterService(encounters_dir).get("py-001")
    public = EncounterPublic.from_encounter(encounter)
    assert public.hint_levels == 3
    assert "hints" not in public.model_dump()


def test_list_endpoint_returns_summaries_only():
    with TestClient(app) as client:
        response = client.get("/api/v1/encounters", params={"module": "python-basics"})
    assert response.status_code == 200
    rows = response.json()["encounters"]
    assert [r["id"] for r in rows] == ["py-001", "py-002", "py-003", "py-004", "py-005", "py-006", "py-007"]
    first = rows[0]
    assert first["concept"] == "input-output"
    assert first["concepts"] == ["input-output", "arithmetic"]
    assert first["order"] == 1
    for forbidden in ("problem", "starter_code", "sample_tests", "tests", "hints", "hint_levels"):
        assert forbidden not in first


def test_list_endpoint_filters_and_rejects_bad_input():
    with TestClient(app) as client:
        none = client.get("/api/v1/encounters", params={"module": "no-such-module"})
        bad = client.get("/api/v1/encounters", params={"module": "../etc"})
    assert none.status_code == 200 and none.json() == {"encounters": []}
    assert bad.status_code == 422
