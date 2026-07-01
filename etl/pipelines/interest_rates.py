"""
interest_rates — ETL pipeline for interest-rates.json.

Mirrors the structure of etl/pipelines/unemployment.py.

This pipeline reads the interest-rates.json dataset (which the SARB
automation adapter keeps up to date) and loads it into PostgreSQL using the
shared ETL framework (extract → validate → transform → load).

Usage
-----
    # Preview only (no DB writes)
    from etl.pipelines.interest_rates import run
    result = run()

    # Full load into PostgreSQL
    result = run(load=True)

Dataset schema (interest-rates.json)
-------------------------------------
  statistics:
    - id: "repo-rate-sarb"       (repo rate time series)
    - id: "prime-lending-rate"   (prime rate time series)
  Each statistic has:
    - rawValue: float            (current rate %)
    - change: float              (delta from previous MPC decision)
    - trend: "up"|"down"|"stable"
    - lastUpdated: YYYY-MM-DD
    - series[0].data: [{label: "Mon YYYY", value: float}, ...]

Business rules enforced here
-----------------------------
  - prime = repo + 3.5 (validated before load)
  - Both stat IDs must be present
  - All series data points must parse as valid period labels

ETL-PostgreSQL integration
--------------------------
  Reuses the same load functions as unemployment.py:
    create_dataset_version, load_observations, load_statistic_snapshots,
    record_update_event.

  Table mapping:
    observations      → stat_id, geography_code="ZA", period_label, value
    statistic_snapshots → stat_id, display_value, raw_value, trend, last_updated
    dataset_versions  → version record for audit trail
    update_events     → human-readable update log
"""

from __future__ import annotations

import time
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

DATASET_SLUG = "interest-rates"

EXPECTED_STAT_IDS = {
    "repo-rate-sarb",
    "prime-lending-rate",
}

EXPECTED_GEOGRAPHY_CODES = {"ZA"}

# Business rule (mirrors automation/adapters/sarb.py)
_PRIME_REPO_SPREAD = 3.5
_SPREAD_TOLERANCE = 0.001


def _validate_business_rules(data: dict[str, Any]) -> list[str]:
    """
    Enforce SARB-specific business rules on the parsed dataset document.

    Returns a list of warning strings (empty if all rules pass).
    These are recorded as warnings, not hard failures — the pipeline
    continues loading even if the spread is slightly off due to rounding,
    but the deviation is logged for operator review.
    """
    warnings: list[str] = []
    stats = {s["id"]: s for s in data.get("statistics", [])}

    repo = stats.get("repo-rate-sarb")
    prime = stats.get("prime-lending-rate")

    if repo is None:
        warnings.append("Missing statistic 'repo-rate-sarb' in interest-rates.json")
    if prime is None:
        warnings.append("Missing statistic 'prime-lending-rate' in interest-rates.json")

    if repo is not None and prime is not None:
        try:
            repo_val = float(repo["rawValue"])
            prime_val = float(prime["rawValue"])
            expected_prime = repo_val + _PRIME_REPO_SPREAD
            delta = abs(prime_val - expected_prime)
            if delta > _SPREAD_TOLERANCE:
                warnings.append(
                    f"Business rule deviation: prime ({prime_val:.4f}%) should be "
                    f"repo ({repo_val:.4f}%) + {_PRIME_REPO_SPREAD}% = "
                    f"{expected_prime:.4f}% (delta={delta:.4f}%)"
                )
        except (KeyError, TypeError, ValueError) as exc:
            warnings.append(f"Cannot validate spread business rule: {exc}")

    return warnings


def build_preview(
    observations: list,
    snapshots: list,
    validation_warnings: list[str],
) -> dict[str, Any]:
    """Build a preview summary dict for the pipeline result."""
    from collections import Counter

    by_stat = Counter(o.stat_id for o in observations)
    return {
        "dataset_slug": DATASET_SLUG,
        "statistics": sorted(EXPECTED_STAT_IDS),
        "observation_count": len(observations),
        "observations_by_stat_id": dict(sorted(by_stat.items())),
        "geography_codes": sorted({o.geography_code for o in observations}),
        "period_range": {
            "earliest": (
                min(o.period_label for o in observations) if observations else None
            ),
            "latest": (
                max(o.period_label for o in observations) if observations else None
            ),
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
    """
    Execute the interest-rates ETL pipeline.

    Parameters
    ----------
    load:
        When False (default), runs in preview mode — extracts, validates, and
        transforms the data but does NOT write to PostgreSQL.
        When True, performs a full load into the database.

    Returns
    -------
    PipelineResult
        Contains status, row counts, preview data, warnings, and errors.
    """
    started = time.perf_counter()
    result = PipelineResult(dataset_slug=DATASET_SLUG, status="preview")

    try:
        # --- Extract ---
        raw, snapshot_path = extract_json_dataset(DATASET_SLUG)
        result.rows_extracted = len(raw.get("statistics", []))
        result.source_snapshot_path = str(snapshot_path)

        # --- Generic JSON schema validation ---
        json_warnings = validate_dataset_json(raw, DATASET_SLUG)
        result.warnings.extend(json_warnings)

        # --- SARB-specific business rule validation ---
        biz_warnings = _validate_business_rules(raw)
        result.warnings.extend(biz_warnings)

        # --- Transform (shared time-series transformer) ---
        observations, snapshots = transform_time_series_dataset(raw)
        result.rows_transformed = len(observations)

        # --- Observation validation ---
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

        # --- Preview mode: return without loading ---
        if not load:
            result.duration_ms = int((time.perf_counter() - started) * 1000)
            return result

        # --- Full load ---
        version_id = create_dataset_version(
            dataset_slug=DATASET_SLUG,
            source_snapshot_path=str(snapshot_path),
            row_count=len(observations),
            status="success",
            duration_ms=0,
            notes=(
                "Interest rates ETL load — "
                "repo rate and prime lending rate series. "
                "Source: SARB HomePageRates API via automation adapter."
            ),
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
                f"Loaded {len(observations)} observations for interest-rates dataset "
                f"({inserted} inserted, {updated} updated, {skipped} skipped). "
                f"Repo rate: {meta.get('publicationDate', 'unknown effective date')}."
            ),
            source_url=meta.get("source_url") or meta.get("source_url", ""),
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
