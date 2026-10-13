from app.judge.harness import JudgeOutcome
from app.judge.verdicts import Verdict
from app.schemas.execution import ExecutionStatus
from app.services.scoring_service import score_outcomes


def _outcome(test_id, passed, status=ExecutionStatus.SUCCESS, points=20):
    return JudgeOutcome(test_id=test_id, passed=passed, status=status, points=points)


def test_all_passed_is_accepted_full_score():
    outcomes = [_outcome("t1", True), _outcome("t2", True)]
    score, verdict = score_outcomes(outcomes)
    assert verdict == Verdict.ACCEPTED
    assert score.earned == 40
    assert score.total == 40


def test_partial_failure_is_wrong_answer_partial_score():
    outcomes = [_outcome("t1", True), _outcome("t2", False)]
    score, verdict = score_outcomes(outcomes)
    assert verdict == Verdict.WRONG_ANSWER
    assert score.earned == 20
    assert score.total == 40


def test_runtime_error_outranks_wrong_answer():
    outcomes = [
        _outcome("t1", False),
        _outcome("t2", False, status=ExecutionStatus.RUNTIME_ERROR),
    ]
    _, verdict = score_outcomes(outcomes)
    assert verdict == Verdict.RUNTIME_ERROR


def test_timeout_outranks_runtime_error():
    outcomes = [
        _outcome("t1", False, status=ExecutionStatus.RUNTIME_ERROR),
        _outcome("t2", False, status=ExecutionStatus.TIMEOUT),
    ]
    _, verdict = score_outcomes(outcomes)
    assert verdict == Verdict.TIME_LIMIT_EXCEEDED


def test_sample_tests_worth_zero_points_dont_affect_score():
    outcomes = [_outcome("sample-1", True, points=0), _outcome("hidden-1", True, points=20)]
    score, verdict = score_outcomes(outcomes)
    assert verdict == Verdict.ACCEPTED
    assert score.earned == 20
    assert score.total == 20


def test_no_outcomes_is_system_error():
    score, verdict = score_outcomes([])
    assert verdict == Verdict.SYSTEM_ERROR
    assert score.earned == 0
    assert score.total == 0
