import json
from pathlib import Path

from pydantic import BaseModel


class ConceptInfo(BaseModel):
    id: str
    name: str
    note: str


def load_concepts(encounters_dir: Path) -> dict[str, ConceptInfo]:
    """The agreed concept tags (encounters/concepts.json), keyed by id. An
    encounter may only use tags from this list, so the same idea is never
    spelled two ways and the "you were beaten by <concept>" message always
    has a name and a one-line note to show."""

    raw = json.loads((encounters_dir / "concepts.json").read_text(encoding="utf-8"))
    return {c["id"]: ConceptInfo.model_validate(c) for c in raw["concepts"]}


def load_concept_ids(encounters_dir: Path) -> set[str]:
    return set(load_concepts(encounters_dir))
