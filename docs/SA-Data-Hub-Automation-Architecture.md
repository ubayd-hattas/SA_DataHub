# SA Data Hub — Long-Term Data Automation Architecture

**Prepared:** 1 July 2026
**Audience:** Solo maintainer + future contributors / AI coding assistants
**Status:** Design document — no code included
**Inputs:** `ai-context.md` (current architecture), `SA-Data-Hub-Dataset-Sourcing-Plan.md` (per-dataset research)

---

## 0. Design Principles

Before the diagrams: the constraints that shaped every decision below, pulled directly from the two source documents.

1. **Nothing auto-deploys to production data.** Every dataset in the sourcing plan — even the "Easy" SARB API case — is recommended for a manual approval gate. The architecture treats this as a hard rule, not a per-dataset option.
2. **One release, one job.** The QLFS family (`unemployment`, `youth-unemployment`, `labour-force`) must be *one* extractor with three outputs, not three independent scripts. This is the single largest structural fix the sourcing plan calls for.
3. **"Automatable" and "worth automating" are different questions.** `crime.json` and `education.json` are deliberately *not* candidates for scraping/PDF-parsing automation. The system needs a first-class "human-in-the-loop reminder" pathway that isn't a degraded version of the automated pipeline — it's a designed workflow of its own.
4. **Static doesn't mean unmonitored.** `census.json` and `municipalities.json` need no refresh logic but do need a cheap "has the source page changed" watch, because Stats SA has already issued a Census 2022 revision once (August 2025, Thaba Chweu/Mbombela erratum).
5. **Fix data-integrity bugs before building automation on top of them.** `population.json` is pulling from the wrong upstream source entirely (likely World Bank rather than Stats SA MYPE) while its `_meta` claims a verified auto-update. Automating a broken source just automates the bug. The architecture below assumes source-correctness is validated *before* a dataset is allowed onto the scheduled pipeline, not after.
6. **Respect the existing "never change without asking" list.** URL paths, statistic IDs, municipality codes, registry IDs, citation format, and dataset JSON shape are all off-limits for silent modification. The automation system treats these as protected fields with their own validation rule, distinct from "value" validation.
7. **JSON today, Postgres tomorrow, same pipeline both times.** Since `DATA_SOURCE=db` vs `json` is already a planned feature flag, the ETL should write to whichever sink is active without the detection/validation/approval stages knowing or caring.

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         OFFICIAL SOURCES (external)                       │
│   Stats SA (QLFS, CPI, GDP, MYPE, GHS, Census)   SARB (Web API)           │
│   SAPS (crime stats page)   DBE (NSC results)    World Bank (where valid) │
└───────────────┬────────────────────────────────────────────────────────┬─┘
                │ polling / API calls                                     │
                ▼                                                         ▼
┌──────────────────────────────┐                         ┌──────────────────────────────┐
│  1. RELEASE DETECTION LAYER   │                         │   MANUAL-REVIEW REGISTRY      │
│  (scheduled, per-source)      │                         │  (crime, education, static    │
│  - API poll (SARB)            │                         │   erratum watch)               │
│  - page/ETag watch (SAPS, DBE,│                         │  → opens a review ticket,      │
│    Stats SA release hub)      │                         │    no auto-download attempt    │
│  - calendar-based pre-check   │                         └───────────────┬────────────────┘
│    (QLFS, GDP, CPI, MYPE)     │                                         │
└───────────────┬────────────────                                         │
                │ "new release likely available"                          │
                ▼                                                         │
┌──────────────────────────────┐                                         │
│  2. FETCH LAYER               │                                         │
│  - source-specific downloader │                                         │
│  - retry w/ backoff            │                                         │
│  - checksum + raw archive      │                                         │
└───────────────┬────────────────                                         │
                ▼                                                         │
┌──────────────────────────────┐                                         │
│  3. TRANSFORM LAYER            │                                         │
│  - source-specific parser      │                                         │
│    (Excel cell-range / API     │                                         │
│    JSON / API→field map)       │                                         │
│  - dataset-specific mapper     │                                         │
│    → existing JSON schema      │                                         │
└───────────────┬────────────────                                         │
                ▼                                                         │
┌──────────────────────────────┐                                         │
│  4. VALIDATION LAYER (generic) │                                         │
│  - schema validation            │                                         │
│  - business rules (prime=repo  │                                         │
│    +3.5, monotonic dates, etc.)│                                         │
│  - protected-field diff check  │                                         │
│    (IDs, URLs, codes unchanged)│                                         │
└───────────────┬────────────────                                         │
                ▼                                                         │
┌──────────────────────────────┐                                         │
│  5. DIFF & ANOMALY ENGINE      │◄────────── previous release (versioned) │
│  - compare vs last-approved     │                                         │
│  - statistical anomaly flags    │                                         │
│    (jump thresholds, sign       │                                         │
│    reversals, source mismatch)  │                                         │
│  - generates human-readable      │                                         │
│    update summary                 │                                         │
└───────────────┬────────────────                                         │
                ▼                                                         │
┌──────────────────────────────┐                                         │
│  6. STAGING (Postgres schema   │                                         │
│     `staging.*`, mirrors         │                                         │
│     production tables)           │                                         │
└───────────────┬────────────────                                         │
                ▼                                                         │
┌──────────────────────────────────────────────────────────────────────────┐
│              7. HUMAN REVIEW & APPROVAL (GitHub PR-based)                 │
│   Auto-opened PR: raw file + diff view + anomaly flags + summary          │
│   Reviewer: approve / edit / reject                                       │
└───────────────┬────────────────────────────────────────────────────────┬─┘
                │ approved                                                 │ rejected
                ▼                                                          ▼
┌──────────────────────────────┐                          ┌──────────────────────────────┐
│  8. PROMOTE (staging→prod)     │                          │  Logged, staging cleared,      │
│  - Postgres write               │                          │  release detector re-armed      │
│  - regen statistic_snapshots    │                          └──────────────────────────────┘
│  - regen affected stories        │
│  - regen JSON export (fallback)   │
└───────────────┬────────────────
                ▼
┌──────────────────────────────┐
│  9. EQUIVALENCE TESTS           │
│  - DB vs JSON output parity      │
│  - snapshot vs raw observation    │
│  - story callouts still resolve   │
└───────────────┬────────────────
                ▼
┌──────────────────────────────┐
│  10. DEPLOYMENT REPORT          │
│  - generated markdown artifact   │
│  - attached to PR / release       │
│  - feeds update-history.ts        │
└───────────────┬────────────────
                ▼
        Vercel deploy on merge to main (existing, unchanged)
```

Everything left of step 7 can run unattended on a schedule. Nothing crosses step 7 without a human clicking "approve." This is true even for the SARB repo rate, which is the closest thing to a fully-automatable dataset in the portfolio — the sourcing plan is explicit that it should still be gated given its visibility.

---

## 2. Folder Structure

The goal is that adding dataset #14 next year means adding files, not touching shared code. Three tiers — generic / source-specific / dataset-specific — map directly onto folders.

```
etl/
├── core/                          # GENERIC — never dataset- or source-aware
│   ├── detection/
│   │   ├── scheduler.ts           # cron-style trigger, calendar windows
│   │   ├── poller.ts              # generic HTTP ETag/hash watcher
│   │   └── types.ts
│   ├── fetch/
│   │   ├── downloader.ts          # retry/backoff, checksum, raw archive
│   │   └── rate_limiter.ts
│   ├── validate/
│   │   ├── schema_validator.ts    # JSON-shape validation (generic)
│   │   ├── protected_fields.ts    # IDs/URLs/codes never silently change
│   │   └── rule_engine.ts         # runs dataset-supplied business rules
│   ├── diff/
│   │   ├── differ.ts              # generic value-level diff
│   │   ├── anomaly_detector.ts    # threshold/sign-reversal/z-score checks
│   │   └── summary_generator.ts   # turns a diff into human prose
│   ├── staging/
│   │   └── stage_writer.ts        # writes to staging.* tables
│   ├── promote/
│   │   ├── promoter.ts            # staging → production, transactional
│   │   ├── snapshot_regen.ts      # statistic_snapshots refresh
│   │   ├── story_regen.ts         # re-evaluates story callouts
│   │   └── json_export.ts         # regenerates src/data/datasets/*.json
│   ├── equivalence/
│   │   └── equivalence_tests.ts   # DB vs JSON parity, generic runner
│   └── report/
│       └── deployment_report.ts   # generic report template renderer
│
├── sources/                       # SOURCE-SPECIFIC — one org, many datasets
│   ├── statssa/
│   │   ├── release_calendar.ts    # known QLFS/GDP/CPI/MYPE/GHS windows
│   │   ├── excel_fetcher.ts       # locates + downloads the release Excel
│   │   ├── excel_parser.ts        # shared cell-range parsing helpers
│   │   └── auth.ts                # (none currently needed; placeholder)
│   ├── sarb/
│   │   ├── api_client.ts          # SarbWebApi wrapper
│   │   └── series_map.ts          # KBP series code → internal field map
│   ├── saps/
│   │   └── page_watcher.ts        # weekly "new PDF appeared" check only
│   ├── dbe/
│   │   └── release_watcher.ts     # mid-January NSC announcement watch
│   └── worldbank/
│       └── api_client.ts          # kept for datasets that legitimately use it
│
├── datasets/                      # DATASET-SPECIFIC — one file per dataset
│   ├── qlfs_family/                # unemployment + youth-unemployment + labour-force
│   │   ├── extractor.ts            # ONE extractor, THREE outputs
│   │   ├── mapper_unemployment.ts
│   │   ├── mapper_youth_unemployment.ts
│   │   ├── mapper_labour_force.ts
│   │   └── rules.ts                # e.g. rate must be within QLFS plausible band
│   ├── gdp/
│   │   ├── extractor.ts            # handles revisions to prior quarters, not append-only
│   │   └── rules.ts
│   ├── inflation/
│   │   ├── cpi_extractor.ts        # Stats SA half
│   │   ├── repo_rate_ref.ts        # references interest-rates canonical value, no duplicate fetch
│   │   └── rules.ts
│   ├── interest_rates/
│   │   ├── extractor.ts            # SARB API, canonical repo/prime home
│   │   └── rules.ts                # prime = repo + 3.5
│   ├── population/
│   │   ├── extractor.ts            # MUST target Stats SA P0302, not World Bank
│   │   ├── source_guard.ts         # hard-fails if source host != statssa.gov.za
│   │   └── rules.ts                # e.g. year-over-year delta plausibility band
│   ├── housing/
│   │   ├── census_baseline.ts      # static component, no scheduled run
│   │   ├── ghs_refresh.ts          # annual GHS component only
│   │   └── rules.ts
│   ├── education/
│   │   ├── review_reminder.ts      # opens a review ticket mid-January
│   │   └── manual_entry_template.ts
│   ├── crime/
│   │   ├── review_reminder.ts      # weekly SAPS page poll → ticket only
│   │   └── manual_entry_template.ts
│   ├── provinces/
│   │   └── merge_job.ts            # downstream reshape over already-fresh sources
│   ├── census/
│   │   └── erratum_watch.ts        # low-frequency page-change check only
│   └── municipalities/
│       └── erratum_watch.ts        # same pattern as census
│
├── pipelines/                      # WIRING — declarative, ties source+dataset+schedule
│   ├── qlfs.pipeline.yaml
│   ├── gdp.pipeline.yaml
│   ├── inflation.pipeline.yaml
│   ├── interest_rates.pipeline.yaml
│   ├── population.pipeline.yaml
│   ├── housing.pipeline.yaml
│   ├── education.pipeline.yaml
│   ├── crime.pipeline.yaml
│   ├── provinces.pipeline.yaml
│   ├── census.pipeline.yaml
│   └── municipalities.pipeline.yaml
│
├── db/
│   ├── staging_schema.sql          # staging.* mirrors of production tables
│   └── migrations/                 # existing convention, unchanged
│
└── reports/
    └── archive/                    # generated deployment reports, one per run
```

**Adding dataset #14** in this structure means: one new folder under `datasets/`, one new `.pipeline.yaml`, and — only if it's from a genuinely new organisation — one new folder under `sources/`. Nothing under `core/` should ever need to change for a new dataset.

---

## 3. Generic vs Source-Specific vs Dataset-Specific — Recommendation

| Layer | Tier | Reasoning |
|---|---|---|
| Scheduler, retry/backoff, checksum archive | **Generic** | Identical mechanics regardless of what's being fetched |
| Schema validation, protected-field guard | **Generic** | The rule "don't silently change a statistic ID" applies to all 13 datasets equally |
| Diff engine, anomaly thresholds (structure) | **Generic** | The *mechanism* is generic; the *thresholds* are dataset-specific (see below) |
| Staging writer, promoter, snapshot/story regen | **Generic** | Postgres schema is fact/dimension — one promotion path serves every dataset |
| Equivalence test runner | **Generic** | DB-vs-JSON parity check is the same shape for every dataset |
| Excel locating/parsing helpers for Stats SA | **Source-specific** | URL pattern, file layout, and release-hub structure are Stats SA idioms shared across QLFS/GDP/CPI/MYPE/GHS |
| SARB API client, KBP series mapping | **Source-specific** | Auth, endpoint shape, series codes are SARB-only concepts |
| SAPS/DBE "watch for a new document" pollers | **Source-specific** | Both are effectively "no structured source," so the source-specific code here is deliberately thin — a watcher, not a parser |
| Cell ranges → field mapping for one dataset | **Dataset-specific** | `unemployment` and `gdp` both come from Stats SA Excel, but the cell layout differs per release |
| Business/plausibility rules (e.g. `prime = repo + 3.5`, population YoY bounds) | **Dataset-specific** | Only the dataset owner knows what a "suspicious" jump looks like for that indicator |
| Manual-review cadence and templates (crime, education) | **Dataset-specific** | The reminder timing and transcription template are unique to each dataset's publication rhythm |

**Rule of thumb used throughout:** if two datasets sharing an organisation would need to duplicate the code to add a third, it belongs one tier up. This is exactly the QLFS lesson from the sourcing plan generalised.

---

## 4. Per-Source Design

### 4.1 Stats SA (QLFS, CPI, GDP, MYPE, GHS, Census)

| Aspect | Design |
|---|---|
| **Release detection** | Two combined signals: (a) a **calendar pre-check** — each dataset's known release window (e.g. QLFS ~6 weeks after quarter-end, GDP ~65–70 days after quarter-end, MYPE late July) arms the poller a few days early; (b) an **ETag/content-hash watch** on the relevant `?page_id=1854&PPN=P0XXX` release hub, checked daily inside the calendar window and weekly outside it, to avoid hammering the site year-round. |
| **Download strategy** | Locate the Excel data table linked from the release hub (URL pattern is predictable per release series per the sourcing plan), download to a raw archive folder keyed by dataset + release date, verify file isn't a repeat of the last-known checksum before parsing. |
| **Retry strategy** | Exponential backoff (e.g. 1m → 5m → 30m → 2h), capped at a source-level daily attempt limit; on the release day itself, Stats SA's site is known to be under heavy load, so retries should tolerate 5xx and timeouts specifically, not just network errors. |
| **Validation strategy** | Schema validation on parsed cell ranges (expected columns/units present), plus dataset-specific plausibility rules (e.g. unemployment rate 0–100%, quarter-over-quarter jump above a defined threshold triggers an anomaly flag rather than a hard fail). |
| **Version tracking** | Every successful parse is written to `dataset_versions` with source URL, checksum, and parse-schema version, whether or not it's later approved. |
| **Rollback strategy** | Promotion is transactional per dataset: if any later stage (snapshot regen, equivalence test) fails, the whole promotion for that release is rolled back in one transaction and the previous approved version remains live. Rollback is also available on-demand — re-promote any prior `dataset_versions` row. |
| **Logging** | Structured log per pipeline run: detection trigger, fetch duration/attempts, validation result, diff summary, approval outcome, promotion result — all linked by a single run ID, written to `update_events`. |
| **Failure recovery** | If detection or fetch fails silently for longer than one full release cycle for that dataset, escalate to a manual-review ticket automatically (this is the safety net for GDP revisions and Stats SA site changes breaking the URL pattern). |

**GDP-specific note:** Stats SA revises prior quarters' figures, not just appends new ones. The GDP extractor must overwrite historical points identified by period, not blind-append — this is called out explicitly because it's the one Stats SA dataset in this portfolio where "new row only" logic would silently leave stale revised figures in place.

**Population-specific note:** the extractor includes a **source guard** that hard-fails (does not silently fall through to a cached/alternate source) if the resolved data doesn't originate from `statssa.gov.za`'s P0302 release — this is the direct fix for the MYPE-vs-World-Bank bug identified in the sourcing plan.

### 4.2 SARB

| Aspect | Design |
|---|---|
| **Release detection** | Primary: poll the SARB Web API's rate-decision endpoint on a schedule aligned to the published MPC meeting calendar (6×/year, dates known in advance — e.g. next meeting 23 July 2026). Secondary: a lightweight daily check outside the schedule as a safety net for out-of-cycle emergency decisions. |
| **Download strategy** | Direct API call, no file parsing — this is the one dataset in the portfolio with a true machine-readable source. |
| **Retry strategy** | Short backoff (API is expected to be reliable); a handful of retries over minutes is sufficient. |
| **Validation strategy** | The existing business rule (`prime = repo + 3.5`) runs automatically; any deviation is a hard anomaly flag, not a silent pass. |
| **Version tracking** | Each MPC decision is one immutable version row — SARB never revises a past decision, so this is the simplest version history in the system. |
| **Rollback strategy** | Effectively never needed (no historical revisions expected), but the same generic promote/rollback path applies for consistency and in case of maintainer transcription error. |
| **Logging** | Same structured event log as other sources; volume is low (6–8 events/year) so this feed can also power a simple uptime/last-checked dashboard. |
| **Failure recovery** | If the API is unreachable across a known meeting date, auto-escalate to a manual-review ticket immediately (this is the market-sensitive number the sourcing plan flags as needing a human check regardless). |

**Also handles:** the `repo-rate`/`repo-rate-sarb` de-duplication. Under this design, `interest-rates.json` becomes the single canonical write target for SARB data; `inflation.json`'s repo-rate field becomes a reference/lookup at export time rather than an independently-fetched duplicate.

### 4.3 SAPS

| Aspect | Design |
|---|---|
| **Release detection** | Weekly content-hash check of the SAPS crime-stats page. Given the confirmed unreliable calendar, this is deliberately **not** calendar-gated — polling runs year-round at low frequency. |
| **Download strategy** | None automated. On detecting a change, the watcher downloads the new PDF into the raw archive for the reviewer to open, but does **not** attempt table extraction, per the sourcing plan's explicit recommendation against trusting PDF-layout parsing here. |
| **Retry strategy** | Simple retry on the page fetch itself; no download/parse retries since there's no automated parse step. |
| **Validation strategy** | N/A for automated validation. A manual-entry template enforces the *shape* of what the human transcribes (murder count, contact crime, aggravated robbery, plus period label) so at least structural validation still applies to the human-entered values. |
| **Version tracking** | Each manually-approved entry is still versioned identically to automated datasets — the human-in-the-loop path feeds the same `dataset_versions`/`observations` tables, just with a different upstream stage. |
| **Rollback strategy** | Identical generic rollback path. |
| **Logging** | Logs "checked, no change" weekly (cheap proof of liveness) and "change detected, ticket opened" events. |
| **Failure recovery** | If the page structure itself changes (breaking the hash-watch), a missed-check alert fires after two consecutive failed checks. |

**Design intent:** revisit full automation only if the reported SAPS–Stats SA MoU moves crime publication onto Stats SA's structured Excel process, per the sourcing plan — the pipeline wiring (`crime.pipeline.yaml`) is intentionally left easy to re-point at a `statssa` source module later without restructuring anything else.

### 4.4 DBE (Department of Basic Education)

| Aspect | Design |
|---|---|
| **Release detection** | Scheduled reminder window: second/third week of January each year, matching the historical announcement pattern, plus a lightweight page watch as backup since the sourcing plan notes the publication *mechanism* itself is not guaranteed stable (POPIA/Information Regulator dispute affecting the 2025 cycle). |
| **Download strategy** | None automated for the headline figure (press-announcement only). The later-arriving National Diagnostic Report PDF is archived when found, for reference, but not auto-parsed. |
| **Retry strategy** | N/A beyond the page watch. |
| **Validation strategy** | Manual-entry template requires citing the DBE's own release (not secondary media), consistent with the sourcing plan's citation-consistency concern. |
| **Version tracking / rollback / logging** | Same generic paths as SAPS. |
| **Failure recovery** | If no announcement is detected by end of January, escalate to a maintainer reminder rather than assuming "no change." |

**Also handles:** the sourcing plan's flag that `higher-education-enrolment`'s source organisation (likely DHET) is undocumented. This is a one-time data-provenance fix (`_meta`/`data_sources` entry) tracked as a task against this pipeline, not an automation problem.

### 4.5 World Bank

| Aspect | Design |
|---|---|
| **Release detection** | Only used where a dataset is *legitimately* World-Bank-sourced (confirmed against `data_sources`, not assumed). The `population.json` mistake — silently using World Bank as a stand-in for Stats SA MYPE — is the specific failure mode this source module must never enable again. |
| **Download / retry / validation / version tracking / rollback / logging / failure recovery** | Same generic API-client pattern as SARB, since World Bank also has a genuine REST API. Every World-Bank-fed dataset is audited (per the sourcing plan's "audit every `auto`-labelled dataset" recommendation) before being wired into a pipeline, to confirm the source is actually appropriate for that indicator. |

---

## 5. Complete Update Workflow (Automated Path)

1. **Trigger.** Scheduler wakes the pipeline for a dataset, either on a calendar window (Stats SA family, SARB) or a routine poll interval (static erratum watches).
2. **Detect.** Source-specific detector checks for a genuinely new release (content hash / API version / API decision date changed). No new release → log "checked, no change," exit.
3. **Fetch.** Source-specific downloader retrieves the raw file/response, with retry/backoff, into a timestamped raw archive. Checksum recorded.
4. **Transform.** Dataset-specific mapper converts the raw source into the existing JSON schema shape (same field names, same `_meta` block conventions) — never the reverse; the schema is the fixed target, not something the transform is allowed to reshape.
5. **Generic validation.** Schema validator confirms shape; protected-field guard confirms statistic IDs, registry IDs, URL-relevant slugs, and municipality codes are unchanged; dataset-specific rule engine runs plausibility checks (rate bounds, `prime = repo + 3.5`, YoY population bounds, etc.).
   - Hard failure (schema broken, protected field changed, rule violated beyond tolerance) → pipeline halts, ticket opened, nothing reaches staging.
6. **Diff against last-approved version.** Value-by-value comparison; anomaly detector flags large jumps, sign reversals, or a source mismatch pattern (the exact shape of the population bug — new value moving in an implausible direction relative to trend).
7. **Generate update summary.** Plain-language description: what changed, by how much, since when, any anomaly flags, and which downstream stories/snapshots will be affected.
8. **Write to staging.** Postgres `staging.*` tables, mirroring production shape — this is also where the JSON-fallback preview is generated for review, so a reviewer sees exactly what would ship either way.
9. **Open a PR (or review ticket).** Automated PR contains: the update summary, a rendered diff, anomaly flags (if any), and links to the raw archived source file for manual spot-checking.
10. **Wait for human approval.** No further action happens until a maintainer approves, edits, or rejects (Section 6).
11. **Promote.** On approval: staging → production write (transactional), `statistic_snapshots` regenerated for affected statistics, dependent `stories`/`story_sections` re-evaluated (via `relatedStatIds`), JSON export regenerated for the fallback path.
12. **Equivalence tests.** DB output vs regenerated JSON compared field-for-field; story callouts confirmed to still resolve; failure here **automatically rolls back** the promotion.
13. **Deployment report.** Markdown artifact generated (Section 5.1 below) and attached to the PR; `update-history.ts` entry appended.
14. **Merge → deploy.** Standard existing Vercel-on-push-to-main flow, unchanged.

### 5.1 Deployment Report Contents

- Dataset(s) affected and their new period/version
- Summary of what changed (from step 7)
- Validation results (pass/fail per rule)
- Anomaly flags and reviewer's resolution notes
- Snapshots and stories regenerated
- Equivalence test results
- Link to raw source archive and checksum, for future audit

---

## 6. Human Review Workflow

Two distinct tracks, matching the sourcing plan's split between automatable and non-automatable datasets.

### 6.1 Track A — Review of an Automated Extraction (QLFS family, GDP, CPI, SARB, MYPE, GHS component of housing)

1. PR auto-opens with the summary/diff/anomaly package described above.
2. Reviewer checks three things, in order:
   - **Does the diff match the official release?** (Spot-check against the archived source file/screenshot.)
   - **Are protected fields untouched?** (Automated, but re-confirmed visually for anything flagged.)
   - **Do the anomaly flags have a legitimate explanation?** (e.g. a real 1.3pp unemployment jump is fine; a population figure moving the wrong direction is not.)
3. Reviewer action:
   - **Approve as-is** → promotion proceeds.
   - **Edit inline** (e.g. correct a mis-mapped cell) → edited value re-validated automatically before promotion is allowed.
   - **Reject** → staging cleared, detector re-armed, reason logged (feeds back into rule-tuning if it was a false anomaly, or into extractor fixes if it was a parsing bug).
4. No SLA pressure by design — a rejected or pending PR simply leaves the *previous* approved data live. Nothing is ever blocked from serving traffic by a stuck review.

### 6.2 Track B — Scheduled Manual-Review Datasets (crime, education, and the periodic erratum watches on census/municipalities)

1. Watcher detects a change or the calendar reminder fires (mid-January for education, weekly-triggered-only-on-change for crime, low-frequency for census/municipalities erratums).
2. A review ticket opens (same PR-based mechanism, but with **no pre-filled diff** — just the source link and a manual-entry template).
3. Maintainer manually transcribes the small number of headline figures required, citing the primary source per the template.
4. The manually-entered values still pass through **generic validation** (schema, protected fields, plausibility rules) before promotion — the human-in-the-loop path is not exempt from the same guardrails.
5. Same promote → equivalence test → deployment report → deploy path as Track A from that point on.

This keeps exactly one promotion pipeline in the system — Track B differs only in *how the staged data got there*, not in what happens after.

---

## 7. GitHub Actions Integration (Without Auto-Deploying Bad Data)

GitHub Actions is the right home for orchestration because approval-via-PR is a natural fit, but it must never be the thing that pushes straight to `main`.

**What Actions *does* own:**
- Scheduled workflows (cron) that trigger detection for each pipeline on its own cadence — calendar-windowed for Stats SA/SARB, routine-interval for SAPS/erratum watches.
- Running fetch → transform → validate → diff → stage as a single workflow run, writing results to a **feature branch**, never `main`.
- Opening (or updating) a PR from that branch with the summary/diff/report attached as PR description + artifacts.
- Running the equivalence test suite as a required PR check — this can and should block merge automatically, since it's a correctness check, not a data-judgment call.
- Running the promotion step **only** as a post-merge workflow, triggered by the PR being merged (i.e., only after a human clicked approve on the PR itself) — so "merge" *is* the approval action, not a separate button.

**What Actions explicitly does *not* do:**
- Never merges its own PRs.
- Never pushes directly to `main` from a scheduled job.
- Never promotes staging → production without a merged PR as the trigger.
- Never overrides a failed equivalence test to force a deploy.

**Branch protection** on `main` (already implied by "no destructive git" in the existing rules) should require: the equivalence-test check passing, and at least one human review approval, before merge is possible — making the "no auto-deploy of incorrect data" guarantee enforced by GitHub itself, not just by pipeline convention.

---

## 8. Long-Term Maintenance Recommendations

1. **Audit every `auto`-labelled dataset before trusting the label**, exactly as the sourcing plan recommends — the `population.json` case shows a dataset can look automated and verified while quietly being wrong for over a year. Make this a recurring (e.g. quarterly) checklist item, not a one-time fix.
2. **Treat manual-review datasets as first-class, not deferred debt.** `crime.json` and `education.json` will likely never be safe to fully automate given unreliable/PDF-only publication. Budget maintainer time for these permanently rather than periodically re-attempting automation.
3. **Re-audit `provinces.json`'s dependency chain whenever an upstream pipeline changes.** As a merge job, it inherits staleness or bugs from unemployment, education, and population — its own pipeline should re-run automatically whenever any upstream dataset promotes, not on its own independent schedule.
4. **Keep the static-dataset watch cheap and boring.** Census and municipalities erratum checks should never grow into full re-parsing pipelines — if Stats SA revises a figure, that's a manual-review event (Track B), not a trigger for building automation around a once-a-decade dataset.
5. **Review anomaly-detection thresholds annually.** Thresholds tuned against 2026 volatility (e.g. the current inflation/repo-rate hiking cycle) may be too sensitive or too lax in calmer years — revisit rather than treating them as permanent.
6. **Keep `ai-context.md` and `dataset-analysis.md` in sync with reality**, per the sourcing plan's own note that both docs currently under-describe the SARB API. Add "update docs" as an explicit step whenever a dataset moves automation tiers (e.g. manual → hybrid → full-auto).
7. **Preserve the one-release-one-job principle for future consolidations.** If Stats SA or SAPS ever merge publications (as hinted by the SAPS–Stats SA MoU), collapse the corresponding extractors the same way the QLFS family was collapsed — don't let three near-duplicate pipelines regrow.
8. **Revisit the `DATA_SOURCE=db` cutover only after this pipeline has a full cycle of real-world runs behind it** for the "Easy" and "Moderate" datasets — the equivalence-test history from those runs is the evidence base for trusting the flip to production database reads.
9. **Version everything, even manual entries.** Because Track B writes through the same `dataset_versions`/staging path, the system should never lose the ability to answer "what did this figure say on date X and who approved it" — this is as much an accountability tool for a solo maintainer as it is an engineering safeguard.
