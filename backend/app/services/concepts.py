import json
from pathlib import Path


def load_concept_ids(encounters_dir: Path) -> set[str]:
    """The agreed concept tags (encounters/concepts.json). An encounter may
    only use tags from this list, so the same idea is never spelled two ways
    and the 'you were beaten by <concept>' message always has a name to show."""

    raw = json.loads((encounters_dir / "concepts.json").read_text(encoding="utf-8"))
    return {c["id"] for c in raw["concepts"]}
