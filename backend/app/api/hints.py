from fastapi import APIRouter, Depends, HTTPException, Path

from app.api.deps import get_encounter_service
from app.api.encounters import ENCOUNTER_ID_PATTERN
from app.core.logging import get_logger
from app.schemas.encounter import Encounter
from app.schemas.hint import HintCost, HintRequest, HintResponse
from app.services.encounter_service import EncounterNotFoundError, EncounterService

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/encounters", tags=["hints"])


class HintOutOfOrderError(Exception):
    def __init__(self, next_level: int) -> None:
        super().__init__(f"Ask hint level {next_level} first")
        self.next_level = next_level


def hint_for(encounter: Encounter, body: HintRequest) -> HintResponse:
    """Hints are asked in order: level N only after levels 1 to N-1. Asking a
    level already given again is fine and returns the same text. Otherwise a
    player could buy the walkthrough for the price of a nudge."""

    if body.level > body.highest_level_asked + 1:
        raise HintOutOfOrderError(body.highest_level_asked + 1)
    return HintResponse(
        encounter_id=encounter.id,
        level=body.level,
        levels_total=len(encounter.hints),
        text=encounter.hints[str(body.level)],
        cost=HintCost(),
    )


# A POST, not a GET: asking costs the player and is recorded by the caller.
@router.post("/{encounter_id}/hints", response_model=HintResponse)
def request_hint(
    body: HintRequest,
    encounter_id: str = Path(pattern=ENCOUNTER_ID_PATTERN),
    encounter_service: EncounterService = Depends(get_encounter_service),
) -> HintResponse:
    try:
        encounter = encounter_service.get(encounter_id)
    except EncounterNotFoundError:
        raise HTTPException(status_code=404, detail="Encounter not found")

    try:
        hint = hint_for(encounter, body)
    except HintOutOfOrderError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    # Never the hint text: just enough to see which hints get used.
    logger.info("hint served: encounter=%s level=%s", encounter.id, hint.level)
    return hint
