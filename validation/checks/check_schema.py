"""Validate statistic value ranges and trend/change consistency."""

from __future__ import annotations

from validation.loaders import all_statistics, load_json_datasets
from validation.models import CheckResult, Severity


def run() -> CheckResult:
    result = CheckResult(name="check_schema")
    datasets = load_json_datasets()

    for file_slug, stat in all_statistics(datasets):
        sid = stat["id"]
        unit = stat.get("unit", "")
        raw = stat.get("rawValue")
        change = stat.get("change")
        trend = stat.get("trend")

        if not isinstance(raw, (int, float)):
            result.add(Severity.FAIL, f"'{sid}' rawValue is not numeric: {raw!r}")
            continue

        if unit == "%" and not (0 <= raw <= 100):
            result.add(
                Severity.WARN,
                f"'{sid}' percent value out of 0–100 range: {raw}",
            )

        if isinstance(change, (int, float)) and trend in ("up", "down", "stable"):
            if change > 0 and trend == "down":
                result.add(
                    Severity.WARN,
                    f"'{sid}' trend is 'down' but change is positive ({change})",
                )
            elif change < 0 and trend == "up":
                result.add(
                    Severity.WARN,
                    f"'{sid}' trend is 'up' but change is negative ({change})",
                )
            elif change == 0 and trend not in ("stable",):
                result.add(
                    Severity.WARN,
                    f"'{sid}' change is 0 but trend is '{trend}'",
                )

        for series in stat.get("series", []):
            for pt in series.get("data", []):
                if not isinstance(pt.get("value"), (int, float)):
                    result.add(
                        Severity.FAIL,
                        f"'{sid}' series point has non-numeric value: {pt}",
                    )

    if not any(f.severity == Severity.FAIL for f in result.findings):
        result.add(Severity.PASS, "Schema value types and ranges look valid.")

    return result
