import json
from pathlib import Path

from app.schemas.encounter import Encounter


class EncounterNotFoundError(Exception):
    pass


class EncounterService:
    """Loads encounters from the versioned JSON files on disk.

    Day 1: filesystem-backed, in-memory cache. No database involved yet -
    Backend 2 owns persistence; this is deliberately swappable for a
    database-backed implementation later without changing callers.
    """

    def __init__(self, encounters_dir: Path) -> None:
        self._encounters_dir = encounters_dir
        self._cache: dict[str, Encounter] = {}

    def get(self, encounter_id: str) -> Encounter:
        if encounter_id in self._cache:
            return self._cache[encounter_id]

        encounter = self._load_from_disk(encounter_id)
        self._cache[encounter_id] = encounter
        return encounter

    def _load_from_disk(self, encounter_id: str) -> Encounter:
        matches = list(self._encounters_dir.glob(f"*/{encounter_id}/v*.json"))
        if not matches:
            raise EncounterNotFoundError(encounter_id)

        # Highest version file wins, e.g. v2.json over v1.json.
        latest = sorted(matches, key=lambda p: p.stem)[-1]
        raw = json.loads(latest.read_text(encoding="utf-8"))
        return Encounter.model_validate(raw)
