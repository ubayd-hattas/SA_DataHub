# SA Data Hub: implementation plan

**Date:** 13 November 2026. **Planner and reviewer:** Claude (Fable). **Implementer:** Claude Opus in Claude Code.
**Status: approved 13 November 2026.** The owner accepted the recommendation on all six decisions (D1 to D6 below). The CEF email in D3 is still for the owner to send; until CEF answers, the tracker is built and backtested but not published.

Read with: `docs/audit.md`, `docs/ux-plan.md`, `docs/fuel.md`, `docs/pipeline-and-api.md`, `docs/opportunities.md`.

## Dates that drive the order

| Date | Event |
|---|---|
| Fri 13 Nov | Plan written |
| Wed 18 Nov | CPI October release (owner's manual task, takes priority when the file arrives) |
| Thu 19 Nov | SARB rate decision (same) |
| **Fri 20 Nov** | **Target: `/fuel` and `/fuel/history` live** |
| Fri 27 Nov | Target: estimate tracker and calculator live, if D3 and D4 are approved |
| About Mon 30 Nov or Tue 1 Dec | December fuel prices announced (November's came the day before the change) |
| **Wed 2 Dec** | **December prices take effect** |

## Decisions the owner must make first

These reopen things this repo records as paused or ruled out. My recommendation is first in each.

| # | Decision | Recommendation | If the answer is no |
|---|---|---|---|
| D1 | Reopen automation, for fuel only (CEF and DMPR). Paused since 25 Oct 2026 | **Yes, fuel only.** The Stats SA rule stays exactly as it is | Phases 3 and 4 become manual: the owner keys monthly prices by hand and there is no tracker |
| D2 | PostgreSQL | **Stay paused. Build fuel on JSON files in git** (audit section 1) | Add about two weeks before fuel can start |
| D3 | CEF daily data has no published reuse terms ("All Rights Reserved") | **Email CEF today** (draft in `docs/fuel.md`). Build and backtest privately meanwhile. Publish the tracker when they agree, or when the owner knowingly accepts option 2 in `docs/fuel.md` | No tracker. History, breakdown and calculator still ship |
| D4 | Principle 2 says "no speculation and no forecasts". The tracker is an estimate | **Amend the principle:** "No forecasts of our own. We may show a published official indicator of the next change, as a range, with our past error shown." Record it in `docs/PRODUCT_DIRECTION.md` | No tracker |
| D5 | Principle 6 says a person checks every number. The daily CEF figure would publish with machine checks only | **Split it:** official monthly prices always need a person's merge. The daily estimate merges itself when every check passes, and is labelled "updated automatically, not reviewed" | Daily pull requests wait for the owner each day |
| D6 | Public API was "not now". The brief also asks for per-IP rate limiting | **Yes to a static API. No to rate limiting for now** (`docs/pipeline-and-api.md` section 5) | No Phase 5 |

## Things only the owner can do

1. Answer D1 to D6.
2. Send the CEF email (D3).
3. Download the DMPR files in a browser into `sources/releases/fuel/` (already git-ignored): every monthly "Fuel Regulations" spreadsheet and "Breakdown of Prices" PDF from the [archive](https://www.dmpr.gov.za/Branches/Petroleum-Resources/Petrol-Price-Archive) and the [current page](https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices), plus one "History of Fuel Prices" file. Start with November 2025 to November 2026. That unblocks Phase 3.
4. Check once that GitHub emails you when a scheduled workflow fails.
5. Approve the Figma screens (task 6.0) before Phase 6 starts.

---

## Instructions for Opus

Follow these on every task. They come from the owner's standing instructions and from this repo's history.

**Before starting**
1. `git pull --ff-only` on `main`. The local checkout was 11 commits behind on 13 November. Run `npm ci`.
2. Read this plan, the document the task points to, and every file the task lists, before editing.
3. Never send a request to statssa.gov.za. Never read or print `.env` files. Never copy browser headers into a script.
4. Before any `git checkout` of an old commit or any `git rm --cached`, read the project memory note on untracking: files have been lost that way twice. Use `git show` or a separate worktree.

**One task, one branch, one pull request**
5. Branch from fresh `main`: `feat/…`, `fix/…`, `data/…`, `docs/…`, `test/…`, `chore/…`.
6. Do the task and nothing else. If you notice another problem, write it in the pull request description and leave it.
7. A task that touches more than about ten files is too big. Stop and propose a split.

**Commits: more of them, each one real**
The owner wants a healthy commit count from honest work.
8. Aim for three to six commits per task. Each task below lists its natural commits. Use those.
9. Every commit must stand on its own: it type-checks, tests pass, and its message says what changed and why in one plain sentence. Match the style already in `git log` (for example "Fix browser CSV downloads so spreadsheets and parsers can read them"). No em dashes.
10. Good places to split: data files, types, logic, tests, the page, navigation and links, the update-log entry, docs. Backfilled data splits naturally by year.
11. Do not pad. No empty commits, no whitespace-only commits, no splitting one logical change across commits so that the middle ones are broken, no committing and reverting.
12. End each commit message with the co-author line the session gives you.

**Verify before the pull request**
13. Run and paste the real output of: `npm run typecheck`, `npm run lint`, `npm test`, `npm run validate`, `npm run build`. For Python changes also `python -m pytest -q` on the folders you touched.
14. For any UI change, open the page at 375 px and 1280 px, light and dark, and look at it. Check keyboard focus on anything interactive. Say in the pull request what you looked at.
15. If a test fails, fix the cause. Do not skip, weaken or delete the test.
16. Run the `reviewer` agent on the branch before opening the pull request. Fix what it finds or say why not.

**Pull request, check, merge**
17. Push the branch and open the pull request with `gh pr create`. Use the repo's template. Include: what changed, files, the verification output, what was not verified.
18. Wait for CI. Read the result with `gh pr checks`. Do not merge on red, and do not merge with checks still running.
19. Merge with a **merge commit**: `gh pr merge --merge --delete-branch`. Not squash, so every commit lands on `main`. The owner pre-authorised this on 7 November 2026 for normal pull requests.
20. After the merge, load the changed page on sadatahub.tech once Vercel has deployed, and confirm it.
21. Never force push. Never run `vercel --prod`. Never push straight to `main`.

**Stop and ask the owner when**
22. A task depends on a decision (D1 to D6) that has not been answered.
23. A number from a source file does not pass its validation and you cannot see why.
24. A source's terms or `robots.txt` do not clearly allow what the task does.
25. Anything would cost money, or needs a new account, secret or third-party service.

**Data rules for every number**
26. Enter values exactly as published, in the publisher's units. Record the source document, its URL, its release date and the date you checked it.
27. A figure that cannot be traced to a held file is not published.
28. Every data change that readers can see gets an entry on `/updates` (hand-written file for manual work, the auto file for pipeline work).

**After each task, report in this form** so the planner can review it:
1. What changed (one or two sentences)
2. Files touched
3. How it was verified (command and result)
4. What was not verified

---

## Tasks

Sizes: S under a day, M one to three days, L a week or more.

### Phase 0: clean start

**0.1 Sync and protect the working copy (S)**
- Files: `.gitignore`. Move `https___sadatahub.tech_-Performance-on-Search-2026-10-25.zip` into `sources/search-console/` (not a commit: the folder is ignored).
- Commits: (1) ignore Search Console exports in the repo root, (2) resolve `next-env.d.ts` being both tracked and ignored. For (2) take the safe option: remove the ignore line, keep the file tracked.
- Accept: `git status` is clean after `npm run build`. The zip no longer shows as untracked.
- Audit: H4, H5.

**0.2 Lighthouse baseline (S)**
- Files: `docs/case-study/lighthouse-2026-11.md` (new).
- Do: run Lighthouse, mobile preset, on `/`, `/category/inflation`, `/municipalities/CPT`, `/series/cpi-headline`, `/dashboard` on the live site. Record performance score, LCP, CLS, TBT and total transfer size.
- Commits: one.
- Accept: the file holds the five rows with the run date and tool version. No claims beyond the numbers.

### Phase 1: critical security and data-correctness fixes

**1.1 Topic-page CSV gives the full series (S)**
- Files: `src/app/category/[slug]/page.tsx`, `src/lib/export.ts`, `tests/unit/export-csv.test.ts`, `src/data/update-history.ts`.
- Commits: (1) test that a multi-statistic export has one row per data point, failing first, (2) pass `exportMode="series"` on the topic page and make `series` the default when any statistic has a series, (3) log the correction on `/updates`.
- Accept: downloading from `/category/inflation` gives every period of every statistic. The new test passes. Summary mode still works when asked for by name.
- Audit: H1.

**1.2 Automation labels tell the truth (S)**
- Files: `src/lib/registry.ts`, `src/app/downloads/page.tsx`, `tests/unit/registry-automation.test.ts` (new), `src/data/update-history.ts`.
- Commits: (1) set every `automationLevel` to `manual` or `static`, (2) test with an explicit allow-list for `auto` and `semi-auto` (empty for now), (3) plain-language labels on `/downloads` ("Entered by hand", "Does not change"), (4) log the correction.
- Accept: no page says a dataset updates automatically. The test fails if someone sets `auto` without adding the id to the allow-list.
- Audit: H2.

**1.3 Unique ids and the `DATA_SOURCE` trap (S)**
- Files: `tests/unit/stat-ids.test.ts` (new), `src/lib/data-source.ts`, `.env.example`, `src/lib/db/index.ts`.
- Commits: (1) test that every statistic id is unique across `allStatistics`, (2) make `getDataSourceMode()` throw on any value other than `json`, `database` or unset, with a test, (3) correct the two comments that say `db`.
- Accept: `DATA_SOURCE=db npm run build` fails with a clear message. The build with no variable passes.
- Audit: M1 and section 2.

**1.4 Security headers (S)**
- Files: `next.config.js`, `tests/unit/security-headers.test.ts` (new).
- Commits: (1) add `headers()` with `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options: SAMEORIGIN` on everything except `/embed/:path*`, (2) test that reads the config and checks the embed exception.
- Accept: `curl -I` on the preview deployment shows the headers on `/` and not the frame header on `/embed/series/cpi-headline`. An embed still loads in an iframe on another origin.
- Audit: M2.

**1.5 Review the three share-image routes (S)**
- Files: `src/app/municipalities/[code]/share-image/route.tsx`, `src/app/tools/compare/share-image/route.tsx`, `src/app/tools/money-value/share-image/route.tsx`, tests beside the existing share-image test.
- Do: read each. Confirm every query input is checked against known ids or clamped to a range, unknown input returns 400 or a default, and responses set a long `Cache-Control`. Fix only what fails.
- Commits: one per route that needs a change, each with its test. If none needs a change, one commit adding the tests that prove it.
- Accept: a request with a garbage parameter cannot make the route render arbitrary text or run uncached work.
- Audit: section 3.

**1.6 Guard the paused scripts (S)**
- Files: `scripts/update_all.py`, `scripts/update_gdp.py`, `scripts/update_housing.py`, `scripts/update_inflation.py`, `scripts/update_unemployment.py`, `src/data/mock.ts` (header comment only).
- Commits: (1) scripts exit with "paused since 25 October 2026" unless run with an explicit override flag, (2) fix the comment in `mock.ts` that tells people to run them.
- Accept: `python scripts/update_all.py` prints the message, exits non-zero and makes no network request.
- Audit: M4.

### Phase 2: the migration, as far as fuel needs it

Fuel needs none of it (D2).

**2.1 Record that the migration is parked (S)**
- Files: `db/README.md`, `etl/README.md`, `docs/CURRENT_STATE.md`.
- Commits: one.
- Accept: each README opens with one paragraph saying the work is parked, what state it is in (audit section 1) and what would have to happen first to resume it.

### Phase 3: fuel history page and the monthly pipeline. Target 20 November

Needs D1, D2 and owner action 3.

**3.1 Fuel data model, first twelve months (M)**
- Files: `src/types/fuel.ts` (new), `src/data/fuel/prices.json` (new), `src/lib/fuel.ts` (new), `tests/unit/fuel-prices.test.ts` (new).
- Do: define the record in `docs/fuel.md` section 2. Enter November 2025 to November 2026 from the DMPR files in `sources/releases/fuel/`. Write `fuelStatistics()` that returns `Statistic[]` for the eleven series.
- Commits: (1) types, (2) the data file, (3) `fuelStatistics()` with tests, (4) the chain check: each month equals the previous month plus the official change, within half a cent.
- Accept: tests pass. Petrol 95 inland for November 2026 matches the DMPR file. Any value that disagrees with the industry association table is listed in the pull request with both numbers.

**3.2 Script to read a month's DMPR files (M)**
- Files: `automation/adapters/dmpr_fuel.py` (new), `automation/adapters/tests/test_dmpr_fuel.py` (new), `automation/__main__.py`, `automation/requirements.txt`, `.github/workflows/ci.yml`.
- Do: `python -m automation fuel-official <folder>` reads a local spreadsheet and breakdown PDF, prints the parsed values and a diff against `prices.json`, and writes only with `--write`. It makes no network request. Follow `automation/adapters/base.py`.
- Commits: (1) parser with fixtures made from text extractions (not the publisher's files), (2) validation rules from `docs/pipeline-and-api.md` section 3, each with a passing and a failing test, (3) the command, (4) run `pytest automation` in CI.
- Accept: running it on November 2026 reproduces the values entered by hand in 3.1 exactly.

**3.3 Backfill to January 2022 (M)**
- Files: `src/data/fuel/prices.json`.
- Commits: one per calendar year (2022, 2023, 2024, 2025), each produced with the 3.2 script and each passing the chain check.
- Accept: 59 adjustments from January 2022 to November 2026 with no gaps. Every record names its source document.

**3.4 Fuel joins the site's data layer (S)**
- Files: `src/types/index.ts` (`CategoryId`), `src/data/mock.ts`, `src/lib/registry.ts`, `src/lib/sourcing.ts` if needed, `tests/unit/` for registry and category.
- Commits: (1) `fuel` category and `CategoryId`, (2) fuel statistics added to `allStatistics`, (3) registry entry (`semi-auto`, added to the allow-list from 1.2), (4) tests.
- Accept: `/series/fuel-petrol-95-inland`, its CSV and JSON, and its embed all build. `assertSiteSourced()` passes. The CSV has 59 rows.

**3.5 The shared data page layout (M)**
- Files: `src/components/editorial/DataPage.tsx` (new), `src/app/series/[id]/page.tsx`, a test.
- Do: `docs/ux-plan.md` section 2. Move the series page onto it with no visual change.
- Commits: (1) component with its five states, (2) series page uses it, (3) test for each state.
- Accept: screenshots of `/series/cpi-headline` before and after at 375 and 1280 px match.

**3.6 `/fuel` page, version 1 (M)**
- Files: `src/app/fuel/page.tsx` (new), `src/components/fuel/` (new: selector, price table), `src/components/layout/nav-items.ts`, `src/app/sitemap.ts`, `src/lib/llms-txt.ts`, `src/lib/search-index.ts`, `tests/unit/navigation.test.ts`.
- Do: headline price for the chosen product and zone, change in words, one plain sentence, server-rendered SVG chart, table toggle, a table of all products this month, source line naming the DMPR document, "Entered from the department's files by hand".
- Commits: (1) page with headline and table, (2) selector with URL state, (3) chart and table toggle, (4) menu, sitemap, search and `llms.txt` entries, (5) tests.
- Accept: works with JavaScript off (default product shown). Checked at 375 and 1280 px, both themes. No Recharts import. Diesel says "wholesale" wherever its price appears.

**3.7 `/fuel/history` (S)**
- Files: `src/app/fuel/history/page.tsx` (new), tests.
- Commits: (1) page with table and downloads, (2) tests and sitemap entry.
- Accept: every adjustment listed with its effective date and change in cents. The CSV link returns the same rows.

**3.8 Fuel on the home page (S)**
- Files: `src/lib/headline-numbers.ts`, `src/app/page.tsx`, `tests/unit/homepage.test.ts`.
- Commits: (1) two fuel tiles, (2) tests.
- Accept: six tiles in a 2 by 3 grid at 375 px. Each fuel tile shows the price, the effective date and "DMPR", and links to `/fuel`.

**3.9 What a litre is made of (M)**
- Files: `src/data/fuel/breakdown.json` (new), `src/lib/fuel-breakdown.ts` (new), `src/components/fuel/BreakdownBar.tsx` (new), `src/app/fuel/page.tsx`, tests.
- Commits: (1) types and the last twelve months of data, (2) sum check (elements equal the price within half a cent), (3) stacked bar with its table, (4) plain-language element descriptions, (5) the temporary relief shown as its own row with dates and source.
- Accept: the four groups add up to the headline price on the page. Element names match the DMPR PDF.

**3.10 Launch housekeeping (S)**
- Files: `src/data/update-history.ts`, `src/data/release-calendar.ts`, `src/lib/feed.ts`, `docs/CURRENT_STATE.md`, `docs/PRODUCT_DIRECTION.md`, `docs/RUNBOOK.md`.
- Commits: (1) "new dataset" entry on `/updates`, (2) fuel adjustment dates on the calendar, (3) runbook section "Publishing the monthly fuel prices", (4) current-state and direction docs, including the answers to D1 to D6.
- Accept: `/updates`, `/calendar` and `/feed.xml` show fuel. The runbook steps can be followed by someone who has not seen this plan.

### Phase 4: estimate tracker and calculator. Target 27 November

4.1 to 4.4 need D1. 4.5 also needs D3 and D4. 4.6 needs neither and can be done first.

**4.1 CEF sheet parser (M)**
- Files: `automation/adapters/cef_daily.py` (new), tests, `automation/config/sources/cef.yaml` (new).
- Commits: (1) parser from extracted text, with the six fixture cases in `docs/pipeline-and-api.md` section 3, (2) validation rules with tests, (3) fetcher that reads `robots.txt`, the index page and one PDF, with the honest User-Agent, tested against saved responses, not the live site.
- Accept: parsing the 30 December 2025 sheet gives an average over-recovery of 61.187 c/l for petrol 95 and 132.722 for diesel 0.05%, the values read in the planning session. A sheet with a missing row fails loudly.

**4.2 Backfill and backtest (M)**
- Files: `automation/fuel/backtest.py` (new), `docs/fuel-backtest.md` (new), `src/data/fuel/cef-daily.json` (new), tests for the statistics functions.
- Do: fetch each daily sheet from December 2024 once, at least five seconds apart, into a local folder that is not committed. Follow `docs/fuel.md` section 4 exactly.
- Commits: (1) error and percentile functions with tests on made-up numbers, (2) the backtest script, (3) the parsed daily series, (4) the report.
- Accept: the report gives, for each group of days, the month count, mean absolute error, 10th and 90th percentile error, direction hit rate and leave-one-out coverage, for each product. It says plainly if the sign convention or the method does not hold. **Stop here and send the report to the planner before 4.3.** If the range is too wide to be useful, the tracker does not ship as designed.

**4.3 Estimate calculation (S)**
- Files: `automation/fuel/estimate.py` (new), `src/data/fuel/known-changes.json` (new), `src/data/fuel/estimate.json` (new), `src/data/fuel/estimate-log.json` (new), `src/lib/fuel-estimate.ts` (new), tests.
- Commits: (1) known-changes file with the December 2026 levy step-down, each entry with its source, after confirming the amounts against the official document, (2) the calculation with tests, (3) the reader in TypeScript with the "none" and "stale" cases.
- Accept: the range for a hand-worked example matches to the cent.

**4.4 Daily workflow and failure handling (M)**
- Files: `.github/workflows/fuel-daily.yml` (new), `src/components/fuel/StaleNote.tsx` (new), `src/data/update-history.auto.json` (new), `src/lib/registry.ts`, tests.
- Commits: (1) workflow following `release-due.yml` conventions, with read-only permissions except where needed, (2) failure path that opens or updates one `pipeline-failure` issue, (3) stale note component with tests on fixed dates, (4) auto update-log file merged into `/updates`.
- Accept: a manual run with a deliberately broken fixture opens the issue and commits nothing. A manual run with a good fixture produces a pull request that changes only `src/data/fuel/`. Auto-merge follows the answer to D5.

**4.5 `/fuel/next-month` and the estimate on `/fuel` and the home page (M)**
- Files: `src/app/fuel/next-month/page.tsx` (new), `src/components/fuel/EstimateBlock.tsx` (new), `src/app/fuel/page.tsx`, `src/app/page.tsx`, `src/app/methodology/page.tsx`, tests.
- Commits: (1) estimate block with all states, (2) the page with method and "what is not included", (3) track record table with "calculated afterwards" and "published at the time" labels, (4) home strip and `/fuel` block, (5) methodology section.
- Accept: the word "estimate" is in the same line as every estimated number. The as-of date is always shown. With an empty `estimate.json` no estimate appears anywhere and nothing breaks.

**4.6 Calculator (M)**
- Files: `src/components/fuel/FuelCalculator.tsx` (new), `src/lib/fuel-calc.ts` (new), `src/app/fuel/share-image/route.tsx` (new), `src/app/fuel/page.tsx`, tests.
- Commits: (1) calculation functions with tests, (2) the form with labels, errors and a live result region, (3) URL state and copy link, (4) share image with validated inputs and caching, (5) WhatsApp share link.
- Accept: 45 litres of petrol 95 inland in November 2026 shows R1 360.80 with the working. Keyboard-only use works. The share image rejects unknown products.

**4.7 Official price watcher (S)**
- Files: `.github/workflows/fuel-official.yml` (new), `scripts/fuel-official-check.mjs` or a Python equivalent, tests.
- Commits: (1) the check against a saved copy of the DMPR page, (2) the workflow, active from the 25th to the 7th.
- Accept: with a fixture that has a newer entry it opens one issue. Run twice, it does not open a second.

### Phase 5: public API. Needs D6

**5.1 Fuel endpoints (M)**
- Files: `src/app/api/v1/fuel/latest/route.ts`, `history/route.ts`, `breakdown/route.ts`, `estimate/route.ts` (new), `src/lib/api-envelope.ts` (new), `tests/unit/api-v1.test.ts` (new).
- Commits: (1) envelope helper with tests, (2) latest and history, (3) breakdown and estimate, (4) contract test that snapshots the keys of every response.
- Accept: all four are static in the build output. Each carries source, attribution, terms and `estimate` flags. Headers include the cache and CORS values in `docs/pipeline-and-api.md`.

**5.2 Series under the same pattern (S)**
- Files: `src/app/api/v1/series/route.ts`, `src/app/api/v1/series/[id]/route.ts`, `src/app/api/v1/route.ts` (new), tests.
- Commits: (1) series list and item, (2) index.
- Accept: `/api/v1/series/cpi-headline` returns the same points as `/data/series/cpi-headline.json` inside the envelope.

**5.3 API docs page (S)**
- Files: `src/app/api-docs/page.tsx` or a route group so the page lives at `/api` without clashing with `/api/v1` (decide and say which), `src/components/layout/Footer.tsx`, `src/lib/llms-txt.ts`.
- Commits: (1) the page with real example responses generated from the data, (2) links from the footer, methodology and `llms.txt`.
- Accept: every example on the page is produced by the same code as the endpoint, so it cannot drift.

### Phase 6: UX work

**6.0 Figma: tokens and key screens for review (S). Not done in the planning pass**
- Do: put the tokens from `docs/DESIGN.md` plus the proposed `warn` token, and four phone screens (`/fuel`, `/fuel/next-month`, the calculator, the new home page) in a Figma file for the owner.
- Accept: the owner approves or marks changes. Nothing in Phase 6 starts before that. Phase 3 pages use the existing system as it is, so they are not blocked.

**6.1 `warn` token and the stale and estimate states (S)**: `src/app/globals.css`, `tailwind.config.ts`, `tests/unit/design-system.test.ts`, `docs/DESIGN.md`. Accept: contrast test passes on `paper` and `subtle` in both themes.

**6.2 Home page built around questions (S)**: `src/app/page.tsx`, `src/data/answers.ts`, tests. Accept: questions are the second section, six rows with their numbers, 44 px touch targets, scale names instead of raw sizes.

**6.3 Topic pages through `DataPage` (M)**: `src/app/category/[slug]/page.tsx`. Accept: no visual change at 375 and 1280 px.

**6.4 Retire `/dashboard` (S)**: `next.config.js` redirect, nav, sitemap, remove unused components in a second commit. First check Search Console clicks to `/dashboard` and report them. Accept: the redirect works and no test or link still points at the old page.

**6.5 `/downloads` on the tokens, static CSV links (S).**

**6.6 Navbar and footer on the tokens (S).**

**6.7 Province detail pages on the tokens (M).**

**6.8 Old chart cards removed (S)**: delete `LineChartCard`, `BarChartCard`, `StatChart` once nothing imports them. Remove `recharts` if `CpiHistoryChart` and `HistoricalTimeline` have also moved. Report the bundle size before and after.

**6.9 Rename `src/data/mock.ts` to `src/data/index.ts` (S)**: one mechanical commit, nothing else in it.

### Phase 7: opportunities, only those the owner approves

**7.1 Monthly fuel explainer template (M once, then S a month).** On the existing explainer system.
**7.2 SARB repo rate job (S).** Needs the endpoint re-confirmed and the SARB terms cleared.
**7.3 Breakdown history back to January 2022 (M).**
**7.4 Fuel price by zone, tied to municipality pages (L).** Only if fuel traffic justifies it.

---

## How the planner will review each task

1. The diff touches only the files the task lists, or the pull request says why not.
2. The commits match the task's commit list and each stands alone.
3. The acceptance line is demonstrated with real command output or a screenshot, not asserted.
4. Every new number has a source document, release date and checked date.
5. Nothing reached statssa.gov.za. No secret, `.env` content or publisher's document was committed.
6. CI was green before the merge, and the merge was a merge commit.

## What this plan does not cover

- Performance fixes: there is no baseline until 0.2 is done.
- Catching up crime, QLFS Q3, CPI October and the rate decision: those are release tasks in `docs/RUNBOOK.md` and wait on the owner's files. When a file arrives, that task goes ahead of whatever is in progress here.
- Anything in `docs/opportunities.md` the owner has not approved.
