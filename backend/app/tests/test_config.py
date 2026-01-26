"""Tests for configuration helpers."""

from app.config import Settings


def test_env_overrides(monkeypatch) -> None:
    monkeypatch.setenv("VLM_API_BASE_URL", "http://example.com")
    monkeypatch.setenv("VLM_MODEL_NAME", "custom-model")
    monkeypatch.setenv("VLM_BACKEND", "stub")
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://localhost:11434")
    monkeypatch.setenv("OLLAMA_MODEL", "llava:13b")
    settings = Settings()
    assert settings.vlm_api_base_url == "http://example.com"
    assert settings.vlm_model_name == "custom-model"
    assert settings.model_backend == "stub"
    assert settings.log_level == "DEBUG"
    assert settings.ollama_base_url == "http://localhost:11434"
    assert settings.ollama_model == "llava:13b"
