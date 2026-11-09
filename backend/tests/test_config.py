"""CORS settings must parse the format render.yaml and docker-compose.yml use."""

from app.config import Settings


def test_cors_origins_splits_comma_separated_value(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://a.example, https://b.example")

    assert Settings(_env_file=None).cors_origins == [
        "https://a.example",
        "https://b.example",
    ]


def test_cors_origins_defaults_to_local_frontend(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    assert Settings(_env_file=None).cors_origins == ["http://localhost:3000"]
