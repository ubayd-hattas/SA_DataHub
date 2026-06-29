# SA Data Hub — AI Context

**Audience:** AI coding assistants (Cursor, Copilot, etc.) working on this repository.

**Read this first** before making changes. For full detail, see linked docs in `/docs`.

---

## Project Overview

SA Data Hub ([sadatahub.tech](https://sadatahub.tech)) is a Next.js 14 TypeScript app that visualises official South African statistics from Stats SA, SARB, SAPS, DBE, and World Bank. It serves 8 category pages, 9 province profiles, 213 municipality Census profiles, 5 data stories, CSV downloads, and citation widgets.

**Current data storage:** Static JSON in `src/data/datasets/`, aggregated by `src/data/mock.ts`, bundled at build time. **No production database reads yet** — but Neon PostgreSQL is provisioned (`src/lib/db/client.ts`, `/api/test-db`).

**Owner:** Solo developer project (portfolio + public good). Prefer simple, maintainable solutions over enterprise patterns.

---

## Architecture in Brief

```
Official sources → scripts/update_*.py → src/data/datasets/*.json
                                              ↓
                                        src/data/mock.ts (facade)
                                              ↓
                     src/lib/{registry,citation,insights,search,export}
                                              ↓
              src/app/* (server pages) + src/components/* (charts, ui)
```

**Target:** PostgreSQL on Neon + `etl/` pipelines + `src/lib/db/` + `/api/v1/*` REST API. Modular monolith — stay in one Next.js app.

**Deployment:** Vercel on push to `main`. Static generation for categories, provinces, municipalities, stories.

---

## Database Tables (Target Schema)

Fact/dimension model — see [database-schema.md](./database-schema.md).

| Table | Purpose |
|-------|---------|
| `data_sources` | Stats SA, SARB, SAPS, DBE provenance |
| `categories` | 8 UI categories |
| `datasets` | One row per `Statistic.id` + registry metadata |
| `geographies` | ZA → provinces → municipalities (self-referencing) |
| `observations` | Time series values (dataset × geography × period) |
| `statistic_snapshots` | Headline values, change, trend |
| `municipality_profiles` | Census 2022 wide JSONB profiles (213 rows) |
| `province_snapshots` | Composite province data |
| `dataset_versions` | ETL audit log |
| `update_events` | Human-readable update history |
| `stories` / `story_sections` | Data story content |
| `platform_changelog` | App release notes |

**Key constraint:** `UNIQUE (dataset_id, geography_id, period_start)` on observations for idempotent upserts.

---

## Key Relationships

- **Registry ID** = JSON filename stem (`youth-unemployment`) — may differ from **categoryId** (`unemployment`)
- **Multiple registry entries** can share one category (unemployment, youth-unemployment, labour-force)
- **interest-rates** registry entry has `categoryId: 'gdp'` (grouped in GDP & Economy UI)
- **Municipalities** are NOT in `datasetRegistry` — separate JSON + export path
- **Stories** reference `relatedStatIds` that resolve via `getStatById()` in `mock.ts`

---

## Folder Conventions

| Path | Role |
|------|------|
| `src/app/` | Routes only — thin pages |
| `src/data/mock.ts` | **Only** data import facade for pages (not mock data — it's production) |
| `src/data/datasets/*.json` | Canonical datasets |
| `src/lib/registry.ts` | Dataset metadata hub — downloads, citations, freshness |
| `src/lib/citation.ts` | APA/Harvard — feature types stay in this file |
| `src/lib/insights.ts` | Rule-based insight generation from series |
| `src/components/charts/` | Recharts wrappers |
| `scripts/` | Python updaters (migrating to `etl/`) |
| `validation/` | Data validation framework (`npm run validate`) |

**Do not** import JSON directly in page components. **Do not** put business logic in JSX files.

---

## Coding Conventions

- Server components default; `'use client'` only for interactivity
- Types for data models in `src/types/index.ts`; feature types in feature files
- Tailwind + `cn()` for styling; three fonts: DM Serif Display, DM Sans, DM Mono
- Python: snake_case; TypeScript: camelCase components, PascalCase types
- SQL: parameterized queries only; snake_case tables/columns
- Minimal diffs — don't refactor unrelated code
- Don't add tests unless asked (but `citation.ts`, `registry.ts`, `insights.ts` are good candidates)

---

## Common Terminology

| Term | Meaning |
|------|---------|
| Statistic | One measurable indicator with headline + optional series |
| Registry entry | Metadata for a JSON file / download card |
| Category | UI grouping (8 total) — maps to `/category/[slug]` |
| Observation | One value at one geography and period (DB term) |
| QLFS | Quarterly Labour Force Survey (Stats SA P0211) |
| Freshness | `fresh` / `recent` / `stale` from `lastUpdated` + cadence |
| Automation level | `auto`, `semi-auto`, `manual`, `static` |
| Client island | `'use client'` component in server page tree |

---

## Dataset Files (13)

`unemployment`, `youth-unemployment`, `labour-force`, `inflation`, `gdp`, `interest-rates`, `crime`, `education`, `population`, `housing`, `census`, `provinces`, `municipalities`

Run all updaters: `python scripts/update_all.py`  
Validate data: `npm run validate`

---

## Known Inconsistencies (Do Not Worsen)

1. `youth-unemployment` stat ID appears in both `unemployment.json` and `youth-unemployment.json`
2. `repo-rate` (inflation) vs `repo-rate-sarb` (interest-rates) — duplicate SARB data
3. Provincial unemployment period (Q3 2025) may lag national (Q4 2025)
4. World Bank scripts update annual data; JSON has quarterly/monthly Stats SA figures
5. README says Next.js 15; `package.json` has **14.2.3**
6. `mock.ts` is production data facade despite the name

---

## NEVER Change Without Asking the User

| Item | Reason |
|------|--------|
| **URL paths** | `/category/[slug]`, `/provinces/[id]`, `/municipalities/[code]`, `/insights/[slug]` — SEO |
| **Statistic IDs** | Stories, registry, and citations reference them |
| **Municipality codes** | 213 static URLs indexed by Google |
| **Province URL slugs** | `western-cape`, `gauteng`, etc. |
| **Registry IDs** | Download center and update log keys |
| **Citation output format** | Academic users may have saved citations |
| **Domain redirect** | `www` → apex in `next.config.js` |
| **Dataset JSON breaking shape** | Downstream registry, export, charts depend on it |
| **Removing `_meta` blocks** | Registry reads notes from them |
| **Git history / force push** | User rules prohibit destructive git |
| **Committing secrets** | `.env.local`, `DATABASE_URL` |

---

## Safe Changes Without Asking

- Fix data values with correct source attribution
- Add entries to `update-history.ts` when updating data
- Add unit tests for `lib/` modules
- Internal refactors that don't change URLs or public types
- Documentation in `/docs`
- New statistics with new unique IDs (follow adding-dataset workflow in [development-guide.md](./development-guide.md))

---

## Adding a Dataset (Checklist)

1. `src/data/datasets/{slug}.json`
2. Spread into `mock.ts` `statistics[]`
3. Entry in `registry.ts`
4. `update-history.ts` record
5. Optional: `scripts/update_{slug}.py`

Registry entry alone enables downloads, citations, freshness UI.

---

## PostgreSQL / ETL Work

- Use fact/dimension model — **not** one table per category
- ETL stages: extract → transform → validate → load
- Migrations in `db/migrations/NNN_name.sql` — apply with `npm run db:migrate`
- Feature flag: `DATA_SOURCE=db` vs `json`
- Equivalence tests required before flipping production
- See [migration-plan.md](./migration-plan.md) and [etl-pipeline.md](./etl-pipeline.md)

---

## Pages Quick Map

| Route | Data source | Server/Client |
|-------|-------------|---------------|
| `/` | mock.ts featured stats | Server |
| `/category/[slug]` | mock + registry + insights | Server |
| `/dashboard` | mock search | Client island |
| `/provinces` | mock provinces | Mixed |
| `/municipalities` | mock municipalities | Client explorer |
| `/municipalities/[code]` | mock | Server (SSG × 213) |
| `/insights/[slug]` | stories.ts + mock stat callouts | Server |
| `/downloads` | registry + export | Server |
| `/updates` | registry update log | Server |

---

## Documentation Index

| File | Use when |
|------|----------|
| [README.md](./README.md) | Onboarding |
| [architecture.md](./architecture.md) | System design questions |
| [database-schema.md](./database-schema.md) | SQL / schema work |
| [dataset-analysis.md](./dataset-analysis.md) | Data field questions |
| [etl-pipeline.md](./etl-pipeline.md) | Pipeline / scripts work |
| [migration-plan.md](./migration-plan.md) | DB migration phases |
| [api-design.md](./api-design.md) | API routes |
| [development-guide.md](./development-guide.md) | Conventions |
| [future-roadmap.md](./future-roadmap.md) | Prioritization |

Root [SA-Data-Hub-Architecture-Review.md](../SA-Data-Hub-Architecture-Review.md) — mentorship review that informed this docs set.

---

*Keep this file concise. Update when architecture, schema, or critical conventions change.*
