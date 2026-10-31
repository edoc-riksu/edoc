from fastapi import APIRouter, Depends, HTTPException, Path, Query

from app.api.deps import get_encounter_service
from app.schemas.encounter import EncounterList, EncounterPublic, EncounterSummary
from app.services.encounter_service import EncounterNotFoundError, EncounterService

router = APIRouter(prefix="/api/v1/encounters", tags=["encounters"])

# Kept in sync with EncounterId in app/schemas/submission.py - EncounterService
# builds a glob() from this value, so it's a security boundary, not just
# input hygiene.
ENCOUNTER_ID_PATTERN = r"^[a-z]+-\d{3}$"


@router.get("", response_model=EncounterList)
def list_encounters(
    module: str | None = Query(default=None, pattern=r"^[a-z0-9-]{1,64}$"),
    language: str | None = Query(default=None, pattern=r"^[a-z]{1,32}$"),
    encounter_service: EncounterService = Depends(get_encounter_service),
) -> EncounterList:
    """The encounters of a module (or all of them), in play order, each with
    its main concept. Summaries only: no problem text, tests or hints."""

    found = encounter_service.list_encounters(module=module, language=language)
    return EncounterList(encounters=[EncounterSummary.from_encounter(e) for e in found])


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
