"""Structured logging helpers with request and session context."""

import logging
from contextvars import ContextVar
from typing import Optional

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
route_ctx: ContextVar[str] = ContextVar("route", default="-")
session_ctx: ContextVar[str] = ContextVar("session_id", default="-")


class ContextFilter(logging.Filter):
    """Inject contextvars into log records."""

    def filter(self, record: logging.LogRecord) -> bool:  # type: ignore[override]
        record.request_id = request_id_ctx.get("-")
        record.route = route_ctx.get("-")
        record.session_id = session_ctx.get("-")
        return True


def configure_logging(level: int = logging.INFO, fmt: Optional[str] = None) -> None:
    """Configure root logging if it has not already been set up."""
    if logging.getLogger().handlers:
        return
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        fmt
        or "%(asctime)s [%(levelname)s] %(name)s route=%(route)s request_id=%(request_id)s session=%(session_id)s: %(message)s"
    )
    handler.setFormatter(formatter)
    handler.addFilter(ContextFilter())
    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """Get a logger, ensuring base configuration exists."""
    configure_logging()
    logger = logging.getLogger(name)
    logger.addFilter(ContextFilter())
    return logger


def set_request_context(request_id: str, route: str) -> None:
    """Populate context variables for request-scoped logging."""
    request_id_ctx.set(request_id)
    route_ctx.set(route)


def clear_request_context() -> None:
    """Clear request-scoped context variables."""
    request_id_ctx.set("-")
    route_ctx.set("-")
    session_ctx.set("-")


def set_session_context(session_id: str) -> None:
    """Attach session id to the current logging context."""
    session_ctx.set(session_id)
