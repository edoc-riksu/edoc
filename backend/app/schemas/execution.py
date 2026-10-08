from enum import Enum

from pydantic import BaseModel


class ExecutionStatus(str, Enum):
    """Our own normalized execution outcome. Never expose Piston's raw shape."""

    SUCCESS = "SUCCESS"
    RUNTIME_ERROR = "RUNTIME_ERROR"
    TIMEOUT = "TIMEOUT"
    SYSTEM_ERROR = "SYSTEM_ERROR"


class ExecutionResult(BaseModel):
    """Internal representation of a single code execution, normalized from Piston."""

    stdout: str
    stderr: str
    exit_code: int | None
    signal: str | None
    runtime_ms: int
    timed_out: bool
    status: ExecutionStatus
