"""
automation.core.http_client — Generic HTTP client.

Wraps urllib (stdlib-only, no external dependency) with:
  - configurable timeouts
  - User-Agent header
  - ETag / Last-Modified caching support
  - response body as bytes or decoded string
  - consistent error model (raises AutomationHTTPError)

No retry logic here — see retry.py.  The client is intentionally thin so
the retry wrapper can be composed around any callable.
"""

from __future__ import annotations

import hashlib
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any

from automation.core.logging import get_logger

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Public error type
# ---------------------------------------------------------------------------


class AutomationHTTPError(Exception):
    """Raised when an HTTP request fails in a non-retryable way."""

    def __init__(self, url: str, status: int | None, reason: str) -> None:
        self.url = url
        self.status = status
        self.reason = reason
        super().__init__(f"HTTP error {status} for {url}: {reason}")


# ---------------------------------------------------------------------------
# Response dataclass
# ---------------------------------------------------------------------------


@dataclass
class HTTPResponse:
    url: str
    status: int
    headers: dict[str, str]
    body: bytes
    etag: str = ""
    last_modified: str = ""
    content_sha256: str = ""

    @property
    def text(self) -> str:
        return self.body.decode("utf-8", errors="replace")

    @property
    def size_bytes(self) -> int:
        return len(self.body)


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

_DEFAULT_USER_AGENT = (
    "SA-Data-Hub-Automation/0.1 "
    "(https://sadatahub.tech; data-automation-bot)"
)


class HTTPClient:
    """
    Simple HTTP client wrapping urllib.

    Parameters
    ----------
    timeout_seconds:
        Socket timeout for each request.
    user_agent:
        User-Agent string sent with every request.
    extra_headers:
        Additional headers sent with every request.
    """

    def __init__(
        self,
        *,
        timeout_seconds: int = 30,
        user_agent: str = _DEFAULT_USER_AGENT,
        extra_headers: dict[str, str] | None = None,
    ) -> None:
        self.timeout_seconds = timeout_seconds
        self.user_agent = user_agent
        self.extra_headers: dict[str, str] = extra_headers or {}

    # ------------------------------------------------------------------
    # Low-level request
    # ------------------------------------------------------------------

    def request(
        self,
        url: str,
        *,
        method: str = "GET",
        headers: dict[str, str] | None = None,
        body: bytes | None = None,
    ) -> HTTPResponse:
        """
        Perform a single HTTP request.

        Does not retry — compose with :func:`automation.core.retry.with_retry`.

        Raises
        ------
        AutomationHTTPError
            On HTTP 4xx (non-retryable) or other permanent failures.
        urllib.error.URLError
            On transient network errors (caller / retry wrapper decides).
        """
        merged_headers: dict[str, str] = {
            "User-Agent": self.user_agent,
            **self.extra_headers,
            **(headers or {}),
        }
        req = urllib.request.Request(
            url,
            data=body,
            headers=merged_headers,
            method=method,
        )

        log.debug("HTTP %s %s", method, url)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                raw_body = resp.read()
                resp_headers: dict[str, str] = {
                    k.lower(): v for k, v in dict(resp.headers).items()
                }
                sha256 = hashlib.sha256(raw_body).hexdigest()
                response = HTTPResponse(
                    url=url,
                    status=resp.status,
                    headers=resp_headers,
                    body=raw_body,
                    etag=resp_headers.get("etag", ""),
                    last_modified=resp_headers.get("last-modified", ""),
                    content_sha256=sha256,
                )
                log.debug(
                    "HTTP %s %s → %d (%d bytes, sha256=%s…)",
                    method,
                    url,
                    resp.status,
                    len(raw_body),
                    sha256[:8],
                )
                return response

        except urllib.error.HTTPError as exc:
            # 4xx → non-retryable; 5xx → retryable (caller/retry decides)
            if 400 <= exc.code < 500:
                raise AutomationHTTPError(url, exc.code, exc.reason or str(exc)) from exc
            # Re-raise as URLError so retry wrapper sees it as transient
            raise urllib.error.URLError(
                f"HTTP {exc.code} {exc.reason or ''}"
            ) from exc

    # ------------------------------------------------------------------
    # Convenience wrappers
    # ------------------------------------------------------------------

    def get(self, url: str, *, headers: dict[str, str] | None = None) -> HTTPResponse:
        return self.request(url, method="GET", headers=headers)

    def head(self, url: str, *, headers: dict[str, str] | None = None) -> HTTPResponse:
        return self.request(url, method="HEAD", headers=headers)

    def etag_check(
        self,
        url: str,
        *,
        previous_etag: str = "",
        previous_sha256: str = "",
    ) -> tuple[bool, HTTPResponse]:
        """
        Check whether a URL has changed since the last visit.

        Returns
        -------
        (changed, response)
            ``changed`` is True when the content appears different.
            ``response`` is the full response (may be HEAD-only if ETag matched).
        """
        req_headers: dict[str, str] = {}
        if previous_etag:
            req_headers["If-None-Match"] = previous_etag

        try:
            resp = self.get(url, headers=req_headers)
        except urllib.error.URLError:
            raise

        changed = True
        if resp.etag and resp.etag == previous_etag:
            changed = False
        elif previous_sha256 and resp.content_sha256 == previous_sha256:
            changed = False

        return changed, resp


# ---------------------------------------------------------------------------
# Module-level default client (singleton, lazy)
# ---------------------------------------------------------------------------

_default_client: HTTPClient | None = None


def get_default_client(*, timeout_seconds: int = 30) -> HTTPClient:
    """Return the module-level default HTTP client (created on first call)."""
    global _default_client
    if _default_client is None:
        _default_client = HTTPClient(timeout_seconds=timeout_seconds)
    return _default_client
