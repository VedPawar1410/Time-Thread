"""Application configuration using Pydantic Settings."""

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_cors_origins(v: str | list[str]) -> list[str]:
    """Parse CORS origins from env variable or list."""
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        return [origin.strip() for origin in v.split(",") if origin.strip()]
    return ["http://localhost:3000"]


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "Time-Thread API"
    app_version: str = "0.1.0"
    debug: bool = False

    # CORS - Supports comma-separated string from env
    cors_origins: list[str] = ["http://localhost:3000"]

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # OpenAI (for future AI processing)
    openai_api_key: str = ""

    # Google Gemini
    google_api_key: str = ""

    def __init__(self, **data):
        super().__init__(**data)
        # Parse CORS origins from environment if set as comma-separated string
        cors_env = os.environ.get("CORS_ORIGINS", "")
        if cors_env:
            self.cors_origins = parse_cors_origins(cors_env)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
