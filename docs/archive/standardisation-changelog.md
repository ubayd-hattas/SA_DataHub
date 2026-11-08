# SA Data Hub — Standardisation Changelog

This document records every data and metadata standardisation change made during pre-migration cleanup (June 2026). **No statistic IDs or URL paths were changed** — those remain frozen for SEO and story references.

---

## Summary

| Category | Changes |
|----------|---------|
| Data corrections | SARB interest rates synced to authoritative inflation.json values |
| Metadata | Labour-force source fields, municipalities `_meta.notes` |
| Scripts | `update_interest_rates.py` stat ID and rate constants fixed |
| Code | Duplicate `TimelineEvent` interface removed from `types/index.ts` |
| Documentation | README Next.js version aligned with lockfile |
| Tooling | `validation/` framework + `npm run validate` |

---

## Data Corrections

### `interest-rates.json` — SARB repo and prime rates (stale data fix)

**Problem:** `repo-rate-sarb` showed 7.50% while `inflation.json` `repo-rate` correctly showed 6.75% (March 2026 MPC hold). Prime rate was similarly stale at 11.00% vs correct 10.25%.

**Change:** Updated headline values, trend/change fields, and Sep 2025–Mar 2026 series tail to match `inflation.json` and SARB MPC March 2026.

**Reasoning:** Same underlying indicator from the same source; stale interest-rates file was a data maintenance gap, not an intentional difference.

**Not changed:** Stat IDs (`repo-rate-sarb`, `repo-rate` in inflation) — consolidation deferred to migration (see migration-readiness blockers).

---

## Metadata Standardisation

### `labour-force.json` — Source citation fields

**Before:** `source.release` only (`"QLFS Q4 2025"`)

**After:** `source.publicationName` + `source.publicationDate` (matches unemployment.json and other QLFS stats)

**Reasoning:** Citation engine (`lib/citation.ts`) resolves year from `publicationDate` first; consistent shape across QLFS datasets.

### `municipalities.json` — `_meta.notes`

**Added:**

```json
"notes": "Census 2022 municipal profiles. Employment and income themes excluded per Statistician-General (August 2024). Regenerate via: node scripts/transform_municipalities.js"
```

**Reasoning:** All dataset files should have the standard five `_meta` keys (`source`, `source_url`, `update_frequency`, `last_verified`, `notes`) for registry and ETL mapping.

---

## Script Fixes

### `scripts/update_interest_rates.py`

| Item | Before | After |
|------|--------|-------|
| Stat ID | `repo-rate` (wrong — would overwrite wrong ID) | `repo-rate-sarb` |
| `LATEST_REPO_RATE` | 7.50 | 6.75 |
| `LATEST_MPC_DATE` | 2026-03-27 | 2026-03-26 |

**Reasoning:** Script was out of sync with JSON schema after interest-rates dataset was split from inflation. Running the old script would have corrupted data.

---

## Code / Documentation

### `src/types/index.ts`

Removed duplicate stub `TimelineEvent` interface (lines 118–122). Single complete definition retained.

### `README.md`

Next.js badge and tech table: **15 → 14** to match `package.json` (`next@14.2.3`).

### `package.json`

Added `"validate": "python validation/report.py"`.

---

## Intentionally NOT Changed (Requires Manual Review)

These were identified in the audit but left unchanged to avoid breaking references or altering ambiguous data:

| Item | Why deferred |
|------|----------------|
| Stat ID `youth-unemployment` in `unemployment.json` | Referenced by `stories.ts` callouts; distinct from `youth-unemployment-narrow` in youth file — rename needs coordinated story/registry update |
| Stat ID `labour-force-participation` vs `lfpr-overall` | **Different values (42.7% vs 60.6%)** — likely different age-band definitions; must be resolved with Stats SA methodology before migration |
| `repo-rate` in inflation.json vs `repo-rate-sarb` | Both now consistent in value; ID consolidation is a migration task |
| Provincial unemployment Q3 2025 vs national Q4 2025 | Requires QLFS provincial extract from Feb 2026 release — data update, not standardisation |
| `src/data/mock.ts` filename | Renamed post-migration per architecture plan |
| `ProvinceCard.tsx` | Unused component — kept for potential province grid refactor |
| `population.json` `_meta.auto_updated` | Non-standard key; harmless; map to `last_verified` in ETL |

---

## Validation After Changes

```bash
npm run validate
```

Expected: **0 failures**, 2 warnings (LFPR mismatch, provincial period lag) until QLFS provincial update.

---

## Related Documents

- [migration-readiness.md](./migration-readiness.md)
- [testing-strategy.md](./testing-strategy.md)
- [validation/README.md](../validation/README.md)
