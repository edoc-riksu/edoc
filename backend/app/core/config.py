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
    run_memory_limit_bytes: int = 256 * 1024 * 1024  # 256 MB

    encounters_dir: Path = Path(__file__).resolve().parents[2] / "encounters"

    # RunResponse includes raw stdout/stderr for player debugging - cap it so
    # a submission can't balloon the response size.
    run_output_char_limit: int = 4_000

    # Browsers on these origins may call this service. Comma-separated.
    # The defaults are the local dev servers; staging and production set
    # CORS_ALLOWED_ORIGINS to the real site URLs (see DEPLOYMENT.md).
    cors_allowed_origins: str = (
        "http://localhost:4173,http://127.0.0.1:4173,http://localhost:3000"
    )
    # Optional regex for origins that change per deploy, e.g. Vercel preview
    # URLs: https://edoc-.*-edoc-riksu\.vercel\.app
    cors_allowed_origin_regex: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
