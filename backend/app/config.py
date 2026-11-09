"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


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

    # CORS - comma-separated in the environment. NoDecode stops pydantic-settings
    # from parsing the value as JSON before split_cors_origins sees it.
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Public deployment safeguards (0 means no daily limit)
    daily_process_limit: int = 0
    read_only_maps: bool = False

    # Google Gemini
    google_api_key: str = ""
    # Google retires model names, so keep this overridable without a code change.
    gemini_model: str = "gemini-3.5-flash"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: str | list[str]) -> str | list[str]:
        """Turn a comma-separated CORS_ORIGINS value into a list."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
