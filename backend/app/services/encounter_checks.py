"""Authoring-side checks that go beyond the Encounter schema.

The schema only proves a file has the right shape. A stub made by
scripts/new_encounter.py has the right shape too, so these checks catch the
placeholder text it leaves behind.
"""

from app.schemas.encounter import Encounter

SCAFFOLD_STARTER_MARKER = "starter code shown to the player"


def find_placeholders(encounter: Encounter) -> list[str]:
    """Return a short description of every unfinished placeholder, or []."""
    found: list[str] = []

    if "TODO" in encounter.problem:
        found.append("problem still contains TODO")
    if SCAFFOLD_STARTER_MARKER in encounter.starter_code:
        found.append("starter_code is still the scaffold text")
    if "TODO" in encounter.failure_explanation:
        found.append("failure_explanation still contains TODO")

    for level, text in encounter.hints.items():
        if "TODO" in text:
            found.append(f"hint {level} still contains TODO")

    for group, tests in (("sample", encounter.tests.sample), ("hidden", encounter.tests.hidden)):
        for test in tests:
            if test.input.strip() == "TODO" or test.expected_output.strip() == "TODO":
                found.append(f"{group} test {test.id} still has TODO input or output")

    return found
