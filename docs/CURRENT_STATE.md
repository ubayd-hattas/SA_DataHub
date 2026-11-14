# SA Data Hub: current state

**As of:** 14 November 2026. Fuel prices added on top of `main` after pull request #62.
**Live:** [sadatahub.tech](https://sadatahub.tech), deployed by Vercel from `main`.

This describes the site as it is. For where it is going, see [`PRODUCT_DIRECTION.md`](PRODUCT_DIRECTION.md) and the roadmap in the [README](../README.md#where-its-going). For how to publish a release, see [`RUNBOOK.md`](RUNBOOK.md). Earlier plans are in [`archive/`](archive/README.md).

## Pages

The main menu has five sections: What changed, Your area, Topics, Tools and About the data.

| Area | URL | What is there |
|---|---|---|
| Home | `/` | Latest figures with their release dates, "Find your municipality", "What changed this month" (latest explainers, the release calendar, the 2026 election results, the census story), the money value calculator, questions people ask, topics |
| Municipalities | `/municipalities`, `/municipalities/[code]` | 213 profiles: Census 2011 and 2022 on the same boundaries, the 2026 local election results (turnout, PR vote shares, ward wins), comparisons with the province and similar places, and a share image |
| Elections | `/elections-2026` | National turnout, PR vote shares and ward wins, the eight metros, and the councils where no party won half the PR vote |
| Provinces | `/provinces`, `/provinces/[id]` | Province explorer and nine province pages |
| Topics | `/category/[slug]` | Unemployment, GDP and economy, inflation, crime, education, population, housing, Census 2022, with CSV downloads, citations and a link from every statistic to its series page |
| Data series | `/series`, `/series/[id]` | Every shown statistic (32, plus the ten fuel series) with every value, CSV and JSON at `/data/series/[id].csv` and `.json`, a citation, revision history and Dataset markup |
| Embeds | `/embed/series/[id]` | A script-free chart page for other sites to show in an iframe |
| Explainers | `/explainers`, `/explainers/[slug]` | CPI September 2026 and QLFS Q2 2026 |
| Release calendar | `/calendar`, `/calendar.ics` | Next release dates, each taken from a release the site holds |
| Fuel prices | `/fuel`, `/category/fuel`, `/series/fuel-*` | Official monthly petrol, diesel and illuminating paraffin prices from the DMPR, January 2022 to November 2026, inland and coastal, with ten series pages and two tiles on the home page |
| Why numbers differ | `/why-numbers-differ` | Census count, mid-year estimate and UN projection for population; LU1 to LU4 for unemployment |
| Answers | `/answers`, `/answers/[slug]` | 22 factual questions, answer first, with sources |
| Stories | `/insights`, `/insights/[slug]` | The census story, a scrolling unemployment story, and stories on unemployment, inflation, GDP, crime and Matric 2025 (the Matric 2024 story was retired and redirects there) |
| Tools | `/tools/money-value`, `/tools/compare` | Money value calculator (CPI from 1980) and a compare tool, each with a share image |
| Trust | `/methodology`, `/updates`, `/changelog`, `/feed.xml` | Methods, Stats SA's reuse condition, the public corrections log, the changelog and an RSS feed |
| Support | `/support` | Ways to help: report an error, ask for data, share, contribute code. A sponsorship section appears once GitHub Sponsors is approved (`SPONSORS_URL` in `src/lib/contact.ts`) |
| For AI tools | `/llms.txt` | A Markdown map of the site and every series JSON file |
| Other | `/dashboard`, `/downloads`, `/about` | All statistics, CSV downloads, about the author |

## Data

- JSON files in `src/data/datasets/`, read at build time. Almost every page is static.
- Entered by hand from releases saved in `sources/releases/` and `newdatasets/`, which are not committed. Repeatable builds: `scripts/census/` (Provinces at a glance), `scripts/crime/import_quarter.py` (SAPS quarter) and `scripts/elections/build_lge_2026.py` (IEC voting-station results) and `scripts/fuel/build_prices.py` (DMPR fuel prices, kept in `src/data/fuel/prices.json`). Fuel steps are in `RUNBOOK.md`.
- Sources: Stats SA (Census 2022, QLFS, CPI, GDP, mid-year population estimates), SARB (repo and prime), the Department of Mineral and Petroleum Resources (DMPR, monthly fuel prices), SAPS (crime), DBE (matric), DHET (enrolment), the IEC (2026 local elections) and the UN (World Population Prospects 2024, for comparison only).
- Records that can't be traced to a held release are kept with a `withheld` reason and not shown, such as the expanded youth unemployment rate.

## Checks

- `assertSiteSourced()` (`src/lib/sourcing.ts`) fails the build if a figure on the homepage, a topic page or a municipality page lacks a source, release date or checked date. Explainers have `assertExplainerSourced()`.
- CI (`.github/workflows/ci.yml`) runs the type-check, lint, Vitest, `npm run validate` and its tests, and a full build on every pull request.

## Paused

- **Automation** (`automation/`, `scripts/update_*.py`): paused since 25 October 2026. Nothing may make requests to statssa.gov.za. Reopened for fuel only (decision D1, 13 November 2026), and no fuel automation is built yet.
- **PostgreSQL migration** (`db/`, `etl/`, `DATA_SOURCE=database`): production uses the JSON files. Parked, not planned: decided 13 November 2026 (`docs/implementation-plan.md`, D2). New data, including fuel, is built on JSON files in git.

## Decisions on fuel (13 November 2026)

The owner approved all six as recommended in `docs/implementation-plan.md`.

| | Decision | Answer |
|---|---|---|
| D1 | Automation | Reopened for fuel only (CEF and DMPR). The Stats SA rule is unchanged. |
| D2 | PostgreSQL | Stays paused. Fuel is built on JSON files in git. |
| D3 | CEF daily data has no published reuse terms | Email CEF and do not publish the estimate tracker until they answer. Sending the email is the owner's action and is pending. The tracker, if built, is private until then. |
| D4 | Principle 2 and the estimate | Principle 2 amended (`PRODUCT_DIRECTION.md`). |
| D5 | Principle 6 and automatic merges | Principle 6 split (`PRODUCT_DIRECTION.md`). Official monthly prices always need a person's merge. |
| D6 | Public API | Yes to a static API. No rate limiting for now. Not built yet. |

## Known gaps

- Fuel: the estimate tracker, the calculator, the breakdown of a litre and the static API are not built. The official history is live. March and April 2026 have no DMPR price schedule, so some series leave those months out.
- Release explainers wait on the releases: QLFS Q3 (November), CPI October (18 November), the MPC decision (19 November) and GDP Q3 (December). There is no GDP or MPC explainer template yet.
- Election results have no council seats: the IEC voting-station files don't include the seat calculation.
- The population series for 2015 to 2024 is calculated back from growth rates, not taken from Stats SA's published series.
- Some older stories still give unsourced explanations, for example the reasons for unemployment in the unemployment story.
- No source the site holds covers the Census 2022 undercount yet, so the planned Post-Enumeration Survey explainer is waiting on those documents.
- Annual crime figures end at 2023/24 until the SAPS annual release is added.
