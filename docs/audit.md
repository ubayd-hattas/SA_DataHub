# SA Data Hub audit

**Date:** 13 November 2026. **Auditor:** Claude (planner). **Report only: no code was changed.**

## Result in five lines

1. No critical security or data-correctness bug was found.
2. One of the two earlier bugs is only half fixed: the CSV download on topic pages still gives one row per statistic instead of the full series (H1).
3. The PostgreSQL migration is about a third done and is not needed. Production runs on JSON. Fuel should be built on JSON files in git, not on Postgres (section 1).
4. The Download Center tells readers that seven datasets are "Semi-auto" or "Auto-updated" while all automation has been paused since 25 October 2026 (H2).
5. The brief this audit was written against is out of date in places, and four of its goals conflict with decisions already recorded in this repo. They are listed first because they change the plan.

## What I checked, and what I did not

| Checked | How |
|---|---|
| Repo structure, 460 tracked files | `git ls-files` |
| Data layer, providers, DB client, data routes, export engine, registry, sourcing check, home page, nav, layout, line chart, Tailwind config, design doc, current-state and direction docs | Read in full |
| Every statistic in `src/data/datasets/*.json` | Script that prints id, value, dates, series length and duplicate ids |
| Secrets in tracked files and in history | Pattern scan (connection strings, common key prefixes, private keys) and `git log` for env files |
| Type-check | `npx tsc --noEmit`, exit 0 |
| CI on GitHub | `gh run list`: last five runs passed |

Not checked, so not claimed:

- **Performance was not measured.** No Lighthouse run, no bundle analysis, no test on a real low-end phone. Section 4 is a code read only.
- I did not read every page component. Not read: the three `share-image` routes, `CitationWidget.tsx`, the stories components, `/provinces`, `/municipalities/[code]`, the `automation/core` framework beyond the SARB adapter header, `etl/`, `db/migrations/`, `validation/`.
- I did not open any Stats SA page (standing rule), so "latest official release" for Stats SA series is from release patterns and the repo's own calendar, and is marked unverified.
- **The local checkout is 11 commits behind `origin/main`** (local stops before PR #72; GitHub is at PR #94). I read the newer `export.ts`, `series.ts`, `release-due.ts` and `package.json` from `origin/main`. Line numbers below are for the local checkout unless they say "origin". Pull before any work starts.

## Where the brief is out of date

| The brief says | The repo says |
|---|---|
| Next.js 14 | Next.js 16.4.6 on `origin/main` (PR #91). 15.5.28 in the local checkout |
| The data layer is moving to PostgreSQL | Migration paused 25 Oct 2026 (`docs/CURRENT_STATE.md` line 47, `docs/PRODUCT_DIRECTION.md` principle 5 and "Not now") |
| Data that updates itself | Automation paused 25 Oct 2026. No requests to statssa.gov.za, ever |
| A public API | Listed under "Not now" in `docs/PRODUCT_DIRECTION.md` line 74 |
| An "expected next month" estimate | Principle 2: "No speculation and no forecasts" |
| A June 2026 roadmap found indicators one release behind | Mostly fixed since. See the table in section 2 |
| AutomationBadge component | No such component. The badge is a local function in `src/app/downloads/page.tsx` lines 30 to 36 |

None of this blocks a plan. It means the owner has to reopen four decisions on purpose. They are listed as D1 to D6 at the top of `docs/implementation-plan.md`.

---

## Findings

### Critical

None found.

### High

**H1. Topic-page CSV download gives one row per statistic, not the series**
- Where: `src/app/category/[slug]/page.tsx:284` renders `<ExportButton stats={stats} label={category.label} variant="full" />` with no `exportMode`. `src/lib/export.ts` (default at local line 79) then picks `summary` whenever more than one statistic is passed.
- What is wrong: a topic with three statistics downloads a three-row file. This is the earlier "three rows instead of the full series" bug. It was fixed for `/downloads` (`exportMode="series"` at `src/app/downloads/page.tsx:166`) and for `/data/<id>.csv` and `/data/series/<id>.csv` (both pass `mode: 'series'`), but not here.
- Why it matters: the topic page is where most people will press download. The file looks complete and is not.
- Fix: pass `exportMode="series"` at line 284. Then change the default in `buildCsvContent` to `series` whenever any statistic has a series, so a new caller cannot repeat the mistake. Add a test to `tests/unit/export-csv.test.ts` (exists on origin) that a multi-statistic export has more rows than statistics.

**H2. Automation labels are untrue**
- Where: `src/lib/registry.ts`, `automationLevel` on seven entries is `'semi-auto'` (local lines 116 to 191 and 282) and on `population` is `'auto'` (line 236). Shown by `src/app/downloads/page.tsx:32-33` and `:72` as "Semi-auto" and "Auto-updated".
- What is wrong: every dataset has been entered by hand since 25 October 2026.
- Why it matters: the site's whole claim is that it tells the truth about its numbers. This is a false statement on a trust page.
- Fix: set every entry to `'manual'` or `'static'`. Only a dataset with a running, tested pipeline may say `'auto'`. Add a unit test that fails if an entry says `auto` or `semi-auto` and is not in an explicit allow-list.

**H3. Some figures are behind or out of step with each other** (detail in section 2)
- Annual crime ends at 2023/24, released 20 September 2024. At least one annual release is missing, probably two.
- `youth-neet-rate` is at Q4 2025 while the other labour figures on the same page are at Q2 2026.
- QLFS Q3 2026 is due "November 2026" and may already be out. Unverified.
- Fix: these are release tasks, already tracked in the runbook. They wait on the owner downloading the files.

**H4. A private Search Console export sits in the repo root, not ignored**
- Where: `https___sadatahub.tech_-Performance-on-Search-2026-10-25.zip` (untracked). `.gitignore` covers `sources/search-console/` only.
- Why it matters: one `git add .` publishes private analytics in a public repo.
- Fix: move the file into `sources/search-console/`. Add `*Performance-on-Search*.zip` to `.gitignore`.

**H5. The local checkout is stale and dirty**
- Where: local `main` is 11 commits behind `origin/main`, with `next-env.d.ts` and `skills-lock.json` modified.
- Why it matters: any work started here starts from Next.js 15 and misses the CSV fix (#92) and the lint config change (#91).
- Fix: `git pull --ff-only` before the first task. `next-env.d.ts` is both tracked and listed in `.gitignore` (line 39), which is why it always shows as modified. Pick one. If it is untracked with `git rm --cached`, back the file up first: this repo has lost files that way twice (see the project memory note on untracking).

### Medium

**M1. `DATA_SOURCE=db` silently does nothing**
- Where: `.env.example` line 6 says `json (default) or db`. `src/lib/db/index.ts:3` says "until DATA_SOURCE=db". `src/lib/data-source.ts:6` only accepts the string `database`.
- Why it matters: anyone following the example file gets JSON mode with no warning and believes the database is live.
- Fix: correct the two comments to `database`, or make `getDataSourceMode()` throw on any value that is not `json` or `database`.

**M2. No security headers on normal pages**
- Where: `next.config.js` has no `headers()`. Only `src/app/embed/series/[id]/route.ts:23` sets a Content-Security-Policy.
- Why it matters: any site can frame the main pages, and browsers get no `nosniff` or referrer rule. Low risk today because there is no login and no user input, but it is a two-line credibility fix.
- Fix: add `headers()` with `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN` for everything except `/embed/*`, and a minimal `Permissions-Policy`. Leave a full CSP for later: it needs testing against Next.js inline scripts and Vercel Analytics.

**M3. Pipeline tests do not run in CI**
- Where: `.github/workflows/ci.yml` (local copy) runs `tsc`, lint, Vitest, `npm run validate` and `pytest validation/tests`. It does not run `automation/**/tests` or `etl/transform/test_periods.py`.
- Why it matters: the brief wants automated fetching. The existing pipeline code has tests that nothing executes.
- Fix: when automation is reopened for fuel, add a `pytest automation` step. Until then, no change. Check the origin copy of `ci.yml` first: I could not read it in this session.

**M4. Paused scripts can still make forbidden requests**
- Where: `scripts/update_gdp.py`, `update_housing.py`, `update_inflation.py`, `update_unemployment.py` and `automation/adapters/statss.py` reference statssa.gov.za. The header of `src/data/mock.ts` (line 24) still says "Run: python scripts/update_all.py".
- Why it matters: the standing rule is no requests to Stats SA. One command breaks it.
- Fix: make `scripts/update_all.py` and each Stats SA script exit with a message unless an explicit `--i-know-this-is-paused` flag is given, and correct the comment in `mock.ts`. Do not delete: they document past work.

**M5. Two design systems**
- Where: `docs/DESIGN.md` defines the editorial tokens (`paper`, `ink`, `muted`, `rule`, `accent`). `src/components/charts/LineChartCard.tsx` uses hard-coded hex colours (line 30, `CHART_COLORS`), `slate-*` classes and the old `card` class. `FreshnessIndicator.tsx`, `ExportButton.tsx` and the Download Center do the same.
- Why it matters: charts and download controls look different from the pages around them, and the old colours are not covered by the contrast test in `tests/unit/design-system.test.ts`.
- Fix: covered in `docs/ux-plan.md`. One chart component on the tokens, then delete the old ones.

**M6. Dashboard charts have no table alternative**
- Where: `LineChartCard.tsx:111` wraps the chart in `role="img"` with an `aria-label` that names the chart but gives no values. Seen live on `/dashboard` at 375 px on 13 November 2026.
- What is right already: topic pages and series pages use the editorial chart with "Show the numbers as a table" under it.
- Why it matters: on the dashboard a screen-reader user gets "line chart, measured in %". `docs/DESIGN.md` requires "a table view of the numbers is one click away". The dashboard also fades in on load, counts 32 statistics as "32 datasets", starts every y-axis at zero so the line is squashed against the top, and shows a second search box directly under the header search.
- Fix: move the dashboard onto the editorial chart, or retire it in favour of `/series` (see `docs/ux-plan.md`).

**M7. The name `mock.ts` hides the real data layer**
- Where: `src/data/mock.ts` is imported by most of the site and holds production data access.
- Why it matters: every new contributor, human or model, reads "mock" and assumes test data. It also uses a lazy `require()` (line 196) to dodge a circular import with `registry.ts`.
- Fix: rename to `src/data/index.ts` in one mechanical commit with no other change. Low priority: do it after fuel ships.

**M8. Hand-kept numbers in the registry go stale**
- Where: `src/lib/registry.ts` `FILE_SIZE_BY_ID` (local lines 219 to 232) hard-codes byte sizes. `seriesStart: '1996'` for population (line 238) while the series starts at 2015.
- Fix: compute both from the data at build time, or remove the file size from the UI.

**M9. `@neondatabase/serverless` looks unused**
- Where: `package.json`. `src/lib/db/client.ts` uses `postgres`. A search of `src`, `db` and `etl` found no import of `@neondatabase/serverless`.
- Fix: confirm with a full search, then remove it. One less dependency for Dependabot to bump.

### Low

- **L1. CSV formula injection is not handled.** `escapeField` in `src/lib/export.ts` does not neutralise a leading `=`, `+` or `@`. All text is written by the maintainer today, so the risk is theoretical. It becomes real the day scraped text reaches a CSV. Prefix such fields with a single quote when the pipeline lands.
- **L2. `dangerouslySetInnerHTML` in `src/components/ui/CitationWidget.tsx:181`.** The HTML comes from the site's own data. Not read in this audit. Check that titles are escaped before they go into `result.html`.
- **L3. Three web fonts.** `src/app/layout.tsx` loads Inter, Source Serif 4 and DM Mono (two weights). If `font-mono` is used in only a few places, drop DM Mono and use the system monospace.
- **L4. `docs/DESIGN.md` is stale.** It says the homepage still uses the old look. `src/app/page.tsx` already uses the tokens.
- **L5. `.neon` in git history.** A 77-byte Neon CLI link file was committed on 29 June 2026 (`f310745`) and untracked later (`55fcd47`). I did not print it. That file normally holds a project id and an org id, not a password. If the owner ever pasted a connection string into it, rotate the Neon password. Otherwise no action.
- **L6. 52 uses of `any`** across `src`, mostly Recharts callbacks and `_meta` reads in `registry.ts`. Fix as files are touched.

---

## 1. Migration state

**How far it got.** Phase 2 of roughly six.

- Schema and migrations exist (`db/migrations/001` to `004`).
- Four datasets have ETL pipelines and equivalence tests: unemployment, youth unemployment, labour force, interest rates (`etl/pipelines/`, `tests/equivalence/`). That is 9 of 33 statistics.
- `src/data/providers/database.ts` overlays those 9 statistics from Postgres onto the JSON baseline when `DATA_SOURCE=database`.
- The type-check phase the brief mentions is finished: `tsc --noEmit` exits 0 and CI is green.

**What still reads JSON.** Everything in production, because `DATA_SOURCE` is unset. Even in database mode only three pages go through the provider: `src/app/dashboard/page.tsx:20`, `src/app/insights/[slug]/page.tsx:71`, `src/app/category/[slug]/page.tsx:142`. The home page, series pages, CSV and JSON routes, embeds, search index, sourcing check, registry, provinces, municipalities, explainers, answers and `llms.txt` all import `src/data/mock.ts` directly. So database mode would show different numbers on a topic page than on the series page it links to.

**Shortest safe path to finish it.** Do not finish it. Reasons:

1. The site is static. Every page is built from files and served from a CDN. A database adds a runtime dependency, a secret, cold starts and a failure mode, and returns nothing a reader can see.
2. The whole dataset is small: 33 statistics and 213 municipalities. Fuel adds about 300 monthly rows and about 250 daily rows a year.
3. JSON in git already gives what a database would be used for here: history, review before publish (a pull request), rollback (a revert) and a public audit trail.
4. The rule that a person checks numbers before they go live (principle 6) maps onto pull requests. It does not map onto database writes.

If the owner still wants Postgres later, the safe path is: route every reader through `getAppDataProvider()` first (one PR per page group), then migrate the remaining seven datasets, then switch production. That is weeks of work with no user-visible gain. I recommend parking it and saying so in `db/README.md`.

**Should fuel be built on Postgres from day one?** No. Build fuel on JSON files under `src/data/fuel/`, written by a scheduled GitHub Actions job through a pull request. Design in `docs/pipeline-and-api.md`.

## 2. Data correctness

**Duplicate statistic ids: fixed.** A script over all 11 dataset files found 33 statistics and no repeated id. There is no test that keeps it that way that I could find. Add one (three lines in a Vitest file).

**CSV three-row bug: fixed in three places, not in the fourth.** See H1.

**Dataset currency.** "Held" is what the site shows. "Latest official" is unverified wherever it says so: I may not open Stats SA, and I did not open the SAPS or DHET sites in this session.

| Dataset | Held (period, release date) | Latest official | Behind by |
|---|---|---|---|
| CPI headline and food | Sep 2026, released 21 Oct 2026 | Sep 2026. October is due 18 Nov 2026 (repo calendar) | 0 |
| Annual average CPI | 2025, released 21 Jan 2026 | 2025 | 0 |
| Unemployment, youth 15 to 34, youth 15 to 24, participation | Q2 2026, released 11 Aug 2026 | Q3 2026 is due "November 2026". Unverified whether it is out | 0 or 1 |
| Youth NEET rate | Q4 2025, released 17 Feb 2026 | Q2 2026 at least | 2 quarters |
| Expanded youth unemployment | Withheld (no traceable release) | n/a | Withheld |
| GDP quarterly growth | Q2 2026, released 8 Sep 2026 | Q2 2026. Q3 is due early December (unverified) | 0 |
| GDP annual, nominal, per person | 2025, released 10 Mar 2026 | 2025 | 0 |
| Repo and prime rates | Sep 2026 (7.25%, 10.75%) | Same. Next MPC decision 19 Nov 2026 | 0 |
| Crime, annual | 2023/24, released 20 Sep 2024 | 2024/25 should exist, 2025/26 possibly. Unverified | 1 or 2 years |
| Crime, quarterly | Jan to Mar 2026, released 22 May 2026 | Apr to Jun 2026 probably out, Jul to Sep possibly. Unverified | 1 or 2 quarters |
| Matric pass rate | 2025, released 12 Jan 2026 | 2025 | 0 |
| University enrolment | 2023, released 1 Nov 2024 | 2024 may be out. Unverified | 0 or 1 |
| Population, mid-year | 2026, released 30 Jul 2026 | 2026 | 0 |
| Urban share, median age, literacy | Census 2022, single value, no series | Census 2022 | 0 |
| Housing, census households, internet | Census 2022 | Census 2022 | 0 |

Other data notes:

- 22 of 33 statistics carry no explicit checked date in the dataset file (the script printed `?`). The sourcing check passes because `statDates()` falls back to another field. Worth confirming what it falls back to, so "checked on" never just repeats "released on".
- The population series for 2015 to 2024 is calculated back from growth rates. Already disclosed on the site (PR #93).

## 3. Security

- **Secrets in the repo:** none found in tracked files. See L5 for history.
- **Secrets in the client bundle:** no `NEXT_PUBLIC_*` variables exist. `process.env` is read only in `src/lib/data-source.ts` and `src/lib/db/client.ts`, both server-side. The Google site verification code in `layout.tsx:73` is public by design.
- **Database credentials:** `DATABASE_URL` only, read server-side, SSL required (`client.ts:24`). Production does not use it. If it is set in Vercel but unused, remove it from the Vercel project: an unused secret is only risk.
- **API route validation:** every data route is `force-static` with `dynamicParams = false`. A request can only hit a path generated at build time. No user input reaches server code in those routes. The three `share-image` routes are the exception: they render images on request. I did not read them. They need a check that inputs are validated against known ids and that responses are cached, because image rendering is the one place a stranger can make the site burn function time.
- **Rate limiting:** none in the app, and none needed for static files. See `docs/pipeline-and-api.md` for why the API should stay static.
- **Headers:** see M2.
- **Dependencies:** Dependabot is on (PR #72) and merging. Good.

## 4. Performance (code read only, nothing measured)

- **Strong:** almost every page is static HTML. Embeds are script-free SVG (`src/lib/embed-chart.ts`). Vercel skips builds for docs-only changes (`scripts/vercel-ignore-build.sh`).
- **Risk, charts:** five client components import Recharts (`BarChartCard`, `LineChartCard`, `StatChart`, `CpiHistoryChart`, `HistoricalTimeline`). Recharts is a large library and draws on the main thread. On a low-end Android phone this is the most likely source of slow interaction. The site already knows how to draw a line chart as plain SVG on the server. Use that for the fuel page and for the shared data-page layout, and keep Recharts off new pages.
- **Risk, stories:** `framer-motion` and `react-scrollama` load on the story pages only if those components are not imported elsewhere. Confirm with a bundle analysis.
- **Fonts:** see L3.
- **Caching:** static assets are cached by Vercel by default. The CSV and JSON routes set no `Cache-Control` of their own. Fine for static output.
- **First task before any performance work:** run Lighthouse (mobile preset) on `/`, `/category/inflation`, `/municipalities/CPT`, `/series/cpi-headline` and `/dashboard`, and save the numbers in `docs/case-study/`. Without a baseline nothing can be claimed.

## 5. Code health

- **Dead or parked code:** `db/`, `etl/`, `src/lib/db/`, `src/data/providers/database.ts`, `tests/equivalence/`, most of `scripts/update_*.py`. Parked on purpose. Label it in one README line each, and guard the scripts (M4).
- **Duplication:** two CSV paths (browser `exportDataset` and server routes) that now share `buildCsvContent`. Good. Two chart stacks (Recharts cards and the SVG embed). Three places define dataset metadata: JSON `_meta`, `registry.ts` and `mock.ts` categories.
- **Inconsistent patterns:** provider versus direct import (section 1). Old and new design classes (M5).
- **Tests:** 37 unit test files and good build-time checks (`assertSiteSourced`). The gaps are a unique-id test, a multi-statistic CSV test (H1) and pipeline tests in CI (M3).
- **Docs:** `docs/archive/` holds 30 old plans. `docs/CURRENT_STATE.md` is accurate as of 8 November and should be updated when fuel ships.
