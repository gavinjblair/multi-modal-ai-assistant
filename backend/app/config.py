"""Application settings loaded from environment variables."""

from functools import lru_cache
from typing import Literal, Tuple

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration."""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    vlm_api_base_url: str = Field(
        default="", validation_alias=AliasChoices("VLM_API_BASE_URL", "vlm_api_base_url")
    )
    vlm_api_key: str | None = Field(
        default=None, validation_alias=AliasChoices("VLM_API_KEY", "vlm_api_key")
    )
    vlm_model_name: str = Field(
        default="vlm-stub", validation_alias=AliasChoices("VLM_MODEL_NAME", "vlm_model_name")
    )
    model_backend: str = Field(
        default="ollama",
        validation_alias=AliasChoices("VLM_BACKEND", "MODEL_BACKEND", "model_backend"),
    )
    ollama_base_url: str = Field(
        default="http://localhost:11434",
        validation_alias=AliasChoices("OLLAMA_BASE_URL", "ollama_base_url"),
    )
    ollama_model: str = Field(
        default="llava:13b",
        validation_alias=AliasChoices("OLLAMA_MODEL", "ollama_model"),
    )

    allowed_image_types: Tuple[str, ...] = ("image/jpeg", "image/png", "image/webp")
    allowed_modes: Tuple[str, ...] = ("general", "safety", "slide_summary")
    max_image_mb: int = 5
    max_new_tokens: int = 128
    temperature: float = 0.2
    max_question_chars: int = Field(
        default=2000, validation_alias=AliasChoices("MAX_QUESTION_CHARS", "max_question_chars")
    )
    session_store: Literal["memory", "redis"] = Field(
        default="memory", validation_alias=AliasChoices("SESSION_STORE", "session_store")
    )
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        validation_alias=AliasChoices("REDIS_URL", "redis_url"),
    )
    session_ttl_seconds: int = Field(
        default=1800,
        validation_alias=AliasChoices("SESSION_TTL_SECONDS", "session_ttl_seconds"),
    )
    cors_origins: Tuple[str, ...] = Field(
        default=("http://localhost:3000", "http://localhost:5173"),
        validation_alias=AliasChoices("CORS_ORIGINS", "cors_origins"),
    )
    rate_limit_requests: int = Field(
        default=60, validation_alias=AliasChoices("RATE_LIMIT_REQUESTS", "rate_limit_requests")
    )
    rate_limit_window_seconds: int = Field(
        default=60,
        validation_alias=AliasChoices("RATE_LIMIT_WINDOW_SECONDS", "rate_limit_window_seconds"),
    )

    log_level: str = Field(default="INFO", validation_alias=AliasChoices("LOG_LEVEL", "log_level"))
    environment: str = Field(
        default="development", validation_alias=AliasChoices("ENVIRONMENT", "environment")
    )
    request_timeout: float = Field(
        default=30.0, validation_alias=AliasChoices("REQUEST_TIMEOUT", "request_timeout")
    )

    def backend_config_issue(self, backend: str) -> str | None:
        """Return a short code if backend configuration is unusable."""
        if backend == "ollama":
            if not self.ollama_base_url or not self.ollama_base_url.strip():
                return "missing_ollama_base_url"
            if not self.ollama_model or not self.ollama_model.strip():
                return "missing_ollama_model"
            return None
        return None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: object) -> Tuple[str, ...]:
        if isinstance(value, str):
            items = [item.strip() for item in value.split(",") if item.strip()]
            return tuple(items)
        return value  # type: ignore[return-value]


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
