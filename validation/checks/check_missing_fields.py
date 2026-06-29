"""Check required fields on statistics, sources, and _meta blocks."""

from __future__ import annotations

from validation.config import (
    REQUIRED_META_FIELDS,
    REQUIRED_SOURCE_FIELDS,
    REQUIRED_STAT_FIELDS,
    VALID_CATEGORY_IDS,
)
from validation.loaders import load_json_datasets
from validation.models import CheckResult, Severity


def run() -> CheckResult:
    result = CheckResult(name="check_missing_fields")
    datasets = load_json_datasets()

    for slug, data in datasets.items():
        if "statistics" not in data and slug not in ("provinces", "municipalities"):
            result.add(Severity.WARN, f"{slug}.json has no statistics array.")

        meta = data.get("_meta")
        if not meta:
            result.add(Severity.FAIL, f"{slug}.json missing _meta block.")
            continue
        missing_meta = REQUIRED_META_FIELDS - set(meta.keys())
        # municipalities uses extended _meta — only check core fields
        if missing_meta:
            result.add(
                Severity.WARN,
                f"{slug}.json _meta missing fields: {sorted(missing_meta)}",
                "Add standard _meta keys for migration metadata mapping.",
            )

    for file_slug, stat in [
        (s, st) for s, d in datasets.items() for st in d.get("statistics", [])
    ]:
        sid = stat.get("id", "<unknown>")
        missing = REQUIRED_STAT_FIELDS - set(stat.keys())
        if missing:
            result.add(
                Severity.FAIL,
                f"Statistic '{sid}' in {file_slug}.json missing: {sorted(missing)}",
            )
        if stat.get("categoryId") not in VALID_CATEGORY_IDS:
            result.add(
                Severity.FAIL,
                f"Statistic '{sid}' invalid categoryId: {stat.get('categoryId')!r}",
            )
        source = stat.get("source", {})
        missing_src = REQUIRED_SOURCE_FIELDS - set(source.keys())
        if missing_src:
            result.add(
                Severity.FAIL,
                f"Statistic '{sid}' source missing: {sorted(missing_src)}",
            )

    if not any(f.severity == Severity.FAIL for f in result.findings):
        result.add(Severity.PASS, "Required statistic and source fields present.")

    return result
