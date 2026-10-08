"""Validate every encounter file under encounters/ against the Encounter schema.

Day 1 has no database, so this doesn't seed anything yet - it's the
authoring-side validation step (Backend 1's "tools for writing encounters"
responsibility) and will grow into a real DB seed script once Backend 2's
encounter tables exist.

Usage: python scripts/seed_encounters.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.encounter_service import EncounterService  # noqa: E402

ENCOUNTERS_DIR = Path(__file__).resolve().parents[1] / "encounters"


def main() -> int:
    files = sorted(ENCOUNTERS_DIR.glob("*/*/v*.json"))
    if not files:
        print(f"No encounter files found under {ENCOUNTERS_DIR}")
        return 1

    service = EncounterService(ENCOUNTERS_DIR)
    failures = 0

    for file in files:
        encounter_id = file.parent.name
        try:
            encounter = service.get(encounter_id)
        except Exception as exc:  # noqa: BLE001 - report every bad file, don't stop at first
            print(f"FAIL  {file}: {exc}")
            failures += 1
            continue

        total_points = sum(t.points for t in encounter.tests.hidden)
        print(
            f"OK    {encounter.id} v{encounter.version} "
            f"({len(encounter.tests.sample)} sample, "
            f"{len(encounter.tests.hidden)} hidden, {total_points} pts)"
        )

    print(f"\n{len(files) - failures}/{len(files)} encounters valid")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
