# SA Data Hub — Development Guide

Engineering conventions for contributors working on SA Data Hub.

---

## Naming Conventions

### TypeScript / React

| Entity | Convention | Example |
|--------|------------|---------|
| Components | PascalCase | `StatCard.tsx`, `LineChartCard.tsx` |
| Files (lib) | camelCase | `registry.ts`, `municipality-copy.ts` |
| Route folders | kebab-case | `category/[slug]`, `municipalities/[code]` |
| Types / interfaces | PascalCase | `Statistic`, `MunicipalityRecord` |
| Type unions (IDs) | kebab-case strings | `CategoryId`, `Province` slug |
| Functions | camelCase | `getStatsByCategory`, `generateInsight` |
| Constants | SCREAMING_SNAKE or camelCase | `STORIES`, `datasetRegistry` |
| CSS | Tailwind utilities; `cn()` for merges | |

### Dataset identifiers

| Concept | Convention | Example |
|---------|------------|---------|
| JSON filename | kebab-case | `youth-unemployment.json` |
| Registry ID | matches filename stem | `youth-unemployment` |
| Statistic ID | kebab-case, descriptive | `unemployment-national` |
| Category ID | kebab-case | `unemployment` |
| Municipality code | Official Stats SA / MDB | `CPT`, `WC011` |
| Province slug (URL) | kebab-case | `western-cape` |
| Province code | 2–3 char Stats SA | `WC`, `GP` |

### Python (scripts / ETL)

| Entity | Convention | Example |
|--------|------------|---------|
| Modules | snake_case | `update_unemployment.py` |
| Functions | snake_case | `run()`, `fetch_indicator()` |
| Constants | SCREAMING_SNAKE | `WB_BASE`, `DATASETS_DIR` |

### PostgreSQL

| Entity | Convention | Example |
|--------|------------|---------|
| Tables | snake_case plural | `observations`, `dataset_versions` |
| Columns | snake_case | `period_start`, `geography_id` |
| Primary keys | `{table_singular}_id` or natural | `observation_id`, `slug` |
| Indexes | `idx_{table}_{columns}` | `idx_observations_dataset_geo_period` |
| Migrations | numbered prefix | `001_init.sql` |

---

## Folder Conventions

```
src/app/           # Routes only — minimal logic, delegate to lib/
src/components/
  charts/          # Recharts wrappers — accept data props, no direct JSON import
  layout/          # Navbar, Footer, ThemeProvider
  seo/             # Breadcrumbs, JsonLd
  ui/              # Reusable presentational components
src/data/
  datasets/        # Canonical JSON (current) — one file per logical dataset
  mock.ts          # Data facade — only place pages should import data from
  stories.ts       # Authored content
src/lib/           # Domain logic — no JSX
  db/              # PostgreSQL query functions (growing)
src/types/         # Shared data model types only
scripts/           # Legacy updaters — migrate to etl/
etl/               # Target ETL home (create during migration)
db/migrations/     # SQL migrations (create during migration)
docs/              # Engineering documentation (this folder)
```

**Rules:**

- Pages import data via `@/data/mock` or `@/lib/db` — never import JSON directly in components
- `lib/registry.ts` is metadata hub — add new datasets here when adding JSON
- Feature-specific types (e.g. `CitationStyle`) live in the feature file, not `types/index.ts`

---

## SQL Conventions

```sql
-- Always use parameterized queries from TypeScript
const rows = await sql`
  SELECT o.value, o.period_label
  FROM observations o
  JOIN datasets d ON d.dataset_id = o.dataset_id
  WHERE d.stat_id = ${statId}
    AND o.geography_id = ${geoId}
  ORDER BY o.period_start ASC
`;

-- Upsert pattern
INSERT INTO observations (...)
VALUES (...)
ON CONFLICT (dataset_id, geography_id, period_start)
DO UPDATE SET value = EXCLUDED.value, version_id = EXCLUDED.version_id;

-- Never string-interpolate user input into SQL
```

- Use `TIMESTAMPTZ` for timestamps
- Use `NUMERIC` for statistical values (not `FLOAT`)
- Use `TEXT` over `VARCHAR(n)` unless constraint needed
- Document enum-like columns with `CHECK` constraints

---

## ETL Conventions

1. **Extract** writes immutable raw snapshots
2. **Transform** is pure — no side effects
3. **Validate** fails the pipeline on critical errors
4. **Load** is idempotent (`ON CONFLICT DO UPDATE`)
5. Log structured JSON: `{ event, dataset, status, rows, duration_ms }`
6. One pipeline per registry slug
7. Preserve `_meta.notes` in `datasets.notes` column

**Running updaters today:**

```bash
pip install -r scripts/requirements.txt
python scripts/update_all.py
python scripts/update_all.py --only inflation --dry-run
node scripts/transform_municipalities.js
```

---

## Adding a New Dataset (Current JSON Workflow)

1. Create `src/data/datasets/{slug}.json` with `_meta` + `statistics[]`
2. Import and spread into `statistics[]` in `src/data/mock.ts`
3. Add `DatasetRegistryEntry` in `src/lib/registry.ts`
4. Update category `stats` count in `mock.ts` `categories` if new category
5. Add chart on category page if needed (automatic if `categoryId` matches)
6. Add `scripts/update_{slug}.py` + register in `update_all.py`
7. Add entry to `src/data/update-history.ts`
8. Document in `docs/dataset-analysis.md`

Downloads, citations, freshness, and updates pages work automatically via registry.

---

## Adding a Data Story

1. Add `Story` object to `src/data/stories.ts`
2. Use existing `relatedStatIds` for live callouts
3. Story auto-indexed in search via `insights/page.tsx`
4. Add to sitemap via `STORIES` array (automatic)

---

## Git Workflow

| Practice | Detail |
|----------|--------|
| Default branch | `main` |
| Deploy | Push to `main` → Vercel auto-deploy |
| Branch naming | `feat/`, `fix/`, `data/`, `docs/` prefixes |
| Commits | Imperative mood; focus on why |
| PRs | Open issue for large changes |
| Secrets | Never commit `.env*`; use `.env.example` |
| Data PRs | Include source URL and release date in PR description |

**Do not commit:**

- `.env.local`
- `.next/`
- `node_modules/`
- Large raw snapshots (use gitignore / LFS)

---

## Testing Strategy

### Current state

No test runner configured. Recommended setup:

```bash
npm install -D vitest @testing-library/react
```

### Priority test targets

| Module | Why |
|--------|-----|
| `lib/citation.ts` | Format strings; regression-prone |
| `lib/registry.ts` | Freshness, status derivation |
| `lib/insights.ts` | Trend logic |
| `lib/export.ts` | CSV escaping |
| `etl/transform/periods.py` | Date normalization |
| `lib/db/*.ts` | Query correctness post-migration |

### Equivalence tests (migration)

Compare JSON vs DB output per statistic — run in CI on every PR touching data layer.

### Manual smoke test

```bash
npm run build   # Must pass — catches SSG errors
npm run lint
```

---

## Documentation Standards

| Change type | Update |
|-------------|--------|
| New dataset | `docs/dataset-analysis.md` |
| Schema change | `db/migrations/` + `docs/database-schema.md` |
| Architecture decision | `docs/decisions/NNNN-title.md` (create folder) |
| API endpoint | `docs/api-design.md` |
| AI-relevant convention | `docs/ai-context.md` |

Keep root `README.md` user-facing; put engineering detail in `/docs`.

---

## Code Style

- TypeScript strict mode
- Server components by default — `'use client'` only when needed
- No `any` in new code (existing `as any` in registry JSON imports — migrate to typed imports)
- Prefer existing utilities: `cn()`, `formatDate()`, `formatNumber()`
- Match surrounding comment density — don't over-comment

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | For DB mode | Neon PostgreSQL connection string |
| `DATA_SOURCE` | Optional | `json` (default) or `db` |
| `WRITE_JSON` | ETL only | Dual-write during migration |

`.env.example`:

```
DATABASE_URL=
DATA_SOURCE=json
```

---

## Performance Guidelines

- Avoid importing `municipalities.json` in client components
- Use `generateStaticParams` for known routes
- Memoize expensive client filters (`useMemo` in explorers)
- Post-migration: paginate municipality queries in SQL, not JS

---

## Accessibility

- Keyboard navigation for search and menus
- Chart tooltips are mouse-focused — add `aria-label` on stat cards
- Color contrast in dark mode (test both themes)

---

## Local Development Checklist

```bash
git clone <repo>
cd stats_data
npm install
npm run dev

# Optional: Python updaters
pip install -r scripts/requirements.txt

# Optional: Database
cp .env.example .env.local
# Add DATABASE_URL
curl http://localhost:3000/api/test-db
```

---

## Related Documents

- [architecture.md](./architecture.md)
- [ai-context.md](./ai-context.md)
- [migration-plan.md](./migration-plan.md)
