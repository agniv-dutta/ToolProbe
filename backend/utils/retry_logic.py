import asyncio
import logging
import random
from functools import wraps
from typing import Any, Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


def is_retryable(exc: Exception) -> bool:
    msg = str(exc).lower()
    retryable_signals = ["rate limit", "429", "529", "timeout", "503", "502", "connection"]
    return any(s in msg for s in retryable_signals)


async def retry_with_backoff(
    func: Callable[..., Any],
    *args,
    max_retries: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    **kwargs,
) -> Any:
    last_exc: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except Exception as exc:
            last_exc = exc
            if attempt == max_retries or not is_retryable(exc):
                raise
            jitter = random.uniform(0, 0.5 * base_delay)
            delay = min(base_delay * (2 ** attempt) + jitter, max_delay)
            logger.warning(
                "Attempt %d/%d failed (%s). Retrying in %.1fs…",
                attempt + 1,
                max_retries + 1,
                exc,
                delay,
            )
            await asyncio.sleep(delay)
    raise last_exc  # type: ignore[misc]


def retry_async(
    max_retries: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
):
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            return await retry_with_backoff(fn, *args, max_retries=max_retries, base_delay=base_delay, max_delay=max_delay, **kwargs)
        return wrapper
    return decorator
