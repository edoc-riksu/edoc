from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_encounter_service, get_judge_service
from app.core.logging import get_logger
from app.schemas.submission import SubmissionRequest, SubmissionResult
from app.services.encounter_service import EncounterNotFoundError, EncounterService
from app.services.judge_service import JudgeService

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/submissions", tags=["submissions"])


@router.post("", response_model=SubmissionResult)
async def submit_code(
    body: SubmissionRequest,
    encounter_service: EncounterService = Depends(get_encounter_service),
    judge_service: JudgeService = Depends(get_judge_service),
) -> SubmissionResult:
    logger.info("submission requested: encounter=%s", body.encounter_id)

    try:
        encounter = encounter_service.get(body.encounter_id)
    except EncounterNotFoundError:
        raise HTTPException(status_code=404, detail="Encounter not found")

    # NOTE: no persistence yet - Backend 2 owns submission/attempt storage.
    # This returns the authoritative verdict; wiring it into a database row
    # is deferred (see README "Deferred to Day 2+").
    return await judge_service.judge_submission(encounter=encounter, code=body.code)
