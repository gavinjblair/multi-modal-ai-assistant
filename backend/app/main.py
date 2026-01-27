"""FastAPI application exposing the multimodal question-answering endpoint."""

from __future__ import annotations

import logging
import time
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import IS_PROD, ENV, get_settings
from app.models.schemas import AskResponse, ErrorResponse, Message
from app.services.logging_utils import (
    clear_request_context,
    configure_logging,
    get_logger,
    set_request_context,
    set_session_context,
)
from app.services.rate_limiter import InMemoryRateLimiter
from app.services.session_store import get_session_store
from app.services.vlm_service import VLMService

settings = get_settings()
configure_logging(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = get_logger(__name__)
logger.info("ENV=%s IS_PROD=%s", ENV, IS_PROD)

app = FastAPI(
    title="Multi-Modal Vision-Language Assistant",
    version="0.2.0",
    description="Upload an image and ask free-form questions via a vision-language model.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://vision.blairautomate.co.uk",
        "https://perceptive-grace-production-2b86.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_vlm_service = VLMService(settings)
_sessions = get_session_store(settings)
_rate_limiter = InMemoryRateLimiter(
    settings.rate_limit_requests, settings.rate_limit_window_seconds
)


@app.middleware("http")
async def add_request_id(request, call_next):
    """Assign a request id for tracing and logging."""
    request_id = uuid4().hex
    set_request_context(request_id=request_id, route=request.url.path)
    response = None
    try:
        response = await call_next(request)
    finally:
        clear_request_context()
    if response:
        response.headers["X-Request-ID"] = request_id
    return response


@app.get("/health")
async def health() -> dict:
    """Lightweight health and readiness check."""
    return {"status": "ok"}


@app.post(
    "/api/ask",
    response_model=AskResponse,
    responses={
        400: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def ask(
    request: Request,
    image: UploadFile = File(..., description="Image file (JPEG, PNG, WEBP)."),
    question: str = Form(..., description="Natural language question about the image."),
    mode: str = Form("general", description="Optional prompt mode to adjust answer style."),
    session_id: str | None = Form(None, description="Existing session identifier."),
    backend: str | None = Form(None, description="Optional backend override."),
) -> AskResponse:
    """Handle image + question requests and return model answers."""
    client_ip = request.client.host if request.client else "unknown"
    allowed, retry_after = _rate_limiter.allow(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after), "X-Error-Code": "rate_limited"},
        )
    if image.content_type not in settings.allowed_image_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, or WEBP images are supported.",
            headers={"X-Error-Code": "unsupported_media"},
        )
    if image.size and image.size > settings.max_image_mb * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large. Max {settings.max_image_mb}MB allowed.",
            headers={"X-Error-Code": "image_too_large"},
        )
    if not question or not question.strip():
        raise HTTPException(
            status_code=400,
            detail="Type a question to ask about this image.",
            headers={"X-Error-Code": "missing_question"},
        )
    if len(question) > settings.max_question_chars:
        raise HTTPException(
            status_code=400,
            detail=f"Question too long. Max {settings.max_question_chars} characters.",
            headers={"X-Error-Code": "question_too_long"},
        )
    if mode not in settings.allowed_modes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode '{mode}'. Allowed: {', '.join(settings.allowed_modes)}.",
            headers={"X-Error-Code": "invalid_mode"},
        )
    backend_override = None
    if backend is not None:
        normalized = backend.strip().lower()
        if normalized and normalized not in {"auto", "ollama", "stub", "remote"}:
            raise HTTPException(
                status_code=400,
                detail="Invalid backend selection.",
                headers={"X-Error-Code": "invalid_backend"},
            )
        if normalized == "auto":
            backend_override = "ollama"
        elif normalized == "ollama":
            backend_override = "ollama"
        elif normalized == "remote":
            backend_override = "remote"
        elif normalized == "stub":
            backend_override = "stub"

    resolved_backend = "remote" if IS_PROD else backend_override or settings.model_backend
    logger.info("Resolved backend: %s", resolved_backend)

    session = _sessions.start(session_id)
    set_session_context(session)
    logger.info("Request session=%s mode=%s question_len=%s", session, mode, len(question))
    image_bytes = await image.read()
    history = _sessions.history(session)

    start = time.perf_counter()
    try:
        result = await _vlm_service.generate(
            image_bytes=image_bytes,
            question=question,
            mode=mode,
            history=history,
            backend=resolved_backend,
        )
    except HTTPException:
        raise
    except ValueError as exc:
        message = f"Invalid image data: {exc}"
        raise HTTPException(status_code=400, detail=message) from exc
    except Exception as exc:  # pragma: no cover - safety net
        logger.exception("Unexpected error running vision-language model.")
        raise HTTPException(status_code=500, detail="Error running vision-language model.") from exc

    _sessions.append_message(session, Message(role="user", content=f"[{mode}] {question}"))
    _sessions.append_message(session, Message(role="assistant", content=result["answer"]))
    latency_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info("Responded session=%s mode=%s latency_ms=%.2f", session, mode, latency_ms)
    backend_mode = result.get("backend_mode") or _vlm_service.backend_mode
    fallback_reason = result.get("fallback_reason") or _vlm_service.fallback_reason
    response_payload = {**result, "backend_mode": backend_mode, "fallback_reason": fallback_reason}

    return AskResponse(
        mode=mode,
        session_id=session,
        history=_sessions.history(session),
        latency_ms=latency_ms,
        **response_payload,
    )


__all__ = ["app"]
