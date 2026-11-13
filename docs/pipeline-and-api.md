# Automatic updates and a public API: design

**Date:** 13 November 2026. Design only. Depends on decisions D1, D2, D3, D5 and D6 in `docs/implementation-plan.md`, because automation, the database and a public API are all recorded as paused or "not now" in this repo.

## Result

- **Scheduler: GitHub Actions**, not Vercel Cron.
- **Storage: JSON files in git**, not Postgres. The job opens a pull request. Merging it is what publishes.
- **API: static JSON files under `/api/v1/`**, built with the site and served from the CDN. No database, no secrets, no server code per request.
- **Scope: fuel only, plus the SARB repo rate as a second, human-approved job.** Nothing touches statssa.gov.za.

## 1. Scheduling: GitHub Actions or Vercel Cron

| | GitHub Actions | Vercel Cron (Hobby) |
|---|---|---|
| Frequency | Any cron expression. Runs can start late under load | Once a day at most on Hobby, within an hour-wide window ([Vercel docs](https://vercel.com/docs/cron-jobs/usage-and-pricing)) |
| Can it write to the repo | Yes, with the built-in token | No. It calls an HTTP function, which would need a database or blob store to keep results |
| Runtime | Python and Node on a full runner. `pypdf` for the CEF PDFs, a spreadsheet reader for DMPR files | A serverless function with a short time limit |
| Review before publish | Natural: the job opens a pull request | Would have to be built |
| Cost | Not re-verified this session. This repo already runs a scheduled workflow ("Release due", last run 12 November 2026, 16 seconds), so scheduled runs work for it today. **Check GitHub's current billing page for public repositories before relying on it** | Free on Hobby within limits |
| Known trap | Scheduled workflows in a public repo are disabled after 60 days with no repository activity ([GitHub docs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)). This repo gets commits weekly, and the daily data commit is itself activity | Hobby is for non-commercial use (check Vercel's fair-use terms before any sponsorship) |

**Choice: GitHub Actions.** It can read a PDF, write a file, open a pull request and leave a public log, all without a new service or secret.

Neon is not used. For the record, its free plan was listed on 13 November 2026 as 100 compute-unit hours and 1 GB per project ([Neon FAQ](https://neon.com/faqs/free-plan-limits-and-quotas), via search summary, page not opened).

## 2. The jobs

Put the code in the existing `automation/` package, which already has adapters, an HTTP client with an honest User-Agent, retry, staging, archive and report modules. Read `automation/adapters/base.py` and `automation/docs/developer-guide.md` first and follow their pattern. Do not start a second framework.

### Job A: CEF daily sheet (`.github/workflows/fuel-daily.yml`)

- **When:** working days at 15:00 and 19:00 South African time (13:00 and 17:00 UTC). Two attempts because the publication hour is not known. Record the time each new sheet first appears for a month, then cut to one run.
- **Steps:**
  1. Read `https://cefgroup.co.za/robots.txt`. Stop if the path is disallowed.
  2. Fetch the current year's index page once. Find the newest `Daily-DD-MM-YYYY.pdf` link. Take the date from the file name, not from the link label (labels have typos).
  3. If that date is already in `src/data/fuel/cef-daily.json`, exit cleanly. No commit.
  4. Download that one PDF. Record its URL and SHA-256. Keep the PDF as a workflow artifact for 90 days. Do not commit it: the repo's rule is that publishers' documents are not redistributed.
  5. Parse with `pypdf`. Validate (section 3).
  6. Append the day to `cef-daily.json`. Recompute `estimate.json`. Append the day's estimate to `estimate-log.json`, which is the public track record.
  7. Run `npm run typecheck`, the fuel unit tests and `npm run validate` inside this workflow.
  8. Open a pull request from `data/fuel-daily-YYYY-MM-DD` and merge it with a merge commit, only if every check passed (see D5).
- **Requests per run:** three at most (robots, index, one PDF). User-Agent: `SADataHubBot/1.0 (+https://sadatahub.tech/methodology)`. No retries faster than 30 seconds apart. Never copy browser headers.

### Job B: official price watcher (`.github/workflows/fuel-official.yml`)

- **When:** daily at 16:00 South African time from the 25th of each month to the 7th of the next. Not at all in between.
- **What it does:** reads DMPR `robots.txt`, then fetches the [Fuel Prices](https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices) page once and compares the newest entry's date with the newest `effectiveFrom` in `prices.json`. If there is a newer entry, it **opens a GitHub issue** titled "New fuel prices published: effective DD Month YYYY" with the links found. It does not try to parse the documents.
- **Why not parse automatically:** the department's links change shape every month (short links, ZIP files, numbered download handlers, wrong labels). A parser for that will break, and the brief's first rule is that a broken scraper must never put a wrong price live. Twelve times a year, a person downloads the files, runs `python -m automation fuel-official path/to/files`, checks the diff and merges. That takes minutes and keeps principle 6 (a person checks every number).
- **The semi-automatic script** reads the XLSX and the breakdown PDF from a local folder, writes `prices.json` and `breakdown.json`, appends the update-log entry, and runs the validation in section 3.

### Job C: SARB repo rate (extend later)

The adapter exists (`automation/adapters/sarb.py`). Run it on Monetary Policy Committee days only (next: 19 November 2026), open a pull request, never auto-merge: the adapter's own header says rate changes need human approval. Blocked on re-confirming the endpoint (the help page returned 404 on 13 November 2026) and on the SARB reuse terms recorded on 8 November 2026.

### Datasets that stay manual

Everything from Stats SA (CPI, QLFS, GDP, population, census), SAPS, DBE and DHET. The `release-due` workflow already opens an issue when one is overdue. That is the right level of automation for them.

## 3. Safety

A fetched value is published only if all checks pass. Otherwise nothing changes on the site.

| Check | CEF daily | Official monthly |
|---|---|---|
| Shape | Five product columns found by name. Every expected row label found | Every product and zone present |
| Types | Each value parses as a number after removing thousands separators. Brackets mean negative | Same |
| Date | Sheet date equals the file-name date, is a working day, is later than the last stored date and is not in the future | `effectiveFrom` is a Wednesday and later than the last one |
| Plausible range | Basic fuel price 300 to 4 000 c/l. Average recovery between −1 500 and +1 500 c/l. R/$ between 10 and 35 | Each price 800 to 6 000 c/l |
| Change from last value | Average recovery moves less than 150 c/l in a day. A larger move is held for a person | New price equals old price plus the change in the official statement, within 0.5 c. Any month-on-month move over 400 c/l is held for a person |
| Internal consistency | Product-price part plus exchange-rate part equals the average recovery within 0.01 | Breakdown elements sum to the price within 0.5 c |
| Duplicate | Same SHA-256 as an earlier file with a different date is rejected | n/a |

The ranges are starting values set from the numbers seen in this session (basic fuel price about 850 to 950 c/l in December 2025, paraffin up 275 c/l in one month in November 2026). The implementer should tune them against the backtest data and write the reasoning beside each constant.

**"Held for a person"** means: the job opens an issue with the parsed values and the reason, attaches the PDF as an artifact, and exits without a pull request.

**On failure** (network error, layout change, check failed):
1. No commit. The site keeps the last good value.
2. The page shows it is stale by itself: each automated figure prints its as-of date, and a small client component adds "No newer figure has been checked in since [date]" after 3 days for daily data. This works even when the pipeline is completely down, because it needs no new build.
3. The owner is alerted twice: the workflow fails (GitHub emails the owner on failed scheduled runs if notifications are on, which should be checked once) and the job opens or updates one issue labelled `pipeline-failure`. One open issue, updated with a comment each day, not a new issue per day.
4. Three failures in a row add the label `needs-owner`.

**Tests that must exist before the first live run:** parser tests against at least six saved text extractions (a normal day, a day with brackets, a first day of a period, a `-1` re-upload, a year boundary, a deliberately broken layout that must fail), and a test for each validation rule with one passing and one failing input.

## 4. Update log

- `src/data/update-history.ts` is written by hand and holds long prose entries. A daily job must not edit a TypeScript file.
- Add `src/data/update-history.auto.json`, an array with the same fields as `UpdateHistoryEntry` plus `"automated": true`. `getEntryUpdateHistory()` and the `/updates` page merge both lists by date.
- **What gets logged:** each official monthly price update (one entry a month), each held or rejected fetch that lasted more than one working day, and each correction. **Not** each daily CEF figure: 250 entries a year would bury real updates. The daily data has its own visible as-of date and the estimate log.
- **Registry truth:** the `fuel` registry entry may say `automationLevel: 'auto'` only for the daily estimate. Official fuel prices say `'semi-auto'` (script plus human check). Every other dataset says `'manual'` or `'static'` (audit H2). A unit test enforces the allow-list.

## 5. Public API

### Shape

Static route handlers, the same pattern as `src/app/data/series/[file]/route.ts` (`dynamic = 'force-static'`).

| Endpoint | Returns |
|---|---|
| `GET /api/v1/fuel/latest` | Current official price per product and zone, effective date, change from last month |
| `GET /api/v1/fuel/history` | Every adjustment for every series. Optional static variants per series: `/api/v1/fuel/history/<series-id>` |
| `GET /api/v1/fuel/breakdown` | Elements per product and zone for the latest month. `/api/v1/fuel/breakdown/<YYYY-MM>` for past months |
| `GET /api/v1/fuel/estimate` | Current range per product, as-of date, method version, what is not included. `"status": "none"` when there is no estimate |
| `GET /api/v1/series` and `/api/v1/series/<id>` | The existing series documents under a versioned path, so every dataset follows the same pattern |
| `GET /api/v1` | Index of endpoints |

Every response uses one envelope:

```jsonc
{
  "data": { },
  "meta": {
    "version": "v1",
    "generatedAt": "2026-11-13T15:04:00Z",
    "source": { "publisher": "Department of Mineral and Petroleum Resources", "document": "…", "url": "…", "releasedOn": "2026-11-03" },
    "checkedOn": "2026-11-13",
    "attribution": "Source: DMPR. Via SA Data Hub, https://sadatahub.tech/fuel",
    "terms": "Free for non-commercial use with credit to the source. See https://sadatahub.tech/api",
    "estimate": false,
    "docs": "https://sadatahub.tech/api"
  }
}
```

Units are in the field names or a `unit` field (`cents_per_litre`). Dates are ISO. Estimates carry `"estimate": true` at the top of `meta` and inside each estimated value.

### Caching

Files are generated at build and served by Vercel's CDN. Set `Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400` and `Access-Control-Allow-Origin: *` (the series route already sends the CORS header). A new build after each merged data pull request replaces the files.

### Rate limiting: the brief asks for it, and I recommend against building it now

- A static file on a CDN costs no function time per request. There is no database or compute to protect.
- Per-IP limiting needs middleware on every API request plus a counter store. On free tiers that means a new service and a new secret, and it turns free static requests into metered function calls. It adds the cost it was meant to prevent.
- Do this instead: publish a fair-use line on the docs page ("cache responses, at most one request a minute per endpoint, the data changes at most daily"), watch Vercel's usage page for the first month, and check whether Vercel's firewall offers a rate-limit rule on the Hobby plan (not verified). If abuse appears, add the firewall rule first, and middleware only as a last resort.
- This is decision D6. If the owner wants a hard limit from day one, the plan gains one M-sized task and one external dependency.

### Versioning

`/api/v1/` is frozen once announced: fields are added, never renamed or removed. A breaking change means `/api/v2/` beside it. Add a contract test that snapshots the keys of each response so an accidental rename fails CI.

### Docs page (`/api`)

One static page: what it is, each endpoint with a real example response, units, the envelope, the fair-use line, the terms of each source, how to cite, a changelog, and where to report a problem. Link it from the footer, `/methodology` and `llms.txt`.

### Never expose the database

There is none in this design. If Postgres is ever switched on, the API still serves build-time files, and `DATABASE_URL` stays server-only.

### Terms carried through

DMPR data is free to reuse only non-commercially and with credit, so the API cannot grant more than that. The existing series files state "Licence: CC BY 4.0" (`src/lib/series.ts`). For fuel, do not print CC BY: print the DMPR condition. CEF-derived estimates are covered by D3.

## 6. How a merged update reaches the site

1. The job merges a pull request that changes only files under `src/data/fuel/`.
2. `scripts/vercel-ignore-build.sh` sees a change outside the excluded folders, so Vercel builds.
3. The build runs `assertSiteSourced()` and the fuel checks. A bad file fails the build and the previous deployment stays live.
4. One build a day from Job A. Check Vercel's current Hobby deployment and build limits once before launch. I did not verify them in this session.

## 7. Note on commits

Commits made by the Actions bot do not count toward the owner's GitHub contribution graph. A merge performed by the workflow is the bot's too. Only the monthly official-price pull requests, which the owner or their Claude Code session authors and merges, count. This pipeline is for the readers, not the graph.

## 8. Open points for the implementer to confirm before coding

1. Read `.github/workflows/release-due.yml` on `origin/main` and copy its conventions (permissions block, issue handling). I could not open it in this session.
2. Pull requests opened with the built-in token do not start other workflows, as I understand GitHub's rules. That is why Job A runs its checks inside its own workflow. Confirm against GitHub's documentation, and check whether `main` has branch protection that requires the CI check.
3. Read DMPR's `robots.txt` in full.
4. Confirm the hour CEF publishes.
