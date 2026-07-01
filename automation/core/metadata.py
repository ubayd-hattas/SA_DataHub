"""
automation.core.metadata — Dataset metadata utilities.

Reads and writes the ``_meta`` block that every dataset JSON file carries,
and exposes helpers for computing freshness based on cadence.

Protected field list
--------------------
The following fields must NEVER change silently during an automated update.
Any diff against these fields must halt the pipeline and open a review ticket.

    statistic IDs   (stat.id)
    registry IDs    (registryId)
    slug / URL IDs  (slug, categoryId)
    municipality codes (municipalityCode)
    citation keys

See the architecture document for the rationale.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from automation.core.logging import get_logger

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Protected fields — any change must halt the pipeline
# ---------------------------------------------------------------------------

PROTECTED_FIELDS: frozenset[str] = frozenset(
    {
        "id",
        "slug",
        "registryId",
        "categoryId",
        "statId",
        "municipalityCode",
        "province_code",
        "geography_code",
        "citation_key",
        "dataSource",
        "source_id",
    }
)


# ---------------------------------------------------------------------------
# Meta block dataclass
# ---------------------------------------------------------------------------


@dataclass
class DatasetMeta:
    """
    Parsed representation of the ``_meta`` block in a dataset JSON file.

    All fields are optional — missing values are represented as ``None`` or
    sensible defaults so callers can always read the struct safely.
    """

    dataset_id: str
    last_updated: date | None = None
    last_verified: date | None = None
    auto_updated: str | None = None   # raw string from JSON (may be date or bool-string)
    cadence: str = "manual"
    source_organisation: str = ""
    source_url: str = ""
    notes: str = ""
    automation_level: str = "manual"  # "auto", "semi-auto", "manual", "static"
    release_calendar: dict[str, Any] = field(default_factory=dict)
    extra: dict[str, Any] = field(default_factory=dict)

    # ------------------------------------------------------------------
    # Freshness
    # ------------------------------------------------------------------

    def freshness_status(self, as_of: date | None = None) -> str:
        """
        Compute freshness relative to cadence.

        Returns
        -------
        "fresh" | "recent" | "stale" | "unknown"
            fresh   — within the expected update window
            recent  — slightly past the window but not alarmingly so
            stale   — significantly overdue
            unknown — no last_updated date available
        """
        if self.last_updated is None:
            return "unknown"

        reference = as_of or date.today()
        age_days = (reference - self.last_updated).days

        thresholds: dict[str, tuple[int, int]] = {
            "daily": (2, 7),
            "weekly": (10, 21),
            "monthly": (40, 90),
            "quarterly": (100, 180),
            "annual": (370, 550),
            "manual": (999999, 999999),
            "static": (999999, 999999),
        }

        fresh_days, stale_days = thresholds.get(self.cadence, (999999, 999999))

        if age_days <= fresh_days:
            return "fresh"
        if age_days <= stale_days:
            return "recent"
        return "stale"

    def days_since_update(self, as_of: date | None = None) -> int | None:
        if self.last_updated is None:
            return None
        reference = as_of or date.today()
        return (reference - self.last_updated).days


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------


def _parse_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    raw = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d %B %Y", "%B %Y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def parse_meta_block(dataset_id: str, meta_raw: dict[str, Any]) -> DatasetMeta:
    """Parse a raw ``_meta`` dict into a :class:`DatasetMeta`."""
    known = {
        "last_updated", "last_verified", "auto_updated",
        "cadence", "source_organisation", "source_url",
        "notes", "automation_level", "release_calendar",
    }
    return DatasetMeta(
        dataset_id=dataset_id,
        last_updated=_parse_date(meta_raw.get("last_updated")),
        last_verified=_parse_date(meta_raw.get("last_verified")),
        auto_updated=meta_raw.get("auto_updated"),
        cadence=str(meta_raw.get("cadence", "manual")),
        source_organisation=str(meta_raw.get("source_organisation", "")),
        source_url=str(meta_raw.get("source_url", "")),
        notes=str(meta_raw.get("notes", "")),
        automation_level=str(meta_raw.get("automation_level", "manual")),
        release_calendar=dict(meta_raw.get("release_calendar", {})),
        extra={k: v for k, v in meta_raw.items() if k not in known},
    )


def read_dataset_meta(dataset_json_path: Path) -> DatasetMeta | None:
    """
    Read the ``_meta`` block from a dataset JSON file.

    Returns ``None`` if the file doesn't exist or has no ``_meta`` key.
    """
    if not dataset_json_path.exists():
        return None
    try:
        doc = json.loads(dataset_json_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        log.warning("Cannot read %s: %s", dataset_json_path, exc)
        return None

    meta_raw = doc.get("_meta") or doc.get("meta")
    if not meta_raw or not isinstance(meta_raw, dict):
        return None

    dataset_id = dataset_json_path.stem
    return parse_meta_block(dataset_id, meta_raw)


# ---------------------------------------------------------------------------
# Protected field diff
# ---------------------------------------------------------------------------


def check_protected_fields(
    previous: dict[str, Any],
    proposed: dict[str, Any],
    context: str = "root",
) -> list[str]:
    """
    Recursively compare ``previous`` and ``proposed``, returning a list of
    violation messages wherever a protected field has changed value.

    Parameters
    ----------
    previous:
        The last-approved dataset document (or sub-document).
    proposed:
        The newly-extracted candidate document.
    context:
        Dot-path prefix used in violation messages.

    Returns
    -------
    list[str]
        Empty if no violations; one message per violation otherwise.
    """
    violations: list[str] = []

    for key, prev_val in previous.items():
        path = f"{context}.{key}" if context else key
        new_val = proposed.get(key)

        if key in PROTECTED_FIELDS:
            if new_val != prev_val:
                violations.append(
                    f"Protected field changed: {path} "
                    f"{prev_val!r} → {new_val!r}"
                )
        elif isinstance(prev_val, dict) and isinstance(new_val, dict):
            violations.extend(
                check_protected_fields(prev_val, new_val, context=path)
            )
        elif isinstance(prev_val, list) and isinstance(new_val, list):
            for i, (p_item, n_item) in enumerate(zip(prev_val, new_val)):
                if isinstance(p_item, dict) and isinstance(n_item, dict):
                    violations.extend(
                        check_protected_fields(
                            p_item, n_item, context=f"{path}[{i}]"
                        )
                    )

    return violations
