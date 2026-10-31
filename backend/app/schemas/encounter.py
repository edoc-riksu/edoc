from typing import Literal

from pydantic import BaseModel, Field, field_validator

Difficulty = Literal["easy", "medium", "hard"]
DIFFICULTY_RANK: dict[str, int] = {"easy": 0, "medium": 1, "hard": 2}

# Every encounter has exactly these three hint levels: 1 is a nudge, 2 points
# at the approach, 3 is the walkthrough (see contracts/README.md).
HINT_LEVELS = ("1", "2", "3")


class TestCase(BaseModel):
    id: str
    input: str
    expected_output: str
    points: int = 0


class TestSuite(BaseModel):
    sample: list[TestCase] = Field(default_factory=list)
    hidden: list[TestCase] = Field(default_factory=list)


class ExecutionLimits(BaseModel):
    timeout_ms: int = 2000


class Encounter(BaseModel):
    """Full internal encounter record. Never return this directly from an API."""

    id: str
    version: int
    language: str
    title: str
    difficulty: Difficulty
    module: str
    # Position inside its module, starting at 1. Players meet encounters in
    # this order; Backend 2's seed script copies it into the database.
    order: int = Field(ge=1)
    # The first concept is the encounter's main one: it is the concept named
    # when a player is defeated. Every tag must exist in encounters/concepts.json.
    concepts: list[str] = Field(min_length=1)
    problem: str
    starter_code: str
    tests: TestSuite
    limits: ExecutionLimits = ExecutionLimits()
    hints: dict[str, str] = Field(default_factory=dict)
    failure_explanation: str = ""

    @field_validator("hints")
    @classmethod
    def _exactly_three_hint_levels(cls, hints: dict[str, str]) -> dict[str, str]:
        if tuple(sorted(hints)) != HINT_LEVELS:
            raise ValueError('hints must have exactly the levels "1", "2" and "3"')
        for level, text in hints.items():
            if not text.strip():
                raise ValueError(f"hint level {level} must not be empty")
        return hints

    @property
    def primary_concept(self) -> str:
        return self.concepts[0]


class PublicTestCase(BaseModel):
    """A sample test case, safe to expose. No hidden tests, ever."""

    id: str
    input: str
    expected_output: str


class EncounterPublic(BaseModel):
    """What the player-facing API is allowed to return for an encounter."""

    id: str
    version: int
    language: str
    title: str
    difficulty: str
    module: str
    concepts: list[str]
    problem: str
    starter_code: str
    sample_tests: list[PublicTestCase]
    hint_levels: int
    limits: ExecutionLimits

    @classmethod
    def from_encounter(cls, encounter: Encounter) -> "EncounterPublic":
        return cls(
            id=encounter.id,
            version=encounter.version,
            language=encounter.language,
            title=encounter.title,
            difficulty=encounter.difficulty,
            module=encounter.module,
            concepts=encounter.concepts,
            problem=encounter.problem,
            starter_code=encounter.starter_code,
            sample_tests=[
                PublicTestCase(id=t.id, input=t.input, expected_output=t.expected_output)
                for t in encounter.tests.sample
            ],
            hint_levels=len(encounter.hints),
            limits=encounter.limits,
        )


class EncounterSummary(BaseModel):
    """One row of a module or approach list: enough to draw the list and its
    concept tags, never the problem text or any tests."""

    id: str
    version: int
    language: str
    title: str
    difficulty: str
    module: str
    order: int
    concept: str
    concepts: list[str]

    @classmethod
    def from_encounter(cls, encounter: Encounter) -> "EncounterSummary":
        return cls(
            id=encounter.id,
            version=encounter.version,
            language=encounter.language,
            title=encounter.title,
            difficulty=encounter.difficulty,
            module=encounter.module,
            order=encounter.order,
            concept=encounter.primary_concept,
            concepts=encounter.concepts,
        )


class EncounterList(BaseModel):
    encounters: list[EncounterSummary]
