"""Pydantic schemas shared by the FastAPI routes."""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class Message(BaseModel):
    """Represents a single chat message."""

    role: Literal["user", "assistant"]
    content: str


class Usage(BaseModel):
    """Optional token accounting returned by the model."""

    prompt_tokens: Optional[int] = Field(default=None, ge=0)
    completion_tokens: Optional[int] = Field(default=None, ge=0)
    total_tokens: Optional[int] = Field(default=None, ge=0)


class AskResponse(BaseModel):
    """Response payload for /api/ask."""

    answer: str
    provider: Optional[str] = None
    model: str
    backend_mode: Optional[str] = None
    fallback_reason: Optional[str] = None
    latency_ms: float = Field(..., ge=0)
    mode: str
    session_id: str
    usage: Optional[Usage] = None
    history: Optional[List[Message]] = None


class ErrorResponse(BaseModel):
    """Standard error shape returned by the API."""

    detail: str
    code: Optional[str] = None
