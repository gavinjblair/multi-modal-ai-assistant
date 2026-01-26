"""Ollama vision provider implementation."""

from __future__ import annotations

import base64

import httpx
from fastapi import HTTPException

from app.config import Settings
from app.services.logging_utils import get_logger
from app.services.vlm.prompts import get_system_prompt

logger = get_logger(__name__)


class OllamaProvider:
    """Ollama /api/chat provider."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def answer(
        self,
        image_bytes: bytes,
        question: str,
        mode: str,
        history: list[dict] | None,
    ) -> dict:
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        system_prompt = get_system_prompt(mode)
        messages: list[dict] = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": question, "images": [image_b64]})

        payload = {"model": self.settings.ollama_model, "messages": messages, "stream": False}
        endpoint = f"{self.settings.ollama_base_url.rstrip('/')}/api/chat"

        try:
            async with httpx.AsyncClient(timeout=self.settings.request_timeout) as client:
                resp = await client.post(endpoint, json=payload)
        except httpx.HTTPError as exc:
            logger.exception("HTTP error contacting Ollama backend.")
            raise HTTPException(status_code=502, detail="Model backend error.") from exc

        if resp.status_code >= 400:
            logger.error("Ollama backend returned non-2xx status=%s", resp.status_code)
            raise HTTPException(status_code=502, detail="Model backend error.")

        try:
            response_payload = resp.json()
        except ValueError as exc:
            logger.exception("Invalid JSON from Ollama backend.")
            raise HTTPException(status_code=502, detail="Model backend error.") from exc

        answer = response_payload.get("message", {}).get("content")
        if not answer:
            logger.exception("Malformed Ollama response.")
            raise HTTPException(status_code=502, detail="Model backend error.")

        usage = None
        if "prompt_eval_count" in response_payload or "eval_count" in response_payload:
            prompt_tokens = response_payload.get("prompt_eval_count")
            completion_tokens = response_payload.get("eval_count")
            total_tokens = None
            if prompt_tokens is not None and completion_tokens is not None:
                total_tokens = prompt_tokens + completion_tokens
            usage = {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
            }

        return {
            "answer": answer,
            "provider": "ollama",
            "model": self.settings.ollama_model,
            "usage": usage,
        }
