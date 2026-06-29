"""Validate province slugs, codes, and municipality geography."""

from __future__ import annotations

from validation.config import PROVINCE_CODES, PROVINCE_SLUGS
from validation.loaders import load_json_datasets
from validation.models import CheckResult, Severity


def run() -> CheckResult:
    result = CheckResult(name="check_geography_integrity")
    datasets = load_json_datasets()

    provinces = datasets.get("provinces", {}).get("provinces", [])
    prov_ids = {p["id"] for p in provinces}
    missing_slugs = PROVINCE_SLUGS - prov_ids
    extra_slugs = prov_ids - PROVINCE_SLUGS
    for s in sorted(missing_slugs):
        result.add(Severity.FAIL, f"Missing province slug in provinces.json: {s}")
    for s in sorted(extra_slugs):
        result.add(Severity.FAIL, f"Unknown province slug in provinces.json: {s}")
    if not missing_slugs and not extra_slugs:
        result.add(Severity.PASS, f"All {len(PROVINCE_SLUGS)} province slugs present.")

    municipalities = datasets.get("municipalities", {}).get("municipalities", [])
    meta = datasets.get("municipalities", {}).get("_meta", {})
    expected_total = meta.get("total_records") or meta.get("category_counts", {}).get("total")
    if expected_total and len(municipalities) != expected_total:
        result.add(
            Severity.FAIL,
            f"Municipality count {len(municipalities)} != _meta total {expected_total}",
        )
    elif municipalities:
        result.add(Severity.PASS, f"Municipality count matches metadata ({len(municipalities)}).")

    bad_codes: list[str] = []
    for m in municipalities:
        if m.get("province") not in PROVINCE_CODES:
            bad_codes.append(m["id"])
    if bad_codes:
        result.add(
            Severity.FAIL,
            f"Municipalities with invalid province codes: {bad_codes[:5]}...",
        )
    elif municipalities:
        result.add(Severity.PASS, "All municipality province codes are valid.")

    return result
