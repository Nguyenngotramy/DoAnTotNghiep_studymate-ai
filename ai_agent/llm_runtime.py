"""Shared LLM runtime limits and provider readiness state."""

from __future__ import annotations

import os
import threading
import time
from datetime import datetime, timezone


def _float_env(name: str, default: float, minimum: float, maximum: float) -> float:
    try:
        value = float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        value = default
    return min(max(value, minimum), maximum)


LLM_REQUEST_TIMEOUT_SECONDS = _float_env("LLM_REQUEST_TIMEOUT", 20.0, 1.0, 120.0)
LLM_TURN_TIMEOUT_SECONDS = _float_env("LLM_TURN_TIMEOUT", 35.0, 2.0, 300.0)
LLM_MAX_RETRIES = int(_float_env("LLM_MAX_RETRIES", 0, 0, 3))
PROVIDER_FAILURE_COOLDOWN_SECONDS = _float_env(
    "PROVIDER_FAILURE_COOLDOWN_SECONDS",
    60.0,
    1.0,
    3600.0,
)

_lock = threading.Lock()
_last_success_at: float | None = None
_last_failure_at: float | None = None
_last_error_type: str | None = None


class LLMTurnTimeoutError(TimeoutError):
    pass


def record_provider_success() -> None:
    global _last_success_at
    with _lock:
        _last_success_at = time.time()


def record_provider_failure(exc: Exception) -> None:
    global _last_failure_at, _last_error_type
    with _lock:
        _last_failure_at = time.time()
        _last_error_type = type(exc).__name__


def _iso_timestamp(value: float | None) -> str | None:
    if value is None:
        return None
    return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()


def provider_status() -> dict:
    now = time.time()
    with _lock:
        last_success = _last_success_at
        last_failure = _last_failure_at
        last_error_type = _last_error_type

    recent_unrecovered_failure = bool(
        last_failure
        and (not last_success or last_failure > last_success)
        and now - last_failure < PROVIDER_FAILURE_COOLDOWN_SECONDS
    )
    return {
        "ready": not recent_unrecovered_failure,
        "configured": bool(os.getenv("OPENAI_API_KEY", "").strip()),
        "last_success_at": _iso_timestamp(last_success),
        "last_failure_at": _iso_timestamp(last_failure),
        "last_error_type": last_error_type,
        "failure_cooldown_seconds": PROVIDER_FAILURE_COOLDOWN_SECONDS,
        "request_timeout_seconds": LLM_REQUEST_TIMEOUT_SECONDS,
        "turn_timeout_seconds": LLM_TURN_TIMEOUT_SECONDS,
        "max_retries": LLM_MAX_RETRIES,
    }
