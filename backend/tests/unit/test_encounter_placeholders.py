"""A scaffolded stub must not pass for a finished encounter."""

import json
import subprocess
import sys
from pathlib import Path

from app.schemas.encounter import Encounter
from app.services.encounter_checks import find_placeholders
from app.services.encounter_service import EncounterService

BACKEND = Path(__file__).resolve().parents[2]


def _stub() -> Encounter:
    """An encounter with the placeholder text scripts/new_encounter.py writes."""
    raw = json.loads((BACKEND / "encounters" / "python" / "py-001" / "v1.json").read_text())
    raw["problem"] = "TODO: describe the problem the player needs to solve."
    raw["starter_code"] = "# TODO: starter code shown to the player\n"
    raw["failure_explanation"] = "TODO: what a wrong submission probably got wrong."
    raw["hints"] = {"1": "TODO: one", "2": "TODO: two", "3": "TODO: three"}
    for group in ("sample", "hidden"):
        for test in raw["tests"][group]:
            test["input"] = "TODO"
            test["expected_output"] = "TODO"
    return Encounter.model_validate(raw)


def test_every_shipped_encounter_is_free_of_placeholders(encounters_dir):
    for encounter in EncounterService(encounters_dir).list_encounters(strict=True):
        assert find_placeholders(encounter) == [], encounter.id


def test_scaffold_stub_is_reported():
    found = find_placeholders(_stub())
    assert any("problem" in f for f in found)
    assert any("starter_code" in f for f in found)
    assert any("failure_explanation" in f for f in found)
    assert any("hint 1" in f for f in found)
    assert any("hidden test" in f for f in found)


def test_a_todo_comment_in_real_starter_code_is_allowed(encounters_dir):
    encounter = EncounterService(encounters_dir).get("py-001")
    data = encounter.model_dump()
    data["starter_code"] = "# TODO: write your code here\n"
    assert find_placeholders(Encounter.model_validate(data)) == []


def test_seed_script_fails_on_a_scaffold_stub():
    """End to end: scaffold py-777, run the checker, expect failure, clean up."""
    target = BACKEND / "encounters" / "python" / "py-777"
    assert not target.exists()
    try:
        subprocess.run(
            [sys.executable, "scripts/new_encounter.py", "py-777", "Stub", "--module", "python-basics",
             "--order", "777", "--concepts", "loops"],
            cwd=BACKEND, check=True, capture_output=True,
        )
        result = subprocess.run(
            [sys.executable, "scripts/seed_encounters.py"], cwd=BACKEND, capture_output=True, text=True
        )
        assert result.returncode == 1
        assert "py-777" in result.stdout and "unfinished" in result.stdout
    finally:
        for f in target.glob("*"):
            f.unlink()
        if target.exists():
            target.rmdir()
