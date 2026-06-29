"""Extract dataset JSON into an immutable raw snapshot."""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATASETS_DIR = PROJECT_ROOT / "src" / "data" / "datasets"
RAW_SNAPSHOTS_DIR = PROJECT_ROOT / "etl" / "raw-snapshots"


def extract_json_dataset(slug: str) -> tuple[dict[str, Any], Path]:
    source = DATASETS_DIR / f"{slug}.json"
    if not source.exists():
        raise FileNotFoundError(f"Dataset JSON not found: {source}")

    with open(source, encoding="utf-8") as f:
        data = json.load(f)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dest_dir = RAW_SNAPSHOTS_DIR / slug
    dest_dir.mkdir(parents=True, exist_ok=True)
    snapshot_path = dest_dir / f"{timestamp}.json"

    shutil.copy2(source, snapshot_path)

    sidecar = {
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "source_path": str(source.relative_to(PROJECT_ROOT)),
        "extractor_version": "etl/1.0",
    }
    snapshot_path.with_suffix(".meta.json").write_text(
        json.dumps(sidecar, indent=2), encoding="utf-8"
    )

    return data, snapshot_path
