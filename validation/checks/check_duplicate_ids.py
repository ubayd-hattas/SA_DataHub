"""Check for duplicate statistic IDs across dataset JSON files."""

from __future__ import annotations

from collections import defaultdict

from validation.loaders import all_statistics, load_json_datasets
from validation.models import CheckResult, Severity


def run() -> CheckResult:
    result = CheckResult(name="check_duplicate_ids")
    datasets = load_json_datasets()
    by_id: dict[str, list[str]] = defaultdict(list)

    for file_slug, stat in all_statistics(datasets):
        by_id[stat["id"]].append(file_slug)

    duplicates = {k: v for k, v in by_id.items() if len(v) > 1}
    if duplicates:
        for stat_id, files in sorted(duplicates.items()):
            result.add(
                Severity.FAIL,
                f"Statistic ID '{stat_id}' appears in multiple files: {files}",
                "Keep one canonical JSON file per statistic ID before PostgreSQL migration.",
                stat_id=stat_id,
                files=files,
            )
    else:
        result.add(
            Severity.PASS,
            f"All {len(by_id)} statistic IDs are unique across dataset files.",
        )

    # Municipality codes
    muni = datasets.get("municipalities", {}).get("municipalities", [])
    muni_ids = [m["id"] for m in muni]
    if len(muni_ids) != len(set(muni_ids)):
        result.add(Severity.FAIL, "Duplicate municipality codes found in municipalities.json")
    elif muni_ids:
        result.add(
            Severity.PASS,
            f"All {len(muni_ids)} municipality codes are unique.",
        )

    return result
