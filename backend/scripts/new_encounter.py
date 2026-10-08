"""Scaffold a new, schema-valid encounter file so writing one of the ~40
planned encounters means filling in blanks, not retyping the JSON shape.

Usage:
    python scripts/new_encounter.py py-004 "Reverse a String" --module python-basics --concepts strings
"""

import argparse
import json
import sys
from pathlib import Path

ENCOUNTERS_DIR = Path(__file__).resolve().parents[1] / "encounters"


def build_stub(encounter_id: str, title: str, module: str, concepts: list[str]) -> dict:
    return {
        "id": encounter_id,
        "version": 1,
        "language": "python",
        "title": title,
        "difficulty": "easy",
        "module": module,
        "concepts": concepts,
        "problem": "TODO: describe the problem the player needs to solve.",
        "starter_code": "# TODO: starter code shown to the player\n",
        "tests": {
            "sample": [
                {"id": "sample-1", "input": "TODO", "expected_output": "TODO", "points": 0},
                {"id": "sample-2", "input": "TODO", "expected_output": "TODO", "points": 0},
            ],
            "hidden": [
                {"id": "hidden-1", "input": "TODO", "expected_output": "TODO", "points": 20},
                {"id": "hidden-2", "input": "TODO", "expected_output": "TODO", "points": 20},
                {"id": "hidden-3", "input": "TODO", "expected_output": "TODO", "points": 20},
                {"id": "hidden-4", "input": "TODO", "expected_output": "TODO", "points": 20},
                {"id": "hidden-5", "input": "TODO", "expected_output": "TODO", "points": 20},
            ],
        },
        "limits": {"timeout_ms": 2000},
        "hints": {
            "1": "TODO: gentlest nudge, doesn't give away the approach.",
            "2": "TODO: names the technique/concept to use.",
            "3": "TODO: near-complete approach or the one-liner solution.",
        },
        "failure_explanation": "TODO: what a wrong submission probably got wrong.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("encounter_id", help="e.g. py-004")
    parser.add_argument("title", help="e.g. 'Reverse a String'")
    parser.add_argument("--module", default="python-basics")
    parser.add_argument("--concepts", nargs="+", default=[])
    args = parser.parse_args()

    out_dir = ENCOUNTERS_DIR / "python" / args.encounter_id
    out_path = out_dir / "v1.json"

    if out_path.exists():
        print(f"Refusing to overwrite existing file: {out_path}")
        return 1

    out_dir.mkdir(parents=True, exist_ok=True)
    stub = build_stub(args.encounter_id, args.title, args.module, args.concepts)
    out_path.write_text(json.dumps(stub, indent=2) + "\n", encoding="utf-8")

    print(f"Created {out_path}")
    print("Fill in every TODO, then validate with: python scripts/seed_encounters.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
