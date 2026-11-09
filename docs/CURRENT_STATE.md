# SA Data Hub: current state

**As of:** 8 November 2026, `main` after pull request #62.
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
| Data series | `/series`, `/series/[id]` | Every shown statistic (32) with every value, CSV and JSON at `/data/series/[id].csv` and `.json`, a citation, revision history and Dataset markup |
| Embeds | `/embed/series/[id]` | A script-free chart page for other sites to show in an iframe |
| Explainers | `/explainers`, `/explainers/[slug]` | CPI September 2026 and QLFS Q2 2026 |
| Release calendar | `/calendar`, `/calendar.ics` | Next release dates, each taken from a release the site holds |
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
- Entered by hand from releases saved in `sources/releases/` and `newdatasets/`, which are not committed. Repeatable builds: `scripts/census/` (Provinces at a glance), `scripts/crime/import_quarter.py` (SAPS quarter) and `scripts/elections/build_lge_2026.py` (IEC voting-station results).
- Sources: Stats SA (Census 2022, QLFS, CPI, GDP, mid-year population estimates), SARB (repo and prime), SAPS (crime), DBE (matric), DHET (enrolment), the IEC (2026 local elections) and the UN (World Population Prospects 2024, for comparison only).
- Records that can't be traced to a held release are kept with a `withheld` reason and not shown, such as the expanded youth unemployment rate.

## Checks

- `assertSiteSourced()` (`src/lib/sourcing.ts`) fails the build if a figure on the homepage, a topic page or a municipality page lacks a source, release date or checked date. Explainers have `assertExplainerSourced()`.
- CI (`.github/workflows/ci.yml`) runs the type-check, lint, Vitest, `npm run validate` and its tests, and a full build on every pull request.

## Paused

- **Automation** (`automation/`, `scripts/update_*.py`): paused since 25 October 2026. Nothing may make requests to statssa.gov.za.
- **PostgreSQL migration** (`db/`, `etl/`, `DATA_SOURCE=database`): production uses the JSON files.

## Known gaps

- Release explainers wait on the releases: QLFS Q3 (November), CPI October (18 November), the MPC decision (19 November) and GDP Q3 (December). There is no GDP or MPC explainer template yet.
- Election results have no council seats: the IEC voting-station files don't include the seat calculation.
- The population series for 2015 to 2024 is calculated back from growth rates, not taken from Stats SA's published series.
- Some older stories still give unsourced explanations, for example the reasons for unemployment in the unemployment story.
- No source the site holds covers the Census 2022 undercount yet, so the planned Post-Enumeration Survey explainer is waiting on those documents.
- Annual crime figures end at 2023/24 until the SAPS annual release is added.
