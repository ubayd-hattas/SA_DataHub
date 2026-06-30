"""Youth unemployment dataset ETL pipeline — follows the unemployment.py template."""

from __future__ import annotations

import time
from collections import Counter
from datetime import date
from typing import Any

from etl.extract.json_dataset import extract_json_dataset
from etl.load.postgres import (
    create_dataset_version,
    load_observations,
    load_statistic_snapshots,
    record_update_event,
)
from etl.lib.types import PipelineResult
from etl.transform.time_series import transform_time_series_dataset
from etl.validate.runner import validate_dataset_json, validate_observations

DATASET_SLUG = "youth-unemployment"

EXPECTED_STAT_IDS = {
    "youth-unemployment-narrow",
    "youth-unemployment-1524",
    "youth-unemployment-expanded",
    "youth-neet-rate",
}

EXPECTED_GEOGRAPHY_CODES = {"ZA"}


def build_preview(
    observations: list,
    snapshots: list,
    validation_warnings: list[str],
) -> dict[str, Any]:
    by_stat = Counter(o.stat_id for o in observations)
    return {
        "dataset_slug": DATASET_SLUG,
        "statistics": sorted(EXPECTED_STAT_IDS),
        "observation_count": len(observations),
        "observations_by_stat_id": dict(sorted(by_stat.items())),
        "geography_codes": sorted({o.geography_code for o in observations}),
        "period_range": {
            "earliest": min(o.period_label for o in observations) if observations else None,
            "latest": max(o.period_label for o in observations) if observations else None,
        },
        "snapshots": [
            {
                "stat_id": s.stat_id,
                "display_value": s.display_value,
                "raw_value": s.raw_value,
                "trend": s.trend,
            }
            for s in snapshots
        ],
        "sample_observations": [
            {
                "stat_id": o.stat_id,
                "geography_code": o.geography_code,
                "period_label": o.period_label,
                "value": o.value,
            }
            for o in observations[:5]
        ],
        "validation_warnings": validation_warnings,
    }


def run(*, load: bool = False) -> PipelineResult:
    started = time.perf_counter()
    result = PipelineResult(dataset_slug=DATASET_SLUG, status="preview")

    try:
        raw, snapshot_path = extract_json_dataset(DATASET_SLUG)
        result.rows_extracted = len(raw.get("statistics", []))
        result.source_snapshot_path = str(snapshot_path)

        json_warnings = validate_dataset_json(raw, DATASET_SLUG)
        result.warnings.extend(json_warnings)

        observations, snapshots = transform_time_series_dataset(raw)
        result.rows_transformed = len(observations)

        validation = validate_observations(
            observations,
            snapshots,
            expected_stat_ids=EXPECTED_STAT_IDS,
            expected_geography_codes=EXPECTED_GEOGRAPHY_CODES,
        )
        result.warnings.extend(validation.warnings)

        if not validation.passed:
            result.status = "failed"
            result.errors = validation.errors
            result.duration_ms = int((time.perf_counter() - started) * 1000)
            result.preview = build_preview(observations, snapshots, result.warnings)
            return result

        result.preview = build_preview(observations, snapshots, result.warnings)

        if not load:
            result.duration_ms = int((time.perf_counter() - started) * 1000)
            return result

        version_id = create_dataset_version(
            dataset_slug=DATASET_SLUG,
            source_snapshot_path=str(snapshot_path),
            row_count=len(observations),
            status="success",
            duration_ms=0,
            notes="ETL load in progress",
        )

        inserted, updated, skipped = load_observations(
            observations, version_id=version_id
        )
        snapshot_rows = load_statistic_snapshots(snapshots)

        duration_ms = int((time.perf_counter() - started) * 1000)

        meta = raw.get("_meta", {})
        record_update_event(
            dataset_slug=DATASET_SLUG,
            event_date=date.today(),
            summary=(
                f"Loaded {len(observations)} observations for youth-unemployment dataset "
                f"({inserted} inserted, {updated} updated, {skipped} skipped)"
            ),
            source_url=meta.get("source_url"),
        )

        result.status = "success"
        result.rows_inserted = inserted
        result.rows_updated = updated
        result.rows_skipped = skipped
        result.version_id = version_id
        result.duration_ms = duration_ms
        result.preview["snapshots_loaded"] = snapshot_rows

    except Exception as exc:  # noqa: BLE001 — pipeline reports all failures
        result.status = "failed"
        result.errors.append(str(exc))
        result.duration_ms = int((time.perf_counter() - started) * 1000)

    return result
