"""Stub provider for development and fallback."""

from __future__ import annotations

from app.config import Settings


class StubProvider:
    """Stubbed provider with mode-specific formatting."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def answer(
        self,
        image_bytes: bytes,
        question: str,
        mode: str,
        history: list[dict] | None,
    ) -> dict:
        history_len = len(history or [])
        answer = _format_stub_answer(question=question, mode=mode, history_len=history_len)
        return {
            "answer": answer,
            "provider": "stub",
            "model": self.settings.vlm_model_name,
            "usage": {"prompt_tokens": 32, "completion_tokens": 32, "total_tokens": 64},
        }


def _format_stub_answer(question: str, mode: str, history_len: int) -> str:
    trimmed = question.strip()
    if mode == "slide_summary":
        return (
            "[Stub] Slide summary\n"
            "Title: Stubbed slide title\n"
            "Key bullets:\n"
            f"- Summary of '{trimmed}'\n"
            "- Key point not derived (stub)\n"
            "Numbers & trends:\n"
            "- Unknown (stub)\n"
            "Action items:\n"
            "- Review slide content\n"
            "Unknowns:\n"
            f"- Full slide context (history turns: {history_len})"
        )
    if mode == "safety":
        return (
            "[Stub] Safety review\n"
            "Hazards:\n"
            f"- Potential hazard related to '{trimmed}' (Severity: Medium)\n"
            "Recommended PPE/actions:\n"
            "- Use standard PPE and follow site guidelines\n"
            "Unknowns:\n"
            f"- Hidden risks not visible (history turns: {history_len})"
        )
    return (
        "[Stub] Answer\n"
        f"Response: {trimmed}\n"
        "Uncertainty: Limited image context in stub mode.\n"
        f"Context: History turns: {history_len}."
    )
