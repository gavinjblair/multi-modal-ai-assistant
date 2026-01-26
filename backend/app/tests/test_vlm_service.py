"""Tests for the vision-language model service."""

import base64
import pytest
from fastapi import HTTPException

from app.config import Settings
from app.services.vlm_service import VLMService

PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC"
)


@pytest.mark.asyncio
async def test_generate_stub_mode(monkeypatch) -> None:
    settings = Settings(model_backend="stub", vlm_model_name="stub-model")
    service = VLMService(settings)
    result = await service.generate(
        image_bytes=PNG_BYTES, question="What is here?", mode="general", history=[]
    )
    assert "stub" in result["answer"].lower()
    assert result["model"] == "stub-model"
    assert result["provider"] == "stub"
    assert result["usage"] is not None


@pytest.mark.asyncio
async def test_generate_invalid_image_raises() -> None:
    settings = Settings(model_backend="stub")
    service = VLMService(settings)
    with pytest.raises(ValueError):
        await service.generate(image_bytes=b"bad-bytes", question="?", mode="general")


@pytest.mark.asyncio
async def test_ollama_misconfig_falls_back_to_stub() -> None:
    settings = Settings(model_backend="ollama", ollama_base_url="", ollama_model="llava:13b")
    service = VLMService(settings)
    result = await service.generate(
        image_bytes=PNG_BYTES, question="Fallback?", mode="general", history=[]
    )
    assert result["backend_mode"] == "stub"
    assert result.get("fallback_reason") == "backend_config_invalid"
    assert "stub" in result["answer"].lower()


@pytest.mark.asyncio
async def test_ollama_success(monkeypatch) -> None:
    settings = Settings(
        model_backend="ollama",
        ollama_base_url="http://localhost:11434",
        ollama_model="llava:13b",
    )
    service = VLMService(settings)
    calls = []

    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "message": {"content": "A mocked local answer"},
                "prompt_eval_count": 10,
                "eval_count": 5,
            }

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, url, json=None):
            calls.append({"url": url, "json": json})
            return FakeResponse()

    monkeypatch.setattr("httpx.AsyncClient", lambda timeout: FakeClient())

    result = await service.generate(
        image_bytes=PNG_BYTES, question="What is here?", mode="general", history=[]
    )
    assert result["backend_mode"] == "ollama"
    assert result["fallback_reason"] is None
    assert result["provider"] == "ollama"
    assert result["answer"] == "A mocked local answer"
    assert result["model"] == "llava:13b"
    assert calls
    sent = calls[0]
    assert sent["url"].endswith("/api/chat")
    assert sent["json"]["model"] == "llava:13b"
    assert sent["json"]["messages"][-1]["content"] == "What is here?"


@pytest.mark.asyncio
async def test_ollama_http_error(monkeypatch) -> None:
    settings = Settings(
        model_backend="ollama",
        ollama_base_url="http://localhost:11434",
        ollama_model="llava:13b",
    )
    service = VLMService(settings)

    class FakeResponse:
        status_code = 500

        def json(self):
            return {}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr("httpx.AsyncClient", lambda timeout: FakeClient())

    with pytest.raises(HTTPException) as excinfo:
        await service.generate(image_bytes=PNG_BYTES, question="?", mode="general", history=None)
    assert excinfo.value.status_code == 502


@pytest.mark.asyncio
async def test_unsupported_backend_raises() -> None:
    settings = Settings(model_backend="openai")
    service = VLMService(settings)
    with pytest.raises(HTTPException) as excinfo:
        await service.generate(image_bytes=PNG_BYTES, question="?", mode="general", history=None)
    assert excinfo.value.status_code == 400
