"""Validation check package."""

from validation.checks import (
    check_dataset_consistency,
    check_dates,
    check_duplicate_ids,
    check_duplicate_slugs,
    check_geography_integrity,
    check_json_structure,
    check_missing_fields,
    check_registry_integrity,
    check_relationships,
    check_schema,
)

ALL_CHECKS = [
    check_json_structure,
    check_duplicate_ids,
    check_duplicate_slugs,
    check_registry_integrity,
    check_missing_fields,
    check_schema,
    check_dates,
    check_dataset_consistency,
    check_geography_integrity,
    check_relationships,
]
