"""Verify registry statIds resolve to real statistics."""

from __future__ import annotations

from validation.loaders import all_statistics, load_json_datasets, parse_registry_stat_ids
from validation.models import CheckResult, Severity


def run() -> CheckResult:
    result = CheckResult(name="check_registry_integrity")
    datasets = load_json_datasets()
    stats = {s["id"]: (slug, s) for slug, s in all_statistics(datasets)}
    registry = parse_registry_stat_ids()

    missing = 0
    for reg_slug, stat_ids in sorted(registry.items()):
        if reg_slug == "provinces":
            if stat_ids:
                result.add(
                    Severity.WARN,
                    "Provinces registry entry should have empty statIds.",
                )
            continue
        for sid in stat_ids:
            if sid not in stats:
                missing += 1
                result.add(
                    Severity.FAIL,
                    f"Registry '{reg_slug}' references missing stat '{sid}'.",
                    "Add the statistic to the correct JSON file or update registry statIds.",
                    registry_slug=reg_slug,
                    stat_id=sid,
                )

    # Stats not referenced by any registry entry (informational)
    referenced = {sid for ids in registry.values() for sid in ids}
    unregistered = set(stats) - referenced
    for sid in sorted(unregistered):
        slug, _ = stats[sid]
        result.add(
            Severity.WARN,
            f"Statistic '{sid}' in '{slug}.json' is not listed in any registry statIds.",
            "Add to the appropriate registry entry for downloads/citations.",
            stat_id=sid,
            file=slug,
        )

    if missing == 0:
        result.add(
            Severity.PASS,
            "All registry statIds resolve to existing statistics.",
        )

    return result
