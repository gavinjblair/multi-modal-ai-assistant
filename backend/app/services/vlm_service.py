"""Vision-language model client that calls a selected VLM provider."""

from __future__ import annotations

from io import BytesIO
import re
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


def _clean_text(text: str) -> str:
    return " ".join(text.split())


def _first_sentences(text: str, max_sentences: int = 2) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    sentences = [part.strip() for part in parts if part.strip()]
    return sentences[:max_sentences]


def _extract_bullets(text: str, max_points: int = 3) -> list[str]:
    bullets: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith(("-", "*")):
            bullet = stripped.lstrip("-* ").strip()
            if bullet:
                bullets.append(bullet)
    if bullets:
        return bullets[:max_points]
    sentences = _first_sentences(text, max_points)
    return sentences if sentences else ["Summary not provided."]


def _derive_title(text: str) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if lines and len(lines[0]) <= 80:
        return lines[0]
    sentences = _first_sentences(text, 1)
    if sentences:
        return sentences[0][:80]
    return "Untitled slide"


def _ensure_slide_summary(answer: str) -> str:
    required = ["Title:", "Key bullets:", "Numbers & trends:", "Action items:", "Unknowns:"]
    lowered = answer.lower()
    if all(section.lower() in lowered for section in required):
        normalized = _normalize_section_bullets(
            answer, ["Key bullets:", "Numbers & trends:", "Action items:", "Unknowns:"]
        )
        return _collapse_title_section(normalized, required)
    title = _derive_title(answer)
    bullets = _extract_bullets(answer, 3)
    bullet_lines = "\n".join(f"- {item}" for item in bullets)
    return (
        "Title:\n"
        f"{title}\n"
        "Key bullets:\n"
        f"{bullet_lines}\n"
        "Numbers & trends:\n"
        "- Not specified.\n"
        "Action items:\n"
        "- Review slide details.\n"
        "Unknowns:\n"
        "- Full slide context."
    )


def _ensure_safety(answer: str) -> str:
    required = ["Hazards:", "Recommended PPE/actions:", "Unknowns:"]
    lowered = answer.lower()
    if all(section.lower() in lowered for section in required):
        return _normalize_section_bullets(answer, ["Hazards:", "Recommended PPE/actions:", "Unknowns:"])
    cleaned = _clean_text(answer)
    hazard_text = cleaned[:140] if cleaned else "Potential hazards visible in the scene."
    return (
        "Hazards:\n"
        f"- {hazard_text} (Severity: Medium)\n"
        "Recommended PPE/actions:\n"
        "- Follow site PPE and keep a safe distance.\n"
        "Unknowns:\n"
        "- Hazards outside the frame or not visible."
    )


def _format_answer(mode: str, answer: str) -> str:
    if mode == "slide_summary":
        return _ensure_slide_summary(answer)
    if mode == "safety":
        return _ensure_safety(answer)
    return answer


def _normalize_section_bullets(text: str, sections: list[str]) -> str:
    lines = text.splitlines()
    current_section = None
    output_lines: list[str] = []
    section_set = {section.lower(): section for section in sections}

    def is_section(line: str) -> str | None:
        trimmed = line.strip()
        for section in sections:
            if trimmed.lower().startswith(section.lower()):
                return section
        return None

    for line in lines:
        section = is_section(line)
        if section:
            current_section = section
            output_lines.append(section)
            continue

        if current_section:
            stripped = line.strip()
            if not stripped:
                continue
            if stripped.startswith(("-", "*")):
                output_lines.append(f"- {stripped.lstrip('-* ').strip()}")
            else:
                output_lines.append(f"- {stripped}")
        else:
            output_lines.append(line)

    # Ensure each section has at least one bullet line
    normalized: list[str] = []
    i = 0
    while i < len(output_lines):
        line = output_lines[i]
        normalized.append(line)
        if line in sections:
            next_line = output_lines[i + 1] if i + 1 < len(output_lines) else ""
            if not next_line.strip().startswith("-"):
                normalized.append("- Not specified.")
        i += 1

    return "\n".join(normalized)


def _collapse_title_section(text: str, sections: list[str]) -> str:
    lines = text.splitlines()
    section_set = {section.lower() for section in sections}
    output_lines: list[str] = []
    in_title = False
    title_written = False
    buffered_title_extras: list[str] = []

    for line in lines:
        trimmed = line.strip()
        if trimmed.lower() in section_set:
            in_title = trimmed.lower() == "title:"
            title_written = False if in_title else title_written
            if not in_title and buffered_title_extras:
                output_lines.append("Key bullets:")
                output_lines.extend(f"- {item}" for item in buffered_title_extras)
                buffered_title_extras = []
            output_lines.append(trimmed)
            continue

        if in_title:
            if not trimmed:
                continue
            if not title_written:
                output_lines.append(trimmed)
                title_written = True
            # Skip any extra lines in Title section
            else:
                buffered_title_extras.append(trimmed)
            continue

        output_lines.append(line)

    if buffered_title_extras:
        output_lines.append("Key bullets:")
        output_lines.extend(f"- {item}" for item in buffered_title_extras)

    return "\n".join(output_lines)


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
        if isinstance(result, dict) and "answer" in result:
            result["answer"] = _format_answer(mode, result["answer"])
        result["backend_mode"] = backend_mode
        result["fallback_reason"] = fallback_reason
        return result
