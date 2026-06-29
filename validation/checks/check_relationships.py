"""Check story references, update history, and mock imports."""

from __future__ import annotations

import re

from validation.config import MOCK_FILE, REGISTRY_DATASET_SLUGS, STORIES_FILE
from validation.loaders import (
    all_statistics,
    load_json_datasets,
    parse_story_stat_ids,
    parse_update_history_dataset_ids,
)
from validation.models import CheckResult, Severity


def run() -> CheckResult:
    result = CheckResult(name="check_relationships")
    datasets = load_json_datasets()
    stat_ids = {s["id"] for _, s in all_statistics(datasets)}

    # Story stat references
    story_refs = parse_story_stat_ids()
    for sid in sorted(story_refs):
        if sid not in stat_ids:
            result.add(
                Severity.FAIL,
                f"Story references missing statistic '{sid}'",
                "Add stat to JSON or update stories.ts.",
            )
    if story_refs and all(s in stat_ids for s in story_refs):
        result.add(
            Severity.PASS,
            f"All {len(story_refs)} story stat references resolve.",
        )

    # Update history dataset IDs
    history_ids = parse_update_history_dataset_ids()
    for hid in sorted(history_ids):
        if hid not in REGISTRY_DATASET_SLUGS:
            result.add(
                Severity.WARN,
                f"update-history datasetId '{hid}' not in registry slugs.",
            )
    missing_history = REGISTRY_DATASET_SLUGS - history_ids
    for hid in sorted(missing_history):
        result.add(
            Severity.WARN,
            f"Registry slug '{hid}' has no update-history entry.",
            "Add entry to src/data/update-history.ts when dataset is verified.",
        )

    # mock.ts imports all dataset JSON files used in statistics
    mock_text = MOCK_FILE.read_text(encoding="utf-8")
    for slug, data in datasets.items():
        if "statistics" in data and slug != "provinces":
            if f"datasets/{slug}.json" not in mock_text:
                result.add(
                    Severity.FAIL,
                    f"mock.ts does not import datasets/{slug}.json",
                )

    # Story slugs unique
    story_slugs = re.findall(
        r"slug:\s*'([^']+)'", STORIES_FILE.read_text(encoding="utf-8")
    )
    if len(story_slugs) != len(set(story_slugs)):
        result.add(Severity.FAIL, "Duplicate story slugs in stories.ts")

    return result
