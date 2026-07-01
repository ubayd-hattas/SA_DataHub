"""
automation.core.retry — Retry and exponential-backoff utilities.

Usage
-----
    from automation.core.retry import with_retry, RetryPolicy

    policy = RetryPolicy(max_attempts=5, base_delay=60.0, max_delay=7200.0)

    def fetch():
        return http_client.get(url)

    response = with_retry(fetch, policy=policy, label="fetch unemployment Excel")

Design notes
------------
- Retryable errors: urllib.error.URLError (network), OSError, TimeoutError,
  and any exception type listed in RetryPolicy.extra_retryable_types.
- Non-retryable: AutomationHTTPError with 4xx status (the server understood
  the request and said no — retrying won't help).
- Jitter: each delay is perturbed by ±25 % to avoid thundering-herd when
  multiple pipelines start simultaneously.
- On-release-day tolerance: the Stats SA site is known to be slow/5xx-prone
  on release day; the default max_delay of 2 h is calibrated for that.
"""

from __future__ import annotations

import random
import time
import urllib.error
from dataclasses import dataclass, field
from typing import Any, Callable, Type, TypeVar

from automation.core.logging import get_logger

log = get_logger(__name__)

T = TypeVar("T")


# ---------------------------------------------------------------------------
# Policy dataclass
# ---------------------------------------------------------------------------


@dataclass
class RetryPolicy:
    """
    Controls retry behaviour for a single callable.

    Parameters
    ----------
    max_attempts:
        Maximum number of total attempts (first call + retries).
    base_delay:
        Initial wait in seconds before the first retry.
    max_delay:
        Upper bound on the wait between attempts (after backoff).
    backoff_factor:
        Multiplier applied to the delay after each failure.
    jitter:
        Fraction of the computed delay added or subtracted randomly (0–1).
    extra_retryable_types:
        Additional exception classes to treat as transient.
    """

    max_attempts: int = 5
    base_delay: float = 60.0     # 1 minute initial wait
    max_delay: float = 7200.0    # 2 hours cap (Stats SA release-day load)
    backoff_factor: float = 5.0  # 1m → 5m → 25m → 2h (capped)
    jitter: float = 0.25         # ±25 % randomisation
    extra_retryable_types: list[Type[Exception]] = field(default_factory=list)


# Lightweight policy for API sources (SARB) that are expected to be reliable
API_POLICY = RetryPolicy(
    max_attempts=4,
    base_delay=30.0,
    max_delay=600.0,
    backoff_factor=3.0,
    jitter=0.15,
)

# Policy for page-watch / ETag checks (low-stakes, can fail silently)
WATCH_POLICY = RetryPolicy(
    max_attempts=3,
    base_delay=15.0,
    max_delay=120.0,
    backoff_factor=2.0,
    jitter=0.20,
)

# Default for Stats SA Excel downloads (high-load release day)
STATSSA_POLICY = RetryPolicy(
    max_attempts=5,
    base_delay=60.0,
    max_delay=7200.0,
    backoff_factor=5.0,
    jitter=0.25,
)


# ---------------------------------------------------------------------------
# Retry logic
# ---------------------------------------------------------------------------


def _is_retryable(exc: BaseException, policy: RetryPolicy) -> bool:
    """Return True if this exception class is considered transient."""
    if isinstance(exc, (urllib.error.URLError, OSError, TimeoutError)):
        return True
    for t in policy.extra_retryable_types:
        if isinstance(exc, t):
            return True
    return False


def _compute_delay(attempt: int, policy: RetryPolicy) -> float:
    """Exponential backoff with jitter."""
    raw = min(
        policy.base_delay * (policy.backoff_factor ** attempt),
        policy.max_delay,
    )
    jitter_amount = raw * policy.jitter
    return raw + random.uniform(-jitter_amount, jitter_amount)


def with_retry(
    fn: Callable[[], T],
    *,
    policy: RetryPolicy | None = None,
    label: str = "operation",
) -> T:
    """
    Call ``fn()`` with retry/backoff according to ``policy``.

    Parameters
    ----------
    fn:
        Zero-argument callable to invoke.
    policy:
        Retry policy.  Defaults to STATSSA_POLICY.
    label:
        Human-readable description for log messages.

    Returns
    -------
    T
        Return value of ``fn()`` on success.

    Raises
    ------
    Exception
        The last exception raised by ``fn()`` once all attempts are exhausted.
    """
    if policy is None:
        policy = STATSSA_POLICY

    last_exc: BaseException | None = None

    for attempt in range(policy.max_attempts):
        try:
            result: T = fn()
            if attempt > 0:
                log.info(
                    "%s succeeded on attempt %d/%d",
                    label,
                    attempt + 1,
                    policy.max_attempts,
                )
            return result

        except Exception as exc:
            last_exc = exc

            if not _is_retryable(exc, policy):
                log.error(
                    "%s failed with non-retryable error: %s",
                    label,
                    exc,
                )
                raise

            remaining = policy.max_attempts - attempt - 1
            if remaining == 0:
                log.error(
                    "%s exhausted all %d attempts.  Last error: %s",
                    label,
                    policy.max_attempts,
                    exc,
                )
                break

            delay = _compute_delay(attempt, policy)
            log.warning(
                "%s failed (attempt %d/%d): %s — retrying in %.1f s",
                label,
                attempt + 1,
                policy.max_attempts,
                exc,
                delay,
            )
            time.sleep(delay)

    assert last_exc is not None
    raise last_exc


# ---------------------------------------------------------------------------
# Convenience: retry a callable once with a simple count (no backoff)
# ---------------------------------------------------------------------------


def retry_simple(
    fn: Callable[[], T],
    *,
    max_attempts: int = 3,
    delay_seconds: float = 5.0,
    label: str = "operation",
) -> T:
    """Minimal retry without exponential backoff — for short-lived operations."""
    policy = RetryPolicy(
        max_attempts=max_attempts,
        base_delay=delay_seconds,
        max_delay=delay_seconds * 2,
        backoff_factor=1.0,
        jitter=0.0,
    )
    return with_retry(fn, policy=policy, label=label)
