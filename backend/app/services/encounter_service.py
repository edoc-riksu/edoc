import json
from pathlib import Path

from app.schemas.encounter import DIFFICULTY_RANK, Encounter


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

    def list_encounters(self, *, module: str | None = None, language: str | None = None) -> list[Encounter]:
        """All encounters (latest version of each), optionally narrowed to one
        module and/or language. Sorted the way a player meets them: by module,
        then the encounter's own order, then difficulty, then id."""

        ids = sorted({p.parent.name for p in self._encounters_dir.glob("*/*/v*.json")})
        found = [self.get(encounter_id) for encounter_id in ids]
        if module is not None:
            found = [e for e in found if e.module == module]
        if language is not None:
            found = [e for e in found if e.language == language]
        return sorted(
            found,
            key=lambda e: (e.module, e.order, DIFFICULTY_RANK[e.difficulty], e.id),
        )

    def _load_from_disk(self, encounter_id: str) -> Encounter:
        matches = list(self._encounters_dir.glob(f"*/{encounter_id}/v*.json"))
        if not matches:
            raise EncounterNotFoundError(encounter_id)

        # Highest version file wins, e.g. v2.json over v1.json.
        latest = sorted(matches, key=lambda p: p.stem)[-1]
        raw = json.loads(latest.read_text(encoding="utf-8"))
        return Encounter.model_validate(raw)
