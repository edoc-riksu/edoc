import pytest

from app.judge.harness import JudgeOutcome
from app.judge.verdicts import Verdict
from app.schemas.execution import ExecutionStatus
from app.services.scoring_service import PAR_MS_BY_DIFFICULTY, rate_submission, score_outcomes


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


# Day 15: the rating (stars) from attempts and time, apart from the test score.

EASY_PAR = PAR_MS_BY_DIFFICULTY["easy"]


@pytest.mark.parametrize(
    "attempt,elapsed,stars,within_par",
    [
        (1, EASY_PAR, 3, True),  # first try, exactly at par
        (1, EASY_PAR + 1, 2, False),  # first try, slow
        (4, 1000, 2, True),  # later try, fast
        (4, EASY_PAR + 1, 1, False),  # later try, slow
        (1, None, 2, None),  # no time sent: no time star, not a penalty either
        (2, None, 1, None),
    ],
)
def test_accepted_rating_counts_first_try_and_par(attempt, elapsed, stars, within_par):
    rating = rate_submission(
        verdict=Verdict.ACCEPTED, attempt_number=attempt, elapsed_ms=elapsed, difficulty="easy"
    )
    assert rating.stars == stars
    assert rating.within_par is within_par
    assert rating.par_ms == EASY_PAR


@pytest.mark.parametrize(
    "verdict",
    [Verdict.WRONG_ANSWER, Verdict.RUNTIME_ERROR, Verdict.TIME_LIMIT_EXCEEDED, Verdict.COMPILATION_ERROR],
)
def test_a_wrong_submission_earns_no_stars(verdict):
    rating = rate_submission(verdict=verdict, attempt_number=1, elapsed_ms=10, difficulty="easy")
    assert rating.stars == 0


def test_our_own_failure_is_not_rated():
    assert rate_submission(
        verdict=Verdict.SYSTEM_ERROR, attempt_number=1, elapsed_ms=10, difficulty="easy"
    ) is None


def test_par_grows_with_difficulty():
    assert PAR_MS_BY_DIFFICULTY["easy"] < PAR_MS_BY_DIFFICULTY["medium"] < PAR_MS_BY_DIFFICULTY["hard"]
    for difficulty, par in PAR_MS_BY_DIFFICULTY.items():
        rating = rate_submission(
            verdict=Verdict.ACCEPTED, attempt_number=1, elapsed_ms=par, difficulty=difficulty
        )
        assert rating.par_ms == par and rating.stars == 3
