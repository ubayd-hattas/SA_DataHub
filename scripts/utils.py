"""
scripts/utils.py — shared utilities for SA Data Hub dataset updaters

Provides:
  - JSON read/write helpers that preserve structure
  - A safe HTTP fetch with retry and rate-limit handling
  - Statistic diff/reporting so you can see exactly what changed
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import requests

# ─── Paths ───────────────────────────────────────────────────────────────────

SCRIPTS_DIR  = Path(__file__).parent
PROJECT_ROOT = SCRIPTS_DIR.parent
DATASETS_DIR = PROJECT_ROOT / "src" / "data" / "datasets"

DATASETS_DIR.mkdir(parents=True, exist_ok=True)


# ─── JSON helpers ─────────────────────────────────────────────────────────────

def load_dataset(name: str) -> dict:
    """Load an existing dataset JSON file."""
    path = DATASETS_DIR / f"{name}.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_dataset(name: str, data: dict, dry_run: bool = False) -> None:
    """
    Write a dataset JSON file.
    Preserves the _meta block from the existing file if not provided in data.
    Prints a message if dry_run=True instead of writing.
    """
    path = DATASETS_DIR / f"{name}.json"

    # Preserve existing _meta if the caller didn't supply one
    if "_meta" not in data and path.exists():
        existing = load_dataset(name)
        data = {"_meta": existing.get("_meta", {}), **data}

    if dry_run:
        print(f"  [DRY RUN] Would write {path.name} ({len(data.get('statistics', []))} statistics)")
        return

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"  ✓ Wrote {path.name}")


# ─── HTTP fetch ───────────────────────────────────────────────────────────────

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "SA-DataHub-Updater/1.0 (https://github.com/your-repo; contact@yourdomain.co.za)"
})


PAUSED_MESSAGE = (
    "Automated updates have been paused since 25 October 2026: data is entered by hand "
    "from releases the maintainer downloads, and nothing may send requests to statssa.gov.za. "
    "No request was sent. See docs/CURRENT_STATE.md. To run a non-Stats SA fetch anyway, "
    "set SADH_ALLOW_PAUSED_FETCH=1 for that one command."
)


def fetch(url: str, retries: int = 3, backoff: float = 2.0, **kwargs) -> requests.Response:
    """
    GET a URL with retry/backoff.
    Raises on non-2xx after all retries.
    Refuses to run while automation is paused, and never contacts statssa.gov.za.
    """
    if "statssa.gov.za" in url:
        raise SystemExit("Refusing to request statssa.gov.za: the project does not send automated requests there. " + PAUSED_MESSAGE)
    if os.environ.get("SADH_ALLOW_PAUSED_FETCH") != "1":
        raise SystemExit(PAUSED_MESSAGE)
    for attempt in range(retries):
        try:
            resp = SESSION.get(url, timeout=30, **kwargs)
            resp.raise_for_status()
            return resp
        except requests.HTTPError as e:
            if e.response is not None and e.response.status_code == 429:
                wait = backoff ** (attempt + 1)
                print(f"  Rate limited. Waiting {wait:.0f}s…")
                time.sleep(wait)
                continue
            raise
        except requests.RequestException as e:
            if attempt < retries - 1:
                time.sleep(backoff)
                continue
            raise RuntimeError(f"Failed to fetch {url}: {e}") from e
    raise RuntimeError(f"Exhausted retries for {url}")


# ─── Diff / reporting ─────────────────────────────────────────────────────────

def diff_statistic(old: dict, new: dict) -> list[str]:
    """Return a list of human-readable change descriptions."""
    changes = []
    watch = ["value", "rawValue", "change", "changeLabel", "trend", "lastUpdated"]
    for key in watch:
        old_val = old.get(key)
        new_val = new.get(key)
        if old_val != new_val:
            changes.append(f"    {key}: {old_val!r} → {new_val!r}")
    return changes


def report_changes(old_stats: list[dict], new_stats: list[dict]) -> None:
    """Print a diff between old and new statistics lists."""
    old_map = {s["id"]: s for s in old_stats}
    new_map = {s["id"]: s for s in new_stats}

    added   = [id for id in new_map if id not in old_map]
    removed = [id for id in old_map if id not in new_map]
    changed = []

    for id, new_s in new_map.items():
        if id in old_map:
            diffs = diff_statistic(old_map[id], new_s)
            if diffs:
                changed.append((id, diffs))

    if not added and not removed and not changed:
        print("  No changes detected.")
        return

    if added:
        print(f"  ✚ Added:   {', '.join(added)}")
    if removed:
        print(f"  ✖ Removed: {', '.join(removed)}")
    for id, diffs in changed:
        print(f"  ✎ Changed: {id}")
        for d in diffs:
            print(d)


# ─── Date formatting ──────────────────────────────────────────────────────────

def today_iso() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def quarter_label(year: int, quarter: int) -> str:
    return f"Q{quarter} {year}"
