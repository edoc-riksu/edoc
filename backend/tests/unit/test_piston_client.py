import httpx
import pytest

from app.execution.piston_client import PistonClient, PistonUnavailableError
from app.schemas.execution import ExecutionStatus


def _client_with_handler(handler) -> PistonClient:
    transport = httpx.MockTransport(handler)
    http_client = httpx.AsyncClient(transport=transport)
    return PistonClient(base_url="http://fake-piston:2000", http_client=http_client)


async def test_successful_execution_is_normalized():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "language": "python",
                "version": "3.10.0",
                "run": {"stdout": "5\n", "stderr": "", "code": 0, "signal": None},
            },
        )

    client = _client_with_handler(handler)
    result = await client.execute(language="python", version="3.10.0", code="print(5)")

    assert result.status == ExecutionStatus.SUCCESS
    assert result.stdout == "5\n"
    assert result.exit_code == 0
    assert result.timed_out is False


async def test_nonzero_exit_is_runtime_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "language": "python",
                "version": "3.10.0",
                "run": {"stdout": "", "stderr": "Traceback...", "code": 1, "signal": None},
            },
        )

    client = _client_with_handler(handler)
    result = await client.execute(language="python", version="3.10.0", code="1/0")

    assert result.status == ExecutionStatus.RUNTIME_ERROR
    assert result.exit_code == 1


async def test_killed_with_no_exit_code_is_timeout():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "language": "python",
                "version": "3.10.0",
                "run": {"stdout": "", "stderr": "", "code": None, "signal": "SIGKILL"},
            },
        )

    client = _client_with_handler(handler)
    result = await client.execute(language="python", version="3.10.0", code="while True: pass")

    assert result.status == ExecutionStatus.TIMEOUT
    assert result.timed_out is True


async def test_connection_error_raises_piston_unavailable():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused", request=request)

    client = _client_with_handler(handler)

    with pytest.raises(PistonUnavailableError):
        await client.execute(language="python", version="3.10.0", code="print(1)")


async def test_non_200_raises_piston_unavailable():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"message": "internal error"})

    client = _client_with_handler(handler)

    with pytest.raises(PistonUnavailableError):
        await client.execute(language="python", version="3.10.0", code="print(1)")
