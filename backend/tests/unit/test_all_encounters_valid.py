"""Every encounter file must load and validate - a broken JSON file here
would otherwise only be caught by someone manually running
scripts/seed_encounters.py."""

from app.services.encounter_service import EncounterService


def _all_encounter_ids(encounters_dir):
    return sorted({p.parent.name for p in encounters_dir.glob("*/*/v*.json")})


def test_every_encounter_file_is_valid(encounters_dir):
    ids = _all_encounter_ids(encounters_dir)
    assert ids, "no encounter files found"

    service = EncounterService(encounters_dir)
    for encounter_id in ids:
        encounter = service.get(encounter_id)
        assert encounter.tests.sample, f"{encounter_id} has no sample tests"
        assert encounter.tests.hidden, f"{encounter_id} has no hidden tests"
        assert len(encounter.hints) == 3, f"{encounter_id} must have exactly 3 hints"
        assert encounter.failure_explanation, f"{encounter_id} has no failure_explanation"
