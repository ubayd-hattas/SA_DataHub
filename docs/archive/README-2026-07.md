# SA Data Hub — Engineering Documentation

**South Africa's public data, made clear.**

This `/docs` folder is the long-term knowledge base for SA Data Hub — a Next.js platform that aggregates, visualises, and explains official South African statistics. It is written for human developers and AI assistants who need to understand, extend, or migrate the system without spelunking the entire codebase.

**Live site:** [sadatahub.tech](https://sadatahub.tech)

---

## Purpose

SA Data Hub exists to lower the friction between government statistical releases (Stats SA, SARB, SAPS, DBE, World Bank) and the people who need them — students, researchers, journalists, policymakers, and the general public.

The platform currently:

- Presents **8 data categories** with stat cards, trend charts, auto-generated insights, and citations
- Profiles **9 provinces** and **213 municipalities** (Census 2022)
- Publishes **Data Stories** — long-form narratives with live stat callouts
- Offers **CSV downloads** with APA/Harvard citation metadata
- Tracks **dataset freshness** and update history

The engineering goal is to evolve from **static JSON at build time** to a **PostgreSQL-backed data platform** with automated ETL and a public REST API — without rewriting the presentation layer.

---

## Overall Architecture (Current)

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser → Vercel Edge → Next.js 14 App Router                  │
│                                                                   │
│  Server Components (pages, SSG)  ──┐                             │
│  Client Islands (search, explorers) │                             │
│                                     ▼                             │
│                          src/data/mock.ts                         │
│                    (aggregates JSON datasets)                       │
│                                     │                             │
│              ┌──────────────────────┼──────────────────────┐      │
│              ▼                      ▼                      ▼      │
│        src/lib/registry     src/lib/insights      src/lib/export  │
│        src/lib/citation     src/lib/search        components/     │
└─────────────────────────────────────────────────────────────────┘

Data updates today:
  Official sources → Python/Node scripts → src/data/datasets/*.json
                 → manual registry/history edits → git commit → Vercel rebuild
```

**Target architecture** (in progress): managed PostgreSQL (Neon) + ETL pipelines + `src/lib/db/` data-access layer. See [architecture.md](./architecture.md) and [migration-plan.md](./migration-plan.md).

---

## Repository Folder Structure

```
stats_data/                          # Project root (repo: sa-data-hub)
├── docs/                            # ← You are here — engineering documentation
├── public/                          # Static assets, OG images, screenshots
│   └── docs/screenshots/            # README marketing screenshots
├── raw_data/                        # Source CSVs for municipality transform
├── scripts/                         # Dataset update scripts (Python + Node)
│   ├── update_*.py                  # Per-dataset updaters
│   ├── update_all.py                # Master orchestrator
│   ├── transform_municipalities.js  # CSV → municipalities.json
│   ├── utils.py                     # Shared JSON/HTTP helpers
│   └── requirements.txt
├── src/
│   ├── app/                         # Next.js App Router pages & API routes
│   ├── components/                  # charts/, layout/, seo/, ui/
│   ├── data/
│   │   ├── datasets/                # Canonical JSON datasets (13 files)
│   │   ├── mock.ts                  # Data access facade (imports JSON)
│   │   ├── stories.ts               # Data story content
│   │   ├── update-history.ts        # Hand-maintained update log
│   │   └── changelog.ts             # Platform changelog
│   ├── lib/                         # Domain logic (registry, citation, search, db)
│   └── types/                       # Shared TypeScript types
├── SA-Data-Hub-Architecture-Review.md  # Prior architecture review (mentorship doc)
├── package.json
├── next.config.js
└── tailwind.config.ts
```

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | Current vs target architecture, data/request/build/deploy flows, component interaction |
| [database-schema.md](./database-schema.md) | Complete PostgreSQL schema design with ER diagram |
| [dataset-analysis.md](./dataset-analysis.md) | Per-dataset field analysis, sources, validation, migration mapping |
| [etl-pipeline.md](./etl-pipeline.md) | Reusable extract/transform/validate/load design |
| [migration-plan.md](./migration-plan.md) | Phased JSON → PostgreSQL migration with risks and rollback |
| [api-design.md](./api-design.md) | Future REST API endpoints, versioning, pagination |
| [development-guide.md](./development-guide.md) | Naming, folder, SQL, ETL, git, and testing conventions |
| [future-roadmap.md](./future-roadmap.md) | 12-month improvement priorities ranked by impact |
| [migration-readiness.md](./migration-readiness.md) | Pre-migration audit, health score, ETL checklists |
| [standardisation-changelog.md](./standardisation-changelog.md) | Data/metadata changes during cleanup |
| [testing-strategy.md](./testing-strategy.md) | JSON ↔ PostgreSQL equivalence testing |
| [ai-context.md](./ai-context.md) | Concise briefing for AI assistants |

---

## Where New Contributors Should Start

### 1. Understand the data layer (30 minutes)

1. Read [dataset-analysis.md](./dataset-analysis.md) — know what each JSON file contains
2. Skim `src/data/mock.ts` — see how JSON is aggregated and exposed to pages
3. Read `src/lib/registry.ts` — understand dataset metadata and freshness logic

### 2. Run the app locally

```bash
npm install
npm run dev        # http://localhost:3000
```

No environment variables are required for the default JSON data layer.

Optional (PostgreSQL experiments):

```bash
# .env.local
DATABASE_URL=postgresql://...
# Test: GET /api/test-db
```

### 3. Make a small, safe change

Good first contributions:

- Fix a data value with source citation in `src/data/datasets/<name>.json`
- Add an entry to `src/data/update-history.ts` when data changes
- Write a unit test for `src/lib/citation.ts` or `src/lib/registry.ts`
- Improve accessibility on a UI component

### 4. Before a larger change

Read [architecture.md](./architecture.md) and [development-guide.md](./development-guide.md). For database or ETL work, read [database-schema.md](./database-schema.md) and [etl-pipeline.md](./etl-pipeline.md).

---

## Key Facts (Quick Reference)

| Item | Value |
|------|-------|
| Framework | Next.js **14.2.3** (App Router) — README badge says 15; lockfile is authoritative |
| Language | TypeScript 5 |
| Deployment | Vercel (`main` branch → automatic deploy) |
| Data storage (current) | Static JSON in `src/data/datasets/` |
| Database (planned) | Neon PostgreSQL (`@neondatabase/serverless`, `postgres` package) |
| Categories (UI) | 8: unemployment, gdp, inflation, crime, education, population, housing, census |
| Registry datasets | 12 JSON-backed files (+ municipalities as separate export) |
| Statistics | ~34 `Statistic` objects across category JSON files |
| Provinces | 9 |
| Municipalities | 213 (Census 2022) |
| Data stories | 5 published in `src/data/stories.ts` |
| Update automation | Partial — World Bank API for some; quarterly Stats SA figures often manual |

---

## Related External Documents

- Root [README.md](../README.md) — user-facing project overview and screenshots
- [SA-Data-Hub-Architecture-Review.md](../SA-Data-Hub-Architecture-Review.md) — mentorship-style architecture review that informed this documentation set

---

*Maintained as part of SA Data Hub engineering documentation. Update these docs when architecture or data conventions change materially.*
