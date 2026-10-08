from pydantic import BaseModel, Field


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
    difficulty: str
    module: str
    concepts: list[str] = Field(default_factory=list)
    problem: str
    starter_code: str
    tests: TestSuite
    limits: ExecutionLimits = ExecutionLimits()
    hints: dict[str, str] = Field(default_factory=dict)
    failure_explanation: str = ""


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
            limits=encounter.limits,
        )
