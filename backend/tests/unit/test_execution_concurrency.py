"""Day 41: only a limited number of runs may be inside Piston at once, extra
runs wait, and a run that waits too long fails with a retryable error."""

import asyncio

import httpx
import pytest

from app.execution.piston_client import PistonClient, PistonUnavailableError
from app.schemas.execution import ExecutionStatus

OK_BODY = {"run": {"stdout": "1\n", "stderr": "", "code": 0, "signal": None}}


def _client(handler, **kwargs) -> PistonClient:
    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return PistonClient(base_url="http://fake-piston:2000", http_client=http_client, **kwargs)


async def _run(client: PistonClient):
    return await client.execute(language="python", version="3.10.0", code="print(1)")


async def test_never_more_runs_in_piston_than_the_cap():
    in_flight = 0
    peak = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal in_flight, peak
        in_flight += 1
        peak = max(peak, in_flight)
        await asyncio.sleep(0.01)
        in_flight -= 1
        return httpx.Response(200, json=OK_BODY)

    client = _client(handler, max_concurrent=3)
    results = await asyncio.gather(*[_run(client) for _ in range(12)])

    assert peak == 3
    assert all(r.status == ExecutionStatus.SUCCESS for r in results)


async def test_a_run_that_waits_too_long_fails_with_a_retryable_error():
    release = asyncio.Event()

    async def handler(request: httpx.Request) -> httpx.Response:
        await release.wait()
        return httpx.Response(200, json=OK_BODY)

    client = _client(handler, max_concurrent=1, queue_wait_timeout_seconds=0.05)
    first = asyncio.create_task(_run(client))
    await asyncio.sleep(0.01)  # let the first run take the only slot

    with pytest.raises(PistonUnavailableError):
        await _run(client)

    release.set()
    assert (await first).status == ExecutionStatus.SUCCESS


async def test_the_slot_is_given_back_after_a_failed_run():
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(500, text="boom")
        return httpx.Response(200, json=OK_BODY)

    client = _client(handler, max_concurrent=1, queue_wait_timeout_seconds=0.05)
    with pytest.raises(PistonUnavailableError):
        await _run(client)

    assert (await _run(client)).status == ExecutionStatus.SUCCESS


def test_a_cap_below_one_is_rejected():
    with pytest.raises(ValueError):
        PistonClient(base_url="http://fake-piston:2000", max_concurrent=0)
