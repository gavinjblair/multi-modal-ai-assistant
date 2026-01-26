"""Simple in-memory rate limiter for API endpoints."""

from __future__ import annotations

import time
from collections import deque
from threading import Lock
from typing import Deque, Dict, Tuple


class InMemoryRateLimiter:
    """Fixed-window rate limiter keyed by client identifier."""

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._lock = Lock()
        self._hits: Dict[str, Deque[float]] = {}

    def allow(self, key: str) -> Tuple[bool, int]:
        """Return whether the request is allowed and the retry-after seconds."""
        now = time.monotonic()
        with self._lock:
            bucket = self._hits.setdefault(key, deque())
            while bucket and now - bucket[0] > self._window_seconds:
                bucket.popleft()
            if len(bucket) >= self._max_requests:
                retry_after = int(self._window_seconds - (now - bucket[0]))
                return False, max(retry_after, 1)
            bucket.append(now)
            return True, 0
