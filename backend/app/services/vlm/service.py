"""Provider routing for vision-language models."""

from __future__ import annotations

from dataclasses import dataclass

from app.config import Settings
from fastapi import HTTPException

from app.services.logging_utils import get_logger
from app.services.vlm.base import VLMProvider
from app.services.vlm.providers.ollama_provider import OllamaProvider
from app.services.vlm.providers.stub_provider import StubProvider

logger = get_logger(__name__)


@dataclass(frozen=True)
class ProviderSelection:
    provider: VLMProvider
    name: str
    fallback_reason: str | None = None


def get_vlm_provider(settings: Settings, backend_override: str | None = None) -> ProviderSelection:
    backend = (backend_override or settings.model_backend or "ollama").lower()
    if backend == "ollama":
        issue = settings.backend_config_issue("ollama")
        if issue:
            logger.warning("Ollama backend misconfigured (%s); falling back to stub.", issue)
            return ProviderSelection(StubProvider(settings), "stub", "backend_config_invalid")
        return ProviderSelection(OllamaProvider(settings), "ollama")
    if backend == "stub":
        return ProviderSelection(StubProvider(settings), "stub")
    message = (
        "Unsupported VLM_BACKEND. Supported: ollama, stub. OpenAI support has been removed "
        "(local-first Ollama only)."
    )
    logger.error("Unsupported VLM backend requested: %s", backend)
    raise HTTPException(status_code=400, detail=message)
