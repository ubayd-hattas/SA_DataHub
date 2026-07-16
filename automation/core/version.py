"""
automation.core.version — Version tracking for dataset pipeline runs.

Every successful pipeline execution records a version entry so the system
can answer: "what did this dataset contain on date X and where did it come
from?"  This applies equally to automated extractions and manually-entered
data (Track B datasets like crime and education).

The version store is a simple JSON file per dataset in the automation
reports directory.  It is a lightweight complement to the ``dataset_versions``
PostgreSQL table defined in the architecture — both stores are written when
available; the JSON store works without a live DB connection.

Version entry schema
--------------------
{
  "version_id": "2026-07-01T12:00:00Z-unemployment",
  "dataset_id": "unemployment",
  "source_id": "statssa",
  "extracted_at": "2026-07-01T12:00:00Z",
  "approved_at": null,
  "approved_by": null,
  "status": "pending",          // "pending" | "approved" | "rejected"
  "source_url": "https://...",
  "sha256": "abcdef...",
  "archive_path": "/path/to/raw/file",
  "adapter_version": "0.1.0",
  "notes": ""
}
"""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from automation.core.files import atomic_write_text
from automation.core.logging import get_logger

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Version entry dataclass
# ---------------------------------------------------------------------------


@dataclass
class VersionEntry:
    version_id: str
    dataset_id: str
    source_id: str
    extracted_at: str
    status: Literal["pending", "approved", "rejected"] = "pending"
    approved_at: str | None = None
    approved_by: str | None = None
    source_url: str = ""
    sha256: str = ""
    archive_path: str = ""
    adapter_version: str = "0.1.0"
    notes: str = ""
    run_id: str = ""
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def make_version_id(dataset_id: str, ts: datetime | None = None) -> str:
    """Generate a deterministic, human-readable version ID."""
    ts = ts or datetime.now(tz=timezone.utc)
    return f"{ts.strftime('%Y%m%dT%H%M%Sz')}-{dataset_id}"


def new_version_entry(
    *,
    dataset_id: str,
    source_id: str,
    source_url: str = "",
    sha256: str = "",
    archive_path: str = "",
    adapter_version: str = "0.1.0",
    notes: str = "",
    run_id: str = "",
) -> VersionEntry:
    """Create a new version entry with status='pending'."""
    now = datetime.now(tz=timezone.utc)
    return VersionEntry(
        version_id=make_version_id(dataset_id, now),
        dataset_id=dataset_id,
        source_id=source_id,
        extracted_at=now.isoformat(),
        source_url=source_url,
        sha256=sha256,
        archive_path=archive_path,
        adapter_version=adapter_version,
        notes=notes,
        run_id=run_id,
    )


# ---------------------------------------------------------------------------
# Version store (JSON on disk)
# ---------------------------------------------------------------------------


def _version_store_path(report_dir: Path, dataset_id: str) -> Path:
    return report_dir / "versions" / f"{dataset_id}.versions.json"


def load_version_history(
    report_dir: Path,
    dataset_id: str,
) -> list[VersionEntry]:
    """Load the version history for ``dataset_id`` from the JSON store."""
    path = _version_store_path(report_dir, dataset_id)
    if not path.exists():
        return []
    try:
        raw: list[dict[str, Any]] = json.loads(path.read_text(encoding="utf-8"))
        entries = []
        for item in raw:
            try:
                entries.append(VersionEntry(**item))
            except TypeError:
                pass  # ignore entries with unknown fields from future versions
        return entries
    except (json.JSONDecodeError, OSError) as exc:
        log.warning("Cannot load version history for %s: %s", dataset_id, exc)
        return []


def save_version_entry(report_dir: Path, entry: VersionEntry) -> None:
    """
    Append ``entry`` to the version history for its dataset.

    Creates the store file if it does not exist.
    """
    path = _version_store_path(report_dir, entry.dataset_id)
    history = load_version_history(report_dir, entry.dataset_id)

    # Replace existing entry with same version_id (upsert)
    updated = [e for e in history if e.version_id != entry.version_id]
    updated.append(entry)

    atomic_write_text(path, json.dumps([e.to_dict() for e in updated], indent=2))
    log.debug(
        "Saved version entry %s for %s (status=%s)",
        entry.version_id,
        entry.dataset_id,
        entry.status,
    )


def latest_approved_version(
    report_dir: Path,
    dataset_id: str,
) -> VersionEntry | None:
    """Return the most recently approved version entry for ``dataset_id``."""
    history = load_version_history(report_dir, dataset_id)
    approved = [e for e in history if e.status == "approved"]
    if not approved:
        return None
    # Sort by extracted_at descending
    approved.sort(key=lambda e: e.extracted_at, reverse=True)
    return approved[0]


def pending_versions(
    report_dir: Path,
    dataset_id: str,
) -> list[VersionEntry]:
    """Return all pending (awaiting review) version entries."""
    return [
        e
        for e in load_version_history(report_dir, dataset_id)
        if e.status == "pending"
    ]


def approve_version(report_dir: Path, dataset_id: str, version_id: str, approver: str) -> None:
    """Transition a version entry from pending to approved."""
    history = load_version_history(report_dir, dataset_id)
    updated = False
    for entry in history:
        if entry.version_id == version_id:
            if entry.status != "pending":
                raise ValueError(f"Version {version_id} is not pending (status: {entry.status})")
            entry.status = "approved"
            entry.approved_at = datetime.now(tz=timezone.utc).isoformat()
            entry.approved_by = approver
            updated = True
            break
    
    if not updated:
        raise KeyError(f"Version {version_id} not found for dataset {dataset_id}")
    
    path = _version_store_path(report_dir, dataset_id)
    atomic_write_text(path, json.dumps([e.to_dict() for e in history], indent=2))
    log.info("Approved version %s for %s by %s", version_id, dataset_id, approver)


def reject_version(report_dir: Path, dataset_id: str, version_id: str) -> None:
    """Transition a version entry from pending to rejected."""
    history = load_version_history(report_dir, dataset_id)
    updated = False
    for entry in history:
        if entry.version_id == version_id:
            if entry.status != "pending":
                raise ValueError(f"Version {version_id} is not pending (status: {entry.status})")
            entry.status = "rejected"
            updated = True
            break
            
    if not updated:
        raise KeyError(f"Version {version_id} not found for dataset {dataset_id}")
        
    path = _version_store_path(report_dir, dataset_id)
    atomic_write_text(path, json.dumps([e.to_dict() for e in history], indent=2))
    log.info("Rejected version %s for %s", version_id, dataset_id)
