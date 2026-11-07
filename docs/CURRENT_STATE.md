# SA Data Hub: current state

**As of:** 28 October 2026, `main` at the merge of pull request #46.
**Live:** [sadatahub.tech](https://sadatahub.tech), deployed by Vercel from `main`.

This describes the site as it is. For where it is going, see [`PRODUCT_DIRECTION.md`](PRODUCT_DIRECTION.md). For how to publish a release, see [`RUNBOOK.md`](RUNBOOK.md) (pull request #52). The automation framework's state from August 2026 is archived in [`AUTOMATION_STATE_2026-08.md`](AUTOMATION_STATE_2026-08.md).

## Pages

The main menu has five sections: What changed, Your area, Topics, Tools and About the data.

| Area | URL | What is there |
|---|---|---|
| Home | `/` | Latest figures with their release dates, "Find your municipality", "What changed this month" (latest explainers), the money value calculator, "Questions people ask" (four answers), topics |
| Municipalities | `/municipalities`, `/municipalities/[code]` | 213 Census 2022 profiles, with 2011 figures on the same boundaries, "How it compares" (province and similar places), three related questions, "Compare with another place" and a share image (`/municipalities/[code]/share-image`) |
| Provinces | `/provinces`, `/provinces/[id]` | Province explorer, housing by province from Provinces at a glance, and nine province pages |
| Topics | `/category/[slug]` | Unemployment, GDP and economy, inflation, crime, education, population, housing, Census 2022. Each has CSV downloads and citations; unemployment, population, inflation, housing and census also list related answers. The repo rate sits under inflation. |
| All statistics | `/dashboard` | Every shown statistic, searchable |
| Explainers | `/explainers`, `/explainers/[slug]` | CPI September 2026 and QLFS Q2 2026 |
| Answers | `/answers`, `/answers/[slug]` | 22 factual questions, answer first, with a chart or top-10 list, the working and sources |
| Stories | `/insights`, `/insights/[slug]` | The census story (2011 to 2022, `/insights/census-2011-to-2022`), a scrolling unemployment story, and five stories on unemployment, inflation, GDP, crime and matric |
| Tools | `/tools/money-value`, `/tools/compare` | Money value calculator (CPI history from 1980) and compare two or three municipalities, each with a share image |
| Trust | `/methodology`, `/updates`, `/changelog`, `/feed.xml` | Methods, the "Why do the numbers disagree?" section, the reuse condition quoted from Stats SA, the public corrections log, the platform changelog and an RSS feed |
| Data | `/downloads`, `/data/[file]` | CSV downloads; schema.org `Dataset` markup points to them |
| About | `/about` | Who built it and why |

## Features across pages

- **Header search** (`/search-index.json`, built at build time): places, statistics, answers, explainers, stories and tools, in groups, with full keyboard support. "Compare places" is added to Tools in #51.
- **Guess first:** a slider guess on the two explainers and two answer pages, then the published figure with its source.
- **Report an error:** in the footer, on both explainers and on /methodology. It opens a GitHub issue until #44 merges, then an email to uhattas@gmail.com.
- **Share images** for municipality pages, the compare tool and the calculator.

## Data

- JSON files in `src/data/datasets/`, read at build time. Almost every page is static.
- Entered by hand from releases saved in `sources/releases/` (not committed). The census tables are parsed by `scripts/census/` from Provinces at a glance; the SAPS quarter by `scripts/crime/import_quarter.py`.
- Sources: Stats SA (Census 2022 Provinces at a glance and Municipal fact sheet, QLFS, CPI, GDP, mid-year population estimates), SARB (repo and prime), SAPS (crime), the Department of Basic Education (matric) and the Department of Higher Education and Training (enrolment).
- Records that can't be traced to a held release are kept in the file with a `withheld` reason and not shown: the expanded youth unemployment rate, and the NEET rate until #48 merges.

## The sourcing check

Every figure on the homepage, topic pages and municipality pages must have a source, the source's release date and a checked date, and the check can't be earlier than the release. `assertSiteSourced()` (`src/lib/sourcing.ts`) runs when those pages are built, so `next build` fails on any gap. Explainers have their own check, `assertExplainerSourced()`. Each municipality figure also needs the printed page of its census table.

## Tests and checks

`npx tsc --noEmit`, `npm run lint`, `npm test` (Vitest) and `npm run build`. On `main` at #46: type-check clean, lint clean, 455 tests passed and 27 skipped (the skipped ones need a database). UI changes are also screenshotted at 390, 768, 1280 and 1920 px in light and dark before a pull request is opened.

## Paused

- **Automation** (`automation/`, `scripts/update_*.py`): scheduled checks and downloads from publisher sites. Paused since 25 October 2026. Nothing in the repo may make requests to statssa.gov.za.
- **PostgreSQL migration** (`db/`, `DATA_SOURCE=database`): the data layer can read from Neon, but production uses the JSON files.

## Known gaps

- Province pages show GDP share, matric pass rate, literacy rate, urban population and a legacy "expanded unemployment" row that aren't from a release in `sources/releases/`. #50 moves their housing figures to Provinces at a glance.
- No source in `sources/releases/` covers the Census 2022 undercount, so the census story has no undercount note.
- The education stat card calls the 2025 matric pass rate "the highest on record", citing the Minister's announcement, which isn't held. #49 removes the matric "record" claims from the stories only.
- Several stories still give unsourced explanations (for example why matric results improved). #30 and #35 removed the ones that were listed.
- GDP and SARB decisions have no explainer template yet.

## Open pull requests from the wrap-up run

| PR | What |
|---|---|
| #44 | Send error reports to uhattas@gmail.com |
| #47 | Cite the Census 2022 Municipal fact sheet with its report number |
| #48 | Show the QLFS Q4 2025 NEET rate for ages 15 to 24 |
| #49 | Remove unsourced matric record claims from the stories |
| #50 | Take province page housing from Provinces at a glance |
| #51 | Add Compare places to the header search |
| #52 | Add a per-dataset runbook |
