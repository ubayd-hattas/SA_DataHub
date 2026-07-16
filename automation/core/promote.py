"""
automation.core.promote — Promotion of approved dataset candidates.

This module is the ONLY permitted path for writing to production dataset JSON
files (src/data/datasets/*.json). It enforces the human-approval gate before
allowing a write to proceed.
"""

from __future__ import annotations

import json
from pathlib import Path

from automation.core.files import atomic_write_text
from automation.core.logging import get_logger
from automation.core.staging import read_staged_dataset
from automation.core.version import load_version_history

log = get_logger(__name__)


def get_production_dataset_path(dataset_id: str) -> Path:
    """Return the path to the production JSON file for a given dataset."""
    # Assuming datasets live in src/data/datasets/ relative to the project root
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    return project_root / "src" / "data" / "datasets" / f"{dataset_id}.json"


def promote_version(report_dir: Path, dataset_id: str, version_id: str) -> Path:
    """
    Promote a staged, approved dataset candidate to production.

    Validates that the given version_id has status='approved' in the version
    store. If so, reads the corresponding staged document and atomically writes
    it to the production dataset location.

    Raises
    ------
    ValueError
        If the version is not approved or not found.
    FileNotFoundError
        If the staged artifact cannot be found.
    """
    history = load_version_history(report_dir, dataset_id)
    entry = None
    for e in history:
        if e.version_id == version_id:
            entry = e
            break

    if entry is None:
        raise ValueError(f"Version {version_id} not found in history for dataset {dataset_id}")

    if entry.status != "approved":
        raise ValueError(
            f"Cannot promote version {version_id}: status is {entry.status!r}, "
            f"requires 'approved'."
        )

    # Read the staged candidate
    document = read_staged_dataset(report_dir, dataset_id, version_id)
    
    # Target path
    target_path = get_production_dataset_path(dataset_id)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write to production
    atomic_write_text(target_path, json.dumps(document, indent=2))
    
    log.info(
        "PROMOTED version %s of %s to production (%s)",
        version_id, dataset_id, target_path
    )
    
    return target_path
