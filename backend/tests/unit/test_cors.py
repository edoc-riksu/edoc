"""CORS: the browser on the live site must be able to call this service, and
a random website must not. Origins come from settings, not code."""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app


def test_origin_list_is_split_and_trimmed():
    settings = Settings(cors_allowed_origins=" https://a.example , https://b.example,, ")
    assert settings.cors_origin_list == ["https://a.example", "https://b.example"]


def test_default_origins_are_local_dev_only():
    settings = Settings()
    assert all("localhost" in o or "127.0.0.1" in o for o in settings.cors_origin_list)
    assert settings.cors_allowed_origin_regex is None


def _preflight(client: TestClient, origin: str):
    return client.options(
        "/api/v1/submissions",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )


def test_allowed_origin_gets_cors_header():
    with TestClient(app) as client:
        response = _preflight(client, "http://localhost:3000")
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_unknown_origin_is_refused():
    with TestClient(app) as client:
        response = _preflight(client, "https://evil.example")
    assert "access-control-allow-origin" not in response.headers
