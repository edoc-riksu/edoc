from fastapi import APIRouter, Depends, HTTPException, Path

from app.api.deps import get_encounter_service
from app.schemas.encounter import EncounterPublic
from app.services.encounter_service import EncounterNotFoundError, EncounterService

router = APIRouter(prefix="/api/v1/encounters", tags=["encounters"])

# Kept in sync with EncounterId in app/schemas/submission.py - EncounterService
# builds a glob() from this value, so it's a security boundary, not just
# input hygiene.
ENCOUNTER_ID_PATTERN = r"^[a-z]+-\d{3}$"


@router.get("/{encounter_id}", response_model=EncounterPublic)
def get_encounter(
    encounter_id: str = Path(pattern=ENCOUNTER_ID_PATTERN),
    encounter_service: EncounterService = Depends(get_encounter_service),
) -> EncounterPublic:
    try:
        encounter = encounter_service.get(encounter_id)
    except EncounterNotFoundError:
        raise HTTPException(status_code=404, detail="Encounter not found")

    return EncounterPublic.from_encounter(encounter)
