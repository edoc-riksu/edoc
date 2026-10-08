from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "edoc-backend"
    log_level: str = "INFO"

    piston_base_url: str = "http://localhost:2000"
    piston_request_timeout_seconds: float = 15.0

    python_runtime_version: str = "3.10.0"
    default_timeout_ms: int = 2000

    encounters_dir: Path = Path(__file__).resolve().parents[2] / "encounters"


@lru_cache
def get_settings() -> Settings:
    return Settings()
