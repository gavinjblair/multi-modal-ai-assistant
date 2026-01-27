import os

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings


ENV = os.getenv("ENV", "development").lower()
IS_PROD = ENV == "production"


class Settings(BaseSettings):
    backend: str = Field(
        default="ollama", validation_alias=AliasChoices("VLM_BACKEND", "BACKEND", "backend")
    )
    ollama_base_url: str | None = None
    ollama_model: str | None = None
    vlm_api_base_url: str | None = None

    def resolved_backend(self) -> str:
        if IS_PROD:
            return "ollama"
        return self.backend

    def backend_config_issue(self, backend: str) -> str | None:
        if backend == "ollama" and not self.ollama_base_url:
            return "ollama_base_url is not set"
        if backend == "remote" and not self.vlm_api_base_url:
            return "vlm_api_base_url is not set"
        return None


def get_settings() -> Settings:
    return Settings()
