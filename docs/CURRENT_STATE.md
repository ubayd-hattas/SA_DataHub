# SA Data Hub — Automation Framework: Current State

**Snapshot date:** 2026-07-18
**Status:** Automation Framework Hardening Sprint — **Complete**; Stats SA QLFS Phase 2 (parse/transform/stage) — **Complete** (closeout tasks in `IMPLEMENTATION-SPEC-STATSSA-PHASE2-CLOSEOUT.md` finished 2026-07-18)
**Scope of this document:** `automation/` package only. For the wider SA Data Hub platform (Next.js app, PostgreSQL migration, ETL, API), see `ai-context.md` and the rest of `/docs`.

This document describes the framework **as it exists today**, verified by direct execution (`python -m automation.runner`, `pytest`), not by summary. It supersedes any characterization of the automation framework in earlier planning documents. It does not narrate how the project got here — see `CHANGELOG.md` for that.

---

## 1. Completed Systems

### 1.1 Generic Core (`automation/core/`)
Dataset-agnostic infrastructure shared by every adapter:

| Module | Responsibility |
|---|---|
| `config.py` | Loads `automation/config/*.yaml` (or JSON fallback if PyYAML is unavailable), producing `AutomationConfig` / `SourceConfig` / `DatasetConfig`. |
| `http_client.py`, `retry.py` | HTTP client with configurable retry/backoff policies per source. |
| `files.py` | Atomic file writes (`atomic_write_text`), archive helpers (`save_to_archive`), portable archive-path generation (`portable_archive_path`). |
| `metadata.py` | `check_protected_fields()` — recursive diff that flags any change to a protected field (IDs, slugs, codes) between a previous and proposed document. |
| `logging.py` | Structured logger factory used by the runner and all adapters. |
| `report.py` | Renders a Markdown/JSON execution report per run to `automation/reports/archive/<date>/run_<run_id>.md`. |
| `version.py` | Version-entry data model and JSON-backed store: `new_version_entry()`, `save_version_entry()`, `load_version_history()`, `pending_versions()`, `latest_approved_version()`, `approve_version()`, `reject_version()`. |
| `staging.py` | File-based staging area: `write_staged_dataset()`, `read_staged_dataset()`. Interim implementation of the architecture document's `staging.*` concept, pending the PostgreSQL migration. |
| `promote.py` | The **sole** permitted path for writing to `src/data/datasets/*.json`. `promote_version()` refuses to write unless the corresponding version entry's status is `"approved"`. |

### 1.2 Adapter Layer (`automation/adapters/`)
Template-method pattern via `BaseAdapter` (`validate_config()`, `datasets()`, `check_for_updates()`, `describe()`, `run()`).

| Adapter | Detection (`check_for_updates`) | Write path (`fetch_and_apply`) |
|---|---|---|
| `SARBAdapter` | Live API poll (SARB WebIndicators), business-rule validation (`prime = repo + spread`), effective-date inference from a maintained MPC meeting calendar (not the API's refresh timestamp). | Implemented and gated: fetches, validates, diffs, transforms, then **writes to the staging area** and records a `pending` version entry. Does not touch `interest-rates.json` directly. |
| `StatsSAAdapter` | Live QLFS release-hub detection (ETag/hash), with an explicit WAF-challenge guard (see §5). GDP/CPI/population/housing/census/municipalities remain detection stubs. | Implemented and gated, for the QLFS family only: discovers, downloads, and archives the raw QLFS workbook, then parses it (`parse_qlfs_workbook()`), transforms it into `unemployment.json` / `youth-unemployment.json` / `labour-force.json` via `_transform_unemployment()` / `_transform_youth_unemployment()` / `_transform_labour_force()`, validates each candidate (rate bounds, quarterly-label format, `check_protected_fields()`, a quarter-over-quarter anomaly flag), and **writes to the staging area**, recording one `pending` version entry per changed dataset (up to three). Does not touch `unemployment.json` / `youth-unemployment.json` / `labour-force.json` directly. GDP/CPI/population/housing/census/municipalities remain download/archive-only or detection stubs. |
| `SAPSAdapter` | Honest stub — no live check implemented. | Not implemented. |
| `WorldBankAdapter` | Honest stub — no live check implemented. | Not implemented. |

### 1.3 CLI (`automation/runner.py`)
```
python -m automation.runner                       # run all adapters, detection only
python -m automation.runner --adapter sarb         # run one adapter
python -m automation.runner --list                 # list registered adapters
python -m automation.runner --describe sarb        # adapter self-description
python -m automation.runner --dry-run              # no version entries / no writes
python -m automation.runner --apply                # invoke fetch_and_apply() where defined
python -m automation.runner --approve <ds> <ver>    # pending → approved
python -m automation.runner --reject <ds> <ver>     # pending → rejected
python -m automation.runner --promote <ds> <ver>    # approved → written to production JSON
```

### 1.4 Test Suite (`automation/**/tests/`)
38 tests, all passing, zero collection errors:
- `core/tests/test_metadata.py` — `check_protected_fields()` (no-violation, top-level, nested, list-of-dicts, absent-field cases).
- `core/tests/test_files.py` — `atomic_write()` success and failure-path cleanup.
- `core/tests/test_pipeline_integration.py` — end-to-end staging → approve → promote cycle for SARB, including both the happy path and the negative cases (promotion refused pre-approval; promotion refused after rejection; unknown version raises).
- `adapters/tests/test_sarb.py` — `_validate_prime_spread()` (exact match / within tolerance / violation) and `_transform_interest_rates()` (first-ever update, in-place revision, append new point).
- `adapters/tests/test_statss.py` — 21 tests covering the QLFS parser, validation/anomaly helpers, all three transform functions, and `fetch_and_apply()`'s `"ok"` / `"no_change"` / `"error"` paths (network mocked), including `test_qlfs_staged_candidate_requires_approve_then_promote` — the QLFS-specific equivalent of `test_pipeline_integration.py`'s end-to-end proof, using a real version produced by `fetch_and_apply()` rather than a hand-built fixture.

---

## 2. Completed Milestones

- **Detection layer** (prior milestone): live, source-specific change detection for SARB and the Stats SA QLFS family, with honest stubs elsewhere. Matches `SA-Data-Hub-Automation-Architecture.md` §4.
- **Automation Framework Hardening Sprint** (prior milestone): closes every finding from the 2026-07-12 engineering review —
  - The SARB write path no longer bypasses the approval gate; it is now staged, not applied directly to production.
  - The staging → approval → promote pipeline exists as generic, dataset-agnostic core infrastructure, is wired into the CLI, and is proven by an automated end-to-end test rather than asserted in comments.
  - The SARB effective-date discrepancy is root-caused and fixed (API refresh timestamp vs. MPC decision date), with a maintained decision calendar used for validation.
  - Regression tests exist for every function in scope that mutates or diffs production-shaped data, and the full suite passes.
  - A dependency manifest (`automation/requirements.txt`) ships with the package.
  - The committed local-filesystem-path leak in the version store is removed, and future archive-path entries are generated portably.
  - The Stats SA QLFS WAF-hash reliability question is mitigated in code (explicit WAF detection instead of trusting an unverified hash) and honestly documented as empirically open pending real network access (see §5).
- **Stats SA QLFS Phase 2 — parse/transform/stage, plus closeout** (this milestone, dated 2026-07-18): the QLFS family (`unemployment`, `youth-unemployment`, `labour-force`) now has a second working, gated write path alongside SARB, wired through the same staging → approval → promote pipeline. Shipped:
  - `parse_qlfs_workbook()` (header/label matching, fails loudly on a missing indicator, no PDF fallback) and the `_transform_unemployment()` / `_transform_youth_unemployment()` / `_transform_labour_force()` family, following the same deep-copy / rate-bearing-fields-only pattern as SARB's transform.
  - Per-dataset validation (range, quarterly-label format, `check_protected_fields()` reuse, quarter-over-quarter anomaly flag) and per-dataset `"ok"` / `"no_change"` / `"error"` staging behaviour, matching SARB's semantics.
  - A structural schema fix: the duplicate `youth-unemployment` stat ID was removed from `unemployment.json` (`stories.ts` repointed to `youth-unemployment-narrow`), and — as of this closeout — `labour-force-participation` has been relocated from `unemployment.json` into `labour-force.json` as a distinct stat, with the ~18-point disagreement against `labour-force.json`'s existing `lfpr-overall` stat documented in that file's `_meta.notes` as an open, unresolved data-verification item (not decided by this build — see §5).
  - A QLFS-specific end-to-end approve→promote test (`test_qlfs_staged_candidate_requires_approve_then_promote`), closing the acceptance-criterion gap the post-implementation audit found: the staging→approval→promote guarantee is now proven for a real QLFS-produced version, not only for `interest-rates`.
  - A downstream reference sweep for the removed bare `youth-unemployment` statistic ID across the files available to this project (`src/data/`); no further hits found beyond the `stories.ts` references already repointed in the Phase 2 build. `src/lib/registry.ts`, `src/lib/citation.ts`, and `src/lib/insights.ts` were not available to any session to date and remain unswept — see §5.
  - **Still open after this closeout:** `parse_qlfs_workbook()` has never been run against a real, downloaded Stats SA QLFS workbook — only synthetic fixtures. This is the single most significant remaining risk in the QLFS write path and is tracked as its own item, not closed by this milestone (see §5 and §7).

---

## 3. Current Architecture

```
                     ┌─────────────────────────────┐
 official sources →  │   adapters/*.py             │
 (SARB API, Stats SA │   check_for_updates()       │  ← read-only detection,
  release hub, ...)  │   fetch_and_apply()         │    safe to run unattended
                     └──────────────┬──────────────┘
                                    │ (SARB only, today)
                                    ▼
                     ┌─────────────────────────────┐
                     │  core/staging.py             │  ← file-based interim
                     │  write_staged_dataset()       │    staging area
                     └──────────────┬──────────────┘
                                    │
                     ┌──────────────▼──────────────┐
                     │  core/version.py             │  ← pending/approved/
                     │  new_version_entry()          │    rejected state machine
                     │  approve_version() / reject_  │
                     └──────────────┬──────────────┘
                                    │ runner.py --approve
                                    ▼
                     ┌─────────────────────────────┐
                     │  core/promote.py             │  ← the ONLY path that
                     │  promote_version()             │    writes production JSON;
                     │  raises unless approved       │    refuses otherwise
                     └──────────────┬──────────────┘
                                    │ runner.py --promote
                                    ▼
                     src/data/datasets/*.json  (production)
```

This is a direct, verified implementation of the non-negotiable rule in `SA-Data-Hub-Automation-Architecture.md` §0.1 ("nothing auto-deploys to production data") for the one adapter (SARB) that currently has a write path. No adapter can currently write to `src/data/datasets/*.json` except through `promote_version()`, and `promote_version()` enforces the approved state.

**Deliberate deviations from the long-term architecture document, both explicitly authorized as interim measures:**
- Staging is file-based (`automation/reports/staging/`), not the PostgreSQL `staging.*` schema described in the architecture document — acceptable pending the DB migration (`ai-context.md` confirms no production DB reads exist yet).
- Approval is CLI-driven (`--approve`/`--reject`/`--promote`), not the GitHub Actions PR-based flow described in the architecture document §7 — acceptable as an interim manual gate; the PR-based flow remains unbuilt.

---

## 4. Production Readiness

**Ready, for two adapters (SARB and Stats SA QLFS), under human operation, within their current scope.**

- The package imports and runs cleanly (`python -m automation.runner --list/--describe/--apply/--approve/--promote` all execute without error).
- The regression suite passes in full (38/38) and includes a proof — not just an assertion — that a version cannot reach production without going through approval, for both `interest-rates` (SARB) and a real QLFS-produced dataset (`unemployment`).
- SARB and the Stats SA QLFS family (`unemployment`, `youth-unemployment`, `labour-force`) each have a functioning write path; both are gated end-to-end.

**Not ready** for:
- Unattended/scheduled operation without a human running `--approve`/`--promote` — this is by design, not a gap; the architecture requires a human in this loop for every dataset, including SARB and QLFS.
- Any adapter other than SARB or Stats SA QLFS reaching production data — GDP, CPI, population, housing, census, municipalities, crime, and World Bank datasets currently write nothing beyond raw-file archiving or detection stubs.
- CI/CD integration — there is no GitHub Actions workflow yet; the approval gate today is a local CLI sequence, not a PR-based one.
- Unattended QLFS `--apply` runs against a real Stats SA release — `parse_qlfs_workbook()` has not yet been empirically verified against a real workbook (see §5).

---

## 5. Known Limitations

- **Stats SA QLFS WAF-hash determinism is mitigated, not empirically resolved.** The adapter no longer trusts a hash of a potential WAF challenge page as a change signal — it explicitly detects the WAF challenge and raises rather than guesses. But no session to date has had network access to `statssa.gov.za` to observe the challenge page's actual behavior across multiple requests/dates, so the original open question (is it deterministic?) remains unanswered in the strict empirical sense. See `automation/adapters/statss.py::_fetch_release_hub_html()` and `automation/docs/developer-guide.md`.
- **`StatsSAAdapter.fetch_and_apply()`'s docstring is stale relative to the CLI.** It states the method is "NOT reachable via runner.py" — this was accurate before the staging/approve/promote pipeline existed, but `runner.py --apply` now invokes `fetch_and_apply()` on any adapter that defines it, including `StatsSAAdapter`. This is not a functional defect (the method still only archives a raw file; it does not write any dataset JSON), but the docstring should be corrected for accuracy in the same way `SARBAdapter`'s was during this sprint. Flagged here rather than fixed, since it falls outside this sprint's scope.
- **`core/promote.py::get_production_dataset_path()`** derives the project root via four hardcoded `.parent` hops from its own file location, with no sanity check that the resolved path is actually the project root. Low risk today (the module hasn't moved), but brittle if the package is ever relocated.
- **`runner.py --apply` has no per-adapter allowlist.** It invokes `fetch_and_apply()` on any adapter that defines the method. Both current implementations (SARB, Stats SA) behave safely (stage-only / archive-only), but the CLI itself does not enforce that contract on a future adapter.
- **No GitHub Actions / CI integration.** Detection, staging, and promotion are all manually triggered from a local shell today.
- **No equivalence testing or `statistic_snapshots`/story regeneration.** The architecture document's steps 9–10 (equivalence tests, deployment report as a durable artifact) are not implemented; `core/report.py` produces a per-run Markdown/JSON report but does not compare DB output to JSON output (there is no DB write path yet at all).
- **The QLFS Excel layout assumed by `_QLFS_METRIC_SPECS` is mitigated by design, not yet empirically resolved.** `parse_qlfs_workbook()` locates tables by header/label matching rather than fixed cell coordinates, and fails loudly (naming the missing indicator) rather than guessing — but it has only ever been tested against synthetic fixtures built to the documented Stats SA convention; no session to date has had network access to `statssa.gov.za` to obtain a real archived workbook. The first live `--apply` run against a real downloaded workbook is the actual empirical test of this parser. A parse failure on that first real run is expected-possible, not a regression — the correct response is to update `_QLFS_METRIC_SPECS`'s label-matching rules to match the real layout, re-run, and only then treat this item as resolved. See `automation/adapters/statss.py`'s module docstring, `automation/docs/developer-guide.md`, and `CHANGELOG.md`.

---

## 6. Remaining Work

In rough priority order, all outside the scope of the completed sprints:

1. **GDP write path**, following the QLFS pattern now proven twice (SARB, then Stats SA QLFS) — parse the GDP Excel release (P0441) and produce write-gated output through the existing staging/approve/promote pipeline. GDP ETL must overwrite historical points (revisions), not append.
2. **CPI write path** (`inflation.json`), following the same pattern once GDP is proven; also retires the duplicate `repo-rate` stat via the SARB API repo-rate reference, per the sourcing plan.
3. GitHub Actions PR-based approval flow, replacing the local CLI gate with the architecture document's §7 design, once GDP has run through a full real-world cycle in addition to SARB and QLFS.
4. Equivalence tests (DB vs. JSON) — blocked on the PostgreSQL write path existing at all.
5. The documentation/robustness items noted in §5 (`--apply` allowlist, `get_production_dataset_path()`'s hardcoded `.parent` hops) — small, non-blocking cleanup, appropriate to fold into the start of the next sprint rather than opening a dedicated one.
6. Real-workbook empirical verification of `parse_qlfs_workbook()` against a genuine downloaded Stats SA QLFS release, and separately, human verification of the `labour-force-participation` / `lfpr-overall` value discrepancy against the Stats SA QLFS P0211 release tables (see §5) — both open, tracked items, neither blocking GDP.

---

## 7. Immediate Next Milestone

**GDP write path: Excel parsing and the `gdp` dataset, following the Stats SA QLFS pattern.**

This is the highest-priority next step per `SA-Data-Hub-Dataset-Sourcing-Plan.md`'s Automation Priority ordering, now that the staging/approve/promote pipeline has been proven end-to-end for two materially different adapters (SARB's JSON API, and Stats SA QLFS's Excel-parsing path). This document does not begin GDP implementation — it only records GDP as the next milestone.

The first real `--apply` run of the QLFS adapter against a genuine downloaded workbook remains the empirical test of `parse_qlfs_workbook()` (see §5) and should happen before or alongside the start of GDP work, since GDP's Excel parser is expected to follow the same header/label-matching approach and would benefit from whatever real-layout lessons that first QLFS run surfaces. A parse failure on that first real QLFS run is expected-possible, not a regression — the correct response is to update `_QLFS_METRIC_SPECS`'s label-matching rules to match the real layout, re-run, and only then treat the item as resolved.
