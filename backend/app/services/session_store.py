"""Minimal in-memory session store to preserve chat history per image."""

from __future__ import annotations

import json
import threading
import time
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional
from uuid import uuid4

from app.config import Settings
from app.models.schemas import Message


@dataclass
class _SessionRecord:
    messages: List[Message]
    updated_at: float


class InMemorySessionStore:
    """Holds chat histories keyed by session identifier."""

    def __init__(self, ttl_seconds: int = 1800, clock: Callable[[], float] = time.time) -> None:
        self._sessions: Dict[str, _SessionRecord] = {}
        self._lock = threading.Lock()
        self._ttl_seconds = ttl_seconds
        self._clock = clock

    def _is_expired(self, record: _SessionRecord) -> bool:
        if self._ttl_seconds <= 0:
            return False
        return self._clock() - record.updated_at > self._ttl_seconds

    def _purge_if_expired(self, session_id: str) -> None:
        record = self._sessions.get(session_id)
        if record and self._is_expired(record):
            self._sessions.pop(session_id, None)

    def _touch(self, session_id: str) -> _SessionRecord:
        record = self._sessions.setdefault(session_id, _SessionRecord([], self._clock()))
        record.updated_at = self._clock()
        return record

    def start(self, session_id: Optional[str] = None) -> str:
        """Ensure a session exists and return its identifier."""
        sid = session_id or uuid4().hex
        with self._lock:
            self._purge_if_expired(sid)
            self._touch(sid)
        return sid

    def append_message(self, session_id: str, message: Message) -> None:
        """Store a new message for a session."""
        with self._lock:
            self._purge_if_expired(session_id)
            record = self._touch(session_id)
            record.messages.append(message)

    def history(self, session_id: str) -> List[Message]:
        """Return a shallow copy of history for safe downstream use."""
        with self._lock:
            self._purge_if_expired(session_id)
            record = self._sessions.get(session_id)
            if not record:
                return []
            self._touch(session_id)
            return list(record.messages)

    def reset(self, session_id: str) -> None:
        """Clear a session history."""
        with self._lock:
            self._sessions.pop(session_id, None)


class RedisSessionStore:
    """Redis-backed session store with TTL support."""

    def __init__(self, redis_url: str, ttl_seconds: int = 1800) -> None:
        try:
            import redis
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise RuntimeError("Redis support requires the 'redis' package.") from exc
        self._client = redis.Redis.from_url(redis_url, decode_responses=True)
        self._ttl_seconds = ttl_seconds

    def _key(self, session_id: str) -> str:
        return f"session:{session_id}"

    def _set_messages(self, session_id: str, messages: list[dict]) -> None:
        payload = json.dumps(messages)
        if self._ttl_seconds > 0:
            self._client.set(self._key(session_id), payload, ex=self._ttl_seconds)
        else:
            self._client.set(self._key(session_id), payload)

    def _refresh_ttl(self, session_id: str) -> None:
        if self._ttl_seconds > 0:
            self._client.expire(self._key(session_id), self._ttl_seconds)

    def start(self, session_id: Optional[str] = None) -> str:
        sid = session_id or uuid4().hex
        key = self._key(sid)
        if not self._client.exists(key):
            self._set_messages(sid, [])
        else:
            self._refresh_ttl(sid)
        return sid

    def append_message(self, session_id: str, message: Message) -> None:
        key = self._key(session_id)
        raw = self._client.get(key)
        messages: list[dict] = []
        if raw:
            try:
                messages = json.loads(raw)
            except json.JSONDecodeError:
                messages = []
        messages.append(message.model_dump())
        self._set_messages(session_id, messages)

    def history(self, session_id: str) -> List[Message]:
        raw = self._client.get(self._key(session_id))
        if not raw:
            return []
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            return []
        self._refresh_ttl(session_id)
        return [Message(**item) for item in payload]

    def reset(self, session_id: str) -> None:
        self._client.delete(self._key(session_id))


def get_session_store(settings: Settings) -> InMemorySessionStore | RedisSessionStore:
    """Return the configured session store implementation."""
    if settings.session_store == "redis":
        return RedisSessionStore(settings.redis_url, settings.session_ttl_seconds)
    return InMemorySessionStore(settings.session_ttl_seconds)
