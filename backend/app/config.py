"""Application settings. Read configuration only through get_settings()."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "local"
    database_url: str = "postgresql://app:app_local_only@localhost:5434/app"
    redis_url: str = "redis://localhost:6381/0"
    cors_origins: list[str] = ["http://localhost:5300"]

    # LLM providers. Only app.llm reads these.
    open_router_api_key: str = ""
    openai_api_key: str = ""
    mistral_base_url: str = "http://localhost:18001/v1"
    mistral_api_key: str = ""
    llm_timeout_seconds: float = 60.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
