"""Vision-language model client that calls a selected VLM provider."""

from __future__ import annotations

from io import BytesIO
from typing import List, Optional

from PIL import Image, UnidentifiedImageError

from app.config import Settings
from app.models.schemas import Message
from app.utils.image_preprocess import preprocess_image_bytes
from app.services.vlm.service import get_vlm_provider


def _validate_image(image_bytes: bytes) -> None:
    """Ensure the provided bytes represent a valid image."""
    try:
        with Image.open(BytesIO(image_bytes)) as img:
            img.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Uploaded file is not a valid image.") from exc


class VLMService:
    """Facade around a provider-specific VLM implementation."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.provider = None
        self.backend_mode = None
        self.fallback_reason = None

    async def generate(
        self,
        image_bytes: bytes,
        question: str,
        mode: str = "general",
        history: Optional[List[Message]] = None,
        backend: str | None = None,
    ) -> dict:
        """Call the configured VLM provider and return structured response data."""
        _validate_image(image_bytes)
        if not question.strip():
            raise ValueError("Question must not be empty.")
        if len(question) > self.settings.max_question_chars:
            raise ValueError(
                f"Question too long. Max {self.settings.max_question_chars} characters."
            )

        processed_bytes = preprocess_image_bytes(image_bytes)
        selection = get_vlm_provider(self.settings, backend)
        self.provider = selection.provider
        self.backend_mode = selection.name
        self.fallback_reason = selection.fallback_reason
        provider = selection.provider
        backend_mode = selection.name
        fallback_reason = selection.fallback_reason

        history_payload = [message.model_dump() for message in history] if history else None
        result = await provider.answer(
            image_bytes=processed_bytes,
            question=question,
            mode=mode,
            history=history_payload,
        )
        result["backend_mode"] = backend_mode
        result["fallback_reason"] = fallback_reason
        return result
