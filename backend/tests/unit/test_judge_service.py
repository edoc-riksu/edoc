"""Day 13, 17 and 19: the submission result carries the attempt number and
time, a first-attempt flag, and (only when the player's code was wrong) the
concept and explanation for the defeat screen. Piston is replaced by a fake."""

import logging

import pytest

from app.execution.piston_client import PistonUnavailableError
from app.judge.harness import HarnessRun, JudgeOutcome
from app.schemas.execution import ExecutionStatus
from app.services.concepts import load_concepts
from app.services.encounter_service import EncounterService
from app.services.judge_service import JudgeService


class FakeHarness:
    """Stands in for TestHarness: passes the first `passing` hidden tests."""

    def __init__(self, passing: int | None = None, status=ExecutionStatus.SUCCESS, unavailable=False):
        self._passing = passing
        self._status = status
        self._unavailable = unavailable

    async def run_tests(self, *, tests, **_):
        if self._unavailable:
            raise PistonUnavailableError("down")
        passing = len(tests) if self._passing is None else self._passing
        outcomes = []
        for i, test in enumerate(tests):
            ok = i < passing
            outcomes.append(
                JudgeOutcome(
                    test_id=test.id,
                    passed=ok,
                    status=ExecutionStatus.SUCCESS if ok else self._status,
                    points=test.points,
                )
            )
        return HarnessRun(outcomes=outcomes, max_runtime_ms=30, total_runtime_ms=30 * len(tests))


@pytest.fixture
def encounter(encounters_dir):
    return EncounterService(encounters_dir).get("py-001")


@pytest.fixture
def service_factory(encounters_dir):
    concepts = load_concepts(encounters_dir)
    return lambda harness: JudgeService(harness, concepts)


async def test_accepted_first_try_is_a_first_attempt_clear(encounter, service_factory):
    result = await service_factory(FakeHarness()).judge_submission(
        encounter=encounter, code="x", attempt_number=1, elapsed_ms=4200
    )
    assert result.verdict == "ACCEPTED"
    assert result.attempt_number == 1
    assert result.first_attempt_clear is True
    assert result.elapsed_ms == 4200
    assert result.defeat is None


async def test_accepted_on_a_later_try_is_not_a_first_attempt_clear(encounter, service_factory):
    result = await service_factory(FakeHarness()).judge_submission(
        encounter=encounter, code="x", attempt_number=3
    )
    assert result.verdict == "ACCEPTED"
    assert result.attempt_number == 3
    assert result.first_attempt_clear is False
    assert result.elapsed_ms is None


async def test_wrong_answer_names_the_main_concept_and_explains(encounter, service_factory):
    result = await service_factory(FakeHarness(passing=3)).judge_submission(
        encounter=encounter, code="x", attempt_number=1
    )
    assert result.verdict == "WRONG_ANSWER"
    assert result.first_attempt_clear is False
    assert result.defeat is not None
    assert result.defeat.concept.id == "input-output"
    assert result.defeat.concept.name == "input/output"
    assert result.defeat.concept.note
    assert result.defeat.explanation == encounter.failure_explanation


@pytest.mark.parametrize(
    "status",
    [ExecutionStatus.RUNTIME_ERROR, ExecutionStatus.TIMEOUT],
)
async def test_runtime_error_and_timeout_also_end_in_a_defeat(encounter, service_factory, status):
    result = await service_factory(FakeHarness(passing=0, status=status)).judge_submission(
        encounter=encounter, code="x"
    )
    assert result.verdict in {"RUNTIME_ERROR", "TIME_LIMIT_EXCEEDED"}
    assert result.defeat is not None


async def test_our_own_failure_is_never_a_defeat(encounter, service_factory):
    result = await service_factory(FakeHarness(unavailable=True)).judge_submission(
        encounter=encounter, code="x", attempt_number=2, elapsed_ms=10
    )
    assert result.verdict == "SYSTEM_ERROR"
    assert result.defeat is None
    assert result.first_attempt_clear is False
    assert result.attempt_number == 2


async def test_submission_is_logged_with_its_cost_but_not_the_code(encounter, service_factory, caplog):
    secret = "my_secret_solution_text"
    with caplog.at_level(logging.INFO, logger="app.services.judge_service"):
        await service_factory(FakeHarness()).judge_submission(
            encounter=encounter, code=secret, attempt_number=2, elapsed_ms=1500
        )
    line = next(r.getMessage() for r in caplog.records if "judged" in r.getMessage())
    assert "attempt=2" in line
    assert "elapsed_ms=1500" in line
    assert "tests_run=5" in line
    assert "cost_runtime_ms=150" in line  # 5 hidden tests x 30 ms
    assert "wall_ms=" in line
    assert secret not in line


def test_request_rejects_bad_attempt_and_time():
    from pydantic import ValidationError

    from app.schemas.submission import SubmissionRequest

    ok = SubmissionRequest(encounter_id="py-001", code="x")
    assert ok.attempt_number == 1 and ok.elapsed_ms is None
    for bad in ({"attempt_number": 0}, {"elapsed_ms": -1}, {"attempt_number": 10_001}):
        with pytest.raises(ValidationError):
            SubmissionRequest(encounter_id="py-001", code="x", **bad)


def test_mock_can_show_a_defeat():
    from fastapi.testclient import TestClient

    from app.mock_main import app as mock_app

    with TestClient(mock_app) as client:
        win = client.post("/api/v1/submissions", json={"encounter_id": "py-001", "code": "ok"}).json()
        loss = client.post(
            "/api/v1/submissions",
            json={"encounter_id": "py-001", "code": "#mock-fail", "attempt_number": 2},
        ).json()
    assert win["verdict"] == "ACCEPTED" and win["first_attempt_clear"] is True and win["defeat"] is None
    assert loss["verdict"] == "WRONG_ANSWER" and loss["defeat"]["concept"]["id"] == "input-output"
    assert loss["attempt_number"] == 2
