import pytest

from app.schemas.encounter import EncounterPublic
from app.services.encounter_service import EncounterNotFoundError, EncounterService


def test_loads_py_001(encounters_dir):
    service = EncounterService(encounters_dir)
    encounter = service.get("py-001")

    assert encounter.id == "py-001"
    assert encounter.language == "python"
    assert len(encounter.tests.sample) == 2
    assert len(encounter.tests.hidden) == 5
    assert sum(t.points for t in encounter.tests.hidden) == 100


def test_missing_encounter_raises(encounters_dir):
    service = EncounterService(encounters_dir)
    with pytest.raises(EncounterNotFoundError):
        service.get("does-not-exist")


def test_public_view_hides_hidden_tests_and_hints(encounters_dir):
    service = EncounterService(encounters_dir)
    encounter = service.get("py-001")
    public = EncounterPublic.from_encounter(encounter)

    assert not hasattr(public, "hints")
    assert not hasattr(public, "failure_explanation")
    assert len(public.sample_tests) == 2
    dumped = public.model_dump()
    assert "hidden" not in dumped
    assert "hints" not in dumped
