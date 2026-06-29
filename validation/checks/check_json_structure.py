"""Validate top-level JSON file structure per dataset type."""

from __future__ import annotations

import json

from validation.config import DATASETS_DIR
from validation.models import CheckResult, Severity


def run() -> CheckResult:
    result = CheckResult(name="check_json_structure")
    errors = 0

    for path in sorted(DATASETS_DIR.glob("*.json")):
        slug = path.stem
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            errors += 1
            result.add(Severity.FAIL, f"{slug}.json is invalid JSON: {e}")
            continue

        if not isinstance(data, dict):
            result.add(Severity.FAIL, f"{slug}.json root must be an object.")
            errors += 1
            continue

        if slug == "provinces":
            if "provinces" not in data:
                result.add(Severity.FAIL, f"{slug}.json missing 'provinces' array.")
                errors += 1
        elif slug == "municipalities":
            if "municipalities" not in data:
                result.add(Severity.FAIL, f"{slug}.json missing 'municipalities' array.")
                errors += 1
        else:
            if "statistics" not in data:
                result.add(Severity.FAIL, f"{slug}.json missing 'statistics' array.")
                errors += 1
            elif not isinstance(data["statistics"], list):
                result.add(Severity.FAIL, f"{slug}.json 'statistics' must be an array.")
                errors += 1

    if errors == 0:
        result.add(
            Severity.PASS,
            f"All {len(list(DATASETS_DIR.glob('*.json')))} JSON files parse and have expected top-level keys.",
        )

    return result
