"""Mock backend for Frontend 2: same routes and response shapes as the real
API (reusing the real Pydantic models and real encounter data), but no
Piston required. Every submission is canned as a full-score ACCEPTED and
every run is canned as all-sample-tests-passed - this is for building and
wiring up the console UI, not for testing actual scoring logic.

Run it on a different port so it can sit alongside the real backend:

    uvicorn app.mock_main:app --reload --port 8001
"""

import uuid
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Path, Query

from app.api.encounters import ENCOUNTER_ID_PATTERN
from app.core.config import get_settings
from app.schemas.encounter import EncounterList, EncounterPublic, EncounterSummary
from app.schemas.submission import (
    ExecutionMeta,
    RunRequest,
    RunResponse,
    RunTestResult,
    ScoreBreakdown,
    SubmissionRequest,
    SubmissionResult,
    TestResult,
)
from app.services.encounter_service import EncounterNotFoundError, EncounterService

app = FastAPI(
    title="edoc backend (MOCK - no Piston required)",
    description="Canned responses for frontend development. Do not use for scoring correctness.",
    version="0.1.0-mock",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_encounter_service = EncounterService(get_settings().encounters_dir)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "mock"}


@app.get("/api/v1/encounters", response_model=EncounterList)
def list_encounters(
    module: str | None = Query(default=None, pattern=r"^[a-z0-9-]{1,64}$"),
    language: str | None = Query(default=None, pattern=r"^[a-z]{1,32}$"),
) -> EncounterList:
    found = _encounter_service.list_encounters(module=module, language=language)
    return EncounterList(encounters=[EncounterSummary.from_encounter(e) for e in found])


@app.get("/api/v1/encounters/{encounter_id}", response_model=EncounterPublic)
def get_encounter(encounter_id: str = Path(pattern=ENCOUNTER_ID_PATTERN)) -> EncounterPublic:
    try:
        encounter = _encounter_service.get(encounter_id)
    except EncounterNotFoundError:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return EncounterPublic.from_encounter(encounter)


@app.post("/api/v1/executions/run", response_model=RunResponse)
def run_code(body: RunRequest) -> RunResponse:
    try:
        encounter = _encounter_service.get(body.encounter_id)
    except EncounterNotFoundError:
        raise HTTPException(status_code=404, detail="Encounter not found")

    return RunResponse(
        encounter_id=body.encounter_id,
        tests=[
            RunTestResult(test_id=t.id, passed=True, stdout=t.expected_output, stderr="")
            for t in encounter.tests.sample
        ],
        execution=ExecutionMeta(runtime_ms=42),
    )


@app.post("/api/v1/submissions", response_model=SubmissionResult)
def submit_code(body: SubmissionRequest) -> SubmissionResult:
    try:
        encounter = _encounter_service.get(body.encounter_id)
    except EncounterNotFoundError:
        raise HTTPException(status_code=404, detail="Encounter not found")

    all_tests = encounter.tests.sample + encounter.tests.hidden
    total = sum(t.points for t in all_tests)

    return SubmissionResult(
        submission_id=str(uuid.uuid4()),
        encounter_id=body.encounter_id,
        verdict="ACCEPTED",
        score=ScoreBreakdown(earned=total, total=total),
        tests=[TestResult(test_id=t.id, passed=True) for t in all_tests],
        execution=ExecutionMeta(runtime_ms=42),
    )
