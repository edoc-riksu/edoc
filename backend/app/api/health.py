from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging import get_logger
from app.execution.piston_client import PistonUnavailableError

logger = get_logger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness: the process is up. Cheap on purpose and independent of Piston,
    so Docker does not restart this service just because Piston is down."""
    return {"status": "ok"}


@router.get("/health/ready")
async def ready(request: Request) -> JSONResponse:
    """Readiness: can this service actually judge code right now? Answers 200
    when Piston is reachable and has the Python runtime we ask for and the
    encounters are loaded, 503 otherwise, with the reason. Use this one for the
    uptime monitor and after a deploy. It catches the case where /health says ok
    but every submission would come back SYSTEM_ERROR."""

    settings = get_settings()
    piston = request.app.state.piston_client

    try:
        runtimes = await piston.runtimes()
        wanted = settings.python_runtime_version
        has_python = any(r.get("language") == "python" and r.get("version") == wanted for r in runtimes)
        piston_state = "ok" if has_python else "python_missing"
    except PistonUnavailableError:
        piston_state = "unreachable"

    encounters = len(request.app.state.encounter_service.list_encounters())

    problems = []
    if piston_state != "ok":
        problems.append(f"piston={piston_state}")
    if encounters == 0:
        problems.append("encounters=0")
    if problems:
        logger.warning("readiness check failed: %s", ", ".join(problems))

    body = {
        "status": "degraded" if problems else "ok",
        "piston": piston_state,
        "python_version": settings.python_runtime_version,
        "encounters": encounters,
        "executions": {"running": piston.in_use, "max": piston.max_concurrent},
    }
    return JSONResponse(body, status_code=503 if problems else 200)
