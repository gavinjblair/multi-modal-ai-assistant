import logging

import httpx
from fastapi import HTTPException

from app.services.vlm.prompts import get_system_prompt

logger = logging.getLogger("app.ollama")


async def run_ollama(payload: dict, settings):
    if not settings.ollama_base_url:
        raise HTTPException(status_code=500, detail="ollama_base_url is not set")

    image_b64 = payload.get("image")
    question = payload.get("question")
    if not image_b64 or not question:
        raise HTTPException(status_code=400, detail="Missing image or question.")

    mode = payload.get("mode") or "general"
    system_prompt = get_system_prompt(mode)
    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    history = payload.get("history")
    if isinstance(history, list):
        messages.extend(history)
    messages.append({"role": "user", "content": question, "images": [image_b64]})

    model = settings.ollama_model or "llava"
    endpoint = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
    payload_body = {"model": model, "messages": messages, "stream": False}

    logger.info("Ollama URL=%s model=%s", endpoint, model)
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(endpoint, json=payload_body)
    except httpx.HTTPError as exc:
        logger.exception("HTTP error contacting Ollama backend.")
        raise HTTPException(status_code=502, detail="Model backend error.") from exc

    if resp.status_code >= 400:
        logger.error("Ollama backend returned status=%s", resp.status_code)
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
        "model": model,
        "usage": usage,
    }
