# Fuel prices section: design

**Date:** 13 November 2026. Design only. Nothing is built.

## Result

- The official monthly prices and their breakdown can be published now. The Department of Mineral and Petroleum Resources (DMPR) allows reuse that is accurate, non-commercial and credited.
- The daily data for the "expected next month" tracker comes from the Central Energy Fund (CEF). Its PDFs are machine-readable and its `robots.txt` does not block them, but **CEF publishes no reuse terms: only "All Rights Reserved"**. Per the brief, that source is flagged for the owner (decision D3) and the public tracker waits on that decision.
- The next price change takes effect on **Wednesday 2 December 2026**. November's announcement came out the day before the change (3 November for 4 November), so expect the December one around 30 November or 1 December. The history page should be live by 20 November.

## Checking the brief's figures

| Claim in the brief | Status | Source |
|---|---|---|
| Temporary fuel levy cut of R1.50 a litre on petrol and R3.00 on diesel from 4 November 2026 | Verified | [Official statement on gov.za](https://www.gov.za/news/media-statements/minister-gwede-mantashe-announces-adjustment-fuel-prices-effective-4-0), issued 3 November 2026. General fuel levy becomes 279.0 c/l petrol, 116.0 c/l diesel |
| That cut runs to 1 December, then smaller cuts until early January | Partly verified. Secondary sources say R1.00 petrol and R1.50 diesel until 5 January 2027. I did not find the end dates in the official text I read | [CARmag](https://www.carmag.co.za/news/petrol-to-drop-by-1-cent-confirmed-fuel-prices-for-south-africa-in-november-2026/), [ShowMe](https://showme.co.za/south-africa-fuel-prices-november-2026-update/). Confirm against the Treasury or DMPR document before publishing |
| Record prices in 2026 | Not verified against official history. Press reports called October 2026 a record | [TopAuto](https://topauto.co.za/news/163026/south-africa-facing-record-high-petrol-prices-next-month/) |
| Fuel is the top Google search trend | Not verified |  |

November 2026 as reported, to be re-entered from the DMPR files, not from the press: petrol 95 inland R30.24 a litre (down 1 cent), petrol 93 inland R29.87, diesel 0.05% wholesale down 109.82 c/l, diesel 0.005% down 119.82 c/l, illuminating paraffin wholesale up 275 c/l, slate levy up from 87.66 to 135.84 c/l. Sources: the gov.za statement above and [BusinessTech, 3 November 2026](https://businesstech.co.za/news/energy/882296/here-is-the-official-petrol-price-for-november-8/).

One lesson already visible: a mid-October press forecast put November petrol 95 inland at R31.77 ([CARmag](https://www.carmag.co.za/news/november-2026-fuel-price-forecast-more-bad-news-for-petrol-and-diesel-in-sa/)). The official price was R30.24, because the levy cut was announced on 21 October. CEF figures do not include tax changes. The tracker has to handle that in the open (section 4).

## 1. Data sources

All pages below were opened on 13 November 2026 unless marked.

### A. DMPR: official monthly prices (primary source)

| | |
|---|---|
| Publisher | Department of Mineral and Petroleum Resources |
| Current month | [Fuel Prices](https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices). One entry per adjustment. Recent months are a ZIP behind a short link. May to July 2026 list separate files: Basic Fuel Price, Breakdown of Prices, Diesel Margins, Petrol Margins, Fuel Price Schedule, **History of Fuel Prices**, Media Statement, SMNRP Regulations |
| Archive | [Petrol Price Archive](https://www.dmpr.gov.za/Branches/Petroleum-Resources/Petrol-Price-Archive). January 2022 to February 2026. Monthly "Fuel Regulations" `.xlsx` (prices per zone) and "Breakdown of Prices" PDF |
| What a litre is made of | [Fuel Price Structure](https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Price-Structure) |
| Format | XLSX, PDF, ZIP. File names and link styles change from month to month. Some labels are wrong on the page (the 2 September entry is labelled August) |
| Timing | Adjustment on the first Wednesday of the month. Statement one or two days before |
| Reuse | **Allowed.** [Terms and Conditions](https://www.dmpr.gov.za/Terms-Conditions): material may be reproduced without permission if it is accurate, not used for financial or commercial gain, not misleading, and credited to the DMPR with the site URL and copyright status. Third-party material and photographs are excluded |
| Automated access | The terms say nothing about it. `robots.txt` exists and blocks admin and system folders. I could not get it verbatim. **The implementer must read it in full before any automated request** and must not fetch a disallowed path |
| Not confirmed | What is inside "History of Fuel Prices" and how far back it goes. The contents of the XLSX files. I listed the pages but did not open the files |

The same statement is also published on [gov.za](https://www.gov.za/news/media-statements/minister-gwede-mantashe-announces-adjustment-fuel-prices-effective-4-0). Per a search summary of [gov.za's terms](https://www.gov.za/terms-and-conditions-use-0), content may be copied for non-commercial information use and commercial use needs written permission from GCIS. I did not open that terms page itself.

**Consequence of "non-commercial":** fine for a free site. It rules out selling the data and needs care with sponsorship. This matches the decision of 8 November 2026 to stay free.

### B. CEF: daily basic fuel price and over or under recovery (estimate source) FLAGGED

| | |
|---|---|
| Publisher | Central Energy Fund (CEF Group) |
| Index pages | [Daily Basic Fuel Price](https://cefgroup.co.za/daily-basic-fuel-price/). 2026 files: [cefgroup.co.za/2026-4/](https://cefgroup.co.za/2026-4/). December 2024 to 1 January 2026: [cefgroup.co.za/2025-4/](https://cefgroup.co.za/2025-4/). The menu's "2026" link wrongly points at the 2025 page. Use the sitemap or the direct URL |
| Files | One PDF per working day: `https://cefgroup.co.za/wp-content/uploads/YYYY/MM/Daily-DD-MM-YYYY.pdf`. Some carry a `-1` or `-2` suffix. Some index labels have typos ("24-04-2205", "02-10-206"). Newest on 13 November: 11-11-2026 |
| Format | One-page PDF with a text layer. Extracted with `pypdf` in this session. Rows found in the 30 December 2025 file: pump or wholesale price and its start date, basic fuel price for the day, contribution to BFP in the current price, **unit over/(under) recovery for the day**, **average over/(under) recovery for the period so far**, the split of that average into "international product prices" and "exchange rate", and the R/$ rate. Five columns: petrol 95, petrol 93, diesel 0.05%, diesel 0.005%, illuminating paraffin. Units: SA cents per litre |
| Timing | Each working day. Publication hour not confirmed |
| `robots.txt` | Blocks `/wp-admin/` only. The PDFs and index pages are allowed |
| Reuse | **Not confirmed.** Footer: "© 2026 CEF Group All Rights Reserved". No terms of use or disclaimer page found. The Monthly Press Release page has no terms either |
| History available | December 2024 onward through the two index pages. Pages for 2020 to 2023 exist in the sitemap as press-release years but I found no daily files for them |

**Flag for the owner (D3).** Every news site reports these numbers, and a number is a fact, but "others do it" is not permission and I am not a lawyer. Options:

1. Email CEF and ask (draft below). Build and backtest privately in the meantime. Publish when they answer. Recommended.
2. Publish derived figures only (our estimate and the CEF average it is based on), with credit and a link, never the PDFs. Lower risk than copying documents, but it is still building on unconfirmed terms, which the brief said not to do.
3. Drop the tracker.

Draft email, for the owner to send from their own address:

> Subject: Permission to cite CEF daily basic fuel price figures on a free public-data site
>
> Good day. I run SA Data Hub (sadatahub.tech), a free, non-commercial site that explains South African official statistics and cites every figure to its source. I would like to show the average over/(under) recovery from your daily basic fuel price sheets, credited to the Central Energy Fund with a link to your page, as the basis of a clearly labelled estimate of the next monthly price change. I would read one PDF per working day and would not republish the documents. Please let me know whether this is acceptable and how you would like to be credited. Thank you.

### C. Fuels Industry Association of South Africa (cross-check only)

[Fuel prices, current and past](https://fuelsindustry.org.za/consumer-information/fuel-prices-current-past/): HTML tables, 2012 to 2026, Gauteng and coastal, petrol 93 and 95, both diesels, paraffin, LPG. "All rights reserved", no reuse terms, and visible typos (for example "32361,00" for coastal LPG in July 2025). **Do not publish from it.** Use it only to cross-check values entered from DMPR files, and report differences.

### D. SARB: rand per dollar. Do not use yet

- The existing adapter (`automation/adapters/sarb.py`) uses `https://custom.resbank.co.za/SarbWebApi/WebIndicators/HomePageRates`, confirmed working on 1 July 2026 by a comment in that file. The API help page returned HTTP 404 from my fetch tool on 13 November 2026. I did not test the endpoint itself.
- Reuse: the project recorded on 8 November 2026 that the SARB disclaimer requires written consent for reproduction. I could not re-open the disclaimer today (404 at the URL I tried).
- **Alternative with no SARB dependency:** the exchange rate the fuel price actually uses is printed in the DMPR statement each month (for November: average R16.21 to R16.55 per dollar) and on each CEF sheet. Use those, credited to their publisher.

### E. Stats SA: CPI

No requests to statssa.gov.za. Use the CPI the site already holds: monthly headline from May 2025 (`inflation.json`) and the long history in `src/data/explainers/cpi-history.json`.

### Best source for history

DMPR. Start with the monthly XLSX and breakdown PDFs from January 2022, which is 59 adjustments to November 2026. If "History of Fuel Prices" turns out to hold a longer official series, extend back with it and say exactly where each period comes from. Do not use the industry tables to fill gaps.

## 2. Price history

**Coverage at launch:** January 2022 to the current month, every monthly adjustment, for:

| Series id | Product | Zone | Price type |
|---|---|---|---|
| `fuel-petrol-95-inland`, `fuel-petrol-95-coastal` | Petrol 95 | Inland (Gauteng), coastal | Retail (regulated pump price) |
| `fuel-petrol-93-inland`, `fuel-petrol-93-coastal` | Petrol 93 | Inland, coastal | Retail |
| `fuel-diesel-500ppm-inland`, `fuel-diesel-500ppm-coastal` | Diesel 0.05% sulphur | Inland, coastal | Wholesale |
| `fuel-diesel-50ppm-inland`, `fuel-diesel-50ppm-coastal` | Diesel 0.005% sulphur | Inland, coastal | Wholesale |
| `fuel-paraffin-inland`, `fuel-paraffin-coastal` | Illuminating paraffin | Inland, coastal | Wholesale |
| `fuel-paraffin-smnrp` | Illuminating paraffin | National | Single maximum national retail price |

Series ids never change once published (existing rule in `src/lib/series.ts`). Confirm from the XLSX which zone DMPR means by the Gauteng and coastal reference prices, and print that zone name on the page.

**Storage.** `src/data/fuel/prices.json`: one record per adjustment.

```jsonc
{
  "effectiveFrom": "2026-11-04",
  "source": { "publisher": "Department of Mineral and Petroleum Resources", "document": "November 2026 Fuel Regulations", "url": "…", "releasedOn": "2026-11-03" },
  "checkedOn": "2026-11-13",
  "enteredBy": "hand",            // or "pipeline"
  "prices": { "petrol95": { "inland": 3024.0, "coastal": 2937.0 }, "…": {} }   // cents per litre, as published
}
```

Values are stored in cents per litre exactly as published. Rands are a display format.

**Into the existing engine.** `src/lib/fuel.ts` turns `prices.json` into `Statistic` objects (period label "Nov 2026", the format `parseCoverageLabel` already reads). Add them to `allStatistics`, add a `fuel` category and one registry entry. Series pages, `/data/series/<id>.csv` and `.json`, embeds, search, `llms.txt`, citations and the sourcing check then work with no new export code.

**Page `/fuel/history`.** Product and zone selector (two selects, state in the URL). Line chart as server-rendered SVG. Table of every adjustment: effective date, price, change in cents. Links to the CSV and JSON. Source line naming the DMPR document for the latest month and stating the range of documents used.

**Validation of every entered month:** new price equals the previous price plus the change printed in the official statement, to within half a cent, for every product. This catches typing errors and wrong files.

## 3. Price breakdown

**Elements** come from the DMPR "Breakdown of Prices" document for each month. The [Fuel Price Structure](https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Price-Structure) page names: basic fuel price, fuel tax (general fuel levy), Road Accident Fund levy, customs and excise, slate levy, demand side management levy, tracer dye levy, petroleum pipelines levy, wholesale margin, retail margin, transport costs and regulated service charges. **Take the exact list and names from the PDF, not from this paragraph.**

**Storage.** `src/data/fuel/breakdown.json`: per adjustment, per product, per zone, a list of `{ element, cents }`. The elements must sum to the published price to within half a cent. That is a build-time check.

**Display on `/fuel`:**
- One horizontal stacked bar for the selected product, grouped into four plain parts: import cost (BFP), taxes and levies, margins, transport and other. Each part shows rands and a share of the litre. Tapping a part lists its elements with one-line explanations.
- A table of the same numbers (the chart alternative).
- "How it changed": the four groups over time as a small-multiples line chart, not a stacked area (stacked areas are hard to read on a phone).
- Temporary relief is its own labelled row with its start and end dates and its source, so readers can see what the price would be without it.

**History depth for the breakdown:** start with the last 12 months. Extend to January 2022 as a later task. Each month is one PDF to key in or parse.

## 4. "Expected next month" tracker

Blocked on D3 (CEF terms) and D4 (the "no forecasts" principle). Design assuming both are approved.

### What is shown

The wording below is a layout example. The cents are placeholders, not an estimate.

> **Petrol 95, inland: expected to go up by between 28 and 61 cents on 2 December 2026.**
> Estimate, not the official price. Based on Central Energy Fund figures up to 11 November 2026. [How this is worked out] [How close past estimates were]

A range, never one number. One line per product. The date of the data. The official price replaces the estimate the moment it is entered.

### Method

The implementer builds exactly this. No modelling beyond it.

1. **Start from CEF's own number.** The sheet prints "average unit over/(under) recovery" for the pricing period so far. An over-recovery means the import cost has been below what the current price assumes, so the price should fall by about that much. `import part = −(average over-recovery)`, per product, in cents per litre. Confirm the sign in the backtest: it must match the direction of the real change in most months.
2. **Add changes that are already announced.** Kept by hand in `src/data/fuel/known-changes.json`, each with a source and date. For December 2026 that is the step-down in levy relief (if confirmed: petrol relief from R1.50 to R1.00 adds 50 cents, diesel relief from R3.00 to R1.50 adds 150 cents). `midpoint = import part + known changes`.
3. **List what is not included.** Slate levy changes, margin changes and any tax change not yet announced. Print this list beside the estimate every time.
4. **Set the range from past errors.** For each past month, compare the midpoint with what really happened. The range is the midpoint plus the 10th and 90th percentile of those errors.

### Backtest

- **Data:** every CEF daily sheet from December 2024 (about 480 PDFs, fetched once, slowly, kept locally, not committed) and the DMPR breakdown for each month.
- **For each past month and product:** split the actual change into the import part (the change in the BFP element) and the policy part (everything else). Compare CEF's average with the actual import part. That measures the method. Separately record the policy part, which the method cannot see.
- **Group by how much of the month has passed:** 1 to 5, 6 to 10, 11 to 15 and 16 or more working days of data. Take one estimate per month per group (the last day in the group) so each month counts once.
- **Report for each group:** number of months, mean absolute error in cents, the 10th and 90th percentile error, how often the direction was right, and how often the real value fell inside the range. Compute that last figure leaving the month being tested out of the percentile calculation, or it flatters the method.
- **Be honest about sample size.** This gives roughly 23 months. Percentiles from 23 points are rough. Show the count beside every statistic. If a group has fewer than 12 months, show the smallest and largest past error instead of percentiles and say so.

### Track record page (`/fuel/next-month`)

- A table, newest first: month, our mid-month range, our final range, the official change, inside or outside the range, the error in cents, and what the policy part was.
- Rows from the backtest are labelled "calculated afterwards". Rows from live running are labelled "published at the time". The daily estimate file is committed to git each day, so the live record cannot be rewritten quietly.
- November 2026 goes in as a worked example of a miss caused by an announced tax change.

### States

No data yet in the new period: "No estimate yet." Data older than 3 days: the stale line. Parse failure: keep the last good estimate with its date. Never show a number without its as-of date.

## 5. "What it costs me" calculator

On `/fuel`, above the chart.

- **Inputs:** fuel (petrol 95, petrol 93, diesel 500 ppm, diesel 50 ppm), zone (inland or coastal), then either tank size in litres (quick picks 35, 45, 60, 80, editable) or kilometres a month plus litres per 100 km. No default consumption figure is assumed: the field is empty until the reader fills it.
- **Outputs:** cost of a full tank this month, the difference from last month in rands, and for the kilometres mode the monthly cost and its change. When an estimate exists: "If the estimate holds, a tank will cost between RX and RY from 2 December."
- **Working shown:** "45 litres × R30.24 = R1 360.80", following the site's rule that a calculation shows its working.
- **Diesel note:** the official diesel price is wholesale, so the pump price differs.
- **Share:** state lives in the URL (reuse `src/lib/use-url-param.ts` from origin). A share image route following `src/app/tools/money-value/share-image/route.tsx`. A WhatsApp link (`https://wa.me/?text=…`) with a prepared sentence and the page URL. A copy-link button.
- **Share image inputs must be validated** against the fixed product and zone lists and clamped number ranges, and the response cached, so the route cannot be used to burn function time.

## 6. Context

One chart on `/fuel`: petrol 95 inland, indexed to 100 at the first month shown, beside headline CPI indexed the same way, with the rand per dollar average from the DMPR statements as a third line. Two or three lines, each labelled at its end. Title computed from the data ("Petrol rose X% since January 2022. Prices in general rose Y%"). Table toggle underneath. Separate source lines for each series. CPI comes from data already held. The exchange rate comes from the DMPR statements, so only as many months as have been keyed in.

## 7. Alerts: do the free part, skip email

| Option | Cost | Verdict |
|---|---|---|
| Email alerts | Collects personal data (POPIA duties), needs a sending service, unsubscribe handling and spam risk | **No**, not now. High effort and legal duty for an unproven audience |
| WhatsApp share button | None. It is a link | **Yes**, part of the calculator and the monthly price page |
| RSS (`/feed.xml` exists) | Add fuel entries | **Yes**, small |
| Calendar (`/calendar.ics` exists) | Add "fuel price change" on each first Wednesday | **Yes**, small |
| WhatsApp Channel posted by hand each month | Free, 5 minutes a month, no personal data held | **Maybe later**, once the page has traffic |

## Decisions this design needs

D1 (reopen automation for fuel only), D3 (CEF terms), D4 (estimates versus the "no forecasts" principle) and D5 (who approves automated numbers). See `docs/implementation-plan.md`.
