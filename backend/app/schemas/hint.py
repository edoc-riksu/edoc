from pydantic import BaseModel, Field

from app.schemas.encounter import HINT_LEVELS


class HintRequest(BaseModel):
    level: int = Field(ge=1, le=len(HINT_LEVELS))
    # The highest level this player has already been given for this encounter
    # (0 = none yet). The service doesn't know players; the caller (Backend 2,
    # who has the session) passes it in, the same way as attempt_number.
    highest_level_asked: int = Field(default=0, ge=0, le=len(HINT_LEVELS))


class HintCost(BaseModel):
    # Placeholder: 0 until the cost rules are decided (plan Day 37). Backend 2
    # checks and deducts the fuel; this service only reports the cost.
    fuel: int = Field(default=0, ge=0)


class HintResponse(BaseModel):
    encounter_id: str
    level: int
    levels_total: int
    text: str
    cost: HintCost
