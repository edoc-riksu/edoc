from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_encounter_service, get_execution_service
from app.core.logging import get_logger
from app.schemas.submission import RunRequest, RunResponse
from app.services.encounter_service import EncounterNotFoundError, EncounterService
from app.services.execution_service import ExecutionError, ExecutionService

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/executions", tags=["executions"])


@router.post("/run", response_model=RunResponse)
async def run_code(
    body: RunRequest,
    encounter_service: EncounterService = Depends(get_encounter_service),
    execution_service: ExecutionService = Depends(get_execution_service),
) -> RunResponse:
    logger.info("run requested: encounter=%s", body.encounter_id)

    try:
        encounter = encounter_service.get(body.encounter_id)
    except EncounterNotFoundError:
        raise HTTPException(status_code=404, detail="Encounter not found")

    try:
        return await execution_service.run_against_samples(encounter=encounter, code=body.code)
    except ExecutionError:
        raise HTTPException(status_code=503, detail="Execution backend is unavailable")
