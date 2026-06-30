#!/usr/bin/env python3
"""
SA Data Hub ETL runner.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from etl.lib.types import PipelineResult  # noqa: E402
from etl.pipelines import unemployment, youth_unemployment  # noqa: E402

PIPELINES = {
    "unemployment": unemployment.run,
    "youth-unemployment": youth_unemployment.run,
}


def format_result(result: PipelineResult) -> str:
    lines = [
        "=" * 64,
        f"  ETL — {result.dataset_slug}",
        "=" * 64,
        f"  Status:          {result.status}",
        f"  Rows extracted:  {result.rows_extracted}",
        f"  Rows transformed:{result.rows_transformed:>3}",
        f"  Rows inserted:   {result.rows_inserted}",
        f"  Rows updated:    {result.rows_updated}",
        f"  Rows skipped:    {result.rows_skipped}",
        f"  Duration:        {result.duration_ms} ms",
    ]
    if result.version_id is not None:
        lines.append(f"  Version ID:      {result.version_id}")
    if result.source_snapshot_path:
        lines.append(f"  Snapshot:        {result.source_snapshot_path}")

    if result.warnings:
        lines.append("")
        lines.append("  Warnings:")
        for w in result.warnings:
            lines.append(f"    WARN {w}")

    if result.errors:
        lines.append("")
        lines.append("  Errors:")
        for e in result.errors:
            lines.append(f"    FAIL {e}")

    if result.preview:
        lines.append("")
        lines.append("  Preview:")
        lines.append(json.dumps(result.preview, indent=4))

    lines.append("=" * 64)
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="SA Data Hub ETL runner")
    parser.add_argument("dataset", nargs="?", help="Dataset slug (e.g. unemployment)")
    parser.add_argument("--load", action="store_true", help="Load into PostgreSQL after validation")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    parser.add_argument("--list", action="store_true", help="List available pipelines")
    args = parser.parse_args()

    if args.list:
        print("Available pipelines:")
        for slug in sorted(PIPELINES):
            print(f"  - {slug}")
        return 0

    if not args.dataset:
        parser.error("dataset slug required (or use --list)")

    runner = PIPELINES.get(args.dataset)
    if not runner:
        print(f"Unknown pipeline: {args.dataset}", file=sys.stderr)
        print(f"Available: {', '.join(sorted(PIPELINES))}", file=sys.stderr)
        return 1

    result = runner(load=args.load)

    if args.json:
        print(json.dumps(result.__dict__, indent=2, default=str))
    else:
        print(format_result(result))

    return 0 if result.status != "failed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
