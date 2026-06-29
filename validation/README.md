# SA Data Hub — Data Validation

Reusable validation framework for JSON datasets, registry integrity, and migration readiness.

## Quick start

From the project root:

```bash
python validation/report.py
python validation/report.py --strict   # CI: fail on warnings
python validation/report.py --json > validation-report.json
```

Or via npm:

```bash
npm run validate
```

## When to run

- After every `python scripts/update_all.py` run
- Before any PostgreSQL migration PR
- In CI (recommended: `--strict` once warnings are triaged)

## Checks

| Script | Module | Purpose |
|--------|--------|---------|
| `check_json_structure` | `checks/check_json_structure.py` | Valid JSON and top-level keys |
| `check_duplicate_ids` | `checks/check_duplicate_ids.py` | Unique statistic & municipality IDs |
| `check_duplicate_slugs` | `checks/check_duplicate_slugs.py` | Registry slugs ↔ JSON files |
| `check_registry_integrity` | `checks/check_registry_integrity.py` | Registry statIds resolve |
| `check_missing_fields` | `checks/check_missing_fields.py` | Required fields on stats/_meta |
| `check_schema` | `checks/check_schema.py` | Value types, ranges, trend consistency |
| `check_dates` | `checks/check_dates.py` | ISO dates and period labels |
| `check_dataset_consistency` | `checks/check_dataset_consistency.py` | Cross-file SARB, LFPR, provincial |
| `check_geography_integrity` | `checks/check_geography_integrity.py` | Provinces and municipalities |
| `check_relationships` | `checks/check_relationships.py` | Stories, update-history, mock imports |

## Output

- ✓ passed checks
- ⚠ warnings (review recommended)
- ✗ failures (must fix before migration)

See [docs/migration-readiness.md](../docs/migration-readiness.md) for current health status.
