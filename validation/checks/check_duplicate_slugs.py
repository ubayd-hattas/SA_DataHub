"""Check registry dataset slugs match JSON files and are unique."""

from __future__ import annotations

from validation.config import DATASETS_DIR, REGISTRY_DATASET_SLUGS
from validation.loaders import load_json_datasets
from validation.models import CheckResult, Severity


def run() -> CheckResult:
    result = CheckResult(name="check_duplicate_slugs")
    datasets = load_json_datasets()
    json_slugs = {p.stem for p in DATASETS_DIR.glob("*.json")}

    # Registry slugs must have JSON (except we allow municipalities without registry)
    for slug in sorted(REGISTRY_DATASET_SLUGS):
        if slug not in json_slugs:
            result.add(
                Severity.FAIL,
                f"Registry slug '{slug}' has no matching JSON file.",
                f"Add src/data/datasets/{slug}.json or remove registry entry.",
            )

    # JSON statistics files should be in registry (warn for orphans)
    orphans = json_slugs - REGISTRY_DATASET_SLUGS - {"municipalities"}
    for slug in sorted(orphans):
        data = datasets[slug]
        if "statistics" in data:
            result.add(
                Severity.WARN,
                f"JSON file '{slug}.json' is not in registry dataset slugs.",
                "Add a DatasetRegistryEntry in src/lib/registry.ts.",
            )

    if not any(f.severity == Severity.FAIL for f in result.findings):
        result.add(
            Severity.PASS,
            f"Registry defines {len(REGISTRY_DATASET_SLUGS)} dataset slugs; "
            f"{len(json_slugs)} JSON files on disk.",
        )

    return result
