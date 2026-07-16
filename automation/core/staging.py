"""
automation.core.staging — Dataset staging utilities.

Provides an interim file-based staging area for dataset candidates prior to
human approval and promotion. This serves as the separation barrier preventing
automated runs from writing directly to production datasets.

Note: As described in SA-Data-Hub-Automation-Architecture.md, the long-term
vision for staging is a PostgreSQL `staging.*` schema mirroring production.
This file-based staging is an interim implementation pending the full DB
migration, satisfying the same architectural principle (separation of candidate
and production data).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from automation.core.files import atomic_write_text
from automation.core.logging import get_logger

log = get_logger(__name__)


def _staging_path(report_dir: Path, dataset_id: str, version_id: str) -> Path:
    """Return the path for a staged dataset candidate."""
    staging_dir = report_dir / "staging"
    staging_dir.mkdir(parents=True, exist_ok=True)
    # Sanitize version_id for filename safety if needed, though make_version_id is already safe.
    safe_version = version_id.replace(":", "").replace("/", "_")
    return staging_dir / f"{dataset_id}_{safe_version}.json"


def write_staged_dataset(
    report_dir: Path,
    dataset_id: str,
    version_id: str,
    document: dict[str, Any],
) -> Path:
    """
    Write a candidate dataset document to the staging area.

    This should be called by adapters (e.g., SARBAdapter) instead of writing
    directly to `src/data/datasets/*.json`.
    """
    path = _staging_path(report_dir, dataset_id, version_id)
    atomic_write_text(path, json.dumps(document, indent=2))
    log.info("Staged candidate dataset %s (version %s) at %s", dataset_id, version_id, path)
    return path


def read_staged_dataset(
    report_dir: Path,
    dataset_id: str,
    version_id: str,
) -> dict[str, Any]:
    """
    Read a candidate dataset document from the staging area.

    Raises FileNotFoundError if the staged artifact does not exist.
    """
    path = _staging_path(report_dir, dataset_id, version_id)
    if not path.exists():
        raise FileNotFoundError(f"Staged dataset not found: {path}")
    
    return json.loads(path.read_text(encoding="utf-8"))
