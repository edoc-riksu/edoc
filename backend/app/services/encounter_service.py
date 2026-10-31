import json
import logging
from pathlib import Path

from app.schemas.encounter import DIFFICULTY_RANK, Encounter

logger = logging.getLogger(__name__)


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

    def list_encounters(
        self,
        *,
        module: str | None = None,
        language: str | None = None,
        strict: bool = False,
    ) -> list[Encounter]:
        """All encounters (latest version of each), optionally narrowed to one
        module and/or language. Sorted the way a player meets them: by module,
        then the encounter's own order, then difficulty, then id.

        One broken encounter file must not take the whole list down. When a
        module or language is given, files are matched on the raw JSON first,
        so an encounter outside that module is never validated. A file that
        can't be read or fails validation is logged and left out of the list.
        Pass strict=True (tests, validation scripts) to raise instead, so a
        bad file still fails loudly where we want it to."""

        ids = sorted({p.parent.name for p in self._encounters_dir.glob("*/*/v*.json")})
        found: list[Encounter] = []
        for encounter_id in ids:
            try:
                if (module is not None or language is not None) and encounter_id not in self._cache:
                    raw = self._read_raw(encounter_id)
                    if module is not None and raw.get("module") != module:
                        continue
                    if language is not None and raw.get("language") != language:
                        continue
                encounter = self.get(encounter_id)
            except (OSError, ValueError, EncounterNotFoundError) as exc:
                # ValueError covers bad JSON and pydantic's ValidationError.
                if strict:
                    raise
                logger.error("Skipping encounter %s in the list: %s", encounter_id, exc)
                continue
            if module is not None and encounter.module != module:
                continue
            if language is not None and encounter.language != language:
                continue
            found.append(encounter)
        return sorted(
            found,
            key=lambda e: (e.module, e.order, DIFFICULTY_RANK[e.difficulty], e.id),
        )

    def _latest_path(self, encounter_id: str) -> Path:
        matches = list(self._encounters_dir.glob(f"*/{encounter_id}/v*.json"))
        if not matches:
            raise EncounterNotFoundError(encounter_id)

        # Highest version file wins, e.g. v2.json over v1.json.
        return sorted(matches, key=lambda p: p.stem)[-1]

    def _read_raw(self, encounter_id: str) -> dict:
        raw = json.loads(self._latest_path(encounter_id).read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            raise ValueError(f"{encounter_id}: encounter file must contain a JSON object")
        return raw

    def _load_from_disk(self, encounter_id: str) -> Encounter:
        return Encounter.model_validate(self._read_raw(encounter_id))
