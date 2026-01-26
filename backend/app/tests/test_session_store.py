"""Tests for the in-memory session store."""

from app.models.schemas import Message
from app.services.session_store import InMemorySessionStore


def test_session_creation_and_history_round_trip() -> None:
    store = InMemorySessionStore()
    session_id = store.start()
    assert session_id
    assert store.history(session_id) == []

    store.append_message(session_id, Message(role="user", content="Hello"))
    history = store.history(session_id)
    assert len(history) == 1
    assert history[0].content == "Hello"


def test_unknown_session_returns_empty_history() -> None:
    store = InMemorySessionStore()
    assert store.history("missing") == []


def test_reset_clears_history() -> None:
    store = InMemorySessionStore()
    session_id = store.start()
    store.append_message(session_id, Message(role="user", content="Hi"))
    store.reset(session_id)
    assert store.history(session_id) == []


def test_session_expires_after_ttl() -> None:
    now = [1000.0]

    def clock() -> float:
        return now[0]

    store = InMemorySessionStore(ttl_seconds=10, clock=clock)
    session_id = store.start()
    store.append_message(session_id, Message(role="user", content="Ping"))
    now[0] += 11
    assert store.history(session_id) == []
