import asyncio
import math
import os
import time
from contextlib import asynccontextmanager


def _int_env(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        value = default
    return min(max(value, minimum), maximum)


def _float_env(name: str, default: float, minimum: float) -> float:
    try:
        value = float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        value = default
    return max(value, minimum)


TOTAL_LIMIT = _int_env("LLM_CONCURRENCY_LIMIT", 12, 1, 1000)
HEADROOM_PERCENT = _int_env("LLM_HEADROOM_PERCENT", 25, 0, 90)
QUEUE_TIMEOUT_SECONDS = _float_env("LLM_QUEUE_TIMEOUT", 8.0, 0.1)
PRIORITY_QUEUE_TIMEOUT_SECONDS = _float_env(
    "LLM_PRIORITY_QUEUE_TIMEOUT",
    15.0,
    QUEUE_TIMEOUT_SECONDS,
)

_reserved_slots = min(
    TOTAL_LIMIT - 1,
    math.ceil(TOTAL_LIMIT * HEADROOM_PERCENT / 100),
)
SYSTEM_LIMIT = max(1, TOTAL_LIMIT - _reserved_slots)

_total_semaphore = asyncio.Semaphore(TOTAL_LIMIT)
_system_semaphore = asyncio.Semaphore(SYSTEM_LIMIT)
_active_total = 0
_active_system = 0
_rejected = 0


class LLMCapacityError(RuntimeError):
    pass


def _uses_user_key(context: dict | None) -> bool:
    return bool(
        (context or {}).get("api_key")
        or (context or {}).get("byok_api_key")
    )

def _uses_reserved_capacity(context: dict | None) -> bool:
    return _uses_user_key(context) or bool((context or {}).get("intro_priority"))


async def _acquire_with_deadline(
    semaphore: asyncio.Semaphore,
    deadline: float,
) -> None:
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise asyncio.TimeoutError
    await asyncio.wait_for(semaphore.acquire(), timeout=remaining)


@asynccontextmanager
async def llm_capacity_slot(context: dict | None = None):
    global _active_total, _active_system, _rejected

    is_system_request = not _uses_reserved_capacity(context)
    acquired_system = False
    acquired_total = False
    counted_active = False
    queue_timeout = (
        PRIORITY_QUEUE_TIMEOUT_SECONDS
        if (context or {}).get("intro_priority")
        else QUEUE_TIMEOUT_SECONDS
    )
    deadline = time.monotonic() + queue_timeout

    try:
        if is_system_request:
            await _acquire_with_deadline(_system_semaphore, deadline)
            acquired_system = True

        await _acquire_with_deadline(_total_semaphore, deadline)
        acquired_total = True

        _active_total += 1
        if is_system_request:
            _active_system += 1
        counted_active = True
        yield
    except asyncio.TimeoutError as exc:
        _rejected += 1
        raise LLMCapacityError(
            "AI capacity queue is full. Please retry shortly."
        ) from exc
    finally:
        if counted_active:
            _active_total -= 1
            if is_system_request:
                _active_system -= 1
        if acquired_total:
            _total_semaphore.release()
        if acquired_system:
            _system_semaphore.release()


def capacity_stats() -> dict:
    return {
        "total_limit": TOTAL_LIMIT,
        "system_limit": SYSTEM_LIMIT,
        "reserved_slots": _reserved_slots,
        "headroom_percent": HEADROOM_PERCENT,
        "queue_timeout_seconds": QUEUE_TIMEOUT_SECONDS,
        "priority_queue_timeout_seconds": PRIORITY_QUEUE_TIMEOUT_SECONDS,
        "active_total": _active_total,
        "active_system": _active_system,
        "rejected": _rejected,
    }
