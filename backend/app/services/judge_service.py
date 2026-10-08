import uuid

from app.core.config import get_settings
from app.core.logging import get_logger
from app.execution.piston_client import PistonUnavailableError
from app.judge.harness import TestHarness
from app.judge.verdicts import Verdict
from app.schemas.encounter import Encounter
from app.schemas.submission import (
    ExecutionMeta,
    ScoreBreakdown,
    SubmissionResult,
    TestResult,
)
from app.services.scoring_service import score_outcomes

logger = get_logger(__name__)


class JudgeService:
    """Orchestrates a scored SUBMIT: runs sample + hidden tests through the
    harness, scores them, and produces the submission record. This is the
    only path that is authoritative for game progression / damage."""

    def __init__(self, harness: TestHarness) -> None:
        self._harness = harness

    async def judge_submission(self, *, encounter: Encounter, code: str) -> SubmissionResult:
        submission_id = str(uuid.uuid4())
        all_tests = encounter.tests.sample + encounter.tests.hidden

        try:
            run = await self._harness.run_tests(
                code=code,
                tests=all_tests,
                language=encounter.language,
                version=_language_version(encounter),
                timeout_ms=encounter.limits.timeout_ms,
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
                score=ScoreBreakdown(earned=0, total=sum(t.points for t in all_tests)),
                tests=[],
                execution=ExecutionMeta(runtime_ms=0),
            )

        score, verdict = score_outcomes(run.outcomes)

        logger.info(
            "submission %s judged: encounter=%s verdict=%s score=%s/%s runtime_ms=%s",
            submission_id,
            encounter.id,
            verdict.value,
            score.earned,
            score.total,
            run.max_runtime_ms,
        )

        return SubmissionResult(
            submission_id=submission_id,
            encounter_id=encounter.id,
            verdict=verdict,
            score=score,
            tests=[TestResult(test_id=o.test_id, passed=o.passed) for o in run.outcomes],
            execution=ExecutionMeta(runtime_ms=run.max_runtime_ms),
        )


def _language_version(encounter: Encounter) -> str:
    # Day 1 only supports Python; this is the one place that assumption lives
    # so adding a second language later is a small, localized change.
    return get_settings().python_runtime_version
