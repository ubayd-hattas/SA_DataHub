# Runbook: publishing a new release

How to put a new official release on SA Data Hub by hand. One section per dataset. The target for each is **published within 2 working days of the release**.

## Rules for every dataset

- **Download in a browser.** Nothing in this repo may make requests to statssa.gov.za, and the scripts in `automation/` and the `scripts/update_*.py` files are paused. Do not run them.
- **Keep the raw file.** Save it unchanged in `sources/releases/` under the publisher's file name. PDFs and workbooks are not committed. The file is what you check against.
- **Every figure needs three things on its record:** the source, the source's release date (`source.publicationDate`) and the date you checked it (`checkedOn`, or the dataset's `last_verified`). `npm run build` fails if one is missing (`assertSiteSourced()` in `src/lib/sourcing.ts`).
- **Write down the place.** Record the table and the printed page number (not the PDF page) in `source.publicationName` or the explainer's `location`.
- **Quote, don't explain.** A reason for a change goes on the site only if the release gives it, quoted with its page.
- **If the release date isn't printed** in a file you hold, the figure waits. Put it in `_meta.pending_statistics` or set `withheld` with the reason, and add it later.
- **One pull request per release.** Branch from `main`, and don't merge your own PR without looking at the Vercel preview.

### Checks (run for every release)

```bash
npx tsc --noEmit
npm run lint
npm test            # Vitest
npm run build       # includes the sourcing check
```

Then open the Vercel preview and look at each changed page at 390, 768, 1280 and 1920 px, in light and dark. Look for clipped or overlapping text, squeezed labels and sideways scrolling.

### Update-log entry (every release)

Add an entry at the top of `UPDATE_HISTORY` in `src/data/update-history.ts`. It appears on `/updates` and in the RSS feed.

```ts
{
  date: 'YYYY-MM-DD',              // the day you publish
  datasetId: 'inflation',          // the file name in src/data/datasets/ without .json
  datasetLabel: 'Inflation',
  type: 'data-update',             // or 'correction', 'new-dataset', 'methodology-change'
  summary: 'What changed, from which release (code, release date), with table and page.',
  changes: [{ item: 'CPI, annual rate', from: '4.5% (September 2026)', to: '4.7% (October 2026)' }],
}
```

Use `type: 'correction'` with `changes` when a figure already on the site was wrong.

### When a new statistic is added (not just new values)

Add its id to `statIds` in `src/lib/registry.ts` and to `GOOD_DIRECTION_BY_STAT` in `src/lib/utils.ts`. A test fails if either is missing.

---

## CPI (inflation), Stats SA P0141

**Cadence:** monthly. The dataset notes say around the 22nd, for the previous month. Check the date on Stats SA's release calendar.

**Download:** the release PDF from the P0141 page, https://www.statssa.gov.za/?page_id=1854&PPN=P0141 (for example `P0141October2026.pdf`). For the money value calculator, also the CPI history file (Tables B1 and B2).

**Files to edit**

| File | What |
|---|---|
| `src/data/datasets/inflation.json` | `cpi-headline`, `food-inflation`: new value, change, series point, `source` with release date and pages. `annual-cpi-avg` only from the December release (published in January), which gives the full-year average. |
| `src/data/explainers/cpi-YYYY-MM.ts` | New explainer (see below). |
| `src/data/explainers/cpi-history.json` | New month for the money value calculator, from the history file. |
| `src/data/update-history.ts` | Log entry. |

**Explainer**

1. Copy the latest `src/data/explainers/cpi-*.ts` to `cpi-YYYY-MM.ts` and rename the export.
2. Replace every figure with the new release's value and printed page: headline (Key findings, Table A), contributions (Table C), coverage figures (rural rate, deciles) and the quotes. Change `CHECKED` to today.
3. Add it to the front of `EXPLAINERS` in `src/data/explainers/index.ts` (newest first). The homepage, `/explainers`, the feed, the sitemap, search and the inflation answer page pick it up from there.
4. `assertExplainerSourced` fails the build if a figure has no source or location.

**Also check:** the inflation story's text (`src/data/stories.ts`, the `dataAsOf` note) and the "Guess first" question on the explainer, which names the headline rate.

---

## QLFS (unemployment), Stats SA P0211

**Cadence:** quarterly, in February, May, August and November.

**Download:** the statistical release PDF from https://www.statssa.gov.za/?page_id=1854&PPN=P0211 (for example `P02113rdQuarter2026.pdf`).

**Files to edit**

| File | What | Where in the release |
|---|---|---|
| `src/data/datasets/unemployment.json` | `unemployment-national` | Table A |
| `src/data/datasets/youth-unemployment.json` | 15 to 24 rate, 15 to 34 rate (worked out from the counts, say so), NEET rate | Table 2.2; section 4.2 and Table 7b (NEET) |
| `src/data/datasets/labour-force.json` | participation rates | record the table and page you use |
| `src/data/datasets/provinces.json` | `unemploymentRate`, `change`, `trend`, `lu3` for each province | Table E |
| `src/data/explainers/qlfs-YYYY-qN.ts` | New explainer | |
| `src/data/update-history.ts` | Log entry | |

**Explainer:** copy the latest `qlfs-*.ts`, update the headline, counts, the four LU rates, quotes and pages, then add it to the front of `EXPLAINERS`. Keep the section on why there is more than one rate. Use the release's own definition text, with its page.

**Also check:** the province ranking in `provinces.json` (rank 1 is the lowest rate), the unemployment answer pages (they read the explainer and `provinces.json`) and the unemployment story's `dataAsOf` note. The QLFS releases held so far print no "expanded" rate. Don't bring it back unless a release prints it.

---

## GDP, Stats SA P0441

**Cadence:** quarterly. The dataset notes say about 65 days after the quarter ends.

**Download:** the release PDF from https://www.statssa.gov.za/?page_id=1854&PPN=P0441 (for example `P04412ndQuarter2026.pdf`).

**Files to edit**

| File | What |
|---|---|
| `src/data/datasets/gdp.json` | `gdp-growth` (quarter on quarter, seasonally adjusted), `gdp-annual-growth` (in the fourth-quarter release), `gdp-nominal`, `gdp-per-capita`. Stats SA revises earlier quarters: update revised series points too, and say so in the log. |
| `src/data/update-history.ts` | Log entry, listing any revised quarters with old and new values. |

**Explainer:** there is no GDP explainer template yet. `docs/PRODUCT_DIRECTION.md` plans one (the number, what moved it from the industry breakdown, a quote, what it leaves out). Until it exists, update the dataset and the GDP story (`gdp-growth-slowdown` in `src/data/stories.ts`). In the story, quote the industry contributions with their page rather than explaining them.

---

## SARB repo rate

**Cadence:** after each Monetary Policy Committee meeting (about every two months). The rate takes effect on announcement.

**Download:** the MPC statement PDF from the SARB site's monetary policy statements page, for example https://www.resbank.co.za/en/home/publications/publication-detail-pages/statements/monetary-policy-statements/2026/september. Save it in `sources/releases/`.

**Files to edit**

| File | What |
|---|---|
| `src/data/datasets/interest-rates.json` | `repo-rate-sarb`: new rate, change, series point (one per MPC decision), `source.publicationDate` = statement date. `prime-lending-rate`: update it with the repo rate. Its record cites the same MPC statement. |
| `src/data/update-history.ts` | Log entry (also log "unchanged" decisions, so the checked date moves). |

**Explainer:** no template yet (planned in `PRODUCT_DIRECTION.md`). The interest-rate answer page reads `interest-rates.json` directly.

**Also check:** sentences in `src/data/stories.ts` that name the current repo rate (the inflation and unemployment stories).

---

## SAPS crime statistics

**Cadence:** quarterly releases. The annual figures cover the April to March financial year.

**Download:** the quarterly workbook and presentation from https://www.saps.gov.za/services/crimestats.php. Keep the workbook in `newdatasets/` or `sources/releases/`.

**Release date:** the workbook doesn't state one. Take it from a SAPS document you hold: the fourth quarter of 2025/26 used the POLICE magazine special edition (May 2026, pages 4 and 7: released at a media briefing on 22 May 2026). Without a dated document the figures wait.

**Files to edit**

| File | How |
|---|---|
| `src/data/datasets/crime.json` | Run `python -I scripts/crime/import_quarter.py <workbook.xlsx>` to print every value. Add `--write` to store them as pending, then `--released YYYY-MM-DD --write` once the date is confirmed. The script is written for the fourth quarter (January to March, ids ending `-q4`). For another quarter, change its id table and wording first. Annual figures change only when a full financial year is released. |
| `src/data/update-history.ts` | Log entry, with old and new values. |

**Explainer:** none. The crime story (`understanding-crime-statistics`) uses the annual figures. Update its numbers and `dataAsOf` note when the annual release comes out. Rates per 100 000 need a population for the same period: say which one, or leave the rate out.

---

## Census (Census 2022 municipalities and provinces)

**Cadence:** every ten years (the next census is expected around 2032), plus errata and revised editions.

**Download:** Census 2022 Provinces at a glance (Report 03-01-43) and the Municipal fact sheet (Report 03-01-82) from https://census.statssa.gov.za. Save them in `sources/releases/` as `Provinces_at_a_Glance.pdf` and `Census_2022_Municipal_factsheet-Web.pdf`.

**Files to edit (with a revised edition or erratum)**

1. `python -I scripts/census/parse_provinces_at_a_glance.py sources/releases/Provinces_at_a_Glance.pdf sources/derived/provinces-at-a-glance-municipal-tables.json`. Rows whose totals don't add up are reported, not guessed. Fix those by reading the page.
2. `python -I scripts/census/apply_provinces_at_a_glance.py` prints every difference against `src/data/datasets/municipalities.json`. Add `--write` to apply them.
   With `--write` it also rewrites `src/data/census-pages.json` (the printed page of each table) and `src/data/census-provinces.json` (the nine province rows used by /provinces, the province pages and the answers).
3. Update `CENSUS_SOURCE` and `BOUNDARY_QUOTE` in `src/lib/municipality-profile.ts`: edition, `checkedOn`, `downloadedOn`, pages.
4. Log each changed municipality in `src/data/update-history.ts` as a `correction` with old and new values.

**Also check:** the census story (`/insights/census-2011-to-2022`), the answers that rank municipalities, and that the share images still fit long names (`/municipalities/<code>/share-image`). Mid-year population estimates (P0302, each July) update `population.json` and the province totals in `provinces.json` (Appendix 1). They are estimates, not census counts, so keep them labelled that way.
