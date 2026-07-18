# Changelog

All notable changes to the SA Data Hub automation framework are documented in this file.

---

## 2026-07-18 — Stats SA QLFS Phase 2 (Parse / Transform / Stage)

### Summary
Implements `IMPLEMENTATION-SPEC-STATSSA-PHASE2.md`. `StatsSAAdapter.fetch_and_apply()` now parses the QLFS Excel workbook downloaded in Phase 1, transforms it into the three existing JSON schemas (`unemployment.json`, `youth-unemployment.json`, `labour-force.json`), validates each candidate, and stages it through the same staging → approval → promote pipeline already enforced for `interest-rates.json`. No dataset JSON is written directly by this adapter. GDP, CPI, population, housing, census, and municipalities remain Phase A stubs, unchanged.

Bundled with this build, per explicit user confirmation, is a one-time schema correction: the duplicate `youth-unemployment` stat (a different, disagreeing value for the same concept already tracked as `youth-unemployment-narrow` in `youth-unemployment.json`) has been removed from `unemployment.json`, and the two `stories.ts` references to that ID have been repointed to `youth-unemployment-narrow`. The second flagged item — `labour-force-participation` living in `unemployment.json` instead of `labour-force.json` — was **not** touched: `labour-force.json` already carries a `lfpr-overall` stat that appears to measure the same concept under a different ID and value, and moving `labour-force-participation` in as a third, separate stat would have recreated the exact duplicate-concept problem this fix exists to eliminate. Per the user's decision, this is deferred for separate resolution rather than guessed at.

### Added
- `automation/adapters/statss.py::parse_qlfs_workbook()` — pure function, workbook bytes in, a `QLFSExtract` of seven named values + release period out. Locates each indicator by scanning for a quarter-header row (e.g. `Q1 2026`) plus a label-text match per worksheet — not fixed cell coordinates — and fails loudly (`ValueError`, naming exactly which indicator(s) could not be resolved) rather than guessing or falling back to a stale value. No archived QLFS `.xlsx` file was available in this session to verify the parser against a real release (no session to date has had network access to `statssa.gov.za`); it has been tested only against synthetic fixtures built to the documented Stats SA convention — flagged explicitly in the module docstring and developer guide as the same class of open item as the existing WAF-hash-determinism question, not empirically resolved.
- `automation/adapters/statss.py::_transform_unemployment()` / `_transform_youth_unemployment()` / `_transform_labour_force()` — one per QLFS output dataset, each following the deep-copy / rate-bearing-fields-only / seed-or-append-series pattern already established by `SARBAdapter._transform_interest_rates()`. Structural/protected fields are never touched.
- Validation helpers `_validate_percentage()`, `_validate_quarterly_label()`, and `_check_qoq_jump()` (a quarter-over-quarter anomaly flag — logged and recorded in the version entry's notes for the human reviewer, not a hard failure).
- `automation/adapters/tests/test_statss.py` — 20 new tests covering: full-parser extraction against a fixture workbook; a missing-indicator parse failure; a not-an-Excel-file parse failure; each transform's field-level correctness; empty-series seeding (true first-ever-update semantics — no prior `rawValue`, not just an empty `series` list); a protected-field violation aborting staging for one dataset while the other two QLFS outputs still stage successfully; anomaly-flag threshold behaviour; and full `fetch_and_apply()` runs (network layer mocked) for the "ok" (all three staged, no direct write), `"no_change"`, and `"error"` (unparseable file, PDF fallback) paths.
- `openpyxl>=3.1.0` added to `automation/requirements.txt` (required by the new parser; no other adapter depends on it).

### Changed
- `automation/adapters/statss.py::StatsSAAdapter.fetch_and_apply()` — rewired: Step 5 no longer unconditionally creates one version entry per QLFS dataset regardless of content. It now parses the downloaded file (aborting with `status="error"` if unparseable or non-Excel), computes a per-dataset "did the value actually change" flag against the current on-disk JSON, and only transforms + validates + stages datasets that changed. If none changed, the run returns `status="no_change"` with zero staging/version-entry side effects, matching the behaviour already established for SARB. A per-dataset protected-field or validation failure aborts staging for that dataset only, not the whole run.
- `automation/adapters/statss.py::StatsSAAdapter.fetch_and_apply()` docstring — rewritten to describe the current staging-gated behaviour (previously described Phase 1's download-only, not-reachable-via-runner state, which was already stale per the 2026-07-16 entry's Known Issues).
- `StatsSAAdapter.version` bumped `0.2.0` → `0.3.0`.
- `automation/docs/developer-guide.md` — added a "QLFS Parse / Transform / Stage (Phase 2)" section describing the pipeline above and its Excel-layout verification status.
- `src/data/datasets/unemployment.json` — removed the duplicate `youth-unemployment` stat (see Summary).
- `src/data/stories.ts` — two `relatedStatIds`/`statCallouts` references to the now-removed `youth-unemployment` ID repointed to `youth-unemployment-narrow`.

### Known Issues
- The QLFS Excel layout assumed by `_QLFS_METRIC_SPECS` has not been empirically verified against a real Stats SA release file — only against synthetic test fixtures. The first live `--apply` run against a real downloaded workbook is the actual test of this parser; a mismatch there should update the module docstring's verification-status note rather than be silently patched around.
- `labour-force-participation` (in `unemployment.json`) vs. `lfpr-overall` (in `labour-force.json`) remain two separate, disagreeing stats describing what appears to be the same concept. This was explicitly deferred by the user rather than resolved in this build — it still needs a decision (merge, drop one, or confirm they are in fact genuinely different measures) before the PostgreSQL migration.
- `CURRENT_STATE.md`, referenced by the implementation spec's Definition of Done, was not present in the files available to this session and so could not be updated — flagged rather than fabricated.
- GDP, CPI, population, housing, census, and municipalities remain Phase A stubs, per the implementation spec's explicit scope boundary — not touched in this build.

### Next Milestone
Resolve the deferred `labour-force-participation`/`lfpr-overall` duplication with the user. Obtain (or gain network access to fetch) a real archived QLFS `.xlsx` file and empirically verify `parse_qlfs_workbook()` against it, updating the verification-status note either way. GDP Excel parsing is the next dataset in the sourcing plan's automation priority order once QLFS is confirmed working end-to-end against a real release.

---

## 2026-07-12

### Summary
Engineering review of the `automation/` package (Phase A detection framework plus a partially-implemented Phase B write path for SARB). Reviewed against `SA-Data-Hub-Automation-Architecture.md` and `SA-Data-Hub-Dataset-Sourcing-Plan.md`. Detection layer is solid and largely matches the documented architecture; the SARB write path bypasses the documented manual-approval gate and is not wired into the scheduled runner.

### Added
- (Implementation under review, not authored this session) `automation/core/` — config loader, HTTP client, retry policies, atomic file writer/archiver, protected-field diff, version store, Markdown/JSON report generator.
- (Implementation under review) `automation/adapters/` — `BaseAdapter` template method pattern; `SARBAdapter` (live API detection + unwired write path), `StatsSAAdapter` (live QLFS ETag/hash detection + hardcoded stubs for GDP/CPI/population/housing/census/municipalities), `SAPSAdapter` and `WorldBankAdapter` (honest Phase A stubs).
- `CHANGELOG.md` (this file) — did not previously exist.

### Changed
- N/A — no code was modified as part of this review; review-only pass.

### Fixed
- N/A

### Known Issues
- `fetch_and_apply()` in `adapters/sarb.py` and `adapters/statssa.py` is never invoked by `runner.py`/`base.py`; it is only reachable via direct manual invocation. One such manual run is recorded in `reports/archive/versions/interest-rates.versions.json`, containing a local Windows filesystem path.
- SARB `fetch_and_apply()` writes directly to `src/data/datasets/interest-rates.json` (the live production data file) with no staging table, no PR-based review, and no code path that transitions a version entry from `pending` to `approved`. The manual-approval gate described in the architecture document is not enforced in code.
- Stats SA's QLFS release-hub change detection relies on hashing a page known to be served behind Incapsula WAF; the assumption that the challenge page is "deterministic per client-state" is undocumented/unverified and could produce persistent false positives or false negatives.
- One archived SARB run shows `effective_date` equal to the run date, while the adapter's own hardcoded MPC calendar records the actual decision date as different — unexplained and unverified.
- No automated tests exist anywhere under `automation/`.
- No dependency manifest (`requirements.txt`/`pyproject.toml`) ships with the package; PyYAML is treated as optional with a silent JSON-fallback.

### Risks
- Critical: if `fetch_and_apply()` is wired into a scheduled job before the staging/approval/promote pipeline is built, production dataset JSON can be overwritten unattended, contradicting the architecture document's explicit "nothing auto-deploys to production data" rule.
- High: unverified WAF-hash determinism assumption for QLFS detection.
- High: zero regression test coverage for logic that mutates production data (protected-field diff, business-rule validation, JSON transform).

### Next Milestone
Build the staging → human review (PR-based) → promote pipeline described in `SA-Data-Hub-Automation-Architecture.md` §5–7, and gate `fetch_and_apply()` behind it, before extending live write-capable detection to any additional adapter (QLFS transform, GDP, CPI). Add minimal unit tests for `check_protected_fields`, `_validate_prime_spread`, and the SARB diff/transform functions as part of the same milestone.

---

## 2026-07-16 — Automation Framework Hardening Sprint

### Summary
Closes every finding from the 2026-07-12 engineering review. The SARB write path no longer bypasses the manual-approval gate — it now writes to a staging area and requires an explicit approve → promote sequence before any production dataset file is touched. Regression tests exist and pass for every function in scope that mutates or diffs production-shaped data. The SARB effective-date discrepancy, the missing dependency manifest, and the committed local-filesystem path have all been resolved. Verified by direct execution (`python -m automation.runner`, `pytest automation/`), not by implementation summary alone — an interim delivery within this sprint was found to be non-functional (a syntax error blocked the package from importing at all) despite being reported as complete, and was corrected before this entry was written.

### Added
- `automation/core/staging.py` — file-based interim staging area (`write_staged_dataset()`, `read_staged_dataset()`), the required separation between a freshly-extracted candidate and production data pending the PostgreSQL migration.
- `automation/core/promote.py` — the sole permitted write path to `src/data/datasets/*.json`. `promote_version()` raises `ValueError` unless the target version entry's status is `"approved"`.
- `approve_version()` and `reject_version()` in `automation/core/version.py` — the `pending` → `approved`/`rejected` state transitions; `approve_version()` refuses to act on a non-pending entry.
- `--apply`, `--approve`, `--reject`, `--promote` CLI arguments on `automation/runner.py`.
- `automation/requirements.txt` — pinned `PyYAML` and `pytest`.
- Regression tests: `core/tests/test_metadata.py`, `core/tests/test_files.py`, `adapters/tests/test_sarb.py`, and `core/tests/test_pipeline_integration.py` (end-to-end stage → approve → promote, including the negative cases: promotion refused before approval, after rejection, and for an unknown version). 17 tests total, all passing.
- A documented finding on the Stats SA QLFS WAF-hash question in `automation/adapters/statss.py::_fetch_release_hub_html()` and `automation/docs/developer-guide.md`, recording that the risk is mitigated in code but not yet empirically settled (no session to date has had network access to `statssa.gov.za` to observe the challenge page directly).

### Changed
- `automation/adapters/sarb.py::SARBAdapter.fetch_and_apply()` no longer writes directly to `interest-rates.json`. It now calls `write_staged_dataset()` and records a `pending` version entry; reaching production requires a separate `--approve` then `--promote` step.
- `automation/adapters/sarb.py::_transform_interest_rates()` — the effective-date calculation now derives from a maintained MPC decision calendar (`_MPC_MEETINGS_2026`) instead of the SARB API's refresh timestamp, with a cross-check against the fetched rate and a warning path if the calendar is stale.
- `automation/core/config.py::_load_yaml()` — now logs at `warning` level (was effectively silent) when PyYAML is unavailable and no JSON sibling config exists.
- `automation/core/files.py::portable_archive_path()` — hardened to produce a portable, forward-slash, non-absolute path for every future archive entry.
- Docstrings and `describe()` output in `automation/adapters/sarb.py` rewritten to describe the current gated behaviour (previously described the pre-sprint, ungated state, contradicting the code beneath them).

### Fixed
- **Critical:** a syntax error in `automation/adapters/sarb.py` (a missing function-definition line, leaving an orphaned parameter list) that made the entire `automation` package unimportable — `python -m automation.runner` failed on every invocation, including `--list`. Introduced during an interim delivery within this sprint; found and fixed before this entry was written, via direct execution rather than static review alone.
- A logic bug in `_transform_interest_rates()` where a stat with an empty or missing `series` list silently produced no data point at all on a first-ever update, instead of seeding one.
- Four assertions in `core/tests/test_metadata.py` that checked for a message format `check_protected_fields()` does not produce (the function's pre-existing `context="root"` default was not accounted for when the tests were written). `metadata.py` itself was not modified.
- A committed local Windows filesystem path in `automation/reports/archive/versions/interest-rates.versions.json`, replaced with a portable relative path.

### Documentation
- `automation/docs/developer-guide.md` updated to describe the staging → approval → promote pipeline as the actual, current mechanism (superseding the prior "do not wire this in" guidance, which this sprint's work has now superseded), plus the new QLFS WAF known-open-item note above.

### Known Issues
- The Stats SA QLFS WAF-hash determinism question is mitigated (explicit WAF detection replaces trust in an unverified hash) but not empirically resolved — no dated, request-counted observation exists yet.
- `StatsSAAdapter.fetch_and_apply()`'s docstring still states it is "NOT reachable via runner.py," which is no longer accurate now that `--apply` invokes `fetch_and_apply()` on any adapter that defines it (the method itself still only archives a raw file and writes no dataset JSON, so this is a documentation gap, not a functional one).
- `core/promote.py::get_production_dataset_path()` resolves the project root via four hardcoded `.parent` hops with no sanity check.
- `runner.py --apply` has no per-adapter allowlist; it will invoke `fetch_and_apply()` on any future adapter that defines the method, with no enforced contract that such a method stage rather than write directly.
- No GitHub Actions / CI integration yet; approval is a local CLI sequence.
- Only `SARBAdapter` has a working write path. Stats SA QLFS parsing/transform (and any GDP/CPI/population/housing write path) remains unimplemented — this is the subject of `IMPLEMENTATION-SPEC-STATSSA-PHASE2.md`.
