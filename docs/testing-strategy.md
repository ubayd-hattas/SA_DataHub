# SA Data Hub — Testing Strategy

Strategy for verifying **JSON output = PostgreSQL output** during and after migration. No test runner is configured yet; this document defines what to build.

---

## Goals

1. **Equivalence** — every statistic, observation, and profile field matches pre-migration JSON
2. **Regression** — data updates do not silently break charts, citations, or exports
3. **CI gate** — migration PRs cannot merge with failing equivalence tests
4. **Reusability** — same validation runs after every ETL job (`npm run validate`)

---

## Test Pyramid

```
                    ┌─────────────────┐
                    │  E2E smoke (few) │  Playwright: category page renders
                    ├─────────────────┤
                    │ Integration      │  JSON vs DB equivalence per dataset
                    ├─────────────────┤
                    │ Unit tests       │  citation, registry, insights, periods
                    └─────────────────┘
```

---

## Layer 1: Data Validation (Implemented)

**Tool:** `validation/report.py` (`npm run validate`)

| When | Command |
|------|---------|
| After dataset update | `npm run validate` |
| CI on every PR | `python validation/report.py --strict` (once warnings triaged) |
| Pre-migration gate | Must have 0 failures |

This is the **first line of defense** — catches duplicate IDs, broken registry refs, stale cross-file inconsistencies.

---

## Layer 2: Unit Tests (Recommended — Vitest)

**Setup:**

```bash
npm install -D vitest
```

Add to `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

### Priority modules

| Module | Test focus |
|--------|------------|
| `lib/citation.ts` | APA/Harvard format strings, year extraction |
| `lib/registry.ts` | `getEntryFreshness`, `getDatasetStatus`, `getUpdateLog` |
| `lib/insights.ts` | Trend detection, sentiment by category |
| `lib/export.ts` | CSV escaping, series vs summary mode |
| `lib/utils.ts` | `getFreshness`, province slug maps |
| `validation/` (Python) | `pytest` for period parsing when ETL lands |

### Example equivalence helper (TypeScript)

```typescript
// tests/helpers/load-json-baseline.ts
import { getStatById } from '@/data/mock'

export function jsonBaseline(statId: string) {
  const stat = getStatById(statId)
  if (!stat?.series?.[0]) return null
  return stat.series[0].data.map((p) => ({
    periodLabel: p.label,
    value: p.value,
  }))
}
```

---

## Layer 3: JSON ↔ PostgreSQL Equivalence Tests

**When:** Phase 2+ of [migration-plan.md](./migration-plan.md), per dataset.

### Pattern

```typescript
// tests/equivalence/unemployment.test.ts
import { describe, it, expect } from 'vitest'
import { jsonBaseline } from '../helpers/load-json-baseline'
import { getObservationSeries } from '@/lib/db/observations'

describe('unemployment-national equivalence', () => {
  it('matches JSON series length and values', async () => {
    const json = jsonBaseline('unemployment-national')
    const db = await getObservationSeries('unemployment-national', 'ZA')
    expect(db).toHaveLength(json!.length)
    db.forEach((row, i) => {
      expect(row.periodLabel).toBe(json![i].periodLabel)
      expect(row.value).toBeCloseTo(json![i].value, 1)
    })
  })
})
```

### Equivalence scope per dataset type

| Type | Compare |
|------|---------|
| Time series stats | Every `observations` row: `period_label`, `value` |
| Statistic snapshots | `rawValue`, `change`, `trend`, `lastUpdated` |
| Provinces | Full `ProvinceData` JSON blob vs `province_snapshots` |
| Municipalities | Sample of 10 codes + all 213 codes count/hash |
| Registry metadata | `datasets` table vs `registry.ts` fields |

### Municipality sampling strategy

Full equivalence on 213 × 50 fields is slow. Use:

1. **Count test** — 213 rows in DB
2. **Checksum test** — `md5(profile_data::text)` per municipality vs JSON export
3. **Spot check** — BUF, CPT, JHB, EC101, MP325 (erratum)

### Tolerance rules

| Field type | Rule |
|------------|------|
| Percentages | `toBeCloseTo(value, 1)` — one decimal |
| Counts | Exact integer match |
| Dates | Exact ISO string match |
| Formatted `value` strings | Exact match on snapshots |

---

## Layer 4: Export Equivalence

CSV downloads must match pre-migration output.

```typescript
import { buildCsvContent } from '@/lib/export'
import { getStatsByIds } from '@/data/mock'

it('CSV export unchanged for unemployment registry', () => {
  const stats = getStatsByIds(['unemployment-national'])
  const csv = buildCsvContent(stats, 'Unemployment')
  expect(csv).toMatchSnapshot() // commit baseline snapshot once
})
```

After DB migration, build CSV from DB query functions and compare to same snapshot.

---

## Layer 5: Build / SSG Smoke

```bash
npm run build   # must pass — 252 static pages
```

Catches:

- Broken `generateStaticParams`
- Type errors from schema changes
- Missing stat references in stories

**Future:** Playwright smoke on 5 critical URLs:

- `/`
- `/category/unemployment`
- `/provinces/western-cape`
- `/municipalities/CPT`
- `/insights/south-africa-unemployment-crisis`

---

## CI Pipeline (Recommended)

```yaml
# .github/workflows/ci.yml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: python validation/report.py
      - uses: actions/setup-node@v4
      - run: npm ci && npm run lint && npm run build
      # - run: npm test  # when vitest added

  equivalence:
    needs: validate
    if: github.event_name == 'pull_request'
    services:
      postgres: ...
    steps:
      - run: npm test -- tests/equivalence/
    env:
      DATABASE_URL: ...
```

---

## Neon Branch Testing

For migration PRs:

1. Create Neon branch from production schema
2. Run ETL load on branch only
3. Run equivalence tests against branch `DATABASE_URL`
4. Delete branch after merge

Avoids touching production data during development.

---

## Regression Test Checklist (Manual — Per Release)

- [ ] `npm run validate` — 0 failures
- [ ] `npm run build` — success
- [ ] Homepage featured stats match source publications
- [ ] Category page charts show latest period
- [ ] CSV download opens correctly in Excel
- [ ] Citation copy matches expected APA format
- [ ] Story stat callouts render live values
- [ ] Municipality search returns expected results

---

## Snapshot Baseline Strategy

1. **Before first DB migration PR:** run `vitest -u` to commit JSON-era snapshots
2. **On DB migration PR:** equivalence tests compare DB to snapshots
3. **Intentional data updates:** update snapshots in same PR as data change with source citation in PR description

---

## What Not to Test

| Skip | Reason |
|------|--------|
| Snapshot every municipality page HTML | Brittle; test data equivalence instead |
| World Bank API live calls in CI | Flaky; mock extract fixtures |
| Visual regression on charts | Low ROI for solo dev |

---

## Implementation Order

1. ✅ `validation/report.py` (done)
2. Add Vitest + unit tests for `citation.ts`, `registry.ts`, `insights.ts`
3. Add CSV snapshot tests for 3 registry datasets
4. Add first equivalence test when `lib/db/observations.ts` exists
5. Add GitHub Actions `ci.yml`
6. Add Playwright smoke (optional)

---

## Related Documents

- [migration-readiness.md](./migration-readiness.md)
- [migration-plan.md](./migration-plan.md)
- [validation/README.md](../validation/README.md)
