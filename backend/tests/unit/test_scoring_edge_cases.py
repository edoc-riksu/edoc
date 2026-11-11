"""Day 45: odd outputs and odd Piston answers must end in a normal verdict,
never in a crash, and never in a pass that was not earned. No real Piston:
the comparator, scoring and Piston client are called directly or through a
fake transport."""

import httpx
import pytest

from app.execution.piston_client import PistonClient, PistonUnavailableError
from app.judge.comparator import compare_output
from app.judge.harness import JudgeOutcome, TestHarness
from app.judge.verdicts import Verdict
from app.schemas.encounter import TestCase
from app.schemas.execution import ExecutionStatus
from app.services.scoring_service import PAR_MS_BY_DIFFICULTY, rate_submission, score_outcomes


# --- Comparator: what counts as the same output ---------------------------


@pytest.mark.parametrize(
    "actual, expected",
    [
        ("Even", "even"),  # case matters
        (" Even", "Even"),  # leading spaces matter
        ("a  b", "a b"),  # spaces inside a line matter
        ("\n3", "3"),  # a leading blank line matters
        ("1\n\n2", "1\n2"),  # a blank line in the middle matters
        ("", "0"),  # printing nothing is not an answer
        ("1 2", "1\n2"),  # one line is not two
        ("café", "café"),  # same look, different characters
    ],
)
def test_outputs_that_are_not_the_same_do_not_match(actual, expected):
    assert not compare_output(actual, expected)


@pytest.mark.parametrize(
    "actual, expected",
    [
        ("5\n\n\n", "5"),  # extra blank lines at the end
        ("5   \n7\t\n", "5\n7"),  # trailing spaces and tabs on each line
        ("5\r\n7\r\n", "5\n7"),  # Windows line endings
        ("5\r", "5"),  # a lone carriage return at the end
        ("", ""),  # both empty
        ("  \n\n", ""),  # only whitespace equals empty
    ],
)
def test_harmless_formatting_differences_still_match(actual, expected):
    assert compare_output(actual, expected)


# --- Scoring: partial results and the highest-priority verdict ------------


def _outcome(test_id, passed, status=ExecutionStatus.SUCCESS, points=20):
    return JudgeOutcome(test_id=test_id, passed=passed, status=status, points=points)


def test_one_system_error_outranks_four_passes_and_scores_only_the_passes():
    outcomes = [_outcome(f"t{i}", True) for i in range(4)] + [
        _outcome("t4", False, ExecutionStatus.SYSTEM_ERROR)
    ]
    score, verdict = score_outcomes(outcomes)
    assert verdict == Verdict.SYSTEM_ERROR
    assert (score.earned, score.total) == (80, 100)


def test_partial_credit_adds_up_the_passed_tests_only():
    outcomes = [
        _outcome("t0", True),
        _outcome("t1", False, ExecutionStatus.TIMEOUT),
        _outcome("t2", True),
        _outcome("t3", False, ExecutionStatus.RUNTIME_ERROR),
        _outcome("t4", False),
    ]
    score, verdict = score_outcomes(outcomes)
    assert (score.earned, score.total) == (40, 100)
    assert verdict == Verdict.TIME_LIMIT_EXCEEDED


def test_a_crash_after_correct_output_is_not_accepted():
    """The program printed the right answer, then exited with an error."""
    harness_passed = False  # the harness only passes SUCCESS plus matching output
    score, verdict = score_outcomes([_outcome("t0", harness_passed, ExecutionStatus.RUNTIME_ERROR)])
    assert verdict == Verdict.RUNTIME_ERROR
    assert score.earned == 0


# --- Rating: the time boundary and who gets stars --------------------------


@pytest.mark.parametrize("difficulty", ["easy", "medium", "hard"])
def test_exactly_the_par_time_still_earns_the_time_star(difficulty):
    par = PAR_MS_BY_DIFFICULTY[difficulty]
    on_par = rate_submission(verdict=Verdict.ACCEPTED, attempt_number=2, elapsed_ms=par, difficulty=difficulty)
    over = rate_submission(verdict=Verdict.ACCEPTED, attempt_number=2, elapsed_ms=par + 1, difficulty=difficulty)
    assert on_par.within_par is True and on_par.stars == 2
    assert over.within_par is False and over.stars == 1


def test_zero_elapsed_time_is_within_par():
    rating = rate_submission(verdict=Verdict.ACCEPTED, attempt_number=1, elapsed_ms=0, difficulty="easy")
    assert rating.within_par is True and rating.stars == 3


def test_no_time_sent_means_no_time_star_but_not_slow():
    rating = rate_submission(verdict=Verdict.ACCEPTED, attempt_number=1, elapsed_ms=None, difficulty="hard")
    assert rating.within_par is None and rating.stars == 2


# --- Piston client: odd answers from the sandbox ---------------------------


def _piston(handler) -> PistonClient:
    return PistonClient(
        base_url="http://fake-piston:2000",
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )


async def _execute(handler):
    return await _piston(handler).execute(language="python", version="3.10.0", code="print(1)")


async def test_no_exit_code_and_no_signal_is_never_a_success():
    result = await _execute(lambda r: httpx.Response(200, json={"run": {"stdout": "1\n"}}))
    assert result.status != ExecutionStatus.SUCCESS


async def test_missing_output_fields_become_empty_text():
    result = await _execute(lambda r: httpx.Response(200, json={"run": {"code": 0}}))
    assert result.status == ExecutionStatus.SUCCESS
    assert result.stdout == "" and result.stderr == ""


@pytest.mark.parametrize(
    "body",
    [
        [],  # a list instead of an object
        "oops",  # a bare string
        {"run": None},  # run missing its content
        {"run": "text"},  # run is not an object
        {"message": "runtime not found"},  # an error object with no run
    ],
)
async def test_an_unexpected_answer_is_reported_as_unavailable_not_a_crash(body):
    with pytest.raises(PistonUnavailableError):
        await _execute(lambda r: httpx.Response(200, json=body))


async def test_an_answer_that_is_not_json_is_reported_as_unavailable():
    with pytest.raises(PistonUnavailableError):
        await _execute(lambda r: httpx.Response(200, text="<html>bad gateway</html>"))


async def test_the_harness_fails_a_test_when_the_program_crashes_after_printing_the_answer():
    def handler(request):
        return httpx.Response(200, json={"run": {"stdout": "5\n", "stderr": "boom", "code": 1, "signal": None}})

    harness = TestHarness(_piston(handler))
    test = TestCase(id="hidden-1", input="2 3", expected_output="5", points=20)
    run = await harness.run_tests(
        code="print(5); raise SystemExit(1)",
        tests=[test],
        language="python",
        version="3.10.0",
        timeout_ms=2000,
        memory_limit_bytes=1,
    )
    assert run.outcomes[0].passed is False
    assert run.outcomes[0].status == ExecutionStatus.RUNTIME_ERROR


async def test_null_output_fields_become_empty_text():
    result = await _execute(
        lambda r: httpx.Response(200, json={"run": {"code": 0, "stdout": None, "stderr": None}})
    )
    assert result.stdout == "" and result.stderr == ""
