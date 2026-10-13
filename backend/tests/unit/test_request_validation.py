import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.submission import RunRequest, SubmissionRequest

MALICIOUS_IDS = [
    "../../etc/passwd",
    "py-001/../../secret",
    "py-*",
    "py-001; rm -rf",
    "PY-001",  # uppercase not allowed
    "py-1",  # wrong digit count
    "py-0001",
]


@pytest.mark.parametrize("bad_id", MALICIOUS_IDS)
def test_submission_request_rejects_malicious_encounter_id(bad_id):
    with pytest.raises(ValidationError):
        SubmissionRequest(encounter_id=bad_id, code="print(1)")


@pytest.mark.parametrize("bad_id", MALICIOUS_IDS)
def test_run_request_rejects_malicious_encounter_id(bad_id):
    with pytest.raises(ValidationError):
        RunRequest(encounter_id=bad_id, code="print(1)")


def test_valid_encounter_id_is_accepted():
    SubmissionRequest(encounter_id="py-001", code="print(1)")


def test_code_over_max_length_is_rejected():
    with pytest.raises(ValidationError):
        SubmissionRequest(encounter_id="py-001", code="x" * 20_001)


def test_code_at_max_length_is_accepted():
    SubmissionRequest(encounter_id="py-001", code="x" * 20_000)


@pytest.mark.parametrize("bad_id", ["py-*", "PY-001", "py-1"])
def test_encounter_path_parameter_rejects_malicious_ids(bad_id):
    """Single-segment bad IDs reach our route and get rejected by the
    pattern (422)."""
    with TestClient(app) as client:
        response = client.get(f"/api/v1/encounters/{bad_id}")
    assert response.status_code == 422


def test_encounter_path_parameter_traversal_never_reaches_our_route():
    """A multi-segment traversal attempt doesn't even match our route -
    routing itself is the first line of defense here, before our pattern
    ever runs. 404, not 500/200, is the safe outcome."""
    with TestClient(app) as client:
        response = client.get("/api/v1/encounters/../../etc/passwd")
    assert response.status_code == 404
