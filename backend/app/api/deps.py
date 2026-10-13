from fastapi import Request

from app.services.encounter_service import EncounterService
from app.services.execution_service import ExecutionService
from app.services.judge_service import JudgeService


def get_encounter_service(request: Request) -> EncounterService:
    return request.app.state.encounter_service


def get_execution_service(request: Request) -> ExecutionService:
    return request.app.state.execution_service


def get_judge_service(request: Request) -> JudgeService:
    return request.app.state.judge_service
