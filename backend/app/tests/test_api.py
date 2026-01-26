"""API contract tests for the FastAPI backend."""

import base64
from typing import Dict

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app
from app.services.vlm_service import VLMService, _validate_image

client = TestClient(app)
settings = get_settings()

# Minimal 1x1 PNG pixel.
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC"
)


def _post(payload: Dict[str, str], image_bytes: bytes = PNG_BYTES):
    files = {"image": ("test.png", image_bytes, "image/png")}
    return client.post("/api/ask", files=files, data=payload)


@pytest.fixture(autouse=True)
def stub_vlm(monkeypatch, request):
    if request.node.get_closest_marker("use_real_vlm"):
        yield
        return

    async def fake_generate(*args, **kwargs):
        image_bytes = kwargs.get("image_bytes") or (args[0] if args else None)
        if image_bytes:
            _validate_image(image_bytes)
        return {
            "answer": "stub answer",
            "model": "test-model",
            "usage": {"prompt_tokens": 1, "total_tokens": 2},
            "backend_mode": "stub",
        }

    monkeypatch.setattr("app.main._vlm_service.generate", fake_generate)
    yield


def test_health_endpoint_reports_ok() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"


@pytest.mark.parametrize("mode", settings.allowed_modes)
def test_ask_returns_answer_for_each_mode(mode: str) -> None:
    response = _post({"question": "What is shown here?", "mode": mode})
    assert response.status_code == 200
    body = response.json()
    assert body["answer"]
    assert body["mode"] == mode
    assert body["session_id"]
    assert isinstance(body["latency_ms"], (int, float))
    assert body["usage"] is not None


def test_missing_image_returns_422() -> None:
    response = client.post("/api/ask", data={"question": "Hello"})
    assert response.status_code == 422


def test_empty_question_rejected() -> None:
    response = _post({"question": " "})
    assert response.status_code == 400
    assert "Type a question" in response.json()["detail"]


def test_question_too_long_rejected() -> None:
    long_question = "a" * (settings.max_question_chars + 1)
    response = _post({"question": long_question})
    assert response.status_code == 400
    assert "Question too long" in response.json()["detail"]


def test_invalid_mode_rejected() -> None:
    response = _post({"question": "hi", "mode": "unknown"})
    assert response.status_code == 400
    assert "Invalid mode" in response.json()["detail"]


def test_invalid_backend_rejected() -> None:
    response = _post({"question": "hi", "backend": "bad"})
    assert response.status_code == 400
    assert "Invalid backend" in response.json()["detail"]


def test_invalid_filetype_rejected() -> None:
    files = {"image": ("test.txt", PNG_BYTES, "text/plain")}
    response = client.post("/api/ask", files=files, data={"question": "Is this valid?"})
    assert response.status_code == 400
    assert "Only JPEG" in response.json()["detail"]


def test_invalid_image_rejected() -> None:
    # Proper mimetype but invalid bytes
    files = {"image": ("test.png", b"not-really-an-image", "image/png")}
    response = client.post("/api/ask", files=files, data={"question": "Does this fail?"})
    assert response.status_code == 400
    assert "not a valid image" in response.json()["detail"].lower()


def test_session_history_grows_with_same_session_id() -> None:
    first = _post({"question": "First question?"})
    session_id = first.json()["session_id"]

    second = _post({"question": "Follow up?", "session_id": session_id})
    body = second.json()
    assert body["session_id"] == session_id
    assert body["history"] is not None
    assert len(body["history"]) == 4  # user+assistant per turn


def test_sessions_remain_isolated() -> None:
    first = _post({"question": "Q1"})
    second = _post({"question": "Q2"})
    assert first.json()["session_id"] != second.json()["session_id"]


def test_model_error_returns_502(monkeypatch) -> None:
    async def explode(*args, **kwargs):
        raise HTTPException(status_code=502, detail="Model backend error: boom")

    monkeypatch.setattr("app.main._vlm_service.generate", explode)
    response = _post({"question": "Will this break?"})
    assert response.status_code == 502
    assert "Model backend error" in response.json()["detail"]


@pytest.mark.use_real_vlm
def test_unsupported_backend_fails_fast(monkeypatch) -> None:
    misconfigured = VLMService(Settings(model_backend="openai"))
    monkeypatch.setattr("app.main._vlm_service", misconfigured)
    response = _post({"question": "Does this fail fast?"})
    assert response.status_code == 400
    assert "Unsupported VLM_BACKEND" in response.json()["detail"]
