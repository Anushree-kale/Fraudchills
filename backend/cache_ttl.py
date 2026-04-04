"""Simple in-process TTL cache (optional Redis later via same interface)."""

import os
import time
from typing import Any, Callable, Optional, Tuple

_CACHE: dict[str, Tuple[float, Any]] = {}
DEFAULT_TTL = int(os.getenv("DASHBOARD_CACHE_TTL_SECONDS", "30"))


def get_json(key: str) -> Optional[Any]:
    entry = _CACHE.get(key)
    if not entry:
        return None
    expires_at, value = entry
    if time.monotonic() > expires_at:
        del _CACHE[key]
        return None
    return value


def set_json(key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
    ttl = ttl_seconds if ttl_seconds is not None else DEFAULT_TTL
    _CACHE[key] = (time.monotonic() + ttl, value)


def cache_key_dashboard_summary(user_id: str, role: str) -> str:
    return f"dashboard:summary:{role}:{user_id}"


def invalidate_user_dashboard(user_id: str) -> None:
    """Best-effort: drop summary keys for this user (any role string)."""
    prefix = f"dashboard:summary:"
    for k in list(_CACHE.keys()):
        if k.startswith(prefix) and k.endswith(f":{user_id}"):
            del _CACHE[k]
