# SA Data Hub — Automation Framework: Current State

**Snapshot date:** 2026-07-16
**Status:** Automation Framework Hardening Sprint — **Complete**
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
| `StatsSAAdapter` | Live QLFS release-hub detection (ETag/hash), with an explicit WAF-challenge guard (see §5). GDP/CPI/population/housing/census/municipalities remain detection stubs. | Discovers, downloads, and archives the raw QLFS publication file only. Does not parse, transform, or write any dataset JSON. This is the entry point for Stats SA Phase 2 (see the accompanying implementation spec). |
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
17 tests, all passing, zero collection errors:
- `core/tests/test_metadata.py` — `check_protected_fields()` (no-violation, top-level, nested, list-of-dicts, absent-field cases).
- `core/tests/test_files.py` — `atomic_write()` success and failure-path cleanup.
- `core/tests/test_pipeline_integration.py` — end-to-end staging → approve → promote cycle, including both the happy path and the negative cases (promotion refused pre-approval; promotion refused after rejection; unknown version raises).
- `adapters/tests/test_sarb.py` — `_validate_prime_spread()` (exact match / within tolerance / violation) and `_transform_interest_rates()` (first-ever update, in-place revision, append new point).

---

## 2. Completed Milestones

- **Detection layer** (prior milestone): live, source-specific change detection for SARB and the Stats SA QLFS family, with honest stubs elsewhere. Matches `SA-Data-Hub-Automation-Architecture.md` §4.
- **Automation Framework Hardening Sprint** (this milestone): closes every finding from the 2026-07-12 engineering review —
  - The SARB write path no longer bypasses the approval gate; it is now staged, not applied directly to production.
  - The staging → approval → promote pipeline exists as generic, dataset-agnostic core infrastructure, is wired into the CLI, and is proven by an automated end-to-end test rather than asserted in comments.
  - The SARB effective-date discrepancy is root-caused and fixed (API refresh timestamp vs. MPC decision date), with a maintained decision calendar used for validation.
  - Regression tests exist for every function in scope that mutates or diffs production-shaped data, and the full suite passes.
  - A dependency manifest (`automation/requirements.txt`) ships with the package.
  - The committed local-filesystem-path leak in the version store is removed, and future archive-path entries are generated portably.
  - The Stats SA QLFS WAF-hash reliability question is mitigated in code (explicit WAF detection instead of trusting an unverified hash) and honestly documented as empirically open pending real network access (see §5).

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

**Ready, for a single adapter, under human operation, within its current scope.**

- The package imports and runs cleanly (`python -m automation.runner --list/--describe/--apply/--approve/--promote` all execute without error).
- The regression suite passes in full (17/17) and includes a proof — not just an assertion — that a version cannot reach production without going through approval.
- SARB is the only adapter with a functioning write path; it is gated end-to-end.

**Not ready** for:
- Unattended/scheduled operation without a human running `--approve`/`--promote` — this is by design, not a gap; the architecture requires a human in this loop for every dataset, including SARB.
- Any adapter other than SARB reaching production data — no other adapter currently writes anything beyond raw-file archiving.
- CI/CD integration — there is no GitHub Actions workflow yet; the approval gate today is a local CLI sequence, not a PR-based one.

---

## 5. Known Limitations

- **Stats SA QLFS WAF-hash determinism is mitigated, not empirically resolved.** The adapter no longer trusts a hash of a potential WAF challenge page as a change signal — it explicitly detects the WAF challenge and raises rather than guesses. But no session to date has had network access to `statssa.gov.za` to observe the challenge page's actual behavior across multiple requests/dates, so the original open question (is it deterministic?) remains unanswered in the strict empirical sense. See `automation/adapters/statss.py::_fetch_release_hub_html()` and `automation/docs/developer-guide.md`.
- **`StatsSAAdapter.fetch_and_apply()`'s docstring is stale relative to the CLI.** It states the method is "NOT reachable via runner.py" — this was accurate before the staging/approve/promote pipeline existed, but `runner.py --apply` now invokes `fetch_and_apply()` on any adapter that defines it, including `StatsSAAdapter`. This is not a functional defect (the method still only archives a raw file; it does not write any dataset JSON), but the docstring should be corrected for accuracy in the same way `SARBAdapter`'s was during this sprint. Flagged here rather than fixed, since it falls outside this sprint's scope.
- **`core/promote.py::get_production_dataset_path()`** derives the project root via four hardcoded `.parent` hops from its own file location, with no sanity check that the resolved path is actually the project root. Low risk today (the module hasn't moved), but brittle if the package is ever relocated.
- **`runner.py --apply` has no per-adapter allowlist.** It invokes `fetch_and_apply()` on any adapter that defines the method. Both current implementations (SARB, Stats SA) behave safely (stage-only / archive-only), but the CLI itself does not enforce that contract on a future adapter.
- **No GitHub Actions / CI integration.** Detection, staging, and promotion are all manually triggered from a local shell today.
- **No equivalence testing or `statistic_snapshots`/story regeneration.** The architecture document's steps 9–10 (equivalence tests, deployment report as a durable artifact) are not implemented; `core/report.py` produces a per-run Markdown/JSON report but does not compare DB output to JSON output (there is no DB write path yet at all).
- **Only SARB has a working write path.** Stats SA QLFS parsing/transform, and any write path for GDP/CPI/population/housing, do not exist yet — this is the explicit subject of the next milestone.

---

## 6. Remaining Work

In rough priority order, all outside the scope of the completed sprint:

1. **Stats SA QLFS Phase 2** — parse the archived QLFS Excel release and produce the `unemployment` / `youth-unemployment` / `labour-force` outputs from a single extractor, wired through the existing staging/approve/promote pipeline. (See `IMPLEMENTATION-SPEC-STATSSA-PHASE2.md`.)
2. GDP and CPI write paths, following the same pattern once QLFS is proven.
3. SARB API repo-rate reference from `inflation.json` (retire the duplicate `repo-rate` stat), per the sourcing plan.
4. GitHub Actions PR-based approval flow, replacing the local CLI gate with the architecture document's §7 design, once at least one adapter's write path (SARB, then QLFS) has run through a full real-world cycle.
5. Equivalence tests (DB vs. JSON) — blocked on the PostgreSQL write path existing at all.
6. The two documentation/robustness items noted in §5 (stale Stats SA docstring, `--apply` allowlist) — small, non-blocking cleanup, appropriate to fold into the start of the next sprint rather than opening a dedicated one.

---

## 7. Immediate Next Milestone

**Stats SA QLFS Phase 2: Excel parsing and the `unemployment` / `youth-unemployment` / `labour-force` write path.**

This is the highest-priority next step because: (a) it is the single largest structural consolidation identified in the sourcing plan ("one release, one job"), (b) it exercises the staging/approve/promote pipeline just built against a second, materially different adapter (Excel-parsing vs. a JSON API), which is the right next proof point before investing in CI/CD, and (c) `StatsSAAdapter.fetch_and_apply()` already stops at exactly the right boundary (raw file archived, nothing parsed) for this work to build on without any changes to the framework itself.

Full scope, files, parsing/validation strategy, and acceptance criteria are specified in `IMPLEMENTATION-SPEC-STATSSA-PHASE2.md`.
