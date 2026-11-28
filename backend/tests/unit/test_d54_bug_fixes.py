"""Day 54 bug fixes.

1. A hint request must send real whole numbers. `true`, `"2"` and `2.0` used to
   be accepted by pydantic's lax coercion (true became level 1), which can hide
   a bug in the caller. They are rejected with 422 now.
2. Hint 1 and hint 2 are for thinking, not for copying: no code lines, and hint 2
   is not a copy of hint 3 (py-005's hint 2 used to hand over `max(a, b, c)`).
"""

import re

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.encounter_service import EncounterService


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.mark.parametrize(
    "body",
    [
        {"level": True},
        {"level": "2"},
        {"level": 2.0},
        {"level": 2.5},
        {"level": None},
        {"level": 1, "highest_level_asked": True},
        {"level": 1, "highest_level_asked": "0"},
        {"level": 1, "highest_level_asked": 0.0},
    ],
)
def test_hint_numbers_must_be_whole_numbers(client, body):
    assert client.post("/api/v1/encounters/py-001/hints", json=body).status_code == 422


@pytest.mark.parametrize("body", [{"level": 1}, {"level": 2, "highest_level_asked": 1}, {"level": 1, "highest_level_asked": 0}])
def test_plain_whole_numbers_still_work(client, body):
    assert client.post("/api/v1/encounters/py-001/hints", json=body).status_code == 200


def _all(encounters_dir):
    return EncounterService(encounters_dir).list_encounters(strict=True)


def test_early_hints_contain_no_code(encounters_dir):
    for e in _all(encounters_dir):
        for level in ("1", "2"):
            text = e.hints[level]
            assert "\n" not in text, f"{e.id} hint {level} has a line break"
            # Naming a function like input().split() or range(1, N+1) is fine
            # for an approach hint; a print call is the answer written out.
            assert not re.search(r"\bprint\([^)]", text), f"{e.id} hint {level} contains a print call"


def test_hint_two_is_not_a_copy_of_hint_one_or_three(encounters_dir):
    for e in _all(encounters_dir):
        one, two, three = (e.hints[k].strip() for k in "123")
        assert two != one, f"{e.id}: hint 2 repeats hint 1"
        assert two not in three and three not in two, f"{e.id}: hint 2 and hint 3 are the same"


def test_py_005_hint_two_does_not_hand_over_the_answer(encounters_dir):
    e = EncounterService(encounters_dir).get("py-005")
    assert "max(a, b, c)" not in e.hints["2"]
    assert "max(" not in e.hints["2"]
    assert "max(a, b, c)" in e.hints["3"]  # the walkthrough still shows it
