# SA Data Hub — ETL

Extract → transform → validate → preview → load pipelines for PostgreSQL migration.

## Quick start

```bash
# Dependencies
pip install -r etl/requirements.txt

# Preview (no database writes)
npm run etl -- unemployment

# Validate and load
npm run etl -- unemployment --load

# Verify loaded data
npm run etl:verify unemployment

# Equivalence tests (requires DATABASE_URL + loaded data)
npm run test:equivalence
```

## Unemployment pipeline (template)

| Stage | Module | Purpose |
|-------|--------|---------|
| Extract | `extract/json_dataset.py` | Read `unemployment.json`, archive raw snapshot |
| Transform | `transform/time_series.py` | Map statistics → observations + snapshots |
| Validate | `validate/runner.py` | Range checks + `validation/report.py` gate |
| Preview | `pipelines/unemployment.py` | Summary before load (default mode) |
| Load | `load/postgres.py` | Upsert observations, snapshots, audit rows |

### Expected output (preview)

```
Status:          preview
Rows extracted:  3
Rows transformed: 44
Rows inserted:   0
...
Preview:
  observation_count: 44
  observations_by_stat_id:
    labour-force-participation: 12
    unemployment-national: 16
    youth-unemployment: 16
```

### Expected output (load)

First run: 44 inserted, 0 updated, 0 skipped.  
Second run: 0 inserted, 0 updated, 44 skipped (idempotent).

## Adding the next dataset

1. Copy `pipelines/unemployment.py` → `pipelines/{slug}.py`
2. Register in `etl/run.py` `PIPELINES` dict
3. Add config to `etl/verify.mjs` `PIPELINE_CONFIG`
4. Add `tests/equivalence/{slug}.test.ts`
5. Reuse `transform/time_series.py` for standard time-series JSON

## Raw snapshots

Archived under `etl/raw-snapshots/{slug}/` (gitignored). Never mutate after write.

See [docs/etl-pipeline.md](../docs/etl-pipeline.md).
