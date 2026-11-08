# SA Data Hub — Future Roadmap (12 Months)

Prioritized recommendations for June 2026 – June 2027. Ranked by **impact** (product + portfolio value) within each tier.

Impact scale: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Nice-to-have

---

## Tier 1 — Foundation (Do First)

These unlock everything else. Without them, other improvements are cosmetic.

| Rank | Initiative | Impact | Effort | Why |
|------|------------|--------|--------|-----|
| 1.1 | **PostgreSQL migration** | 🔴 | High | Eliminates deploy-to-fix-data friction; enables API, search, automation |
| 1.2 | **Automated ETL (GitHub Actions)** | 🔴 | Medium | Transforms project from "data website" to "data platform" |
| 1.3 | **Equivalence test suite** | 🔴 | Low | Prevents silent regressions during migration |
| 1.4 | **Fix data inconsistencies** | 🔴 | Low | Duplicate stat IDs, provincial/national QLFS period drift, WB vs Stats SA labeling |
| 1.5 | **CI pipeline (lint + typecheck + test)** | 🟠 | Low | No `.github/workflows/` exists today |

**Quarter target:** Complete Phases 0–2 of [migration-plan.md](./migration-plan.md).

---

## Tier 2 — Platform Capabilities

| Rank | Initiative | Impact | Effort | Why |
|------|------------|--------|--------|-----|
| 2.1 | **Public REST API v1** | 🔴 | Medium | Defines "platform"; enables embeds, partners, open data reuse |
| 2.2 | **Direct Stats SA extractors** | 🟠 | High | World Bank scripts don't match quarterly/monthly cadence |
| 2.3 | **ISR / on-demand revalidation** | 🟠 | Low | Update data without full 213-page rebuild |
| 2.4 | **Dataset version history UI** | 🟠 | Low | Surfaces audit table; strong transparency story |
| 2.5 | **SQL-backed municipality search** | 🟠 | Medium | Replace in-memory filter; prerequisite for scale |
| 2.6 | **OpenAPI docs at `/api/docs`** | 🟡 | Low | Developer experience for API consumers |

**Quarter target:** Phases 3–5 of migration; API live for 3+ datasets.

---

## Tier 3 — Data Engineering

| Rank | Initiative | Impact | Effort | Why |
|------|------------|--------|--------|-----|
| 3.1 | **JSON Schema validation per dataset** | 🟠 | Medium | Catch bad transforms before production |
| 3.2 | **Raw snapshot archive** | 🟠 | Low | Provenance and reproducibility |
| 3.3 | **Provincial unemployment in observations** | 🟠 | Medium | Decompose `provinces.json` into queryable facts |
| 3.4 | **Release calendar automation** | 🟡 | Medium | QLFS/CPI/GDP dates in `etl/config/release_calendar.yaml` |
| 3.5 | **SAPS / DBE parse scripts** | 🟡 | High | Reduce manual Excel steps |
| 3.6 | **Data quality dashboard** | 🟡 | Medium | Internal: stale datasets, failed validations, row counts |

---

## Tier 4 — Analytics & Insights

| Rank | Initiative | Impact | Effort | Why |
|------|------------|--------|--------|-----|
| 4.1 | **SQL query playground (read-only)** | 🟠 | Medium | Distinctive portfolio feature for Stats/CS student |
| 4.2 | **More data stories** | 🟠 | Medium | Content moat; explains numbers journalists need |
| 4.3 | **Story templates + stat callout automation** | 🟡 | Medium | Faster story production when QLFS releases |
| 4.4 | **Anomaly detection on ETL** | 🟡 | Medium | Flag >3σ changes before publish |
| 4.5 | **International comparisons (BRICS)** | 🟡 | High | World Bank data already partially integrated |
| 4.6 | **Vercel Analytics funnels** | 🟢 | Low | Understand which categories drive engagement |

---

## Tier 5 — Search & Discovery

| Rank | Initiative | Impact | Effort | Why |
|------|------------|--------|--------|-----|
| 5.1 | **Postgres full-text search** | 🟠 | Medium | Replace client-side `intelligentSearch` for dashboard |
| 5.2 | **Search autocomplete** | 🟠 | Medium | README roadmap item; depends on 5.1 |
| 5.3 | **Provincial filter on dashboard** | 🟡 | Low | README roadmap item |
| 5.4 | **Faceted filters (category + province + time)** | 🟡 | Medium | Natural with SQL backend |
| 5.5 | **Related stats recommendations** | 🟢 | Medium | Graph of related `stat_id`s |

---

## Tier 6 — User Experience

| Rank | Initiative | Impact | Effort | Why |
|------|------------|--------|--------|-----|
| 6.1 | **Choropleth maps (province)** | 🟠 | High | High visual impact; README roadmap |
| 6.2 | **Municipal map view** | 🟡 | High | Needs GeoJSON boundaries + PostGIS or client SVG |
| 6.3 | **Interest rate timeline with MPC annotations** | 🟡 | Medium | README roadmap; SARB events as metadata |
| 6.4 | **Province comparator export** | 🟡 | Low | CSV of compared provinces |
| 6.5 | **Bookmark / saved views (localStorage)** | 🟢 | Low | README roadmap; no auth needed for v1 |
| 6.6 | **PWA offline for cached pages** | 🟢 | Medium | Nice for mobile SA users |

---

## Tier 7 — SEO & Growth

| Rank | Initiative | Impact | Effort | Why |
|------|------------|--------|--------|-----|
| 7.1 | **Preserve all URL structures** | 🔴 | — | Non-negotiable for existing rankings |
| 7.2 | **Structured data expansion** | 🟠 | Low | Already have schema.org; add `DataFeed` for API |
| 7.3 | **Programmatic comparison pages** | 🟠 | Medium | e.g. `/compare/gauteng/western-cape` — long-tail SEO |
| 7.4 | **RSS feed for data updates** | 🟡 | Low | Journalist discovery |
| 7.5 | **Afrikaans / isiZulu i18n** | 🟡 | Very High | Accessibility for SA audience; defer until platform stable |
| 7.6 | **README version badge fix** | 🟢 | Trivial | Next.js 14.2.3 ≠ badge saying 15 |

---

## Tier 8 — Performance

| Rank | Initiative | Impact | Effort | Why |
|------|------------|--------|--------|-----|
| 8.1 | **Remove municipalities.json from client bundle** | 🟠 | Medium | Happens naturally with DB migration |
| 8.2 | **Image/chart lazy loading** | 🟡 | Low | Below-fold charts on municipality pages |
| 8.3 | **Edge caching for API** | 🟡 | Low | `s-maxage` on `/api/v1/*` |
| 8.4 | **Materialized views for stat cards** | 🟢 | Medium | Only if query profiling warrants |
| 8.5 | **Bundle analysis** | 🟢 | Low | `@next/bundle-analyzer` one-time audit |

---

## Tier 9 — Automation & Operations

| Rank | Initiative | Impact | Effort | Why |
|------|------------|--------|--------|-----|
| 9.1 | **ETL failure alerts** | 🟠 | Low | Silent stale data is worse than downtime |
| 9.2 | **Neon branch per PR** | 🟡 | Medium | Preview DB for equivalence tests |
| 9.3 | **Scheduled freshness report** | 🟡 | Low | Weekly issue if dataset outdated |
| 9.4 | **Dependabot / npm audit** | 🟡 | Low | Security hygiene |
| 9.5 | **Staging environment** | 🟡 | Medium | Vercel preview + Neon branch |

---

## Tier 10 — Public API & Open Data

| Rank | Initiative | Impact | Effort | Why |
|------|------------|--------|--------|-----|
| 10.1 | **API rate limiting** | 🟠 | Low | Protect infrastructure |
| 10.2 | **Embed widgets** | 🟡 | Medium | Depends on API; README roadmap |
| 10.3 | **Bulk JSON dump download** | 🟡 | Medium | Open data practitioners expect it |
| 10.4 | **API keys for partners** | 🟢 | Medium | When traffic justifies |
| 10.5 | **data.gov.za listing** | 🟢 | Low | Visibility for SA open data ecosystem |

---

## Tier 11 — Authentication & Personalization (Year 2)

| Rank | Initiative | Impact | Effort | Why |
|------|------------|--------|--------|-----|
| 11.1 | **Neon Auth / saved dashboards** | 🟡 | High | Different skill set; defer until data platform solid |
| 11.2 | **Email alerts for dataset updates** | 🟡 | Medium | Requires user accounts |
| 11.3 | **Custom data cuts** | 🟢 | Very High | Researcher premium feature |

---

## Explicitly Deprioritized

| Item | Reason |
|------|--------|
| Microservices | Solo dev; modular monolith is correct |
| Kafka / streaming | Data is batch-released quarterly/annually |
| Self-hosted Postgres | Managed Neon is cheaper in time |
| Heavy ML story generation | Rule-based insights are trustworthy; LLM adds hallucination risk |
| TimescaleDB / partitioning | <500k rows expected |
| Full Prisma upfront | Hides SQL learning value |

---

## Suggested Quarterly Milestones

### Q3 2026

- Phase 0–1 complete (schema live)
- 4 datasets in PostgreSQL
- CI running lint + typecheck
- Duplicate stat IDs fixed

### Q4 2026

- All datasets migrated
- 2+ category pages on `DATA_SOURCE=db`
- ETL GitHub Action for population + inflation

### Q1 2027

- Full site on PostgreSQL
- API v1 beta (`/datasets`, `/municipalities`)
- Municipality SQL search

### Q2 2027

- JSON deprecated
- API docs published
- Map visualizations (province choropleth)
- SQL playground beta

---

## Success Metrics (12-month)

| Metric | Current | Target |
|--------|---------|--------|
| Manual steps per data update | 4+ | 0 |
| Time to publish new QLFS release | Days (redeploy) | < 1 hour |
| Test coverage (lib/) | 0% | > 70% |
| API consumers | 0 | 10+ external |
| Lighthouse performance | Good | Maintain > 90 |
| Dataset freshness accuracy | Manual | 100% automated |

---

## Related Documents

- [migration-plan.md](./migration-plan.md) — execution phases
- [architecture.md](./architecture.md) — technical direction
- [SA-Data-Hub-Architecture-Review.md](../SA-Data-Hub-Architecture-Review.md) — original review
