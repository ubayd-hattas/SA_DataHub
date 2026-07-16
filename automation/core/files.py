"""
automation.core.files — File management utilities.

Responsibilities
----------------
- Raw archive: save source files to a timestamped, dataset-keyed directory.
- Checksum: SHA-256 of any file, with a stored manifest entry.
- Atomic write: write to a temp file then rename (safe on Windows & POSIX).
- Path helpers shared across all adapters.

Nothing in this module is source- or dataset-aware; it operates purely on
``Path`` objects and bytes.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from automation.core.logging import get_logger

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Checksum
# ---------------------------------------------------------------------------


def sha256_of_bytes(data: bytes) -> str:
    """Return the hex-encoded SHA-256 digest of ``data``."""
    return hashlib.sha256(data).hexdigest()


def sha256_of_file(path: Path) -> str:
    """Return the hex-encoded SHA-256 digest of a file on disk."""
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65_536), b""):
            h.update(chunk)
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Atomic write
# ---------------------------------------------------------------------------


def atomic_write(path: Path, data: bytes) -> None:
    """
    Write ``data`` to ``path`` atomically.

    Creates parent directories as needed.  On POSIX uses ``os.replace``
    (atomic); on Windows, falls back to a non-atomic copy if the rename
    crosses drives.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=path.parent, prefix=".tmp-")
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise
    log.debug("Wrote %d bytes → %s", len(data), path)


def atomic_write_text(path: Path, text: str, encoding: str = "utf-8") -> None:
    atomic_write(path, text.encode(encoding))


# ---------------------------------------------------------------------------
# Raw archive
# ---------------------------------------------------------------------------


def archive_path(
    archive_root: Path,
    *,
    dataset_id: str,
    source_id: str,
    suffix: str = ".bin",
    timestamp: datetime | None = None,
) -> Path:
    """
    Return the canonical path for a raw archive file.

    Layout: ``<archive_root>/<dataset_id>/<YYYY-MM-DD>/<source_id>_<HHMMSSz><suffix>``

    Parameters
    ----------
    archive_root:
        Base directory for all raw archives.
    dataset_id:
        Dataset slug (e.g. ``"unemployment"``).
    source_id:
        Source organisation ID (e.g. ``"statssa"``).
    suffix:
        File extension including dot (e.g. ``".xlsx"``, ``".json"``).
    timestamp:
        Datetime to use for the path.  Defaults to now (UTC).
    """
    ts = timestamp or datetime.now(tz=timezone.utc)
    date_str = ts.strftime("%Y-%m-%d")
    time_str = ts.strftime("%H%M%Sz")
    filename = f"{source_id}_{time_str}{suffix}"
    return archive_root / dataset_id / date_str / filename


def portable_archive_path(archive_root: Path, dest: Path) -> str:
    """
    Return a portable, archive-root-relative string for an archived file's
    path, suitable for persisting in version entries, manifests, or reports.

    ``dest`` (as returned by :func:`archive_path`/:func:`save_to_archive`) is
    built from whatever ``archive_root`` the caller configured, which
    defaults to an absolute path under the project root but may be an
    absolute local path on a developer's machine (e.g.
    ``AUTOMATION_RAW_ARCHIVE_DIR`` pointing at a local working directory).
    Persisting ``str(dest)`` directly can leak developer-specific local
    filesystem paths into committed artifacts (see Work Item 7 in the
    2026-07-12 implementation spec, which found exactly this in a committed
    version-store entry). Callers that write an archive path to disk should
    use this helper instead of ``str(dest)``.
    """
    try:
        rel_path = str(dest.relative_to(archive_root))
        return f"automation/reports/archive/{rel_path}".replace("\\", "/")
    except ValueError:
        # dest isn't under archive_root (unexpected) — fall back to a
        # short, portable tail rather than emitting an absolute local path.
        fallback = str(Path(archive_root.name) / dest.name)
        return f"automation/reports/archive/{fallback}".replace("\\", "/")


def save_to_archive(
    archive_root: Path,
    data: bytes,
    *,
    dataset_id: str,
    source_id: str,
    suffix: str = ".bin",
    timestamp: datetime | None = None,
) -> tuple[Path, str]:
    """
    Save raw source data to the archive directory.

    Returns
    -------
    (path, sha256)
        The path where the file was written and its SHA-256 checksum.
    """
    dest = archive_path(
        archive_root,
        dataset_id=dataset_id,
        source_id=source_id,
        suffix=suffix,
        timestamp=timestamp,
    )
    checksum = sha256_of_bytes(data)
    atomic_write(dest, data)
    # Write companion manifest entry
    manifest_path = dest.with_suffix(".manifest.json")
    manifest: dict[str, Any] = {
        "dataset_id": dataset_id,
        "source_id": source_id,
        "archived_at": (timestamp or datetime.now(tz=timezone.utc)).isoformat(),
        "size_bytes": len(data),
        "sha256": checksum,
        "path": str(dest),
    }
    atomic_write_text(manifest_path, json.dumps(manifest, indent=2))
    log.info(
        "Archived %d bytes for %s/%s → %s (sha256=%s…)",
        len(data),
        source_id,
        dataset_id,
        dest,
        checksum[:8],
    )
    return dest, checksum


# ---------------------------------------------------------------------------
# Directory helpers
# ---------------------------------------------------------------------------


def ensure_dir(path: Path) -> Path:
    """Create ``path`` (and parents) if it does not exist.  Returns ``path``."""
    path.mkdir(parents=True, exist_ok=True)
    return path


def list_archive_runs(
    archive_root: Path,
    dataset_id: str,
) -> list[Path]:
    """
    Return a list of all archived files for ``dataset_id``, newest first.

    Only returns the data files (not the ``.manifest.json`` companions).
    """
    dataset_dir = archive_root / dataset_id
    if not dataset_dir.exists():
        return []
    files = [
        p
        for p in sorted(dataset_dir.rglob("*"), reverse=True)
        if p.is_file() and not p.name.endswith(".manifest.json")
    ]
    return files


def latest_archive(
    archive_root: Path,
    dataset_id: str,
) -> Path | None:
    """Return the most recent archived file for ``dataset_id``, or None."""
    runs = list_archive_runs(archive_root, dataset_id)
    return runs[0] if runs else None
