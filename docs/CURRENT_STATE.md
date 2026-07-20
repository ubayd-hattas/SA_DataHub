# SA Data Hub — Automation Framework: Current State

**Snapshot date:** 2026-07-20
**Status:** Automation Framework Hardening Sprint — **Complete**; Stats SA QLFS Phase 2 — **Complete**; Stats SA GDP Phase 3a — **Complete**; Stats SA CPI Phase 3b (`cpi-headline`, `food-inflation`) — **Complete** (2026-07-20)
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
| `StatsSAAdapter` | Live QLFS release-hub detection (ETag/hash), with an explicit WAF-challenge guard (see §5). Live GDP (P0441) release-hub detection (`_check_gdp()`, mirroring `_check_qlfs()` exactly). Live CPI (P0141) release-hub detection (`_check_cpi()`, mirroring `_check_qlfs()`/`_check_gdp()` exactly). Population/housing/census/municipalities remain detection stubs. | Implemented and gated, for the QLFS family, `gdp-growth`, AND `cpi-headline`/`food-inflation` (three independent flows within one `fetch_and_apply()` call): QLFS discovers, downloads, and archives the raw QLFS workbook, then parses it (`parse_qlfs_workbook()`), transforms it into `unemployment.json` / `youth-unemployment.json` / `labour-force.json`, validates each candidate (rate bounds, quarterly-label format, `check_protected_fields()`, a quarter-over-quarter anomaly flag), and **writes to the staging area**, recording one `pending` version entry per changed dataset (up to three). GDP discovers, downloads, and archives the raw GDP Excel publication, parses it (`parse_gdp_workbook()`, reading **every** available quarter column — not just the latest — to support Stats SA's routine revisions), transforms it into `gdp.json`'s `gdp-growth` stat only via `_transform_gdp()`/`_apply_gdp_growth_points()` (overwriting revised historical points in place, appending new ones), validates it (a genuinely new plausibility range since GDP growth can be negative, quarterly-label format, `check_protected_fields()`, a wider GDP-specific anomaly threshold), and **writes to the staging area**, recording at most one `pending` version entry for `gdp`. CPI discovers, downloads, and archives the raw CPI Excel publication, parses it (`parse_cpi_workbook()`, reading only the **latest** month's column per metric — CPI, unlike GDP, does not routinely revise prior months), transforms it into `inflation.json`'s `cpi-headline`/`food-inflation` stats only via `_transform_inflation()` (reusing QLFS's `_apply_qlfs_rate_map()` unchanged), validates it (a genuinely new plausibility range tolerating negative/deflationary values, monthly-label format, `check_protected_fields()`, a CPI-specific anomaly threshold, **and** a dedicated `_assert_cpi_ownership_boundary()` hard-fail check against `repo-rate`/`annual-cpi-avg`), and **writes to the staging area**, recording at most one `pending` version entry for `inflation`. None of the three flows ever writes any dataset JSON directly. `gdp-annual-growth`, `gdp-nominal`, `gdp-per-capita`, `repo-rate` (SARB-owned), and `annual-cpi-avg` are untouched — out of scope. Population/housing/census/municipalities remain download/archive-only or detection stubs. |
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
83 tests, all passing, zero collection errors:
- `core/tests/test_metadata.py` — `check_protected_fields()` (no-violation, top-level, nested, list-of-dicts, absent-field cases).
- `core/tests/test_files.py` — `atomic_write()` success and failure-path cleanup.
- `core/tests/test_pipeline_integration.py` — end-to-end staging → approve → promote cycle for SARB, including both the happy path and the negative cases (promotion refused pre-approval; promotion refused after rejection; unknown version raises).
- `adapters/tests/test_sarb.py` — `_validate_prime_spread()` (exact match / within tolerance / violation) and `_transform_interest_rates()` (first-ever update, in-place revision, append new point).
- `adapters/tests/test_statss.py` — 66 tests: 21 covering the QLFS parser, validation/anomaly helpers, all three transform functions, and `fetch_and_apply()`'s `"ok"` / `"no_change"` / `"error"` paths (network mocked), including `test_qlfs_staged_candidate_requires_approve_then_promote`; 15 GDP tests covering `parse_gdp_workbook()`, `_validate_gdp_growth_rate()`, `_apply_gdp_growth_points()` (append, in-place revision, empty-series seeding), `_transform_gdp()`'s scope boundary, the GDP-specific anomaly threshold, `_check_gdp()`'s hub-change detection, and `fetch_and_apply()` integration tests including `test_gdp_staged_candidate_requires_approve_then_promote`; plus 7 Tier-1 WAF-fallback tests (QLFS + GDP); plus 23 new CPI tests covering `parse_cpi_workbook()` (latest-month-only extraction, two fail-loudly paths, non-Excel path), `_validate_cpi_rate()`/`_validate_monthly_label()`, the CPI-specific anomaly threshold, `_transform_inflation()`'s scope boundary (`repo-rate`/`annual-cpi-avg` untouched), `_assert_cpi_ownership_boundary()`'s three direct cases (tamper detection, stat-set-change detection, legitimate-change pass-through), `_update_cpi_meta()`'s narrow-scope proof, `_check_cpi()`'s hub-change detection, five `fetch_and_apply()` integration tests (staging without direct write, no-change, protected-field isolation, ownership-boundary isolation, and `test_cpi_staged_candidate_requires_approve_then_promote`), and three Tier-1 WAF-fallback tests for CPI.

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
- **GDP (P0441) write path — Phase 3a** (this milestone, dated 2026-07-19): `gdp.json`'s `gdp-growth` statistic now has a third working, gated write path alongside SARB and QLFS, wired through the same staging → approval → promote pipeline, implemented within the same `fetch_and_apply()` call as the (unmodified) QLFS flow. Shipped:
  - `parse_gdp_workbook()` (header/label matching, fails loudly on a missing quarter-header row or growth row, no PDF fallback), reading **every** available quarter column in the growth table — not just the latest — so Stats SA's routine revisions to previously published quarters are captured, not just the newest print.
  - `_transform_gdp()` / `_apply_gdp_growth_points()`: overwrites a revised historical series point in place (with a human-readable revision note) and appends a genuinely new one, satisfying `gdp.yaml`'s `overwrites_historical_points: true` requirement directly — proven by a dedicated test, not just asserted in comments. Headline fields are driven only by the chronologically newest point.
  - Per-point validation (a genuinely new plausibility range since GDP growth can be negative, unlike QLFS's `[0, 100]` rates; quarterly-label format; `check_protected_fields()` reuse; a wider GDP-specific quarter-over-quarter anomaly threshold) and `"ok"` / `"no_change"` / `"error"` staging behaviour for `gdp`, matching SARB's and QLFS's semantics — including a pre-transform "did anything actually change" check (mirroring QLFS's `dataset_changed` pattern) so a genuine no-op run reports `"no_change"` rather than always re-staging due to `_meta`'s ever-fresh timestamps.
  - A GDP-specific end-to-end approve→promote test (`test_gdp_staged_candidate_requires_approve_then_promote`), built from the start of this milestone rather than retrofitted afterward (as QLFS's equivalent test was, in the Phase 2 closeout).
  - `gdp-annual-growth`, `gdp-nominal`, and `gdp-per-capita` remain untouched — deliberately out of scope pending their own sourcing audit (see `CHANGELOG.md`).
  - **Still open after this milestone:** `parse_gdp_workbook()` and the P0441 URL-naming convention have never been run against a real, downloaded Stats SA GDP workbook — only synthetic fixtures, the same open item as QLFS's Excel-layout caveat (see §5 and §7).
- **CPI (P0141) write path — Phase 3b** (this milestone, dated 2026-07-20): `inflation.json`'s `cpi-headline` and `food-inflation` statistics now have a fourth working, gated write path alongside SARB, QLFS, and GDP, wired through the same staging → approval → promote pipeline, implemented within the same `fetch_and_apply()` call. Shipped:
  - `parse_cpi_workbook()` (header/label matching, fails loudly on a missing month-header row or a missing metric, no PDF fallback), reading only the **latest** month's column per metric — a deliberate parallel to QLFS's single-latest-value approach, not GDP's multi-quarter one, since Stats SA does not routinely revise previously published CPI prints.
  - `_transform_inflation()`, reusing QLFS's `_apply_qlfs_rate_map()` **unchanged** — no new append/revise logic was needed, since CPI (like QLFS's rates) only ever needs the newest point applied.
  - A dedicated, tested `_assert_cpi_ownership_boundary()` hard-fail check: deep-compares every non-owned stat (`repo-rate`, `annual-cpi-avg`) between the previous and proposed `inflation.json` document and aborts staging on **any** difference — not just a protected-field change — including the stat-ID set itself changing. This is the genuinely new complication CPI introduces that QLFS and GDP did not have: a shared dataset file with a stat owned by a different, untouched adapter (SARB).
  - Per-value validation (a genuinely new plausibility range tolerating negative/deflationary values, unlike QLFS's `[0, 100]` rates; monthly-label format; `check_protected_fields()` reuse; a CPI-specific month-over-month anomaly threshold) and `"ok"` / `"no_change"` / `"error"` staging behaviour for `inflation`, matching SARB's/QLFS's/GDP's semantics, including the same pre-transform "did anything actually change" check pattern.
  - A CPI-specific end-to-end approve→promote test (`test_cpi_staged_candidate_requires_approve_then_promote`), built from the start of this milestone, with a final assertion that `repo-rate`/`annual-cpi-avg` remain byte-for-byte identical after promotion.
  - `repo-rate` de-duplication against `interest-rates.json`'s `repo-rate-sarb`, and `annual-cpi-avg` automation, were **explicitly out of scope** for this milestone (a deliberate narrowing from this document's own §7, written before the implementation spec — see the Known Issues note below) and remain unautomated.
  - **Still open after this milestone:** `parse_cpi_workbook()` and the P0141 URL-naming/label convention have never been run against a real, downloaded Stats SA CPI workbook — only synthetic fixtures, the same open item QLFS and GDP each carried into their own first live runs (see §5 and §6). `repo-rate` in `inflation.json` remains stale and un-deduplicated — this milestone prevented it from being touched but did not resolve its staleness.

---

## 3. Current Architecture

```
                     ┌─────────────────────────────┐
 official sources →  │   adapters/*.py             │
 (SARB API, Stats SA │   check_for_updates()       │  ← read-only detection,
  release hub, ...)  │   fetch_and_apply()         │    safe to run unattended
                     └──────────────┬──────────────┘
                                    │ (SARB, Stats SA QLFS, Stats SA GDP, and Stats SA CPI, today)
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

This is a direct, verified implementation of the non-negotiable rule in `SA-Data-Hub-Automation-Architecture.md` §0.1 ("nothing auto-deploys to production data") for the adapters/flows that currently have a write path: SARB, Stats SA QLFS, Stats SA GDP (`gdp-growth` only), and Stats SA CPI (`cpi-headline`/`food-inflation` only). No adapter can currently write to `src/data/datasets/*.json` except through `promote_version()`, and `promote_version()` enforces the approved state.

**Deliberate deviations from the long-term architecture document, both explicitly authorized as interim measures:**
- Staging is file-based (`automation/reports/staging/`), not the PostgreSQL `staging.*` schema described in the architecture document — acceptable pending the DB migration (`ai-context.md` confirms no production DB reads exist yet).
- Approval is CLI-driven (`--approve`/`--reject`/`--promote`), not the GitHub Actions PR-based flow described in the architecture document §7 — acceptable as an interim manual gate; the PR-based flow remains unbuilt.

---

## 4. Production Readiness

**Ready, for four write-gated flows (SARB, Stats SA QLFS, Stats SA GDP's `gdp-growth`, and Stats SA CPI's `cpi-headline`/`food-inflation`), under human operation, within their current scope.**

- The package imports and runs cleanly (`python -m automation.runner --list/--describe/--apply/--approve/--promote` all execute without error).
- The regression suite passes in full (83/83) and includes a proof — not just an assertion — that a version cannot reach production without going through approval, for `interest-rates` (SARB), a real QLFS-produced dataset (`unemployment`), a real GDP-produced dataset (`gdp`), and a real CPI-produced dataset (`inflation`).
- SARB, the Stats SA QLFS family (`unemployment`, `youth-unemployment`, `labour-force`), Stats SA GDP (`gdp-growth` only), and Stats SA CPI (`cpi-headline`/`food-inflation` only) each have a functioning write path; all are gated end-to-end.

**Not ready** for:
- Unattended/scheduled operation without a human running `--approve`/`--promote` — this is by design, not a gap; the architecture requires a human in this loop for every dataset, including SARB, QLFS, GDP, and CPI.
- Any adapter/stat other than SARB, Stats SA QLFS, Stats SA GDP's `gdp-growth`, or Stats SA CPI's `cpi-headline`/`food-inflation` reaching production data — `repo-rate` (SARB-owned, untouched by the CPI flow), `annual-cpi-avg`, population, housing, census, municipalities, crime, World Bank datasets, and GDP's own `gdp-annual-growth`/`gdp-nominal`/`gdp-per-capita` stats currently write nothing beyond raw-file archiving or detection stubs.
- CI/CD integration — there is no GitHub Actions workflow yet; the approval gate today is a local CLI sequence, not a PR-based one.
- Unattended QLFS, GDP, or CPI `--apply` runs against a real Stats SA release — none of `parse_qlfs_workbook()`, `parse_gdp_workbook()`, or `parse_cpi_workbook()` has yet been empirically verified against a real workbook (see §5).

---

## 5. Known Limitations

- **Stats SA QLFS WAF-hash determinism is mitigated, not empirically resolved.** The adapter no longer trusts a hash of a potential WAF challenge page as a change signal — it explicitly detects the WAF challenge and raises rather than guesses. But no session to date has had network access to `statssa.gov.za` to observe the challenge page's actual behavior across multiple requests/dates, so the original open question (is it deterministic?) remains unanswered in the strict empirical sense. See `automation/adapters/statss.py::_fetch_release_hub_html()` and `automation/docs/developer-guide.md`.
- **Stats SA QLFS/GDP hub WAF-block: confirmed reproducible; Tier 1 mitigation implemented, 2026-07-19.** A real developer environment with genuine `statssa.gov.za` access confirmed that the release hub is reachable, the adapter reaches the correct URL, and the response is a genuine Imperva Incapsula WAF challenge — matching `automation/reports/archive/2026-07-19/run_cfc0d1ae2e99.md`. Following this confirmation, `IMPLEMENTATION-SPEC-STATSSA-WAF.md` §6.1 (Tier 1) was implemented: `_build_http_client()` now sends an ordinary-browser-equivalent header set for Stats SA requests only, and `_check_qlfs()`/`_check_gdp()` now fall through to the existing direct-publication-URL probe on a WAF-blocked hub response, returning `status="unknown"` (a probe-based signal, distinct from a hub-diff signal) when a candidate file is reachable, or the prior `status="error"` unchanged when it is not. The WAF-marker detection logic itself is byte-for-byte unchanged. Whether the direct-URL path is itself WAF-free in practice is what the next live run will show — this is the built-in runtime behavior, not a re-opened investigation. See `automation/docs/developer-guide.md`'s "Tier 1 implementation — 2026-07-19" entry and `CHANGELOG.md`'s corresponding entry. Browser automation (Tier 2) remains explicitly not adopted.
- **`StatsSAAdapter.fetch_and_apply()`'s docstring is stale relative to the CLI.** It states the method is "NOT reachable via runner.py" — this was accurate before the staging/approve/promote pipeline existed, but `runner.py --apply` now invokes `fetch_and_apply()` on any adapter that defines it, including `StatsSAAdapter`. This is not a functional defect (the method still only archives a raw file; it does not write any dataset JSON), but the docstring should be corrected for accuracy in the same way `SARBAdapter`'s was during this sprint. Flagged here rather than fixed, since it falls outside this sprint's scope.
- **`core/promote.py::get_production_dataset_path()`** derives the project root via four hardcoded `.parent` hops from its own file location, with no sanity check that the resolved path is actually the project root. Low risk today (the module hasn't moved), but brittle if the package is ever relocated.
- **`runner.py --apply` has no per-adapter allowlist.** It invokes `fetch_and_apply()` on any adapter that defines the method. Both current implementations (SARB, Stats SA) behave safely (stage-only / archive-only), but the CLI itself does not enforce that contract on a future adapter.
- **No GitHub Actions / CI integration.** Detection, staging, and promotion are all manually triggered from a local shell today.
- **No equivalence testing or `statistic_snapshots`/story regeneration.** The architecture document's steps 9–10 (equivalence tests, deployment report as a durable artifact) are not implemented; `core/report.py` produces a per-run Markdown/JSON report but does not compare DB output to JSON output (there is no DB write path yet at all).
- **The QLFS Excel layout assumed by `_QLFS_METRIC_SPECS` is mitigated by design, not yet empirically resolved.** `parse_qlfs_workbook()` locates tables by header/label matching rather than fixed cell coordinates, and fails loudly (naming the missing indicator) rather than guessing — but it has only ever been tested against synthetic fixtures built to the documented Stats SA convention; no session to date has had network access to `statssa.gov.za` to obtain a real archived workbook. The first live `--apply` run against a real downloaded workbook is the actual empirical test of this parser. A parse failure on that first real run is expected-possible, not a regression — the correct response is to update `_QLFS_METRIC_SPECS`'s label-matching rules to match the real layout, re-run, and only then treat this item as resolved. See `automation/adapters/statss.py`'s module docstring, `automation/docs/developer-guide.md`, and `CHANGELOG.md`.
- **The GDP Excel layout assumed by `_GDP_GROWTH_SPEC`, and the P0441 URL-naming convention assumed by `_build_gdp_candidate_urls()`, are likewise mitigated by design, not yet empirically resolved** — the exact same open item as the QLFS one immediately above, for the same underlying reason (no session to date has had network access to `statssa.gov.za`). `parse_gdp_workbook()` fails loudly (distinguishing "no quarter-header row found" from "a quarter-header row was found but no row matched the GDP growth label") rather than guessing or falling back to a stale value. The first live `--apply` run against a real downloaded GDP workbook is the actual empirical test. See `automation/adapters/statss.py`'s module docstring and `CHANGELOG.md`.
- **The CPI Excel layout assumed by `_CPI_METRIC_SPECS`, and the P0141 URL-naming convention assumed by `_build_cpi_candidate_urls()`, are likewise mitigated by design, not yet empirically resolved** — the same open item as QLFS's and GDP's Excel-layout caveats above, for the same underlying reason. `parse_cpi_workbook()` fails loudly (distinguishing "no month-header row found" from "a month-header row was found but a required metric's label didn't match") rather than guessing or falling back to a stale value. `_CPI_PLAUSIBLE_RANGE = (-5.0, 30.0)` and `_CPI_JUMP_WARNING_THRESHOLD = 1.5` are this implementation's own judgement calls, not sourced from `dataset-analysis.md` or the sourcing plan — flagged for stakeholder confirmation. The first live `--apply` run against a real downloaded CPI workbook is the actual empirical test. See `automation/adapters/statss.py`'s module docstring and `CHANGELOG.md`.
- **`inflation.json`'s `repo-rate` stat remains stale and un-deduplicated against `interest-rates.json`'s `repo-rate-sarb`.** The CPI Phase 3b milestone deliberately does *not* touch `repo-rate` — enforced by a dedicated `_assert_cpi_ownership_boundary()` hard-fail check, not just convention — per `IMPLEMENTATION-SPEC-CPI.md` §0.1. This is correct scope discipline (a cross-dataset de-duplication decision needs its own reviewed design, not to be bundled into a CPI-parsing milestone as a side effect), but it means the staleness itself is unresolved and getting more stale with each MPC meeting `inflation.json` doesn't reflect. This is now the top item in §6.

---

## 6. Remaining Work

In rough priority order, all outside the scope of the completed sprints:

1. **`repo-rate` / `repo-rate-sarb` de-duplication** in `inflation.json`, referencing `interest-rates.json`'s canonical value rather than independently maintaining a second copy — deliberately deferred out of the CPI Phase 3b milestone (`IMPLEMENTATION-SPEC-CPI.md` §0.1) because it requires a human decision (which value is authoritative; how a cross-dataset reference should work given today's file-per-dataset staging model) rather than a straightforward adapter change. `inflation.json`'s `repo-rate` is stale today and this item does not reduce that on its own — it is the fix.
2. **`annual-cpi-avg` automation**, deliberately deferred out of CPI Phase 3b (`IMPLEMENTATION-SPEC-CPI.md` §0.2) pending confirmation of its real table layout and cadence in the P0141 workbook — the same class of deferral already applied to `gdp-annual-growth`/`gdp-nominal`/`gdp-per-capita`.
3. GitHub Actions PR-based approval flow, replacing the local CLI gate with the architecture document's §7 design, once the above have run through a full real-world cycle in addition to SARB, QLFS, GDP, and CPI.
4. Equivalence tests (DB vs. JSON) — blocked on the PostgreSQL write path existing at all.
5. The documentation/robustness items noted in §5 (`--apply` allowlist, `get_production_dataset_path()`'s hardcoded `.parent` hops) — small, non-blocking cleanup, appropriate to fold into the start of the next sprint rather than opening a dedicated one.
6. Real-workbook empirical verification of `parse_qlfs_workbook()`, `parse_gdp_workbook()`, and `parse_cpi_workbook()` against genuine downloaded Stats SA releases, and separately, human verification of the `labour-force-participation` / `lfpr-overall` value discrepancy against the Stats SA QLFS P0211 release tables (see §5) — all open, tracked items, none blocking items 1–2 above.
7. A sourcing audit for `gdp-annual-growth`, `gdp-nominal`, and `gdp-per-capita` (currently untouched by the GDP write path — see `CHANGELOG.md`'s 2026-07-19 entry) before any of the three is safely automatable.

---

## 7. Immediate Next Milestone

**Either `repo-rate`/`repo-rate-sarb` de-duplication, or `annual-cpi-avg` automation, for `inflation.json` — both candidates, neither started.**

CPI Phase 3b (this build, 2026-07-20) implemented `cpi-headline` and `food-inflation` only, following the Stats SA QLFS and GDP pattern, and deliberately deferred both of the above (see `IMPLEMENTATION-SPEC-CPI.md` §0.1/§0.2 and `CHANGELOG.md`). This document previously (as of the 2026-07-19 snapshot) characterized repo-rate de-duplication as part of the same piece of work as CPI parsing — the actual implementation spec narrowed that scope, correctly: de-duplicating a SARB-owned stat is a cross-dataset ownership decision requiring its own review, not a natural side effect of adding a Stats SA Excel parser. This document's own earlier framing is superseded by that spec.

Of the two, `repo-rate` de-duplication is the higher-priority candidate — `inflation.json`'s repo-rate value grows more stale with every SARB MPC meeting it doesn't reflect, whereas `annual-cpi-avg`'s staleness is bounded by CPI's own monthly cadence and, per `dataset-analysis.md`, may already be tracking a value that updates on a slower annual cycle. Either item can proceed independently of the other; neither is blocked by the real-workbook verification items in §5/§6 item 6, though those verification runs should still happen as soon as genuine `statssa.gov.za` network access is available, since all three Excel parsers (QLFS, GDP, CPI) share the same "mitigated by design, not yet empirically resolved" status.
