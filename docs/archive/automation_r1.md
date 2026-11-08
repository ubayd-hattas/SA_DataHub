**Reviewer role:** Principal Software Architect (review-only)
**Scope:** `/automation` package (uploaded `1783843454686_automation.zip`), evaluated against `SA-Data-Hub-Automation-Architecture.md`, `SA-Data-Hub-Dataset-Sourcing-Plan.md`, `ai-context.md`, `dataset-analysis.md`, `etl-pipeline.md`.
**Method:** Direct inspection of source files, archived run reports, and version-store artifacts. No claim below is made without a corresponding file/line reference.

---

## 1. Executive Summary

This implementation builds a **Phase A/B hybrid detection-and-partial-write framework** — an adapter-based runner that polls SARB, Stats SA, SAPS, and World Bank for new releases, and in one case (SARB) goes further to fetch, validate, and write updated data directly to the production dataset JSON.

**Did it achieve its objective?** Partially, and with an important caveat: the objective the documentation set out — an unattended detection layer feeding a gated, human-approved promotion pipeline — is **not what got built**. What got built is a well-engineered detection layer (Implemented, Verified) plus a SARB write-path that bypasses the documented staging/PR/approval gate entirely (Implemented, but architecturally divergent) plus three honest stubs (SAPS, World Bank, and most Stats SA datasets).

**Overall implementation quality:** High for the parts that are actually implemented — clean separation of concerns, real HTTP handling, real checksums, real protected-field diffing, no dead abstractions in `core/`. The concerning finding is not code quality; it's a gap between what the code and its own docstrings *claim* to do and what the runner *actually invokes*.

**Confidence level: Medium.**
High confidence in `core/` and in the `check_for_updates` detection paths. Low confidence in the SARB write path's safety net, because the "manual approval gate" the architecture doc treats as a hard, non-negotiable rule (§0.1) is, in the current wiring, a metadata flag with no enforcement mechanism behind it.

---

## 2. Implementation Review

### 2.1 Core framework (`automation/core/`) — Implemented, Verified

- `config.py`: hierarchical YAML/JSON config loader (env → local.yaml → per-dataset → per-source → global), with graceful degradation when PyYAML is absent (falls back to a `.json` sibling). Verified by reading the full load path (`load_config`, lines 155–223).
- `http_client.py`: stdlib-only `urllib` wrapper with SHA-256 content hashing, ETag capture, and a 4xx/5xx split that correctly routes 5xx into the retry path via `URLError` re-raise (lines 165–172). This is a genuinely correct detail many implementations miss.
- `retry.py`: exponential backoff with jitter, distinguishing `API_POLICY`/`STATSSA_POLICY`/`WATCH_POLICY` — matches the differentiated retry strategy the architecture doc calls for in §4.1/§4.2.
- `files.py`: atomic writes (`tempfile.mkstemp` + `os.replace`), SHA-256 archiving with a companion manifest — directly implements the "archive raw source, verify checksum" requirement in `etl-pipeline.md`.
- `metadata.py`: recursive `check_protected_fields()` diff against a `PROTECTED_FIELDS` frozenset (`id`, `slug`, `registryId`, `categoryId`, `municipalityCode`, etc.) — a real implementation of the architecture doc's §0.6 "protected fields" rule, not a stub.
- `version.py`: JSON-backed version store with `pending`/`approved`/`rejected` status. **Implemented but incomplete**: there is no `approve_version()` or any code path that transitions an entry from `pending` to `approved` (confirmed via `grep -rn "approve\|promote"` — the only hits are docstrings, a report-string, and the dataclass field itself). The version store can record intent; it cannot execute the approval workflow the architecture describes.

### 2.2 Adapter framework (`automation/adapters/base.py`) — Implemented, Verified

`BaseAdapter.run()` is a clean template method: `validate_config()` → per-dataset `check_for_updates()` → status aggregation → `AdapterResult`. This is the one and only method the runner calls per adapter (confirmed in `runner.py` line 360: `result = instance.run(dry_run=dry_run)`). It is read-only by construction — it never calls anything named `fetch_and_apply`.

This matters because it means **the entire framework, as wired, is a detection-only system**, regardless of what individual adapters additionally implement.

### 2.3 SARB adapter (`adapters/sarb.py`) — Implemented, Verified (detection) / Implemented-but-unreachable (write)

- `check_for_updates()` (lines 546–668): live API poll of `SarbWebApi/WebIndicators/HomePageRates`, extracts `MMRD002A`/`MMRD000A`, validates `prime = repo + 3.5` (±0.001 tolerance), diffs against the live `interest-rates.json`. This is genuinely implemented, not a stub, and matches the sourcing plan's "Easy" automation classification.
- `fetch_and_apply()` (lines 670–927): fetches, archives raw bytes with checksum, re-validates, diffs, **writes directly to `src/data/datasets/interest-rates.json` via `atomic_write_text`** (line 881), then records a version entry with `status="pending"` *after* the write has already landed on disk.
- **Verified fact:** `fetch_and_apply` is never called by `runner.py`, `base.py`, or `__main__.py` (exhaustive grep, §above). It is only reachable via direct Python invocation (e.g., a REPL or an ad hoc script not present in this package).
- **Verified fact, from `reports/archive/versions/interest-rates.versions.json`:** exactly one version entry exists, with an `archive_path` under a Windows user directory (`C:\Users\Mahierh\...`) — this was run locally by hand, not through any committed entry point, and not through CI.

### 2.4 Stats SA adapter (`adapters/statssa.py`) — Implemented (QLFS detection), Assumed-risky (WAF hashing), Stub (everything else)

- QLFS family detection (`_check_qlfs`, lines 700–791) does a real ETag/SHA-256 check against the P0211 release hub, with the SHA-256 of the *previous* check persisted to `reports/archive/versions/qlfs_hub.sha256` (confirmed present in the archive, content matches format).
- The adapter's own docstring (lines 88–94, 195–204) discloses that this hub is behind Incapsula WAF and that the fetched response "may be a bot-challenge page rather than the actual release listing." The code proceeds anyway, asserting the challenge page is "deterministic per client-state" — this claim is **unverified** and, if false, would make the detector either report false positives on every run (challenge pages commonly embed per-request nonces/timestamps) or false negatives forever (if Incapsula always returns an identical static block page). No evidence in the repo (no captured sample response, no test) supports the determinism claim either way.
- GDP, CPI, population, housing checks are explicit `"[Phase A]"` string-literal stubs (lines 621–693) returning `status="unknown"` with hardcoded, documentation-derived figures (e.g., "Q1 2026 released 9 June 2026") baked in as literal Python strings rather than derived from any check. These are informative placeholders, not working detectors — this is honestly disclosed in both the code and the docstring, which is good practice, but it means 6 of 9 Stats SA datasets have zero live detection logic today.
- `fetch_and_apply` exists for QLFS (download + archive only, explicitly documented as stopping before parse/transform/write) and is, like SARB's, never invoked by the runner.

### 2.5 SAPS and World Bank adapters — Implemented as honest Phase A stubs, Verified

Both correctly return `status="unknown"`/`"skipped"` and describe their Phase B plan without pretending to have implemented it. `worldbank.py` explicitly enforces the sourcing plan's core lesson (never let World Bank silently stand in for Stats SA MYPE) by shipping with an **empty** dataset list and requiring an explicit audit before any dataset is added (lines 22–27, 95–102). This is the strongest example of the documented architecture being followed to the letter.

---

## 3. Comparison Against the Original Plan

| Planned objective (from architecture/sourcing docs) | Status | Evidence / remaining work |
|---|---|---|
| Generic core (scheduler, retry, checksum, staging, protected-field guard) never dataset-aware | ✅ Completed | `core/*.py` contains zero dataset-specific logic; verified by inspection. |
| SARB adapter: Easy, fully automatable detection | ✅ Completed | `check_for_updates` live, validated against real API shape. |
| SARB: manual-approval gate before promotion | 🟡 Partially Completed | Version entry recorded as `pending`, but the **write to production JSON happens before any approval exists**, and no code transitions `pending→approved`. The gate is a label, not a control. |
| QLFS family: one extractor, three outputs | 🟡 Partially Completed | Detection is unified (`_qlfs_check_cache`) — good. But `fetch_and_apply` stops at download/archive; no transform, no three-output mapping exists yet. |
| GDP / CPI / population / housing detection | ❌ Not Implemented | Hardcoded `"[Phase A]"` string stubs, not live checks. |
| SAPS / education: human-in-the-loop Track B | ✅ Completed (as a stub) | Correctly scoped as detection-absent, ticket-only design; no ticketing system exists yet, but that's explicitly out of scope for this phase. |
| World Bank: audit-gated, empty by default | ✅ Completed | Matches architecture intent precisely. |
| Staging schema (`staging.*` mirrors of production) | ❌ Not Implemented | No SQL, no staging writer found anywhere in this package. `fetch_and_apply` writes straight to the file the Next.js app reads. |
| GitHub Actions: scheduled trigger → feature branch → PR → merge-as-approval | ❌ Not Implemented | No `.github/workflows` present in this package; no PR-authoring code. |
| Equivalence tests (DB vs JSON) | ❌ Not Implemented | No test files exist anywhere in `automation/` (`find` returned nothing). |
| Deployment report artifact | 🟡 Partially Completed | `core/report.py` produces a solid Markdown/JSON run report, but it reports *detection* results, not the promotion/deployment outcomes the architecture doc's §5.1 describes. |

---

## 4. Architecture Review

The **detection layer** (Section 1 of the architecture doc, boxes 1–2 "Release Detection" and "Fetch Layer") is followed closely and well. The three-tier folder split (core/adapters/config) matches §2 of the architecture doc almost exactly in spirit, though the actual folder names differ slightly from the doc's proposed layout (`adapters/` vs. the doc's `sources/` + `datasets/` split) — a reasonable simplification for this phase, not a violation.

The **critical deviation** is at the architecture doc's boxes 6–8 ("Staging" → "Human Review & Approval" → "Promote"). The doc is explicit and repeated: *"Nothing auto-deploys to production data... every dataset — even the 'Easy' SARB API case — is recommended for a manual approval gate. The architecture treats this as a hard rule, not a per-dataset option"* (§0.1). The implementation's SARB `fetch_and_apply` writes to `src/data/datasets/interest-rates.json` — the exact file the live Next.js app statically imports via `mock.ts` per `ai-context.md` — with no staging table, no PR, and no gate other than a `status: "pending"` string that nothing ever reads before deploy.

**Why this likely happened:** building a full GitHub Actions + PR + staging-schema pipeline is substantially more work than a detection poller, and it's plausible this was sequenced as "next phase." The docstrings do half-admit this ("Manual approval required before PostgreSQL load" — but PostgreSQL load was never the risk; the risk is the JSON file itself, which is already the production data source per `ai-context.md`'s explicit statement that there are "No production database reads yet").

**Would I approve this deviation in production?** No, not as committed. If `fetch_and_apply` is ever wired into a scheduled job (which is the obvious next step, and the code is clearly built anticipating that), a live MPC rate change would overwrite production data unattended, on a file with no branch protection, no PR, no review — directly contradicting the one rule the architecture doc calls non-negotiable. This isn't a hypothetical: the archived version entry proves this exact code path has already been run once against production-shaped data.

---

## 5. Engineering Assumptions

### Confirmed
- `core/` modules are dataset-agnostic (verified by reading every file in `core/`).
- The runner only calls `check_for_updates()`, never `fetch_and_apply()` (verified via `base.py` and exhaustive grep).
- SARB's `prime = repo + 3.5` business rule is enforced with a concrete tolerance (`sarb.py` line 182).
- No test suite exists (verified: `find` for `test_*.py` returned nothing).
- No `requirements.txt`/`pyproject.toml` ships with this package (verified: `find` returned nothing).

### Unverified
- Whether the Incapsula challenge page returned by the QLFS release hub is genuinely "deterministic per client-state" as the code's own comment claims (`statssa.py` lines 193–196) — no sample response or test fixture is included to support this.
- Whether the SARB `HomePageRates` endpoint's `Date` field represents the true MPC decision date or a "last refreshed" timestamp — the one real archived run (`run_e8a9f4c89b4f`) shows `effective_date: 2026-07-01` (the run date itself) against a hardcoded MPC calendar in the same file that says the actual hike was decided `2026-05-28`. This inconsistency was not investigated and is not explained anywhere in the code or reports.
- Whether the two archived reports (222ms and 0ms adapter duration for a live HTTPS round trip) reflect a genuine network call each time, versus a cached/mocked response during local testing.

### High Risk
- **The "manual approval gate" has no enforcement mechanism.** Any future scheduler that calls `fetch_and_apply()` will silently write to production JSON. This is the highest-risk assumption in the codebase: the code and docs both use the language of a gated pipeline, which could lead a future maintainer (human or AI) to trust a safety net that isn't there.
- **WAF-based change detection may not detect real changes, or may falsely detect changes on every run.** If false-positive, every scheduled run for QLFS would report "update available" and could eventually train the maintainer to ignore the signal (alert fatigue) — the opposite of the sourcing plan's intent.
- **No dependency manifest.** `config.py`'s YAML-optional fallback is a reasonable defensive pattern, but without a `requirements.txt` pinning PyYAML, a fresh environment (e.g., a GitHub Actions runner) may silently run on the JSON-fallback path with no per-source/per-dataset config at all, and nothing would flag that degraded mode to the operator beyond a debug-level log line.

---

## 6. Risk Assessment

| Risk | Rank | Impact if it materialises |
|---|---|---|
| `fetch_and_apply()` gets wired into a scheduler without also building the staging/PR gate | **Critical** | Unattended, unreviewed writes to the live production dataset JSON — the exact failure mode the architecture doc was written to prevent. |
| SARB effective-date field misinterpreted (mock/stale data mistaken for a real decision) | **High** | A future rate change could be logged under the wrong date, corrupting the `changeLabel`/series history silently, since there is no test coverage to catch it. |
| Incapsula challenge-page hash is not a reliable change signal | **High** | Either permanent false positives (noise, ignored alerts) or permanent false negatives (QLFS updates silently missed — the same "stale but looks fine" failure the sourcing plan flags for `population.json`). |
| No automated tests anywhere in `automation/` | **High** | Any refactor of `core/metadata.py`, `core/version.py`, or the transform logic in `sarb.py` has zero regression protection; correctness currently rests entirely on the one manual run captured in the archive. |
| No dependency manifest | **Medium** | Environment drift between the developer's machine and any CI runner; silent degradation to JSON-config fallback. |
| SAPS/World Bank/most Stats SA datasets remain undetected | **Medium** | Acceptable for now — this is honestly disclosed, matches the sourcing plan's own "difficult" classification, and doesn't misrepresent itself as done. |
| Local Windows path recorded in a version-store artifact committed to the repo | **Low** | Minor information leak (local username/folder structure); no functional impact, but shouldn't be committed as a permanent JSON artifact. |

---

## 7. Pull Request Review

**Strengths**
- `core/` is genuinely reusable, dataset-agnostic, and well-documented — a solid foundation.
- Protected-field diffing and atomic writes are correctly implemented, not hand-waved.
- Honesty in the code itself: SAPS, World Bank, and most Stats SA checks clearly self-label as `[Phase A]` stubs rather than pretending to be complete. The developer guide matches what the runner actually does.
- The QLFS WAF limitation is disclosed in the docstring rather than hidden — good engineering transparency, even though the underlying assumption is unverified.

**Weaknesses**
- `fetch_and_apply()` in `sarb.py` and `statssa.py` writes real data / downloads real files but is orphaned from the execution path the rest of the framework documents — this is either dead code that should be removed until Phase B is properly wired, or a half-finished feature that's one accidental scheduler change away from bypassing the entire approval architecture.
- Zero test coverage for logic that mutates production JSON.
- No dependency manifest.
- The unexplained SARB effective-date discrepancy should be resolved before this is trusted as a template for other "Easy" adapters.

**Requested Changes (before merge)**
1. Either wire `fetch_and_apply()` behind an explicit `--apply` flag with a hard-coded "requires human-supplied `--i-understand-this-writes-production-data`" style confirmation, or remove/quarantine it until the staging/PR pipeline (architecture doc §7) actually exists. Do not leave it silently callable.
2. Add at least unit tests for `check_protected_fields`, `_validate_prime_spread`, and the SARB diff logic — these are the functions standing between the automation and a bad write to production data.
3. Investigate and document the SARB `effective_date` vs. hardcoded MPC calendar discrepancy before trusting this adapter as the "gold standard" pattern for future sources.
4. Add a `requirements.txt` (even if it's just `PyYAML`) and scrub the committed Windows path out of `reports/archive/versions/interest-rates.versions.json`.

**Questions that must be answered before approval**
- Was the archived SARB run (`run_e8a9f4c89b4f`) against the live production API, or a mocked/replayed response? The evidence (0ms duration, effective date == run date) is ambiguous either way.
- Who is expected to actually flip `pending` → `approved`, and where does that happen? No code or documented process answers this today.
- Is `fetch_and_apply()` intended to be called by a human directly (a deliberate design), or is it waiting for scheduler wiring? The docstrings suggest the latter, which is the risk this review flags.

**Recommendation: Request changes, do not merge as-is for automatic scheduling.** The detection layer alone (i.e., disabling/removing the write path for now) would be mergeable today.

---

## 8. Milestone Assessment

**Definition of Done (inferred from the architecture doc's own phrasing of "Phase A"/"Phase B" and the sourcing plan's roadmap):**
A milestone closes when (a) an adapter can detect a real release with evidence of a live, correct run, (b) any write to production data goes through the documented staging → review → promote sequence, and (c) the behaviour is covered by at least minimal regression tests.

| Criterion | Status |
|---|---|
| Adapter framework auto-discovers and runs adapters generically | ✅ Completed |
| At least one adapter performs real, live detection | ✅ Completed (SARB, QLFS) |
| Protected-field and business-rule validation exist and run | ✅ Completed |
| Manual-approval gate actually blocks production writes | ❌ Outstanding — not implemented |
| Staging schema / PR-based review | ❌ Outstanding — not implemented |
| Regression tests for validation/diff logic | ❌ Outstanding |
| SARB effective-date behaviour verified against a real MPC cycle | ⚠️ Unverified |

**Would I close this milestone?** No. The detection sub-milestone is legitimately done and could be closed on its own. The broader "Phase B automation with manual gate" milestone described in the architecture doc is not done — the piece that exists (`fetch_and_apply`) is precisely the piece the doc says must never run unattended, and it's the piece with the least protection around it.

---

## 9. Recommended Next Engineering Task

**Build the staging → approval → promote path before extending `fetch_and_apply()` to any other adapter.**

This is the highest-priority task because:
- It resolves the single largest technical uncertainty in the codebase: whether "pending" version entries are a real control or cosmetic. Right now nothing in the repo answers that, and the SARB adapter has already demonstrated the unattended-write failure mode is one Python call away.
- Every other outstanding item (QLFS transform, GDP/CPI checks, tests) either depends on this gate existing (so they can write safely) or is lower risk in the meantime (a stub returning "unknown" cannot corrupt production data; a working `fetch_and_apply` without a gate can).
- Extending the same pattern to Stats SA before the gate exists would multiply the exposure (QLFS, GDP, CPI, MYPE, GHS all touching production JSON) rather than containing it to one already-tested adapter.

Everything else — Excel parsing for QLFS, GDP calendar checks, SAPS ticketing — should wait, because building more detection-only or write-only logic on top of an ungated write path just increases the number of things that would need re-auditing once the gate is finally added.

---

## 10. CHANGELOG.md## 11. Implementation Confidence

| Dimension | Score | Reasoning |
|---|---|---|
| Architecture Compliance | 6/10 | Detection layer and folder tiering match the doc closely. The write path directly contradicts the doc's one "hard rule, not a per-dataset option." |
| Implementation Quality | 8/10 | `core/` is clean, correct, dependency-light, and genuinely reusable. The parts that are stubs say so honestly. |
| Maintainability | 6/10 | Good separation of concerns, but zero tests around the highest-risk code (data-mutating validation/transform) is a real maintainability debt. |
| Production Readiness | 3/10 | Not ready to run on a schedule as-is — the one write-capable path has no enforced gate, no tests, and one unexplained data discrepancy in its only real-world run. |
| Documentation Completeness | 7/10 | Docstrings are unusually honest about limitations (WAF caveat, Phase A vs B scoping). Missing: no doc anywhere describes how `pending` becomes `approved`, or when/how `fetch_and_apply` is meant to be invoked. |
| **Overall Confidence** | **5/10** | A genuinely well-built detection layer sitting on top of an unfinished, unguarded write path that the project's own architecture document treats as the single most important safety property to get right. Merge the detection layer; do not schedule the write path yet. |
