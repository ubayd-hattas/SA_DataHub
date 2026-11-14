# Runbook: publishing a new release

How to put a new official release on SA Data Hub by hand. One section per dataset. The target for each is **published within 2 working days of the release**.

## Rules for every dataset

- **Download in a browser.** Nothing in this repo may make requests to statssa.gov.za, and the scripts in `automation/` and the `scripts/update_*.py` files are paused. Do not run them.
- **Keep the raw file.** Save it unchanged in `sources/releases/` under the publisher's file name. PDFs and workbooks are not committed. The file is what you check against.
- **Every figure needs three things on its record:** the source, the source's release date (`source.publicationDate`) and the date you checked it (`checkedOn`, or the dataset's `last_verified`). `npm run build` fails if one is missing (`assertSiteSourced()` in `src/lib/sourcing.ts`).
- **Write down the place.** Record the table and the printed page number (not the PDF page) in `source.publicationName` or the explainer's `location`.
- **Quote, don't explain.** A reason for a change goes on the site only if the release gives it, quoted with its page.
- **If the release date isn't printed** in a file you hold, the figure waits. Put it in `_meta.pending_statistics` or set `withheld` with the reason, and add it later.
- **Record revisions.** When a release changes a value the site already shows for an earlier period, update the series point and add an entry to that statistic's `revisions` array: `period`, `from`, `to`, `release`, `releasedOn`, `recordedOn` (today) and, if the release gives a reason, `note` quoted with its page. Series pages show these, and the JSON downloads carry them. `tests/unit/series.test.ts` rejects a revision whose period is not in the series or whose value did not change.
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
| `src/data/datasets/gdp.json` | `gdp-growth` (quarter on quarter, seasonally adjusted), `gdp-annual-growth` (in the fourth-quarter release), `gdp-nominal`, `gdp-per-capita`. Stats SA revises earlier quarters: update revised series points, add each change to `revisions` on the statistic, and say so in the log. |
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

---

## Publishing the monthly fuel prices

**What it is:** the official monthly fuel prices from the Department of Mineral and Petroleum Resources (DMPR). They feed `/fuel`, `/category/fuel` and ten `/series/fuel-*` pages. A person reviews and merges every monthly price update (decision D5, `docs/implementation-plan.md`). Nothing about this task merges by itself.

**Cadence:** one adjustment a month, taking effect on the first Wednesday. The DMPR announces it one or two days before. Target: published within 2 working days of the announcement.

**Never:** make a script request to a DMPR page or file. Download by hand in a browser. Do not commit the downloaded files (`sources/releases/` is ignored by git).

**Files involved**

| File | What |
|---|---|
| `scripts/fuel/sources.json` | One entry per month that has a spreadsheet: `document`, `url`, `file` and `releasedOn` (the announcement date). The key is the month, `YYYY-MM`. |
| `scripts/fuel/manual-months.json` | Months with no spreadsheet online, typed by hand from named DMPR documents (March and April 2026 today). Not needed for a normal month. |
| `scripts/fuel/build_prices.py` | Reads the spreadsheets and the two lists above, checks every price, and writes `src/data/fuel/prices.json`. |
| `src/data/fuel/prices.json` | The output. Do not edit it by hand. |
| `src/data/update-history.ts` | The `/updates` entry. |

**Steps**

1. **Find the files.** Open the DMPR Fuel Prices page, https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices. The current month has one entry. Recent months are a ZIP of files behind a short link, and some months list separate files: Basic Fuel Price, Breakdown of Prices, Fuel Price Schedule, History of Fuel Prices and Media Statement. Older months are on the Petrol Price Archive page, https://www.dmpr.gov.za/Branches/Petroleum-Resources/Petrol-Price-Archive. The files you need are the new month's price schedule or "Fuel Regulations" spreadsheet (`.xlsx`) and the History of Fuel Prices table.
2. **Download by hand.** Save the new month's spreadsheet as `sources/releases/fuel/regs-YYYY-MM.xlsx` (for example `regs-2026-12.xlsx`). Keep the earlier months' files in the same folder: `build` reads every file named in `sources.json`, so a missing file stops it. Also save the History of Fuel Prices document in that folder for step 7. Do not commit any of them.
3. **Add the month to `sources.json`.** Copy the last entry and change: the key, `document` (the DMPR's name for the file), `url` (where you downloaded it), `file` and `releasedOn` (the date of the announcement). The newest month must have `releasedOn`: the site fails to build without it.
4. **Read the spreadsheet.**
   ```bash
   python -I scripts/fuel/build_prices.py check sources/releases/fuel/regs-2026-12.xlsx
   ```
   It prints the effective date from the file's header and the parsed prices (cents per litre: petrol 93 and 95, diesel 500 ppm and 50 ppm, illuminating paraffin, inland zone 9C and coastal zone 1A). Any line starting `PROBLEM` or `ERROR` means a value is outside 800 to 6000 cents, inland is not above coastal, petrol 95 is below petrol 93, a petrol price is not whole cents, or the file does not have the layout the script expects. Do not work around it. Find out why, and stop and ask the owner if you cannot tell.
5. **Build the file.**
   ```bash
   python -I scripts/fuel/build_prices.py build YYYY-MM-DD
   ```
   Use today's date as the argument: it is stored as the date you checked the prices. The script rewrites `src/data/fuel/prices.json`, prints `Wrote N adjustments, 2022-01 to YYYY-MM`, and writes nothing if a month is missing or repeated or any price fails the checks. Run `git diff src/data/fuel/prices.json`: only the new month and `checked_on` should change. If an older month changed, find out why before going on.
6. **Run the tests.**
   ```bash
   npx vitest run tests/unit/fuel-prices.test.ts
   ```
   They check: every month from January 2022 appears once with no gap, each effective date falls in its month, each month names a source with an https URL, every price is within range with inland above coastal and 95 at or above 93, only the hand-typed months have missing prices, and January, April, July, October and November 2026 match the DMPR history table. One test names November 2026 as the latest month, with petrol 95 inland at R30.24. When a new month becomes the latest, change that test to the new month and its value, checked against the DMPR history table (step 7). Do not loosen any other test.
7. **Check the numbers against a second DMPR document.** Open the new History of Fuel Prices table (it is in the new month's pack). Compare the new month's petrol 93, petrol 95, diesel 500 ppm and paraffin, inland and coastal, with `src/data/fuel/prices.json`. They must be equal to the cent. Also read the price in the DMPR media statement for the month. If they differ, the spreadsheet is wrong or the table is: report it, do not choose.
8. **Add the `/updates` entry** at the top of `UPDATE_HISTORY` in `src/data/update-history.ts`, using the format in "Update-log entry" above:
   ```ts
   {
     date: 'YYYY-MM-DD',
     datasetId: 'fuel',
     datasetLabel: 'Fuel prices',
     type: 'data-update',
     summary: 'Added the DMPR prices taking effect on <date>, from <document>.',
     changes: [{ item: 'Petrol 95, inland', from: 'R30.24 a litre (November 2026)', to: 'R… a litre (<month year>)' }],
   }
   ```
   Add one `changes` row for each of the ten series that moved: petrol 93 and 95, diesel 500 ppm and 50 ppm and paraffin, inland and coastal. Rands, not cents, as the site shows them.
9. **Update the release calendar.** In `src/data/release-calendar.ts`, remove the fuel entry whose date has passed and add the next adjustment only if a DMPR document gives the date. The first Wednesday of the month is the rule, not a printed date, so say that in the `source` text and say the announcement is not confirmed.
10. **Run the checks** in "Checks (run for every release)" above, plus `npm run validate`. Then open the Vercel preview and look at `/fuel`, `/category/fuel` and one `/series/fuel-*` page at phone and desktop width.
11. **Open a pull request** from a `data/fuel-YYYY-MM` branch with the diff of `scripts/fuel/sources.json`, `src/data/fuel/prices.json` and `src/data/update-history.ts`, the output of steps 4 to 7, and the date you checked. The owner merges it after looking at the preview. A script or an AI draft does not merge it.

**If a month has no spreadsheet:** type it into `scripts/fuel/manual-months.json` from the named DMPR documents (see the March and April 2026 entries for the shape: `month`, `effectiveFrom`, `source`, `note`, `prices`). Use `null` for a price no held file gives, and say why in `note`. A month goes in `sources.json` or `manual-months.json`, never both.

**Not done by this runbook:** the breakdown of a litre's price and the estimate of the next change have their own sources and are not covered here.
