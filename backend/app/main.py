from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import encounters, executions, health, submissions
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.execution.piston_client import PistonClient
from app.judge.harness import TestHarness
from app.services.encounter_service import EncounterService
from app.services.execution_service import ExecutionService
from app.services.judge_service import JudgeService

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)

    piston_client = PistonClient(
        base_url=settings.piston_base_url,
        request_timeout_seconds=settings.piston_request_timeout_seconds,
    )
    harness = TestHarness(piston_client)

    app.state.encounter_service = EncounterService(settings.encounters_dir)
    app.state.execution_service = ExecutionService(piston_client)
    app.state.judge_service = JudgeService(harness)

    logger.info(
        "edoc backend starting up: piston_base_url=%s encounters_dir=%s",
        settings.piston_base_url,
        settings.encounters_dir,
    )

    yield

    await piston_client.aclose()


app = FastAPI(
    title="edoc backend",
    description="Execution, judging and scoring for edoc coding encounters.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(encounters.router)
app.include_router(executions.router)
app.include_router(submissions.router)
