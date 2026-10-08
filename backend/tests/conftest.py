from pathlib import Path

import pytest

ENCOUNTERS_DIR = Path(__file__).resolve().parents[1] / "encounters"


@pytest.fixture
def encounters_dir() -> Path:
    return ENCOUNTERS_DIR
