import time
import uuid

from app.core.config import get_settings
from app.core.logging import get_logger
from app.execution.piston_client import PistonUnavailableError
from app.judge.harness import TestHarness
from app.judge.verdicts import Verdict
from app.schemas.encounter import Encounter
from app.schemas.submission import (
    Defeat,
    ExecutionMeta,
    ScoreBreakdown,
    SubmissionResult,
    TestResult,
)
from app.services.concepts import ConceptInfo
from app.services.scoring_service import rate_submission, score_outcomes

logger = get_logger(__name__)

# Verdicts that mean "the player's code was wrong" and so end in a defeat
# explanation. SYSTEM_ERROR is our failure, not the player's, so it never does.
_PLAYER_FAULT_VERDICTS = {
    Verdict.WRONG_ANSWER,
    Verdict.RUNTIME_ERROR,
    Verdict.TIME_LIMIT_EXCEEDED,
    Verdict.COMPILATION_ERROR,
}


class JudgeService:
    """Orchestrates a scored SUBMIT: runs the encounter's hidden tests through
    the harness, scores them, and produces the submission record. This is the
    only path that is authoritative for game progression / damage."""

    def __init__(
        self,
        harness: TestHarness,
        concepts: dict[str, ConceptInfo] | None = None,
    ) -> None:
        self._harness = harness
        self._concepts = concepts or {}

    async def judge_submission(
        self,
        *,
        encounter: Encounter,
        code: str,
        attempt_number: int = 1,
        elapsed_ms: int | None = None,
    ) -> SubmissionResult:
        submission_id = str(uuid.uuid4())
        started = time.monotonic()

        # Submit checks hidden tests only.
        hidden_tests = encounter.tests.hidden

        try:
            run = await self._harness.run_tests(
                code=code,
                tests=hidden_tests,
                language=encounter.language,
                version=_language_version(encounter),
                timeout_ms=encounter.limits.timeout_ms,
                memory_limit_bytes=get_settings().run_memory_limit_bytes,
            )
        except PistonUnavailableError:
            logger.error(
                "submission %s could not be judged: execution backend unavailable "
                "(encounter=%s)",
                submission_id,
                encounter.id,
            )
            return SubmissionResult(
                submission_id=submission_id,
                encounter_id=encounter.id,
                verdict=Verdict.SYSTEM_ERROR,
                score=ScoreBreakdown(
                    earned=0,
                    total=sum(test.points for test in hidden_tests),
                ),
                tests=[],
                execution=ExecutionMeta(runtime_ms=0),
                attempt_number=attempt_number,
                elapsed_ms=elapsed_ms,
            )

        score, verdict = score_outcomes(run.outcomes)
        wall_ms = int((time.monotonic() - started) * 1000)

        # One line per submission with what it cost to run: slowest test,
        # total sandbox time over all tests, and time spent in this service.
        # Never the player's code or hidden outputs.
        logger.info(
            "submission %s judged: encounter=%s verdict=%s score=%s/%s attempt=%s "
            "elapsed_ms=%s tests_run=%s runtime_ms=%s cost_runtime_ms=%s wall_ms=%s",
            submission_id,
            encounter.id,
            verdict.value,
            score.earned,
            score.total,
            attempt_number,
            elapsed_ms,
            len(run.outcomes),
            run.max_runtime_ms,
            run.total_runtime_ms,
            wall_ms,
        )

        return SubmissionResult(
            submission_id=submission_id,
            encounter_id=encounter.id,
            verdict=verdict,
            score=score,
            tests=[
                TestResult(test_id=outcome.test_id, passed=outcome.passed)
                for outcome in run.outcomes
            ],
            execution=ExecutionMeta(runtime_ms=run.max_runtime_ms),
            attempt_number=attempt_number,
            first_attempt_clear=verdict == Verdict.ACCEPTED and attempt_number == 1,
            elapsed_ms=elapsed_ms,
            rating=rate_submission(
                verdict=verdict,
                attempt_number=attempt_number,
                elapsed_ms=elapsed_ms,
                difficulty=encounter.difficulty,
            ),
            defeat=self._defeat_for(encounter, verdict),
        )

    def _defeat_for(self, encounter: Encounter, verdict: Verdict) -> Defeat | None:
        if verdict not in _PLAYER_FAULT_VERDICTS:
            return None
        concept = self._concepts.get(encounter.primary_concept) or ConceptInfo(
            id=encounter.primary_concept,
            name=encounter.primary_concept,
            note="",
        )
        return Defeat(concept=concept, explanation=encounter.failure_explanation)


def _language_version(encounter: Encounter) -> str:
    # Day 1 only supports Python; this is the one place that assumption lives
    # so adding a second language later is a small, localized change.
    return get_settings().python_runtime_version
