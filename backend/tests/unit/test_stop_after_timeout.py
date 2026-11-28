"""Day 52: once one test times out, the rest are not run. An endless loop then
costs one timeout (2 s), not one per test (10 s). The tests that were not run
are marked skipped, still count as not passed in the score, and never change
the verdict."""

import httpx
import pytest

from app.execution.piston_client import PistonClient
from app.judge.harness import JudgeOutcome, TestHarness
from app.judge.verdicts import Verdict
from app.schemas.encounter import TestCase
from app.schemas.execution import ExecutionStatus
from app.services.execution_service import ExecutionService
from app.services.scoring_service import score_outcomes

TIMED_OUT = {"run": {"stdout": "", "stderr": "", "code": None, "signal": "SIGKILL"}}


def _ok(out="5\n"):
    return {"run": {"stdout": out, "stderr": "", "code": 0, "signal": None}}


def _piston(*answers):
    """A Piston that gives these answers in order and counts the calls."""
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        return httpx.Response(200, json=answers[min(len(calls), len(answers)) - 1])

    client = PistonClient(
        base_url="http://fake-piston:2000",
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    return client, calls


def _tests(n=5):
    return [TestCase(id=f"hidden-{i}", input="2 3", expected_output="5", points=20) for i in range(1, n + 1)]


async def _run(piston, tests):
    return await TestHarness(piston).run_tests(
        code="x", tests=tests, language="python", version="3.10.0", timeout_ms=2000, memory_limit_bytes=1
    )


async def test_after_the_first_timeout_the_other_tests_are_not_run():
    piston, calls = _piston(TIMED_OUT)
    run = await _run(piston, _tests())
    assert len(calls) == 1
    assert [o.skipped for o in run.outcomes] == [False, True, True, True, True]
    assert all(not o.passed for o in run.outcomes)
    assert run.outcomes[0].status == ExecutionStatus.TIMEOUT


async def test_tests_before_the_timeout_still_count():
    piston, calls = _piston(_ok(), _ok(), TIMED_OUT)
    run = await _run(piston, _tests())
    assert len(calls) == 3
    assert [o.passed for o in run.outcomes] == [True, True, False, False, False]
    assert [o.skipped for o in run.outcomes] == [False, False, False, True, True]


async def test_a_wrong_answer_or_a_crash_does_not_stop_the_run():
    piston, calls = _piston(_ok("6\n"), {"run": {"stdout": "", "stderr": "boom", "code": 1, "signal": None}}, _ok())
    run = await _run(piston, _tests(4))
    assert len(calls) == 4
    assert not any(o.skipped for o in run.outcomes)


async def test_the_score_total_still_counts_every_hidden_test():
    piston, _ = _piston(_ok(), TIMED_OUT)
    run = await _run(piston, _tests())
    score, verdict = score_outcomes(run.outcomes)
    assert (score.earned, score.total) == (20, 100)
    assert verdict == Verdict.TIME_LIMIT_EXCEEDED


def test_skipped_tests_never_change_the_verdict():
    outcomes = [
        JudgeOutcome(test_id="a", passed=False, status=ExecutionStatus.RUNTIME_ERROR, points=20),
        JudgeOutcome(test_id="b", passed=False, status=ExecutionStatus.TIMEOUT, points=20),
        JudgeOutcome(test_id="c", passed=False, status=ExecutionStatus.TIMEOUT, points=20, skipped=True),
    ]
    assert score_outcomes(outcomes)[1] == Verdict.TIME_LIMIT_EXCEEDED
    only_skipped_after_wrong = [
        JudgeOutcome(test_id="a", passed=False, status=ExecutionStatus.SUCCESS, points=20),
        JudgeOutcome(test_id="b", passed=False, status=ExecutionStatus.TIMEOUT, points=20, skipped=True),
    ]
    assert score_outcomes(only_skipped_after_wrong)[1] == Verdict.WRONG_ANSWER


# --- through the real API ------------------------------------------------------


@pytest.fixture
def api(monkeypatch):
    from fastapi.testclient import TestClient

    from app.main import app

    def make(*answers):
        piston, calls = _piston(*answers)
        client = TestClient(app)
        client.__enter__()
        app.state.judge_service._harness = TestHarness(piston)
        app.state.execution_service._piston = piston
        return client, calls

    clients = []

    def factory(*answers):
        client, calls = make(*answers)
        clients.append(client)
        return client, calls

    yield factory
    for c in clients:
        c.__exit__(None, None, None)


def test_submit_reports_the_timeout_and_marks_the_skipped_tests(api):
    client, calls = api(TIMED_OUT)
    body = client.post("/api/v1/submissions", json={"encounter_id": "py-001", "code": "while True: pass"}).json()
    assert len(calls) == 1
    assert body["verdict"] == "TIME_LIMIT_EXCEEDED"
    assert body["score"]["earned"] == 0 and body["score"]["total"] == 100
    assert body["rating"]["stars"] == 0 and body["defeat"] is not None
    skipped = [t["skipped"] for t in body["tests"]]
    assert skipped[0] is False and all(skipped[1:])
    assert len(skipped) == 5


def test_a_normal_submission_has_no_skipped_tests(api):
    client, calls = api(_ok())
    body = client.post("/api/v1/submissions", json={"encounter_id": "py-001", "code": "x"}).json()
    assert len(calls) == 5
    assert not any(t["skipped"] for t in body["tests"])


def test_run_also_stops_after_a_timeout_and_says_so(api):
    client, calls = api(TIMED_OUT)
    body = client.post("/api/v1/executions/run", json={"encounter_id": "py-001", "code": "while True: pass"}).json()
    assert len(calls) == 1
    first, *rest = body["tests"]
    assert first["timed_out"] is True and first["skipped"] is False and first["passed"] is False
    assert rest and all(t["skipped"] and not t["timed_out"] and not t["passed"] for t in rest)


def test_run_without_a_timeout_runs_every_sample(api):
    client, calls = api(_ok())
    body = client.post("/api/v1/executions/run", json={"encounter_id": "py-001", "code": "x"}).json()
    assert len(calls) == len(body["tests"])
    assert not any(t["skipped"] or t["timed_out"] for t in body["tests"])
