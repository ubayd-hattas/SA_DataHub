# SA Data Hub — Dataset Sourcing & Automation Planning Document

**Prepared:** 1 July 2026
**Scope:** All 13 dataset files in `src/data/datasets/` (12 registry entries + `municipalities.json`)
**Purpose:** Establish, per dataset, the official source of record, its current freshness, and the best long-term update strategy — as input to the PostgreSQL/ETL migration. This document contains no code and no JSON; it is a research and planning artefact only.

**Method note:** Every dataset below was checked against the live official publication as of the date on this document, not against training knowledge. Where a source could not be fully verified (e.g. exact download format for a niche indicator), this is flagged explicitly rather than assumed.

---

## Headline findings (read this first)

1. **Every "live" indicator in the JSON is at least one release behind.** QLFS, CPI, GDP, and the SARB repo rate all have a newer official release than what's in the repo — in three cases the gap is large enough to be a wrong number if displayed today, not just a stale one.
2. **`population.json` is not just outdated — it may be reading the wrong source entirely.** Its `_meta.auto_updated` claims the file was refreshed on 30 May 2026, but the underlying series still ends in 2024 and appears to reflect World Bank/modelled estimates rather than Stats SA's own Mid-Year Population Estimates (MYPE). Stats SA's official 2025 MYPE (63.1 million, released 28 July 2025) is *lower* than the JSON's 2024 figure (64.0 million) — that's not staleness, that's two different methodologies disagreeing. This needs a source-level fix, not just a re-run.
3. **`crime.json`'s premise is outdated.** The dataset and its documentation assume SAPS publishes annually in September only. In fact SAPS has published quarterly crime statistics since 2016 (Q1–Q4 of each police financial year), alongside the September annual figures. The quarterly cadence is real but has recently been unreliable — releases have slipped by months in the current financial year — so "quarterly" is the correct target cadence, with the caveat that it isn't a fixed calendar.
4. **SARB actually has a public web API** (`https://custom.resbank.co.za/SarbWebApi/`), contrary to what the dataset notes imply. This meaningfully upgrades `interest-rates.json` (and the `repo-rate` stat duplicated inside `inflation.json`) from "moderate/manual" to "easy" automation.
5. **Stats SA has no REST/JSON API for QLFS, CPI, or GDP**, but does publish structured Excel data tables alongside every PDF statistical release, plus a general time-series Excel/ASCII download page and an interactive SuperWEB2/SuperCROSS query tool. This makes Excel-download automation realistic for most Stats SA datasets even without an API.

---

## Per-Dataset Analysis

### 1. `unemployment.json`

| # | Item | Finding |
|---|------|---------|
| 1 | **Organisation** | Statistics South Africa (Stats SA) |
| 2 | **Publication** | Quarterly Labour Force Survey (QLFS), Statistical Release P0211 |
| 3 | **Webpage** | https://www.statssa.gov.za/?page_id=1854&PPN=P0211 (release hub); presentation PDF pattern `statssa.gov.za/publications/P0211/Presentation QLFS QN YYYY.pdf` |
| 4 | **Update frequency** | Quarterly. Releases land ~6 weeks after quarter-end (Q1→mid-May, Q2→~Aug, Q3→~Nov, Q4→~Feb) |
| 5 | **API exists?** | No REST/JSON API |
| 6 | **Excel/CSV available?** | Yes — Excel data tables are published alongside the PDF release; historical series also available via Stats SA's time-series Excel/ASCII download page |
| 7 | **PDF-only?** | No |
| 8 | **Latest official release** | **Q1 2026**, released 12 May 2026. Official unemployment rate **32.7%**, up from 31.4% in Q4 2025 |
| 9 | **Is the JSON up to date?** | **No** |
| 10 | **What changed** | JSON's last data point is Q4 2025 (31.4%). An entire quarter (Q1 2026 — official rate 32.7%, a 1.3pp jump) is missing. Youth labour-force participation and LFPR series are also missing Q1 2026. |
| 11 | **Automation suitability** | **Moderate.** Structured Excel table with a stable format each quarter, but requires locating the correct file on each release (URL pattern is predictable) and parsing specific cell ranges; no machine-readable API. |
| 12 | **Recommended strategy** | **Hybrid** — automate the Excel download and parse on the known post-release-date schedule; require manual approval before the value goes live (the political sensitivity of this number alone justifies a human check). |

---

### 2. `youth-unemployment.json`

| # | Item | Finding |
|---|------|---------|
| 1 | **Organisation** | Stats SA |
| 2 | **Publication** | QLFS (P0211) — youth labour market supplementary tables/commentary released same day as the main QLFS |
| 3 | **Webpage** | Same as above; youth-specific commentary published as a dedicated Stats SA article each quarter (e.g. "South Africa's Youth and the Labour Market in Q1 2026") |
| 4 | **Update frequency** | Quarterly, same release as unemployment.json |
| 5 | **API exists?** | No |
| 6 | **Excel/CSV available?** | Yes, same QLFS release tables |
| 7 | **PDF-only?** | No |
| 8 | **Latest official release** | Q1 2026: youth (15–34) unemployment 46.3%; 15–24 unemployment 60.9%; NEET rate (15–24) 37.6% |
| 9 | **Is the JSON up to date?** | **No** |
| 10 | **What changed** | JSON stops at Q4 2025 (narrow 45.5%, 15–24 61.2%, NEET annual 37.2% for 2025). Q1 2026 shows youth unemployment *rising* to 46.3% (15–34) and NEET rising to 37.6% — a reversal of the JSON's implied downward trend. |
| 11 | **Automation suitability** | **Moderate** — same QLFS release, same constraints as unemployment.json |
| 12 | **Recommended strategy** | **Hybrid**, and — per the existing "Naming Inconsistencies" note in `dataset-analysis.md` — fold this into the same update job as unemployment.json/labour-force.json since they're one release. Resolve the duplicate `youth-unemployment` stat ID at the same time you build the updater, not after. |

---

### 3. `labour-force.json`

| # | Item | Finding |
|---|------|---------|
| 1 | **Organisation** | Stats SA |
| 2 | **Publication** | QLFS (P0211) |
| 3 | **Webpage** | https://www.statssa.gov.za/?page_id=1854&PPN=P0211 |
| 4 | **Update frequency** | Quarterly |
| 5 | **API exists?** | No |
| 6 | **Excel/CSV available?** | Yes |
| 7 | **PDF-only?** | No |
| 8 | **Latest official release** | Q1 2026. Working-age population reported at 42.2 million; LFPR/female LFPR figures published in the same tables |
| 9 | **Is the JSON up to date?** | **No** |
| 10 | **What changed** | JSON stops at Q4 2025 (60.6% overall, 55.2% female). Q1 2026 values not yet incorporated. |
| 11 | **Automation suitability** | **Moderate** |
| 12 | **Recommended strategy** | **Hybrid** — same QLFS job as #1 and #2. There is no reason for three separate update scripts against one release; this is the single highest-value consolidation opportunity in the roadmap. |

---

### 4. `inflation.json`

| # | Item | Finding |
|---|------|---------|
| 1 | **Organisation** | Stats SA (CPI) + South African Reserve Bank (repo rate) — this file mixes two source organisations |
| 2 | **Publication** | Consumer Price Index, Statistical Release P0141 (Stats SA); Monetary Policy Committee (MPC) Statement (SARB) |
| 3 | **Webpage** | https://www.statssa.gov.za/?page_id=1854&PPN=P0141 ; https://www.resbank.co.za/en/home/what-we-do/monetary-policy/decisions |
| 4 | **Update frequency** | CPI: monthly, released ~3 weeks after month-end (the JSON's "22nd of the month" note is roughly right but drifts). Repo rate: SARB now meets 6×/year (bimonthly) |
| 5 | **API exists?** | CPI: No REST API from Stats SA. Repo rate: **Yes** — SARB operates a public Web API facility at `https://custom.resbank.co.za/SarbWebApi/` (in addition to its non-API "Online Statistical Query" tool using KBP series codes) |
| 6 | **Excel/CSV available?** | CPI: Yes, Excel tables with each P0141 release. Repo rate: Yes, via SARB's Online Statistical Query and API |
| 7 | **PDF-only?** | No for either component |
| 8 | **Latest official release** | CPI: **May 2026, headline inflation 4.5%** (up sharply from 4.0% in April), driven by fuel prices. Repo rate: **7.00%**, raised 28 May 2026 (effective 29 May) — first hike since 2023; prime lending rate now **10.50%** |
| 9 | **Is the JSON up to date?** | **No** |
| 10 | **What changed** | JSON's CPI series ends April 2026 (4.0%) — May's 4.5% print, and the reason for it (fuel-driven, largest jump since the SARB's inflation-target change to a 3% point target), is missing. The `repo-rate` stat inside this file still shows 6.75% (March 2026) — two decisions and 25bps out of date. |
| 11 | **Automation suitability** | **Easy–Moderate.** CPI: Moderate (Excel parse, monthly, high public visibility so accuracy matters). Repo rate: **Easy**, given the confirmed SARB API — this is the best automation candidate in the whole dataset once the API's rate-decision endpoint is identified. |
| 12 | **Recommended strategy** | **Hybrid**, but treat the two halves differently: repo rate via **official SARB API** (near fully automatable, low-frequency changes make manual review cheap); CPI via **automated Excel download** on the known post-release schedule with mandatory human sign-off given its market sensitivity. Also resolve the `repo-rate` vs `repo-rate-sarb` duplication (see `interest-rates.json`) by making `interest-rates.json` the single canonical home and having `inflation.json` reference it rather than duplicate it. |

---

### 5. `gdp.json`

| # | Item | Finding |
|---|------|---------|
| 1 | **Organisation** | Stats SA |
| 2 | **Publication** | Gross Domestic Product, Statistical Release P0441 |
| 3 | **Webpage** | https://www.statssa.gov.za/?page_id=1854&PPN=P0441 |
| 4 | **Update frequency** | Quarterly, ~65–70 days after quarter-end. The `_meta.release_calendar` already in the JSON (Q1→June, Q2→Sept, Q3→Dec, Q4→March) is **accurate** and confirmed by the actual Q1 2026 release date of 9 June 2026 |
| 5 | **API exists?** | No |
| 6 | **Excel/CSV available?** | Yes — Excel files are explicitly offered alongside the PDF release and presentation each quarter |
| 7 | **PDF-only?** | No |
| 8 | **Latest official release** | **Q1 2026, GDP +0.5%** (seasonally adjusted, annualised), a sixth consecutive quarter of growth, released 9 June 2026. Finance, agriculture, trade and transport were the main contributors |
| 9 | **Is the JSON up to date?** | **No** |
| 10 | **What changed** | JSON's `gdp-growth` series ends at Q4 2025 (0.4%). Q1 2026's 0.5% print, and the annual/nominal/per-capita figures that would follow from it, are absent. Note also: Stats SA's release commentary flags that the Q2 2026 GDP print (due 8 September 2026) may show fuel-price effects from an April fuel spike — worth watching for the next cycle. |
| 11 | **Automation suitability** | **Moderate** — same profile as QLFS: reliable Excel table, predictable calendar, no API. |
| 12 | **Recommended strategy** | **Download Excel automatically** on the known release calendar, with manual approval before publishing (GDP revisions are common — Stats SA regularly revises prior quarters' figures, so the ETL needs to overwrite historical points, not just append). |

---

### 6. `interest-rates.json`

| # | Item | Finding |
|---|------|---------|
| 1 | **Organisation** | South African Reserve Bank (SARB) |
| 2 | **Publication** | Monetary Policy Committee (MPC) Statement / decision |
| 3 | **Webpage** | https://www.resbank.co.za/en/home/what-we-do/monetary-policy/decisions ; API root: https://custom.resbank.co.za/SarbWebApi/ |
| 4 | **Update frequency** | ~6 meetings/year (bimonthly); rate is effective immediately on announcement |
| 5 | **API exists?** | **Yes** — confirmed public SARB Web API facility, separate from the older KBP-code-based Online Statistical Query tool |
| 6 | **Excel/CSV available?** | Yes, via Online Statistical Query and Quarterly Bulletin data files (XLSX/zipped/EViews formats) |
| 7 | **PDF-only?** | No |
| 8 | **Latest official release** | **Repo rate 7.00%, prime lending rate 10.50%**, decided 28 May 2026 (effective 29 May), a 4–2 split vote — the first hike since 2023. Next MPC meeting: **23 July 2026** |
| 9 | **Is the JSON up to date?** | **No** |
| 10 | **What changed** | JSON shows 6.75%/10.25% as of March 2026. Two data points are missing: the March 2026 hold (already present) is fine, but the file needs a new row for the 28 May 2026 hike to 7.00%/10.50%. |
| 11 | **Automation suitability** | **Easy** — a single low-frequency numeric value, official API available, validation is trivial (`prime = repo + 3.5`, already encoded as a rule in `dataset-analysis.md`). |
| 12 | **Recommended strategy** | **Use official API.** This is the strongest "fully automated" candidate in the portfolio: 6 checks/year, one number, one validated relationship, an official machine-readable source. Still gate behind a lightweight manual approval given how visible this number is (mortgage/loan impact), but the extraction itself needs no human involvement. |

---

### 7. `crime.json`

| # | Item | Finding |
|---|------|---------|
| 1 | **Organisation** | South African Police Service (SAPS) |
| 2 | **Publication** | Police Recorded Crime Statistics, Republic of South Africa (quarterly *and* annual editions) |
| 3 | **Webpage** | https://www.saps.gov.za/services/crimestats.php |
| 4 | **Update frequency** | **Correction to existing assumption:** SAPS has published *quarterly* crime statistics since 2016 (covering the police financial year, April–March), in addition to a September annual roll-up. However, the quarterly cadence has been unreliable in the current financial year — the Q1 2025/26 release was delayed from its original end-August date, then a revised mid-October date, and slipped further; by contrast Q3 2025/26 (Oct–Dec 2025) and Q4 2025/26 (Jan–Mar 2026, released ~22 May 2026) did appear. Treat the cadence as "quarterly, but not on a fixed calendar." |
| 5 | **API exists?** | No |
| 6 | **Excel/CSV available?** | Unclear/inconsistent — the JSON's own notes say "no public API, manual Excel extraction required," but the quarterly releases located during this research (e.g. the Q3 2025/26 report) are structured **PDF presentation decks**, not confirmed downloadable workbooks. Treat as PDF-primary until proven otherwise. |
| 7 | **PDF-only?** | Effectively yes for the current quarterly cycle |
| 8 | **Latest official release** | Q4 2025/26 (Jan–Mar 2026), presented ~22 May 2026 to Parliament/media. Full-year 2024/25 annual figures (which should have appeared ~September 2025) were not directly located in this research pass and should be confirmed with SAPS directly. |
| 9 | **Is the JSON up to date?** | **No — significantly.** |
| 10 | **What changed** | JSON's newest data point is FY2023/24 (26,232 murders), `last_verified` 2025-05-01. At minimum one full annual cycle (2024/25) and up to four quarterly releases of FY2025/26 are missing. This is the stalest dataset in the portfolio in absolute terms. |
| 11 | **Automation suitability** | **Difficult.** No API, PDF-based, and — uniquely among these 13 datasets — an unreliable release calendar. Automating "check every week for a new PDF" is feasible; automating table extraction from a PDF whose layout can change between releases is not something to fully trust without a human check every time. |
| 12 | **Recommended strategy** | **Manual review**, but semi-assisted: a lightweight scheduled check (e.g. weekly) against the SAPS crime stats page for a new PDF, which raises a flag for a human to open the release and manually transcribe the three headline figures (murder, contact crime, aggravated robbery) into the JSON/DB. Given release volatility, do not attempt PDF table-extraction automation until SAPS's cadence stabilises or the SAPS–Stats SA MoU (mentioned in current reporting) results in Stats SA taking over publication, which would likely bring Excel tables with it. |

---

### 8. `education.json`

| # | Item | Finding |
|---|------|---------|
| 1 | **Organisation** | Department of Basic Education (DBE) — matric; Stats SA — literacy (Census); likely Department of Higher Education and Training (DHET) — enrolment (not explicitly sourced in the current `_meta`, flagged below) |
| 2 | **Publication** | National Senior Certificate (NSC) Examination results announcement; Census 2022 (literacy); higher-education enrolment figures (source TBD) |
| 3 | **Webpage** | https://www.education.gov.za/Informationfor/Examinationsresults.aspx |
| 4 | **Update frequency** | Matric: annual, announced mid-January. Literacy: decennial (tied to Census). Higher-ed enrolment: presumed annual, source needs confirmation |
| 5 | **API exists?** | No |
| 6 | **Excel/CSV available?** | Headline pass rate is announced via press briefing/media statement, not a structured data file. DBE does publish a detailed **National Diagnostic Report** (PDF) with subject- and district-level tables some weeks after the announcement. |
| 7 | **PDF-only?** | Effectively yes for the headline figure at announcement time; detailed data later appears in PDF diagnostic reports |
| 8 | **Latest official release** | **Class of 2025 results, announced 12 January 2026: 87.98–88% national pass rate** (reported inconsistently as "87.98%" vs "88%" across sources depending on rounding/DBE vs. cohort-adjusted method — recommend citing the DBE's own release, not secondary media, when this is automated) |
| 9 | **Is the JSON up to date?** | **No** |
| 10 | **What changed** | JSON shows 87.3% dated 2025-01-15 — that is the **Class of 2024** result, now one full cohort behind. Class of 2025's 87.98%/88% is missing entirely. |
| 11 | **Automation suitability** | **Difficult.** One number, once a year, from a press announcement/PDF, with the added complication that this year's release process was tied up in a POPIA/Information Regulator court dispute over how results are published — a reminder that even the *mechanism* of publication can't be assumed stable year to year. |
| 12 | **Recommended strategy** | **Manual review**, scheduled for mid-to-late January each year (results reliably land in the second week of January). Not worth automated scraping for one annual figure with an inconsistent citation format; a calendar reminder plus 10 minutes of manual entry is the right-sized solution. Also: confirm and document the actual source organisation for `higher-education-enrolment` before the PostgreSQL migration — right now it's undocumented in `_meta`, which will cause provenance problems in `data_sources`. |

---

### 9. `population.json`

| # | Item | Finding |
|---|------|---------|
| 1 | **Organisation** | Stats SA |
| 2 | **Publication** | Mid-Year Population Estimates (MYPE), Statistical Release P0302 (annual); Census 2022 (decennial baseline) |
| 3 | **Webpage** | https://www.statssa.gov.za/?page_id=1854&PPN=P0302 |
| 4 | **Update frequency** | Annual, MYPE typically released **late July** |
| 5 | **API exists?** | No |
| 6 | **Excel/CSV available?** | Yes — MYPE is released with full data tables (age/sex/province breakdowns) in the PDF, and Stats SA's general time-series download page covers population series too |
| 7 | **PDF-only?** | No |
| 8 | **Latest official release** | **MYPE 2025: population 63.1 million**, released 28 July 2025. (MYPE 2026 is due imminently — Stats SA's pattern points to late July, i.e. **this month**.) |
| 9 | **Is the JSON up to date?** | **No — and possibly wrong, not just old.** |
| 10 | **What changed** | This is the most important finding for this dataset: the JSON's newest point is 2024 at **64.0 million**, but Stats SA's own 2025 MYPE — a full year *later* — reports **63.1 million**, a lower figure. A legitimate annual update should never produce this pattern (population estimates don't typically fall this way without a methodology change). This strongly suggests the existing `update_population.py` script is pulling from a **different, non-Stats SA source** (World Bank or similar, per the known issue already logged in `dataset-analysis.md` for other scripts), while `_meta.auto_updated: "2026-05-30"` falsely implies the figure was checked against the real source and found current. This is a data-integrity bug, not a freshness bug, and should be prioritised accordingly. |
| 11 | **Automation suitability** | Currently mis-labelled `auto` in the registry; once pointed at the correct Stats SA source it becomes **Moderate** (Excel/PDF table parse, once a year, predictable July window). |
| 12 | **Recommended strategy** | **Fix the source first, then automate.** Re-point the updater at Stats SA P0302 (not World Bank), verify the corrected figure against at least one secondary citation, and only then re-enable "auto" — with a mandatory manual sanity check for the first cycle or two given the current error. Time this against the MYPE 2026 release, expected this month. |

---

### 10. `housing.json`

| # | Item | Finding |
|---|------|---------|
| 1 | **Organisation** | Stats SA |
| 2 | **Publication** | Census 2022 (baseline); General Household Survey (GHS), Statistical Release P0318 (annual updates to service-delivery indicators) |
| 3 | **Webpage** | https://www.statssa.gov.za/?page_id=1854&PPN=P0318 |
| 4 | **Update frequency** | Census: decennial. GHS: annual — this means the *headline* percentages in this file (piped water, electricity, formal dwellings) should in principle be refreshable every year via GHS, even though the JSON currently treats them as static Census-only figures |
| 5 | **API exists?** | No |
| 6 | **Excel/CSV available?** | Yes — GHS releases include Excel data tables |
| 7 | **PDF-only?** | No |
| 8 | **Latest official release** | Data points in the file are dated to Census 2022. This research pass did not confirm whether a GHS 2024 or 2025 edition has since updated these three specific indicators — **flagged for direct follow-up**, since GHS is an annual survey and a newer edition almost certainly exists. |
| 9 | **Is the JSON up to date?** | **Likely no, pending confirmation** — `last_verified` is 2025-05-01, over a year old, and GHS is an annual product. |
| 10 | **What changed** | Unable to confirm specific deltas without pulling the latest GHS release directly; recommend this be the first concrete task before automating. |
| 11 | **Automation suitability** | **Moderate** — GHS Excel tables are structured and annual, but the file mixes true Census constants (which shouldn't move) with GHS-refreshable indicators (which should), so the ETL needs to know which of the three stats are eligible for annual refresh. |
| 12 | **Recommended strategy** | **Hybrid** — treat this as two datasets bundled into one file: (a) Census-anchored baseline, static; (b) GHS-refreshable service-delivery percentages, automated Excel download once a year with manual review. Consider splitting these at the schema level during migration so automation logic doesn't have to special-case individual stat IDs. |

---

### 11. `census.json`

| # | Item | Finding |
|---|------|---------|
| 1 | **Organisation** | Stats SA |
| 2 | **Publication** | Census 2022 Statistical Release |
| 3 | **Webpage** | https://www.statssa.gov.za/census/census_2022/census_2022_products/Census_2022_Statistical_release.pdf |
| 4 | **Update frequency** | Decennial — next census is expected **~2032** |
| 5 | **API exists?** | No |
| 6 | **Excel/CSV available?** | Yes, via SuperWEB2/SuperCROSS for deep cross-tabulation, but the three headline stats here don't need that |
| 7 | **PDF-only?** | The primary statistical release is a PDF, but that's appropriate for a once-a-decade static figure |
| 8 | **Latest official release** | Census 2022 remains current and authoritative; no newer census exists |
| 9 | **Is the JSON up to date?** | **Yes**, correctly — the maintainer's own note ("static until the next census... no automation needed") is accurate as written |
| 10 | **What changed** | Nothing that should change until 2032, though Stats SA has issued *revisions* to specific Census 2022 products in the interim (see municipalities.json below) — worth a periodic check even on "static" data. |
| 11 | **Automation suitability** | **Manual only** (correctly so — this is effectively "static," not a candidate for automation at all) |
| 12 | **Recommended strategy** | **No automation needed.** Put a low-priority calendar reminder (e.g. annually) to check for Stats SA revisions/erratums to Census 2022 products, given that municipalities.json shows Stats SA does occasionally revise specific figures years after initial release. |

---

### 12. `provinces.json`

| # | Item | Finding |
|---|------|---------|
| 1 | **Organisation** | Composite — Stats SA (QLFS unemployment, Census population), DBE (matric) |
| 2 | **Publication** | No single publication — this file is a manual composite of QLFS + Census 2022 + DBE matric provincial breakdowns |
| 3 | **Webpage** | N/A (composite); underlying sources as listed above |
| 4 | **Update frequency** | Should track the QLFS quarterly cadence for its unemployment component; matric component is annual; population component is Census-static |
| 5 | **API exists?** | No |
| 6 | **Excel/CSV available?** | Yes for each underlying component (QLFS Excel tables include provincial breakdowns; DBE provincial pass rates are in the diagnostic report) |
| 7 | **PDF-only?** | No |
| 8 | **Latest official release** | Provincial unemployment: **Q1 2026** QLFS release includes a provincial breakdown table ("Official Unemployment rate by province, Q1:2016–Q1:2026"). Provincial matric: Class of 2025 results include provincial breakdowns — e.g. KwaZulu-Natal 90.6%, Free State 89.33%, Gauteng 89.06% |
| 9 | **Is the JSON up to date?** | **No, on two fronts** |
| 10 | **What changed** | (a) Unemployment period is stamped "Q3 2025" in the JSON while the national file (once fixed) will show Q1 2026 — a two-quarter lag beyond what's already flagged as a known issue in `dataset-analysis.md`. (b) `matricPassRate` figures reflect the Class of 2024, not the Class of 2025 results announced January 2026. |
| 11 | **Automation suitability** | **Moderate once the upstream files are automated; Difficult today** — because there is no dedicated update script, this file is currently a fully manual composite. Its automation ceiling is capped by whichever upstream source is slowest to refresh. |
| 12 | **Recommended strategy** | **Hybrid**, and sequence it *after* unemployment.json, labour-force.json, and education.json are automated (see roadmap below). Once those exist, `provinces.json` becomes a merge/reshape job pulling from already-fresh sources rather than a from-scratch manual composite — with a mandatory manual sync check to catch exactly the kind of quarter-mismatch bug already logged. |

---

### 13. `municipalities.json`

| # | Item | Finding |
|---|------|---------|
| 1 | **Organisation** | Stats SA |
| 2 | **Publication** | Census 2022 Municipal Fact Sheet (revised August 2025) |
| 3 | **Webpage** | https://census.statssa.gov.za |
| 4 | **Update frequency** | Decennial — next census ~2032 |
| 5 | **API exists?** | No |
| 6 | **Excel/CSV available?** | Yes, via SuperCROSS and the raw CSV extracts already used as inputs (`raw_data/*.csv`) |
| 7 | **PDF-only?** | No |
| 8 | **Latest official release** | Census 2022 Municipal Fact Sheet, **as revised August 2025** — confirmed via Stats SA's own August 2025 announcement of an updated/expanded Census 2022 Municipal Profiles product |
| 9 | **Is the JSON up to date?** | **Yes** — this is the best-maintained dataset in the portfolio. `_meta.last_verified` is 2026-06-04 and correctly reflects the August 2025 revision, including the documented erratum for Thaba Chweu (MP325) and Mbombela (MP322). |
| 10 | **What changed** | Nothing outstanding; no action needed at this time. |
| 11 | **Automation suitability** | **Static/manual only** — appropriate given the decennial cadence |
| 12 | **Recommended strategy** | **No automation needed.** Continue the existing practice of periodically checking for Stats SA erratums/revisions to the Municipal Fact Sheet (as happened in August 2025) — a low-frequency manual check is sufficient. This dataset is a model for how "static" datasets should be maintained; no changes recommended. |

---

## Cross-Cutting Observations

- **One release, three files.** `unemployment.json`, `youth-unemployment.json`, and `labour-force.json` are all sourced from a single QLFS release. Building three independent updaters is wasted effort and is exactly how the youth-unemployment ID duplication happened in the first place. This should be **one** extractor that fans out into three (eventually one, post-migration) dataset tables.
- **`repo-rate` appears in two files.** `inflation.json` and `interest-rates.json` both carry SARB repo-rate data under different stat IDs. Fix this at the same time you build the SARB API integration — don't automate two copies of the same fact.
- **The SARB API is the single best automation opportunity uncovered in this research** and isn't reflected anywhere in the current docs (`ai-context.md` and `dataset-analysis.md` both implicitly assume "no API" for anything outside World Bank). Worth updating those docs once confirmed in production.
- **"Auto" is currently mislabelled at least once.** `population.json`'s registry entry says `auto`, and its `_meta` claims a same-year auto-update, but the actual figure is stale *and* likely wrong. Audit every dataset currently marked `auto` before trusting the label — `dataset-analysis.md` already flags this pattern for the World Bank-based scripts generally.
- **PDF-only datasets are the automation floor, not a reason to avoid updating them.** `crime.json` and (partially) `education.json` can't be fully automated, but "difficult to automate" doesn't mean "leave stale" — both are current candidates for a scheduled manual-review cadence with a lightweight "new release exists" check.

---

## Automation Priority (Easiest → Hardest)

| Rank | Dataset | Automation Level | Why |
|------|---------|-------------------|-----|
| 1 | `interest-rates.json` | **Easy** | Confirmed official SARB API; single low-frequency numeric value; simple validation rule already exists |
| 2 | `municipalities.json` | **Static (no automation needed)** | Already current; decennial cadence; existing transform script is fine as-is |
| 3 | `census.json` | **Static (no automation needed)** | Correctly static; no work required until ~2032 |
| 4 | `inflation.json` (repo-rate component) | **Easy** | Same SARB API as #1; only the CPI half is harder |
| 5 | `gdp.json` | **Moderate** | Reliable Excel table, known release calendar, no API |
| 6 | `unemployment.json` | **Moderate** | Reliable Excel table, known release calendar, no API |
| 7 | `youth-unemployment.json` | **Moderate** | Same release as #6 — automate together |
| 8 | `labour-force.json` | **Moderate** | Same release as #6 — automate together |
| 9 | `inflation.json` (CPI component) | **Moderate** | Reliable Excel table, monthly cadence raises operational load |
| 10 | `housing.json` | **Moderate** | Needs source confirmation first (GHS vs. Census-only), then annual Excel parse |
| 11 | `provinces.json` | **Moderate → Difficult** | Capped by upstream files; becomes moderate once #6–8 and #12 are automated |
| 12 | `education.json` | **Difficult** | Annual, PDF/press-release only, inconsistent citation of the headline number |
| 13 | `crime.json` | **Difficult** | No API, PDF-based, and — uniquely — an unreliable release calendar |

---

## Recommended Update Roadmap (Next 12 Months)

The sequencing below front-loads (a) the highest-impact accuracy fixes, (b) the easiest wins, and (c) the work that unblocks other datasets, while leaving the two genuinely hard datasets for dedicated attention once the rest of the pipeline exists.

**Phase 0 — Immediate data-integrity fixes (Weeks 1–2)**
Before building any automation, correct the data that's actively wrong, not just old:
- Manually correct `population.json` to Stats SA's actual MYPE 2025 figure (63.1M) and investigate/fix `update_population.py`'s source.
- Manually refresh the four live economic files (`unemployment.json`, `youth-unemployment.json`, `labour-force.json`, `gdp.json`, `inflation.json`, `interest-rates.json`) to their current official values identified in this document, so the site isn't serving numbers a full release cycle stale while automation is built.

**Phase 1 — Easiest automation, highest confidence (Weeks 3–6)**
- Build the **SARB API integration** for `interest-rates.json` (repo rate + prime rate). This is the cleanest possible pilot for the "one command update, manual approval before deploy" target architecture — low frequency, official API, simple validation.
- Use this phase to also design and ship the **manual-approval gate** in the ETL (staging table → diff view → human approve → promote), since every subsequent phase depends on it existing.

**Phase 2 — Consolidate and automate the QLFS family (Weeks 6–12)**
- Build **one** QLFS extractor that produces `unemployment.json`, `youth-unemployment.json`, and `labour-force.json` outputs from a single Excel download.
- Resolve the duplicate `youth-unemployment` stat ID and the `labour-force-participation` misplacement as part of this build, not as a follow-up.

**Phase 3 — GDP and CPI (Weeks 12–18)**
- Extend the Excel-parsing infrastructure from Phase 2 to `gdp.json` (quarterly) and the CPI half of `inflation.json` (monthly). By this point the "download Excel → validate → stage → approve" pipeline should be a reusable pattern, not new code each time.
- Retire the duplicate `repo-rate` stat inside `inflation.json` in favour of referencing `interest-rates.json`'s canonical value (built in Phase 1).

**Phase 4 — Housing source confirmation + provinces composite (Weeks 18–24)**
- Resolve the open question on `housing.json`: confirm whether GHS has newer figures than Census 2022 for the three tracked indicators, and split the file's automation logic accordingly (Census-static vs. GHS-refreshable).
- Rebuild `provinces.json` as a **merge job** over the now-automated unemployment and (annually) education data, closing the Q3-vs-Q4 sync gap that's currently a known, documented bug.

**Phase 5 — The hard cases, deliberately scoped (Months 6–9)**
- `education.json`: implement a **scheduled manual-review reminder** (mid-January each year) rather than attempting scraping/PDF-parsing for a once-a-year press-announcement figure. Confirm and document the `higher-education-enrolment` source organisation while here.
- `crime.json`: implement a **lightweight polling check** (weekly) against the SAPS crime-stats page that flags a human when a new release appears, rather than attempting to auto-parse an unreliable, PDF-based, non-calendar release. Revisit full automation only if/when the reported SAPS–Stats SA MoU results in SAPS data moving to Stats SA's more structured publication process.

**Phase 6 — Static-dataset hygiene (ongoing, low effort)**
- `census.json` and `municipalities.json` need no active automation, but add both to the same weekly/monthly polling job used for `crime.json` (a cheap "has this page changed" check) so that Stats SA erratums or revisions — which have happened before, as seen with the August 2025 Municipal Fact Sheet revision — don't sit unnoticed for years.

**End state at Month 9:** the QLFS family, GDP, CPI, and SARB rates run on a fully automated "download → validate → stage → manual approve → deploy" pipeline; `provinces.json` is a downstream merge of already-fresh data; `education.json` and `crime.json` run on human-in-the-loop scheduled reviews rather than full automation; and `census.json`/`municipalities.json` sit on a low-frequency erratum-watch. That combination gets you close to the one-command goal for roughly 9 of 13 datasets, while being honest that the remaining 4 (crime, education, and their downstream effect on provinces) will always need a human somewhere in the loop given the state of their upstream publishers.
