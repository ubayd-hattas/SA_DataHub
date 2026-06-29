"""ETL-stage validation — reuses project validation framework where possible."""

from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from etl.lib.periods import period_label_to_date
from etl.lib.types import LoadObservation, StatisticSnapshot

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


@dataclass
class ValidationResult:
    passed: bool
    rows_in: int
    rows_valid: int
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def run_repo_validation() -> tuple[bool, list[str]]:
    """Run the existing validation/report.py gate."""
    proc = subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "validation" / "report.py"), "--json"],
        capture_output=True,
        text=True,
        cwd=PROJECT_ROOT,
    )
    warnings: list[str] = []
    if proc.returncode != 0:
        return False, [proc.stdout or proc.stderr or "validation/report.py failed"]

    import json

    try:
        payload = json.loads(proc.stdout)
        for check in payload.get("checks", []):
            for finding in check.get("findings", []):
                if finding.get("severity") == "warn":
                    warnings.append(f"[{check['name']}] {finding['message']}")
        return payload.get("ok", True), warnings
    except json.JSONDecodeError:
        return proc.returncode == 0, warnings


def validate_observations(
    observations: list[LoadObservation],
    snapshots: list[StatisticSnapshot],
    *,
    expected_stat_ids: set[str],
    expected_geography_codes: set[str],
) -> ValidationResult:
    result = ValidationResult(passed=True, rows_in=len(observations), rows_valid=0)
    seen_keys: set[tuple[str, str, str]] = set()

    stat_ids = {o.stat_id for o in observations}
    missing_stats = expected_stat_ids - stat_ids
    if missing_stats:
        result.errors.append(f"Missing statistics in transform output: {sorted(missing_stats)}")
        result.passed = False

    extra_stats = stat_ids - expected_stat_ids
    if extra_stats:
        result.warnings.append(f"Unexpected statistics in transform output: {sorted(extra_stats)}")

    for obs in observations:
        key = (obs.stat_id, obs.geography_code, obs.period_start.isoformat())
        if key in seen_keys:
            result.errors.append(
                f"Duplicate natural key: {obs.stat_id} / {obs.geography_code} / {obs.period_label}"
            )
            result.passed = False
            continue
        seen_keys.add(key)

        if obs.geography_code not in expected_geography_codes:
            result.errors.append(f"Unknown geography code: {obs.geography_code}")
            result.passed = False
            continue

        if not (0 <= obs.value <= 100):
            result.warnings.append(
                f"{obs.stat_id} {obs.period_label}: value {obs.value} outside 0–100%"
            )

        try:
            parsed = period_label_to_date(obs.period_label)
            if parsed != obs.period_start:
                result.errors.append(
                    f"{obs.stat_id} {obs.period_label}: period_start mismatch "
                    f"({obs.period_start} vs {parsed})"
                )
                result.passed = False
                continue
        except ValueError as exc:
            result.errors.append(str(exc))
            result.passed = False
            continue

        result.rows_valid += 1

    for snap in snapshots:
        if snap.trend == "down" and snap.change is not None and snap.change > 0:
            result.warnings.append(f"{snap.stat_id}: trend down but change positive")
        if snap.trend == "up" and snap.change is not None and snap.change < 0:
            result.warnings.append(f"{snap.stat_id}: trend up but change negative")

    repo_ok, repo_warnings = run_repo_validation()
    result.warnings.extend(repo_warnings)
    if not repo_ok:
        result.errors.append("Repository validation/report.py reported failures")
        result.passed = False

    return result


def validate_dataset_json(data: dict[str, Any], slug: str) -> list[str]:
    """Lightweight JSON structure checks before transform."""
    warnings: list[str] = []
    if "_meta" not in data:
        warnings.append(f"{slug}: missing _meta block")
    stats = data.get("statistics", [])
    if not stats:
        warnings.append(f"{slug}: no statistics array")
    return warnings
