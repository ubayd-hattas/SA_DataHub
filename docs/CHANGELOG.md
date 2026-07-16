# Changelog

All notable changes to the SA Data Hub automation framework are documented in this file.

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
