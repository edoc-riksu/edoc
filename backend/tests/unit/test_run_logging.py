"""Day 16: every attempt is logged. A practice Run leaves the same kind of
cost line as a Submit, without the player's code or output."""

import logging

from app.schemas.execution import ExecutionResult, ExecutionStatus
from app.services.encounter_service import EncounterService
from app.services.execution_service import ExecutionService


class FakePiston:
    """Echoes the expected output for the first sample test only."""

    def __init__(self):
        self.calls = 0

    async def execute(self, *, stdin, **_):
        self.calls += 1
        stdout = "5\n" if stdin == "2 3" else "wrong\n"
        return ExecutionResult(
            stdout=stdout,
            stderr="",
            exit_code=0,
            signal=None,
            runtime_ms=25,
            timed_out=False,
            status=ExecutionStatus.SUCCESS,
        )


async def test_run_is_logged_with_its_cost_but_not_the_code(encounters_dir, caplog):
    encounter = EncounterService(encounters_dir).get("py-001")
    secret = "my_secret_run_code"
    with caplog.at_level(logging.INFO, logger="app.services.execution_service"):
        response = await ExecutionService(FakePiston()).run_against_samples(
            encounter=encounter, code=secret
        )

    assert [t.passed for t in response.tests] == [True, False]
    line = next(r.getMessage() for r in caplog.records if "run finished" in r.getMessage())
    assert "encounter=py-001" in line
    assert "passed=1/2" in line
    assert "runtime_ms=25" in line
    assert "cost_runtime_ms=50" in line  # 2 sample tests x 25 ms
    assert "wall_ms=" in line
    assert secret not in line
    assert "wrong" not in line
