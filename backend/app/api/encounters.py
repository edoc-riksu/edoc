from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_encounter_service
from app.schemas.encounter import EncounterPublic
from app.services.encounter_service import EncounterNotFoundError, EncounterService

router = APIRouter(prefix="/api/v1/encounters", tags=["encounters"])


@router.get("/{encounter_id}", response_model=EncounterPublic)
def get_encounter(
    encounter_id: str,
    encounter_service: EncounterService = Depends(get_encounter_service),
) -> EncounterPublic:
    try:
        encounter = encounter_service.get(encounter_id)
    except EncounterNotFoundError:
        raise HTTPException(status_code=404, detail="Encounter not found")

    return EncounterPublic.from_encounter(encounter)
