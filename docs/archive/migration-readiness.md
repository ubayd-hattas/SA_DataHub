# SA Data Hub — Migration Readiness Report

**Generated:** June 2026 (pre-migration cleanup)  
**Validation:** `npm run validate` — 0 failures, 2 warnings  
**Build:** `npm run build` — passes (252 static pages)

---

## Repository Health Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Data integrity** | 82/100 | No duplicate IDs; SARB rates fixed; LFPR conflict remains |
| **Registry coherence** | 90/100 | All statIds resolve; file placement ≠ registry for 2 stats |
| **Geography** | 95/100 | 9 provinces, 213 municipalities validated |
| **Metadata standardisation** | 85/100 | Core `_meta` complete; municipalities extended meta OK |
| **ETL readiness** | 55/100 | Scripts exist; no `etl/` pipeline; WB ≠ Stats SA cadence |
| **Test coverage** | 40/100 | Validation framework added; no unit/equivalence tests yet |
| **Documentation** | 92/100 | `/docs` complete; README version fixed |
| **Overall migration readiness** | **78/100** | Ready for Phase 0–1; resolve blockers before Phase 2 load |

---

## Part 1: Repository Audit Summary

### Fixed automatically (see [standardisation-changelog.md](./standardisation-changelog.md))

- Stale SARB rates in `interest-rates.json`
- Broken `update_interest_rates.py` stat ID (`repo-rate` → `repo-rate-sarb`)
- Duplicate `TimelineEvent` interface in `types/index.ts`
- README Next.js version mismatch (15 → 14)
- Missing `municipalities.json` `_meta.notes`
- Labour-force `source.publicationName` / `publicationDate` standardisation

### Confirmed healthy

- **34 unique statistic IDs** across all JSON files (no duplicates when merged in `mock.ts`)
- **213 unique municipality codes**
- **12 registry slugs** map to JSON files (+ municipalities export)
- **All registry statIds resolve** to live statistics
- **All 16 story stat references** resolve
- **All mock.ts imports** present for statistics datasets

### Warnings (not auto-fixed)

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| `labour-force-participation` (42.7%) vs `lfpr-overall` (60.6%) | **Blocker** | Manual methodology review — likely different population definitions; cannot load both as LFPR |
| Provincial unemployment Q3 2025 vs national Q4 2025 | Medium | Update `provinces.json` on next QLFS release |
| `repo-rate` + `repo-rate-sarb` duplicate indicators | Medium | Consolidate to one `stat_id` during migration |
| `youth-unemployment` stat in unemployment file vs youth-unemployment registry file | Low | Naming confusion only; IDs are unique |
| World Bank scripts vs quarterly Stats SA data | Medium | Build Stats SA extractors before automating |
| `ProvinceCard.tsx` unused | Low | Remove or wire up in provinces explorer |
| Duplicate `ChangelogEntry` type in `types/index.ts` and `data/changelog.ts` | Low | Consolidate types post-migration |
| No GitHub Actions CI | Medium | Add per [testing-strategy.md](./testing-strategy.md) |
| `crime.json`, `education.json` `_meta.last_verified` = 2025-05-01 | Low | Verify staleness; update or mark in registry |

### Orphaned / dead code

| Item | Status |
|------|--------|
| `src/components/ui/ProvinceCard.tsx` | Defined, never imported |
| `src/data/changelog.ts` vs `src/lib/changelog.ts` | Not duplicate — data + thin wrapper (OK) |
| `SA-Data-Hub-Architecture-Review.md` (root) | Reference doc; keep |

### Duplicated logic (normalise during ETL)

| Logic | Locations |
|-------|-----------|
| World Bank `_parse_wb()` | 4 Python update scripts |
| Period label parsing | `registry.ts` `parseCoverageLabel()` |
| Freshness calculation | `utils.ts` + `registry.ts` |
| Province code ↔ slug | `utils.ts` (→ DB `geographies.slug`) |
| SARB repo rate | `inflation.json` + `interest-rates.json` (now synced) |

---

## Remaining Blockers

### Blocker 1: LFPR indicator conflict (must resolve before migration)

Two statistics claim to measure labour force participation with **18pp difference**:

| Stat ID | File | Q4 2025 value |
|---------|------|---------------|
| `labour-force-participation` | unemployment.json | 42.7% |
| `lfpr-overall` | labour-force.json | 60.6% |

**Action:** Verify against Stats SA QLFS publication which age band each uses. Retire or rename the incorrect stat. Update stories if `labour-force-participation` is removed.

### Blocker 2: No equivalence test suite

Cannot prove DB = JSON without tests. See [testing-strategy.md](./testing-strategy.md).

### Blocker 3: No `db/migrations/` or seed scripts

~~Phase 1 schema not yet applied.~~ **Resolved in Phase 1** — see `db/migrations/` and `npm run db:migrate`.

---

## Recommended Migration Order

Aligns with [migration-plan.md](./migration-plan.md), adjusted for audit findings:

| Phase | Dataset(s) | Prerequisite |
|-------|------------|--------------|
| 0 | Neon + schema | None |
| 1 | `geographies` seed | Schema applied |
| 2a | `census`, `population` | None |
| 2b | `education`, `crime`, `housing` | Manual extract docs |
| 2c | `interest-rates` | SARB sync done ✅ |
| 2d | `gdp`, `inflation` | Period normalizer |
| 2e | `unemployment`, `youth-unemployment`, `labour-force` | **LFPR blocker resolved** |
| 2f | `provinces` | QLFS provincial update (recommended) |
| 2g | `municipalities` | Last — largest profile load |

---

## Dataset Readiness Matrix

| Dataset | Ready? | Complexity | Manual review? |
|---------|--------|------------|----------------|
| census | ✅ Yes | Low | No |
| population | ✅ Yes | Low | No |
| interest-rates | ✅ Yes | Low | No (after sync) |
| education | ⚠️ Mostly | Low | Annual manual extract |
| crime | ⚠️ Mostly | Medium | SAPS Excel manual |
| housing | ⚠️ Mostly | Low | GHS manual |
| gdp | ⚠️ Mostly | Medium | WB vs Stats SA ZAR |
| inflation | ⚠️ Mostly | Medium | Monthly CPI manual |
| youth-unemployment | ⚠️ Mostly | Medium | QLFS quarterly |
| unemployment | ⚠️ Partial | Medium | LFPR stat in file |
| labour-force | ❌ Blocked | Medium | LFPR conflict |
| provinces | ⚠️ Partial | High | Composite + stale QLFS |
| municipalities | ✅ Yes | High (volume) | Erratum codes MP325/MP322 |

**Legend:** ✅ Ready for ETL design | ⚠️ Needs work | ❌ Blocker

---

## Part 5: ETL Readiness — Per-Dataset Checklists

### census

| Item | Detail |
|------|--------|
| **Source** | Stats SA Census 2022 (static) |
| **Transformations** | Map stat series → observations; census years → `period_start` |
| **Lookup tables** | `geographies` (ZA), `data_sources`, `categories`, `datasets` |
| **FK dependencies** | `datasets` → `categories`, `data_sources` |
| **Destination tables** | `observations`, `statistic_snapshots`, `datasets` |
| **Validation** | Static values; 0–100% where applicable |
| **Checklist** | [ ] Seed 3 datasets [ ] Load ~9 observations each [ ] Equivalence test |

### population

| Item | Detail |
|------|--------|
| **Source** | Stats SA P0302 + World Bank `SP.POP.TOTL` |
| **Transformations** | Millions for total pop; annual labels → Jan 1 dates |
| **Lookup tables** | ZA geography |
| **FK dependencies** | Same as census |
| **Destination tables** | `observations`, `statistic_snapshots` |
| **Validation** | Total pop > 50M; urban % 0–100 |
| **Checklist** | [ ] Prefer Stats SA over WB for headline [ ] Equivalence test |

### education

| Item | Detail |
|------|--------|
| **Source** | DBE NSC + Census literacy |
| **Transformations** | Annual year labels |
| **Lookup tables** | ZA |
| **Destination tables** | `observations`, `statistic_snapshots` |
| **Validation** | Matric % 0–100 |
| **Checklist** | [ ] Manual DBE extract script [ ] Equivalence test |

### crime

| Item | Detail |
|------|--------|
| **Source** | SAPS annual Excel |
| **Transformations** | FY label `2017/18` → `2017-04-01` |
| **Lookup tables** | ZA |
| **Destination tables** | `observations` (unit: cases) |
| **Validation** | Non-negative integers |
| **Checklist** | [ ] SAPS parse script [ ] Equivalence test |

### housing

| Item | Detail |
|------|--------|
| **Source** | Census 2022 + GHS P0318 |
| **Transformations** | % access rates |
| **Destination tables** | `observations` |
| **Checklist** | [ ] Equivalence test |

### interest-rates

| Item | Detail |
|------|--------|
| **Source** | SARB MPC |
| **Transformations** | MPC date labels; prime = repo + 3.5 |
| **Destination tables** | `observations` |
| **Validation** | Prime ≈ repo + 3.5 |
| **Checklist** | [x] JSON synced [ ] Equivalence test [ ] Deprecate duplicate `repo-rate` in inflation |

### gdp

| Item | Detail |
|------|--------|
| **Source** | Stats SA P0441 + World Bank |
| **Transformations** | Quarterly + annual; ZAR billions scaling |
| **Destination tables** | `observations` |
| **Validation** | Growth % plausible (-10 to 10) |
| **Checklist** | [ ] Stats SA ZAR verify [ ] Equivalence test |

### inflation

| Item | Detail |
|------|--------|
| **Source** | Stats SA P0141 |
| **Transformations** | Monthly `Mon YYYY` → first of month |
| **Destination tables** | `observations` |
| **Validation** | CPI % range; repo consistency with interest-rates |
| **Checklist** | [ ] Monthly CPI extract [ ] Handle `repo-rate` dedup |

### unemployment

| Item | Detail |
|------|--------|
| **Source** | Stats SA QLFS P0211 |
| **Transformations** | Quarterly `QN YYYY` → quarter start date |
| **Destination tables** | `observations` |
| **Validation** | % 0–100; quarterly label regex |
| **Checklist** | [ ] Resolve LFPR stat [ ] Move youth-unemployment stat? [ ] Equivalence test |

### youth-unemployment

| Item | Detail |
|------|--------|
| **Source** | Stats SA QLFS |
| **Transformations** | Quarterly |
| **Destination tables** | `observations` (4 stats) |
| **Checklist** | [ ] Dedicated extract script [ ] Equivalence test |

### labour-force

| Item | Detail |
|------|--------|
| **Source** | Stats SA QLFS |
| **Transformations** | Quarterly |
| **Destination tables** | `observations` |
| **Blocker** | Resolve conflict with `labour-force-participation` |
| **Checklist** | [ ] Methodology decision [ ] Equivalence test |

### provinces

| Item | Detail |
|------|--------|
| **Source** | Composite: QLFS + Census + DBE |
| **Transformations** | Snapshot blob per province; 9 rows |
| **Lookup tables** | 9 province `geographies` |
| **Destination tables** | `province_snapshots` (+ future per-indicator observations) |
| **Validation** | 9 provinces; slug set matches |
| **Checklist** | [ ] Update QLFS to Q4 2025 [ ] Equivalence test full JSON blob |

### municipalities

| Item | Detail |
|------|--------|
| **Source** | `raw_data/*.csv` → `transform_municipalities.js` |
| **Transformations** | Already scripted; port to `etl/transform/municipalities.py` |
| **Lookup tables** | 213 `geographies` rows |
| **Destination tables** | `municipality_profiles`, `geographies` |
| **Validation** | 213 count; erratum flags; province codes |
| **Checklist** | [ ] Seed geographies [ ] Load JSONB profiles [ ] Checksum test 213 rows |

---

## Expected Migration Complexity

| Complexity | Datasets | Effort estimate |
|------------|----------|-----------------|
| **Low** | census, population, interest-rates, housing | 1–2 days each |
| **Medium** | education, crime, gdp, inflation, youth-unemployment | 2–4 days each |
| **High** | unemployment, labour-force, provinces | 4–7 days (blockers) |
| **Very high** | municipalities | 5–7 days (volume + search migration) |

---

## Potential Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LFPR loaded twice with different values | High if unblocked carelessly | Critical | Resolve blocker first |
| Stats SA format change | Medium | High | Raw snapshots + validation |
| Build time regression with DB | Medium | Medium | ISR for municipality pages |
| Story callouts break on stat rename | Medium | High | No ID changes without migration script |
| Neon connection limits | Medium | Medium | Pooling; edge runtime audit |
| Equivalence drift | High without tests | High | CI equivalence suite |

---

## Rollback Considerations

| Stage | Rollback |
|-------|----------|
| Pre-Phase 3 | Drop DB tables; no app impact |
| Phase 3 dual-read | `DATA_SOURCE=json` env var (< 1 min) |
| Post-JSON deprecation | Restore JSON from git tag `pre-db-migration` |
| Bad ETL load | `DELETE FROM observations WHERE version_id = X`; re-run load |
| Neon disaster | Point-in-time recovery |

**Tag recommendation:** Create git tag `json-baseline-v1` before first production DB flip.

---

## Next Steps (Ordered)

1. Resolve LFPR methodology conflict (human decision)
2. Apply migrations to Neon dev branch: `npm run db:migrate`
3. Add Vitest + first equivalence test scaffold
4. Add `.github/workflows/ci.yml` with `npm run validate`
5. Migrate `census` end-to-end as pilot
6. Update `provinces.json` QLFS to Q4 2025 when ready

---

## Related Documents

- [standardisation-changelog.md](./standardisation-changelog.md) — changes made this cleanup
- [testing-strategy.md](./testing-strategy.md) — JSON = PostgreSQL verification
- [migration-plan.md](./migration-plan.md) — phased execution
- [etl-pipeline.md](./etl-pipeline.md) — target ETL architecture
- [validation/README.md](../validation/README.md) — run validation
