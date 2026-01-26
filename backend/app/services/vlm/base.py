"""Provider interface for vision-language models."""

from __future__ import annotations

from typing import Protocol, TypedDict


class VLMResponse(TypedDict):
    answer: str
    provider: str
    model: str
    usage: dict | None


class VLMProvider(Protocol):
    """Protocol for VLM providers."""

    async def answer(
        self,
        image_bytes: bytes,
        question: str,
        mode: str,
        history: list[dict] | None,
    ) -> VLMResponse:
        """Return an answer with provider metadata."""
