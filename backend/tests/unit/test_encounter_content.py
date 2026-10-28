"""Plan Days 23, 24 and 27: checks on what encounter authors write, so the
reviews don't have to be redone by hand for every new encounter.

- The reference solution in hint level 3 must pass every test of its own
  encounter (the tests agree with the walkthrough).
- A defeat explanation or an early hint must not quote a hidden test, because
  the explanation is sent to the browser on defeat (see contracts/README.md).
- Hints, served in the shape of contracts/hint.schema.json, are valid.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

import jsonschema
import pytest

from app.schemas.encounter import Encounter
from app.services.encounter_service import EncounterService

CONTRACTS = Path(__file__).resolve().parents[3] / "contracts"
ENCOUNTERS = Path(__file__).resolve().parents[2] / "encounters"


def _all(encounters_dir):
    return EncounterService(encounters_dir).list_encounters(strict=True)


def _hint_response(encounter: Encounter, level: int) -> dict:
    return {
        "encounter_id": encounter.id,
        "level": level,
        "levels_total": 3,
        "text": encounter.hints[str(level)],
        "cost": {"fuel": 0},
    }


# Parametrized from the files on disk, so every new encounter is covered.
@pytest.mark.parametrize("encounter_id", [e.id for e in EncounterService(ENCOUNTERS).list_encounters(strict=True)])
def test_reference_solution_in_hint_three_passes_all_tests(encounters_dir, encounter_id):
    encounter = EncounterService(encounters_dir).get(encounter_id)
    solution = encounter.hints["3"]
    try:
        compile(solution, encounter_id, "exec")
    except SyntaxError:
        pytest.skip("hint 3 is prose, not code")
    for case in [*encounter.tests.sample, *encounter.tests.hidden]:
        run = subprocess.run(
            [sys.executable, "-c", solution],
            input=case.input + "\n",
            capture_output=True,
            text=True,
            timeout=5,
        )
        assert run.returncode == 0, f"{encounter_id} {case.id}: {run.stderr}"
        assert run.stdout.strip() == case.expected_output.strip(), f"{encounter_id} {case.id} disagrees with hint 3"


def test_explanations_and_early_hints_do_not_quote_hidden_tests(encounters_dir):
    for encounter in _all(encounters_dir):
        visible = " ".join(
            [encounter.problem]
            + [f"{c.input} {c.expected_output}" for c in encounter.tests.sample]
        )
        secrets = set()
        for case in encounter.tests.hidden:
            for value in (case.input, case.expected_output):
                value = value.strip()
                # Single characters would match almost anything; values that the
                # problem text or a sample already shows are not secret.
                if len(value) >= 2 and value not in visible:
                    secrets.add(value)
        shown = {
            "failure_explanation": encounter.failure_explanation,
            "hint 1": encounter.hints["1"],
            "hint 2": encounter.hints["2"],
        }
        for where, text in shown.items():
            for value in secrets:
                pattern = r"(?<![\w-])" + re.escape(value) + r"(?![\w])"
                assert not re.search(pattern, text), (
                    f"{encounter.id} {where} quotes the hidden test value {value!r}"
                )


def test_every_hint_is_a_valid_hint_response(encounters_dir):
    schema = json.loads((CONTRACTS / "hint.schema.json").read_text())
    for encounter in _all(encounters_dir):
        for level in (1, 2, 3):
            jsonschema.validate(_hint_response(encounter, level), schema)


@pytest.mark.parametrize(
    "change",
    [
        {"level": 0},
        {"level": 4},
        {"levels_total": 2},
        {"cost": {}},
        {"cost": {"fuel": -1}},
        {"unexpected": True},
    ],
)
def test_hint_schema_rejects_bad_shapes(encounters_dir, change):
    schema = json.loads((CONTRACTS / "hint.schema.json").read_text())
    bad = {**_hint_response(_all(encounters_dir)[0], 1), **change}
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad, schema)


def test_hint_schema_requires_text(encounters_dir):
    schema = json.loads((CONTRACTS / "hint.schema.json").read_text())
    bad = _hint_response(_all(encounters_dir)[0], 1)
    del bad["text"]
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad, schema)
