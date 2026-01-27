"""Remote vision provider implementation."""

from __future__ import annotations

import base64

import httpx
from fastapi import HTTPException

from app.config import Settings
from app.services.logging_utils import get_logger

logger = get_logger(__name__)


class RemoteProvider:
    """Remote VLM provider that calls an external API."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def answer(
        self,
        image_bytes: bytes,
        question: str,
        mode: str,
        history: list[dict] | None,
    ) -> dict:
        if not self.settings.vlm_api_base_url:
            raise HTTPException(status_code=500, detail="Remote backend misconfigured.")

        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        payload = {
            "image": image_b64,
            "question": question,
            "mode": mode,
            "history": history or [],
            "model": self.settings.vlm_model_name,
        }
        headers = {"Content-Type": "application/json"}
        if self.settings.vlm_api_key:
            headers["Authorization"] = f"Bearer {self.settings.vlm_api_key}"

        try:
            async with httpx.AsyncClient(timeout=self.settings.request_timeout) as client:
                resp = await client.post(self.settings.vlm_api_base_url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            logger.exception("HTTP error contacting remote backend.")
            raise HTTPException(status_code=502, detail="Model backend error.") from exc

        if resp.status_code >= 400:
            logger.error("Remote backend returned non-2xx status=%s", resp.status_code)
            raise HTTPException(status_code=502, detail="Model backend error.")

        try:
            response_payload = resp.json()
        except ValueError as exc:
            logger.exception("Invalid JSON from remote backend.")
            raise HTTPException(status_code=502, detail="Model backend error.") from exc

        answer = response_payload.get("answer") or response_payload.get("message", {}).get("content")
        if not answer:
            logger.exception("Malformed remote response.")
            raise HTTPException(status_code=502, detail="Model backend error.")

        usage = response_payload.get("usage")
        return {
            "answer": answer,
            "provider": response_payload.get("provider") or "remote",
            "model": response_payload.get("model") or self.settings.vlm_model_name,
            "usage": usage,
        }
