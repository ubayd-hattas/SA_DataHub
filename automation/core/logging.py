"""
automation.core.logging — Structured logging for the automation framework.

Provides a consistent logger factory used across all modules.  Log records
include the run_id so every event from a single runner invocation is
correlated in output.

Usage
-----
    from automation.core.logging import get_logger

    log = get_logger(__name__)
    log.info("Pipeline started", extra={"dataset": "unemployment"})

Output format (human-readable):
    2026-07-01 12:00:00 [INFO ] automation.runner — Pipeline started | dataset=unemployment

Output format (JSON, when AUTOMATION_LOG_JSON=1):
    {"ts": "2026-07-01T12:00:00", "level": "INFO", "logger": "automation.runner",
     "message": "Pipeline started", "dataset": "unemployment", "run_id": "abc123"}
"""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

# ---------------------------------------------------------------------------
# Global run-id context — set by the runner at startup
# ---------------------------------------------------------------------------

_current_run_id: str = ""


def set_run_id(run_id: str) -> None:
    """Set the run ID that will be injected into every log record."""
    global _current_run_id
    _current_run_id = run_id


def get_run_id() -> str:
    return _current_run_id


# ---------------------------------------------------------------------------
# Custom formatter
# ---------------------------------------------------------------------------

_USE_JSON = os.environ.get("AUTOMATION_LOG_JSON", "").lower() in ("1", "true", "yes")


class _HumanFormatter(logging.Formatter):
    """Human-readable formatter: timestamp [LEVEL] logger — message | key=val ..."""

    LEVEL_LABELS = {
        logging.DEBUG: "DEBUG",
        logging.INFO: "INFO ",
        logging.WARNING: "WARN ",
        logging.ERROR: "ERROR",
        logging.CRITICAL: "CRIT ",
    }

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.fromtimestamp(record.created, tz=timezone.utc).strftime(
            "%Y-%m-%d %H:%M:%S"
        )
        level = self.LEVEL_LABELS.get(record.levelno, record.levelname[:5].ljust(5))
        name = record.name
        msg = record.getMessage()

        # Collect any extra fields the caller passed in
        standard = {
            "name", "msg", "args", "levelname", "levelno", "pathname",
            "filename", "module", "exc_info", "exc_text", "stack_info",
            "lineno", "funcName", "created", "msecs", "relativeCreated",
            "thread", "threadName", "processName", "process", "message",
            "taskName",
        }
        extras: list[str] = []
        if _current_run_id:
            extras.append(f"run_id={_current_run_id}")
        for k, v in record.__dict__.items():
            if k not in standard:
                extras.append(f"{k}={v}")

        suffix = " | " + "  ".join(extras) if extras else ""
        return f"{ts} [{level}] {name} — {msg}{suffix}"


class _JsonFormatter(logging.Formatter):
    """JSON formatter: one JSON object per line."""

    def format(self, record: logging.LogRecord) -> str:
        standard = {
            "name", "msg", "args", "levelname", "levelno", "pathname",
            "filename", "module", "exc_info", "exc_text", "stack_info",
            "lineno", "funcName", "created", "msecs", "relativeCreated",
            "thread", "threadName", "processName", "process", "message",
            "taskName",
        }
        doc: dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if _current_run_id:
            doc["run_id"] = _current_run_id
        for k, v in record.__dict__.items():
            if k not in standard:
                doc[k] = v
        return json.dumps(doc, default=str)


# ---------------------------------------------------------------------------
# Handler cache — one handler on the root automation logger
# ---------------------------------------------------------------------------

_handler_installed = False


def _install_handler(level: int) -> None:
    global _handler_installed
    if _handler_installed:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JsonFormatter() if _USE_JSON else _HumanFormatter())
    root = logging.getLogger("automation")
    root.setLevel(level)
    root.addHandler(handler)
    root.propagate = False
    _handler_installed = True


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def configure_logging(level: str = "INFO") -> None:
    """
    Configure the automation logging handler.  Call once at startup.

    Parameters
    ----------
    level:
        One of DEBUG, INFO, WARNING, ERROR, CRITICAL.
    """
    numeric = getattr(logging, level.upper(), logging.INFO)
    _install_handler(numeric)
    logging.getLogger("automation").setLevel(numeric)


def get_logger(name: str) -> logging.Logger:
    """
    Return a logger scoped under the ``automation`` namespace.

    Parameters
    ----------
    name:
        Typically ``__name__`` of the calling module.
    """
    # Ensure handler is installed with a default level
    _install_handler(logging.INFO)
    return logging.getLogger(name)
