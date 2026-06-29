# SA Data Hub — database migrations

Numbered SQL files applied in order by `npm run db:migrate`.

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | All tables, inline PKs and FKs |
| `002_indexes.sql` | Indexes, views, `pg_trgm` extension |
| `003_constraints.sql` | Natural-key unique constraints |
| `004_seed_reference_data.sql` | Categories, sources, geographies, dataset metadata |

## Apply migrations

```bash
cp .env.example .env.local
# Add DATABASE_URL from Neon console

npm run db:migrate        # apply pending migrations
npm run db:migrate:status # list applied / pending
npm run db:inspect        # row counts / migration status
npm run db:reset          # DROP SCHEMA public (dev branch only!)
```

## Regenerate seed data

After changing categories, registry statistics, or geography JSON:

```bash
npm run db:seed:generate
```

This rewrites `004_seed_reference_data.sql` from:

- `src/data/mock.ts` categories (hardcoded in generator)
- `src/app/methodology/page.tsx` data sources
- `src/data/datasets/*.json` statistic metadata
- `src/data/datasets/provinces.json` + `municipalities.json` geographies

**Do not import observations** — that is Phase 2 ETL.

## Design notes

- `datasets.slug` is **not unique** — multiple statistics share one registry JSON file.
- `datasets.stat_id` is the ETL lookup key (maps to `Statistic.id`).
- `observations` is empty after Phase 1 — expected.
- Use a Neon dev branch for experimentation; apply to main only after review.

See [docs/database-schema.md](../docs/database-schema.md) and [docs/migration-plan.md](../docs/migration-plan.md).
