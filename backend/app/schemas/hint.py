from pydantic import BaseModel, Field

from app.schemas.encounter import HINT_LEVELS


class HintRequest(BaseModel):
    level: int = Field(ge=1, le=len(HINT_LEVELS))
    # The highest level this player has already been given for this encounter
    # (0 = none yet). The service doesn't know players; the caller (Backend 2,
    # who has the session) passes it in, the same way as attempt_number.
    highest_level_asked: int = Field(default=0, ge=0, le=len(HINT_LEVELS))


# What each hint level costs, in stars (decided with Coordination, plan Day 37).
# Stars come out of the player's total star balance, which never goes below 0;
# once there is nothing left to spend, hints are blocked.
HINT_STAR_COST = {1: 1, 2: 2, 3: 4}


class HintCost(BaseModel):
    # Backend 2 holds the star balance: it checks it, deducts this cost and
    # blocks the hint when the balance is below the cost. This service only
    # reports the cost. 0 when the player already has this level (asking again
    # is free).
    stars: int = Field(default=0, ge=0)


class HintResponse(BaseModel):
    encounter_id: str
    level: int
    levels_total: int
    text: str
    cost: HintCost
