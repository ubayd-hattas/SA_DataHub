# SA Data Hub — Architecture Review & Evolution Plan

*Prepared as a mentorship-style technical review. Author's note: this document challenges a few of your assumptions directly — that's intentional, and the reasoning is spelled out each time so you can disagree with it on the merits.*

---

## 0. A few corrections before we start

A senior review should start with what's actually true, not what the docs claim:

- **README says Next.js 15. The lockfile resolves Next.js 14.2.3.** This isn't a big deal technically, but it's exactly the kind of inconsistency that erodes trust in a portfolio piece when a reviewer (or interviewer) checks. Fix the README or upgrade — don't leave the mismatch.
- The README is unusually thorough for a v0.1.0 project — that's a real strength and rare at the first-year level. Most of this review assumes the README accurately describes the *intent* of the architecture, even where the literal code may not be visible to me yet.

---

## 1. Analysis of the Current Architecture

### 1.1 What's genuinely good here

I want to be specific about this, because "good job!" isn't useful feedback.

**The data/lib separation is the right instinct.** You've already split "raw data" (`src/data/mock.ts`), "domain logic" (`src/lib/registry.ts`, `citation.ts`, `insights.ts`, `explanations.ts`), and "presentation" (`components/`, `app/`). This is the single most important habit in this whole project, and it's the reason migrating to a database later will be *tractable rather than a rewrite*. Most students build a project where the JSX file *is* the data file. You didn't do that. That decision alone will save you months.

**The dataset registry concept (`lib/registry.ts`) is doing real architectural work.** Tracking automation level (auto/semi-auto/manual/static), freshness, and update history per dataset is something a lot of real internal data platforms get wrong or skip entirely. This is metadata-driven design — you're not hardcoding "this dataset is fresh," you're computing it from cadence + last-updated. That's the correct mental model for a data platform, and it will map almost 1:1 onto a database table later (more on that in Section 3).

**Static generation for read-heavy, slow-changing government data is the correct trade-off**, not a beginner mistake. Province/municipality/category data changes quarterly or annually at most. Paying a build-time cost to get zero-latency, infinitely-cacheable pages is exactly what you should do for this kind of content. Don't let anyone talk you into "just use a database and fetch on every request" as if that's automatically more sophisticated — for this access pattern, it's often worse.

**Server/client component discipline** (data-heavy = server, interactive = client island) is a distinction a lot of professional Next.js codebases get wrong. You're isolating the dashboard search, comparator, and explorer as client islands rather than making the whole tree client-rendered. Keep doing this.

**The citation engine and insight/explanation generators are unusual and valuable.** Most student data projects show numbers. Very few generate APA/Harvard/Vancouver citations or auto-generate "why this matters" context from structured stat objects. This is a genuine differentiator for a CS+Stats portfolio — it shows you're thinking about data *provenance* and *communication*, not just display.

### 1.2 What will become a bottleneck as this grows

Be honest with yourself about these, because they're not visible yet at 213 municipalities and one dev — but they will be:

**`src/data/mock.ts` as a single in-memory source of truth doesn't scale along three independent axes:**
1. **Update friction** — every data change requires editing a TypeScript file, committing, and triggering a full rebuild. There's no way to fix a wrong number without a deploy.
2. **Query expressiveness** — anything beyond "loop and filter in JS" (e.g., "top 10 municipalities by unemployment *change* over the last 3 years, filtered by province") gets reimplemented by hand, in JS, on every page that needs it. A database gives you this for free via SQL.
3. **Build time** — `generateStaticParams` across 213 municipality pages is fine today. It will not stay fine once you add provincial *time series* depth, more datasets per municipality, or you want to regenerate frequently. Every dataset addition currently means a full-site rebuild, even for content that didn't change.

**There's no actual ETL — there are "update scripts" you run by hand.** The README's "Updating a dataset" section is honest about this: run a Python script, manually edit `mock.ts`, manually bump a date, manually add a history record. That's four manual, unenforced steps with no validation step in between. This isn't really automatable as it stands, even though "automated data pipeline" is on your roadmap — the architecture would need to change first for automation to be possible, not just convenient.

**No data versioning or audit trail beyond a hand-maintained log file.** `update-history.ts` is a static file someone (you) has to remember to update. If a stat is wrong, you can't ask "what was this value before the last update, and why did it change?" without grep-ing git history.

**Insights and explanations are computed client/build-side from mock objects.** That's fine at this scale. It becomes a constraint once the underlying data lives in a database and changes more often than the site rebuilds — you'll want this logic computable from a query result, not just a hardcoded object shape.

**No real backend boundary.** Right now "the backend" *is* "whatever's in `src/data` and `src/lib`," compiled into the same Next.js app. That's fine — genuinely fine, not a consolation prize — for a single-team, single-deploy project. But it means there is currently no way to serve data to anything other than this specific website. Your own roadmap lists "REST API" and "embed widgets" as goals; those require a real data-access layer, not a TypeScript object that happens to live in the same repo.

### 1.3 What should stay unchanged

Don't let "let's modernize this" become "let's rewrite everything." Specifically keep:

- App Router + Server/Client component split
- Static generation for content that doesn't need per-request freshness
- The `lib/` separation pattern (citation, insights, explanations, registry) — these become *consumers of a database* later, not victims of a rewrite
- The component folder structure (`charts/`, `ui/`, `layout/`)
- The three-font typographic system and design language — that's product/design work, totally orthogonal to the data architecture
- Recharts, Tailwind, next-themes — no reason to touch any of these

### 1.4 What should eventually be redesigned

- `src/data/mock.ts` → replaced by PostgreSQL tables, queried at build/request time
- `src/data/update-history.ts` → replaced by a DB-backed audit table
- The "Python script → manual edit" update flow → replaced by a real ETL pipeline with extract/transform/load stages and validation
- `lib/registry.ts`'s freshness logic → stays as *logic*, but reads from DB metadata instead of a static object
- Build-time `generateStaticParams` for all 213 municipalities → likely moves to **Incremental Static Regeneration (ISR)** or on-demand revalidation once data lives in a DB and updates more frequently than your deploy cadence

---

## 2. Future Architecture

### 2.1 The core principle: modular monolith, not microservices

I want to push back on an assumption that's implicit in your goal list ("PostgreSQL, ETL, REST APIs, scalability") — the instinct toward "real platforms have separate backend services" is common and usually wrong at this stage.

**Recommendation: keep this as a single Next.js application** that talks directly to PostgreSQL via server components and Route Handlers (`app/api/.../route.ts`), rather than standing up a separate Express/FastAPI/NestJS backend. Why:

- You are one developer. A separate backend means two deployments, two sets of environment variables, two places auth/CORS can go wrong, and a network hop for data that's currently free (in-process function calls). That's operational overhead bought for zero benefit at this scale.
- Next.js Route Handlers *are* a real REST API. `app/api/v1/datasets/[slug]/route.ts` returning JSON, with proper HTTP verbs and status codes, satisfies your "public REST API" roadmap item without inventing a second service.
- The "real" architectural lesson here — and this is genuinely something senior engineers learn the hard way — is **premature service-splitting is one of the most common ways small teams create accidental complexity.** Splitting becomes justified when you have a genuine scaling or team-boundary reason (different release cadence, different language requirement, different scaling profile). You don't have one of those yet.

So the target shape is:

```
┌─────────────────────────────────────────────────────────┐
│                  Next.js App (Vercel)                    │
│                                                            │
│  Server Components ──┐                                   │
│  (pages, build-time   │                                   │
│   & request-time data)│        ┌─────────────────────┐    │
│                       ├───────▶│  Data Access Layer   │    │
│  Route Handlers ──────┘        │  (src/lib/db/*.ts)   │    │
│  (/api/v1/* — public REST)     │  typed query funcs   │    │
│                                 └──────────┬──────────┘    │
└────────────────────────────────────────────┼──────────────┘
                                              │  SQL (pg/postgres.js)
                                              ▼
                                ┌─────────────────────────┐
                                │   PostgreSQL (managed)  │
                                │   Neon / Supabase /     │
                                │   Railway                │
                                └─────────────────────────┘
                                              ▲
                                              │ scheduled upsert
                                ┌─────────────────────────┐
                                │   ETL (GitHub Actions)   │
                                │   extract → transform   │
                                │   → validate → load      │
                                └──────────┬──────────────┘
                                            │ fetch / scrape
                                            ▼
                       Stats SA · SARB · SAPS · DBE · World Bank
```

### 2.2 Why each piece is chosen this way

**Frontend stays Next.js App Router.** No change needed — it was already the right tool. Server components query the DB directly through your data-access layer; no separate "frontend calls backend calls DB" indirection where frontend and backend are the same codebase.

**Database: managed PostgreSQL (Neon, Supabase, or Railway), not self-hosted.** As a solo developer/student, your scarce resource is *time*, not money (these all have generous free tiers). Self-hosting Postgres teaches you ops skills you don't need yet (backups, failover, patching) at the cost of the skills you're explicitly trying to learn (schema design, SQL, ETL). Pick a managed provider and spend your learning budget on the database *content*, not the database *infrastructure*. Neon is a good first choice — branching for free, generous free tier, and it teaches you connection pooling concepts (serverless Postgres) that are increasingly standard.

**Data access layer (`src/lib/db/`), not an ORM, at first.** This is a deliberate pushback on the "just use Prisma" default. An ORM is genuinely useful in production, but it also *hides* the SQL you're trying to learn. I'd recommend:
- Phase 1–4: write raw SQL through a thin client (`postgres.js` or `pg`), with typed query functions in `src/lib/db/`. You will learn joins, indexes, `EXPLAIN ANALYZE`, and query design directly.
- Phase 5+ (optional): once you're comfortable, introduce **Drizzle ORM** specifically — not Prisma. Drizzle is a thin, SQL-like layer that gives you type safety without hiding the query shape from you the way Prisma's abstraction does. This preserves the learning value while giving you migration tooling and type inference as the schema grows.

**ETL as scheduled GitHub Actions, not a server process.** Your data sources update monthly/quarterly/annually at most — there is no case for a long-running ETL server. A GitHub Actions workflow on a cron schedule (`schedule: cron: ...`) that runs a Python script, validates the output, and upserts into Postgres is the entire pipeline. This also directly satisfies your own roadmap item ("Automated data pipeline — GitHub Actions workflow to run update scripts on release days") — it's not a new idea, it's formalizing what you already wrote down.

**Deployment stays split exactly where it naturally splits**: Vercel for the Next.js app (as now), managed Postgres as an external service, GitHub Actions for scheduled ETL. Nothing here is exotic — it's the standard shape for a small data-driven web product in 2026, and every piece of it maps to something you can put on a CV with a straight face.

### 2.3 Proposed folder structure

```
src/
├── app/                          # unchanged — routes, pages, layouts
│   └── api/
│       └── v1/                   # NEW — public REST API surface
│           ├── datasets/route.ts
│           ├── datasets/[slug]/route.ts
│           ├── provinces/[id]/route.ts
│           └── municipalities/[code]/route.ts
├── components/                   # unchanged
├── lib/
│   ├── db/                       # NEW — data access layer
│   │   ├── client.ts             # pg/postgres.js connection (pooled)
│   │   ├── datasets.ts           # typed query functions
│   │   ├── provinces.ts
│   │   ├── municipalities.ts
│   │   └── observations.ts
│   ├── registry.ts                # same role, now reads from DB metadata
│   ├── citation.ts                 # unchanged logic, new input shape
│   ├── insights.ts                 # unchanged logic, new input shape
│   └── explanations.ts             # unchanged logic, new input shape
├── data/                          # SHRINKS over time, doesn't disappear day 1
│   └── mock.ts                   # remaining not-yet-migrated datasets
└── types/
    └── index.ts                  # extended with DB row types

db/
├── schema.sql                    # NEW — source of truth schema (or migration tool's output)
├── migrations/                   # NEW — versioned, ordered migration files
└── seed/                         # NEW — seed scripts for local dev

etl/
├── extract/                      # NEW — one script per source (Stats SA, SARB, ...)
├── transform/                    # NEW — cleaning, unit normalization, validation
├── load/                         # NEW — upsert logic into Postgres
└── pipelines/                    # NEW — orchestration per dataset (extract→transform→load)

.github/
└── workflows/
    ├── ci.yml                    # NEW — lint/typecheck/test on PR
    └── data-update.yml           # NEW — scheduled ETL runs
```

### 2.4 Data flow, end to end

1. **Extract**: a Python script in `etl/extract/` pulls the latest release from a source (Stats SA bulk download, SARB API, etc.) into a raw, untouched format (CSV/JSON) — this raw snapshot is *kept*, not discarded, for auditability.
2. **Transform**: `etl/transform/` cleans and validates — type coercion, unit normalization (e.g., percentages vs. proportions), outlier/sanity checks, schema validation against an expected shape. This stage should **fail loudly** rather than silently load bad data.
3. **Load**: `etl/load/` upserts into Postgres using `dataset_id + geography_id + period` as the natural conflict key (`ON CONFLICT DO UPDATE`), and writes a row to an audit/history table.
4. **Serve**: Next.js server components and Route Handlers query Postgres through `src/lib/db/`, which return typed rows. `registry.ts`, `citation.ts`, `insights.ts` consume those rows the same way they consume `mock.ts` objects today — same function signatures, different data origin.
5. **Render**: static generation for slow-changing pages (province/municipality profiles), with ISR (`revalidate: N`) once data updates more often than your deploy cadence; Route Handlers for anything that needs to be queried on demand (the public API, search).

---

## 3. Database Design

### 3.1 The central design decision: a fact/dimension model, not a table per dataset

This is the most important conceptual choice in the whole plan, and it's worth explaining *why*, because the wrong intuition here ("make a table for unemployment, a table for GDP, a table for crime...") will hurt you badly in six months.

Your data, fundamentally, is: **an indicator, measured for a geography, at a point in time.** Unemployment rate for Gauteng in Q1 2024. Matric pass rate for Limpopo in 2023. Population for a municipality in the 2022 Census. That's the same *shape* of fact repeated across every one of your "8 data categories." If you model each category as its own bespoke table, you'll rewrite the same query logic, the same chart-feeding code, and the same registry logic eight times — and a ninth dataset means a ninth table and a ninth set of one-off code.

Instead, model it as **dimensions** (the things you're measuring *about* — geography, dataset/indicator, time) and **one fact table** (the actual measured values):

```sql
-- DIMENSION: what is being measured
CREATE TABLE datasets (
    dataset_id      SERIAL PRIMARY KEY,
    slug            TEXT UNIQUE NOT NULL,        -- 'unemployment-rate'
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,               -- or FK to categories table
    unit            TEXT NOT NULL,                -- 'percent', 'count', 'rate'
    source_id       INT REFERENCES data_sources(source_id),
    cadence         TEXT NOT NULL,                -- 'quarterly','annual','monthly'
    automation_level TEXT NOT NULL,               -- 'auto','semi-auto','manual','static'
    last_updated    TIMESTAMPTZ,
    description     TEXT
);

-- DIMENSION: where (this is the deliberately tricky one — see 3.2)
CREATE TABLE geographies (
    geography_id    SERIAL PRIMARY KEY,
    code            TEXT UNIQUE NOT NULL,         -- official StatsSA/MDB code, e.g. 'WC011'
    name            TEXT NOT NULL,
    level           TEXT NOT NULL,                -- 'national','province','municipality'
    parent_id       INT REFERENCES geographies(geography_id),  -- self-referencing hierarchy
    category_class  TEXT                          -- 'A','B','C' for municipalities, null otherwise
);

-- DIMENSION: source provenance
CREATE TABLE data_sources (
    source_id       SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,                -- 'Statistics South Africa'
    short_name      TEXT NOT NULL,                -- 'Stats SA'
    url             TEXT,
    notes           TEXT
);

-- FACT: the actual time series values — this is the table that grows
CREATE TABLE observations (
    observation_id  BIGSERIAL PRIMARY KEY,
    dataset_id      INT NOT NULL REFERENCES datasets(dataset_id),
    geography_id    INT NOT NULL REFERENCES geographies(geography_id),
    period_start    DATE NOT NULL,                -- normalize all cadences to a date
    period_label    TEXT NOT NULL,                -- 'Q1 2024', '2022', display-friendly
    value           NUMERIC NOT NULL,
    is_estimate     BOOLEAN DEFAULT FALSE,
    source_version_id INT REFERENCES dataset_versions(version_id),
    UNIQUE (dataset_id, geography_id, period_start)  -- natural conflict key for upserts
);

-- AUDIT: replaces update-history.ts
CREATE TABLE dataset_versions (
    version_id      SERIAL PRIMARY KEY,
    dataset_id      INT NOT NULL REFERENCES datasets(dataset_id),
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_snapshot_url TEXT,                     -- where the raw file is archived
    row_count       INT,
    notes           TEXT,
    status          TEXT NOT NULL                  -- 'success','partial','failed'
);
```

### 3.2 Why these specific choices

**`geographies` as one self-referencing table, not separate `provinces` and `municipalities` tables.** This is a deliberate normalization decision and the one I'd most expect a reviewer to ask you to defend — so here's the defense: provinces and municipalities are the *same kind of thing* (a geography with a code, a name, a parent) at different levels of a hierarchy. National → Province → Municipality is a tree. Modeling it as one self-referencing table means "give me everything under province X" is one recursive query (`WITH RECURSIVE`), and adding a new geographic level later (e.g., wards, or ward-level census data) requires *zero* schema changes. Two separate tables would require you to duplicate every query that needs "geography of any kind" and would break the moment you needed a third level.

**Natural keys for `geographies.code`, surrogate keys for everything else.** Official municipality and province codes (e.g., the Municipal Demarcation Board's `WC011`) are stable, externally governed identifiers — they're a legitimate natural key and using them lets you cross-reference against official sources without a mapping table. Everything else (`dataset_id`, `observation_id`) uses a surrogate `SERIAL`/`BIGSERIAL` key, because dataset slugs *will* change as you rename things, and you don't want a rename cascading through every foreign key.

**`observations` is intentionally one wide fact table covering all 8+ categories, not one table per category.** This is the payoff of the fact/dimension split: adding a 9th dataset is an `INSERT INTO datasets`, not a `CREATE TABLE`. Every chart, every comparison, every "show me this stat over time" query becomes the same shape of query with a different `dataset_id` filter — your `lib/db/` code stops growing linearly with the number of datasets.

**`period_start` as a real `DATE`, plus a separate `period_label` for display.** You have mixed cadences (quarterly QLFS, annual Census, monthly CPI). Storing a comparable, sortable `DATE` lets the database do `ORDER BY`, range filters, and joins correctly, while `period_label` keeps "Q1 2024" or "2022" as a presentation concern, not a parsing problem for every chart component.

**The `UNIQUE (dataset_id, geography_id, period_start)` constraint is what makes your ETL idempotent.** This single constraint is what lets `INSERT ... ON CONFLICT DO UPDATE` work — re-running an extract for the same period overwrites cleanly instead of duplicating rows. This is *the* mechanism that turns "run a script by hand" into "safe to schedule and forget."

**`dataset_versions` replaces `update-history.ts` and gives you real provenance**, including a link to the *raw* snapshot you extracted (store it in object storage or just commit small CSVs to a `etl/raw-snapshots/` folder) — so "what did this number used to be, and where did it come from" becomes answerable in SQL, not in your memory of what you changed in March.

### 3.3 Normalization reasoning

Dimension tables (`datasets`, `geographies`, `data_sources`) are kept in **3NF** — no repeated/derivable attributes, every non-key attribute depends on the whole key. The fact table (`observations`) is intentionally **not** further normalized beyond what's shown — splitting `value` out further would buy you nothing and cost you a join on every single query. This is the standard, correct trade-off in dimensional modeling: normalize dimensions, keep the fact table lean and denormalized-where-it-helps.

### 3.4 Indexes

```sql
-- The single most important index: this is your "give me the time series" query
CREATE INDEX idx_observations_dataset_geo_period
    ON observations (dataset_id, geography_id, period_start);

-- Fast "latest value per dataset per geography" — your stat cards' main query
CREATE INDEX idx_observations_latest
    ON observations (dataset_id, geography_id, period_start DESC);

-- Geography hierarchy traversal
CREATE INDEX idx_geographies_parent ON geographies (parent_id);

-- Full-text search for the dashboard search feature (Postgres native, no external search service needed)
ALTER TABLE datasets ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', name || ' ' || coalesce(description,''))) STORED;
CREATE INDEX idx_datasets_search ON datasets USING GIN (search_vector);
```

The `UNIQUE` constraint from 3.1 already creates a supporting index for upserts, so you're not duplicating that one.

### 3.5 Future scalability — and a deliberate "don't"

At 8 categories × 213 municipalities × maybe 40 years of quarterly history, you're looking at low hundreds of thousands of rows in `observations` — this is **trivially small** for Postgres. I want to explicitly head off over-engineering here: you do not need table partitioning, you do not need TimescaleDB, you do not need a read replica, and you do not need to denormalize for performance. A vanilla Postgres instance on a free-tier managed host will handle this for years. If you ever ingest *every* CPI sub-basket line item monthly back to 1960 across all municipalities, revisit partitioning by year — not before. Knowing when *not* to add infrastructure is as much a senior skill as knowing when to add it.

---

## 4. Migration Strategy — Incremental, Always-Shippable

Non-negotiable constraint, stated up front: **at the end of every phase, the live site works correctly.** No phase is "the database phase" where the site is broken for a week.

### Phase 0 — Foundations (no visible change)
- Provision managed Postgres (Neon recommended).
- Write `db/schema.sql` for the tables in Section 3. Apply it manually once.
- Add `.env.local` with `DATABASE_URL`; confirm `.env*` is gitignored.
- **Exit criteria**: you can connect from a local script and run a query. Site is untouched and still reads from `mock.ts`.

### Phase 1 — One dataset, end to end, in isolation
- Pick the smallest dataset (e.g., national unemployment rate — 9 provinces, one cadence).
- Write `etl/extract/unemployment.py` → raw CSV. Write `etl/transform/` validation. Write `etl/load/` upsert script. Run it **by hand**.
- Write `src/lib/db/client.ts` and one query function: `getUnemploymentSeries(geographyCode)`.
- **Exit criteria**: you can query this one dataset from a Node script and get correct values back. Nothing in the website has changed yet.

### Phase 2 — Dual-read on one page
- On the unemployment category page only, replace the `mock.ts` read with the DB query function, behind a feature check (e.g., `if (process.env.DATA_SOURCE === 'db')`).
- Write a small comparison script that asserts the DB output matches the `mock.ts` output for this dataset, so you can prove equivalence before flipping the flag in production.
- **Exit criteria**: the unemployment page is now DB-backed in production; every other page is unchanged and still on `mock.ts`. If the DB is down, you can flip the env var back instantly.

### Phase 3 — Repeat per dataset, retire mock.ts incrementally
- Apply the same extract → transform → load → query-function → swap pattern to each remaining category, one at a time, each as its own small PR.
- Each time, delete the now-unused section of `mock.ts`. The file shrinks instead of being deleted in one risky move.
- **Exit criteria**: `mock.ts` only contains datasets you haven't migrated yet; everything migrated is live and correct.

### Phase 4 — Automate the pipeline
- Move the manual `etl/` script runs into a GitHub Actions workflow on a cron schedule matched to each dataset's real-world cadence.
- Add a Slack/email/GitHub-issue notification on ETL failure — silent failures in scheduled jobs are how stale data quietly creeps into "production-quality" platforms.
- **Exit criteria**: a dataset updates in the database without you running anything by hand, and you find out within minutes if it fails.

### Phase 5 — Versioning and audit
- Add `dataset_versions` writes to the `load` step. Retire `update-history.ts` once registry/freshness logic reads from this table instead.
- **Exit criteria**: the "Dataset Updates" tracker page is DB-backed and shows real history, not a hand-maintained file.

### Phase 6 — Public REST API
- Add `app/api/v1/*` Route Handlers using the *same* `src/lib/db/` functions your pages already use — no new data-access logic, just a new presentation of it (JSON instead of HTML).
- Add basic rate limiting (even simple in-memory per-IP limiting is fine at this stage) and an `/api/v1/docs` page.
- **Exit criteria**: someone outside your project can `curl` your unemployment data and get clean JSON. This is the roadmap's "REST API" item, done as a natural consequence of the work already completed.

### Phase 7 — Municipalities at scale, properly
- Migrate the 213-municipality dataset last, deliberately — it's your largest table and the best place to *practice* pagination, filtering, and search as real SQL (`LIMIT/OFFSET` or keyset pagination, `WHERE` clauses, the `tsvector` search index) instead of in-memory JS array operations.
- **Exit criteria**: the Municipality Explorer's search/filter/paginate is powered by SQL queries, not a giant array shipped to the client.

### Phase 8 — Search, polish, and the things that were blocked on having a real DB
- Dashboard search moves to Postgres full-text search.
- ISR/on-demand revalidation replaces full rebuilds for pages backed by frequently-updating data.

---

## 5. Learning Roadmap — Let the Project Teach You

I'm intentionally not pointing you at courses. Each phase above naturally requires specific concepts; learn them *as* you hit the wall, not before.

| Phase | SQL concepts that show up naturally | Backend concepts | Data engineering concepts |
|---|---|---|---|
| 0 | `CREATE TABLE`, data types, `PRIMARY KEY`/`REFERENCES`, `UNIQUE` constraints | environment variables, connection strings, never committing secrets | — |
| 1 | `INSERT`, basic `SELECT`/`WHERE`, `ON CONFLICT DO UPDATE` (upserts) | scripting a one-off ETL job, structured logging | extract/transform/load as distinct stages; schema validation; idempotency |
| 2 | `JOIN` across dimension/fact tables, `ORDER BY`, parameterized queries (SQL injection prevention) | data-access layer pattern, feature flags, equivalence testing | dual-write/dual-read migration pattern |
| 3 | aggregate functions (`AVG`, `MAX`, window functions for "latest value per group") | API contract stability while swapping implementations | incremental migration discipline |
| 4 | — | cron/scheduled jobs, CI/CD with GitHub Actions, failure alerting | orchestration, pipeline observability, idempotent re-runs |
| 5 | audit/history table design, `EXPLAIN ANALYZE` to check your indexes are used | event sourcing-lite (storing what changed, when) | data lineage, provenance |
| 6 | — | REST API design, HTTP status codes, pagination, rate limiting, API versioning | publishing data as a product, not just a UI |
| 7 | `LIMIT/OFFSET` vs keyset pagination, composite indexes, `tsvector`/`GIN` full-text search | server-side filtering/sorting at scale | query performance under realistic load |
| 8 | materialized views, `WITH RECURSIVE` for the geography hierarchy | cache invalidation, ISR/on-demand revalidation | — |

This table is also, not coincidentally, a reasonable description of what a junior data engineer's first year on the job actually looks like.

---

## 6. Best Practices Worth Adopting Now

- **Migrations, not ad-hoc schema edits.** Even before you reach for an ORM, keep every schema change as a numbered, ordered `.sql` file in `db/migrations/` (`001_init.sql`, `002_add_dataset_versions.sql`...). This is the difference between "I can rebuild this database from scratch" and "I have no idea what state production is in."
- **Environment variables, strictly.** `.env.local` for secrets, `.env.example` committed (with no real values) so anyone cloning the repo knows what's needed. Never let a connection string touch a commit.
- **Dataset versioning as data, not as a markdown changelog.** You already half-do this (`update-history.ts`); Phase 5 formalizes it. The principle: if a number on your site is wrong, you should be able to answer "since when, and from what source" without archaeology.
- **Structured logging in ETL, not `print()` statements.** Log dataset name, row counts in/out, validation failures, and duration for every run — this is what makes Phase 4's automation safe to trust unattended.
- **Tests where your README already says they'd help.** Your own README flags `citation.ts`, `registry.ts`, and `insights.ts` as good testing starting points — that's correct, and it's *more* true once these functions consume DB rows instead of static objects, because now a schema change can silently break them.
- **API versioning from day one of the API**, even with one version. `/api/v1/...` costs nothing now and saves you a breaking-change crisis the day you need `/api/v2/...`.
- **Documentation as architecture decision records (ADRs).** A `docs/decisions/0001-fact-dimension-model.md` explaining *why* you chose the schema in Section 3 is genuinely impressive to a reviewer, and forces you to actually justify decisions rather than cargo-cult them.

---

## 7. Future Roadmap, Prioritized

Scored informally on **impact** (does it materially improve the product or your story as a candidate) vs **learning value** (does it teach you something you don't already know).

**Do these — high impact, high learning value:**
1. **PostgreSQL migration (Sections 3–4)** — everything else depends on this.
2. **Automated ETL pipeline** — turns "I built a data site" into "I built a data *platform*" in any interview.
3. **Public REST API with docs** — makes the project usable by other developers, which is the actual definition of a platform vs. a website.

**Strong candidates — good impact, good learning value:**
4. **SQL querying playground** (a sandboxed, read-only query interface against your own `observations` table, with example queries) — this is a genuinely distinctive feature for a Stats & Data Science student's portfolio, more interesting than another dashboard, and it's a natural extension of work you'll have already done.
5. **Map visualizations (choropleth)** — already on your roadmap, high visual impact, and a good excuse to learn PostGIS basics or at minimum geographic joins.
6. **Dataset version history UI** — directly surfaces the audit table from Phase 5; cheap once the data exists.

**Worth doing, lower urgency:**
7. **Authentication + saved dashboards** — real feature, but it's a different skill set (auth, sessions, user data) than the data-platform skills you're prioritizing this year. Good Year 2 material.
8. **Search improvements (autocomplete)** — nice polish, but it's UX refinement on top of Phase 8's full-text search, not a new architectural lesson.
9. **Embed widgets** — fun and demonstrates API maturity, but only valuable once the public API (item 3) actually has external users.

**I'd deprioritize relative to your stated goals:**
- Heavy analytics/telemetry beyond Vercel Analytics — interesting, but it's a product-growth concern, not a data-engineering one, and it's not what this review is about.
- Anything resembling microservices, message queues, or container orchestration — genuinely not justified at this data volume or team size (see Section 2.1). If a future version of you wants to learn Kafka, do it on a project where the data actually arrives as a stream — this one doesn't.

---

## Closing note

The instinct you've already shown — separating data from logic from presentation, treating "freshness" and "automation level" as first-class metadata, writing documentation before being asked — is the actual hard part of becoming a good engineer. The database, the ETL pipeline, the API: these are all *executions* of an architectural instinct you already have. This plan is mostly about giving that instinct a place to live in SQL instead of in a TypeScript object literal.
