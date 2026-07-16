# SA Data Hub — Automation Framework
# Implementation Specification for Next Development Session

**Prepared:** 12 July 2026
**Source:** Engineering review of `automation/` (session dated 2026-07-12), assessed against `SA-Data-Hub-Automation-Architecture.md` and `SA-Data-Hub-Dataset-Sourcing-Plan.md`.
**Audience:** An engineer with no prior context beyond this document.
**Constraint:** This document does not redesign the architecture. Every item below implements or completes something already specified in `SA-Data-Hub-Automation-Architecture.md`. No new architectural concepts are introduced. No code is included — this is a specification, not a patch.

**How to use this document:** Work items are numbered in required implementation order. Do not start item *N+1* before item *N*'s acceptance criteria are met, unless the item's own "Dependencies" section says otherwise. Each item is self-contained enough to be picked up independently, but the ordering reflects real blocking relationships explained in each item's "Risks / Dependencies" section.

---

## Work Item 1 — Quarantine the unwired production write path

### Root cause
`automation/adapters/sarb.py` defines a method `fetch_and_apply()` that fetches live SARB rate data, validates it, and writes the result directly to `src/data/datasets/interest-rates.json` — the file the production Next.js application reads via `src/data/mock.ts`. `automation/adapters/statssa.py` defines an analogous `fetch_and_apply()` for the QLFS family (download + archive only, no write, but same invocation gap).

Neither method is called anywhere. `automation/runner.py`'s `run()` function only ever calls `instance.run(dry_run=dry_run)`, and `BaseAdapter.run()` (in `automation/adapters/base.py`) only ever calls `self.check_for_updates(...)`. There is no code path — CLI flag, config option, or scheduled entry point — that reaches `fetch_and_apply()`. The one existing invocation was a manual, ad hoc call made directly against the class (evidenced by the Windows local path recorded in `automation/reports/archive/versions/interest-rates.versions.json`).

This is a latent hazard, not an active bug: today, running `python -m automation.runner` cannot write to production data. But the method exists, is fully functional, is documented in its own docstring as "Production — live API fetch, validate, diff, transform, write," and is one `runner.py` edit away from being wired into a scheduled job by someone who reasonably assumes the "manual approval required" language in its docstring reflects an enforced control rather than an unread comment.

### Architectural reasoning
`SA-Data-Hub-Automation-Architecture.md` §0.1 states this as a hard rule, not a per-dataset option: *"Nothing auto-deploys to production data... The architecture treats this as a hard rule."* Section 7 further specifies that GitHub Actions must never promote staging → production without a merged, human-reviewed PR as the trigger. A method that writes to the production dataset file with no caller-side gate violates this rule the moment it is invoked — regardless of whether it is invoked today.

The correct posture for code that is not yet safe to run unattended is to make it structurally impossible to run unattended, not to rely on nobody calling it. This is a containment step, not the final fix — the final fix is Work Item 4 (staging/approval/promote pipeline). This item exists to remove the hazard *before* that larger item is built, since Work Item 4 may take multiple sessions.

### Desired behaviour
Until Work Item 4 is complete:
- `fetch_and_apply()` on `SARBAdapter` and `StatsSAAdapter` must not be callable through any normal invocation of the framework (`python -m automation.runner`, with or without flags).
- It must remain callable directly by a developer who explicitly imports the adapter class and calls the method themselves (this is intentional — it should stay usable for manual, supervised testing), but it must not be reachable via `runner.py`, `__main__.py`, or any config-driven flag.
- The method's docstring and any CLI help text must not describe it as "Production" or imply it is safe to schedule. Docstring language should state plainly that it is manually-invoked-only and unprotected by the approval gate until Work Item 4 ships.
- No new CLI flag should be added that calls `fetch_and_apply()` as part of this item. If a flag is wanted later, it belongs to Work Item 4, where it can be built with the gate already in place.

### Files involved
- `automation/adapters/sarb.py` — `SARBAdapter.fetch_and_apply()` docstring/comment update only.
- `automation/adapters/statssa.py` — `StatsSAAdapter.fetch_and_apply()` docstring/comment update only.
- `automation/runner.py` — no functional change required (it already doesn't call these methods); add a code comment at the adapter-execution loop (§7 in `run()`) noting explicitly that `fetch_and_apply()` is intentionally not invoked here, so a future editor sees the reasoning rather than assuming it was an oversight.
- `automation/docs/developer-guide.md` — add a short, explicit subsection stating that `fetch_and_apply()` exists on some adapters but is not part of the execution flow described above, and must not be wired in until the approval gate (Work Item 4) exists.

### Functions / classes involved
- `SARBAdapter.fetch_and_apply` (class `SARBAdapter`, `sarb.py`)
- `StatsSAAdapter.fetch_and_apply` (class `StatsSAAdapter`, `statssa.py`)
- `BaseAdapter.run` (`base.py`) — read-only, confirm no change needed
- `run()` (`runner.py`) — comment-only change

### What should not change
- Do not delete `fetch_and_apply()` from either adapter. The download/validate/transform logic inside it is correct and will be reused by Work Item 4.
- Do not alter the validation logic, transform logic, or archive logic inside `fetch_and_apply()`.
- Do not change `BaseAdapter.run()`'s behaviour or signature.
- Do not add a `--apply` or similar CLI flag in this item — that is explicitly deferred to Work Item 4 so the flag is born with the gate attached, not before it.

### Acceptance criteria
- Grepping the codebase for calls to `fetch_and_apply(` outside of its own class definition and outside test files returns zero results in `runner.py`, `__main__.py`, and any config file.
- `python -m automation.runner --list`, `--describe`, and a normal run complete with no path that reaches `fetch_and_apply()`.
- Docstrings on both `fetch_and_apply()` methods no longer describe the method as "Production" or as protected by manual approval; they instead state it is a manually-invoked, ungated utility pending Work Item 4.
- `developer-guide.md` contains an explicit statement of this constraint, readable by someone with no other context.

### Risks / dependencies
- None. This is a documentation and containment change with no functional risk. It should be done first because every other item either depends on this constraint being explicit (Work Item 4) or is lower urgency than closing an unguarded write path to production data.

---

## Work Item 2 — Resolve the SARB effective-date discrepancy

### Root cause
The only real, archived execution of `SARBAdapter.fetch_and_apply()` (`automation/reports/archive/2026-07-01/run_e8a9f4c89b4f.json` and the corresponding `.md` report) recorded `effective_date: 2026-07-01`, which is identical to the date the run itself was executed. However, `sarb.py`'s own hardcoded `_MPC_MEETINGS_2026` reference table (module-level constant, lines ~93–100) records the actual MPC decision that produced a repo rate of 7.00% as having occurred on `2026-05-28`. These two dates are inconsistent, and nothing in the code, the run report, or the version-store entry explains why.

The adapter's `_extract_rate()` function (`sarb.py`) takes the `Date` field directly from the SARB `HomePageRates` API response and treats it as the MPC decision date (`effective_date = repo_date[:10]`, in `fetch_and_apply()`). If the API's `Date` field actually represents "date this indicator was last refreshed in the API" rather than "date of the MPC decision," every future run of this adapter will silently mislabel the effective date of a rate change as the date the automation happened to run, not the date the rate actually took effect. This would corrupt the `changeLabel` and series-history entries the transform logic writes into `interest-rates.json` (see `_apply_mpc_label()` and `_build_series_label()` in `sarb.py`), because both derive their month/quarter label from `effective_date`.

### Architectural reasoning
The architecture document treats SARB as the "closest thing to a fully-automatable dataset in the portfolio" specifically because it is a single low-frequency numeric value with a simple, checkable business rule. That trust is only warranted if the date semantics are also correct — a rate value can be arithmetically valid (`prime = repo + 3.5`) while still being filed under the wrong month in the public-facing chart series, which is a silent correctness bug the existing validation cannot catch, because `_validate_prime_spread()` only checks the numeric relationship, not the date.

This is not a hypothetical: it has already happened once, in the only real run on record. Before this adapter's pattern is used as a template for any other "Easy" automation candidate (as the sourcing plan recommends doing for SARB), the date-handling assumption must be confirmed against the real API, not left as an open question.

### Desired behaviour
- Determine, with evidence from the live SARB `HomePageRates` API (not from documentation or memory), what the `Date` field on the `MMRD002A`/`MMRD000A` timeseries entries actually represents: the MPC decision/effective date, or a refresh/publication timestamp.
- If it is a refresh timestamp, the adapter must obtain the true effective date from a different, verifiable source (for example, cross-referencing against the SARB MPC decisions page, or a separate SARB endpoint if one exists) rather than continuing to label chart data with the wrong date.
- If it is confirmed to be the true decision date, document that confirmation directly in the code (a comment citing how it was verified) so this is never re-litigated as an open question by a future maintainer.
- Either way, the resolution must be evidenced — a comment or short note referencing what was checked and what was found, not just a code change with no explanation.

### Files involved
- `automation/adapters/sarb.py` — specifically `_extract_rate()`, `_fetch_home_page_rates()`, `fetch_and_apply()`, `check_for_updates()`, and the `_MPC_MEETINGS_2026` reference constant.
- `automation/reports/archive/2026-07-01/run_e8a9f4c89b4f.json` / `.md` — should not be altered (historical record), but the investigation should reference these as the evidence trail.

### Functions / classes involved
- `_extract_rate(rates, timeseries_code, name_hint)` — the function that binds a `(value, date)` pair from the raw API payload.
- `SARBAdapter.check_for_updates()` and `SARBAdapter.fetch_and_apply()` — both currently treat the extracted date as the effective/decision date.
- `_apply_mpc_label()`, `_build_series_label()`, `_build_mpc_statement_url()` — all three derive downstream labels/URLs from `effective_date` and will need to use whatever the corrected date source turns out to be.

### What should not change
- Do not change the `prime = repo + 3.5` validation logic — it is unaffected by this issue and is correct as-is.
- Do not change the archive/checksum logic in `fetch_and_apply()`.
- Do not remove the `_MPC_MEETINGS_2026` reference table — it is useful scheduling context regardless of the outcome of this investigation, and can serve as a secondary check once the primary date-source question is resolved.

### Acceptance criteria
- A comment in `sarb.py`, adjacent to `_extract_rate()` or `fetch_and_apply()`, states explicitly and with evidence what the API's `Date` field represents, and how that was confirmed.
- If the field was found to be unreliable as an effective date, the adapter is updated to source the effective date correctly, and the change is validated against at least the one historical data point already known (repo rate 7.00%, effective 2026-05-28) to confirm the new logic produces the correct label for a past, known-good case.
- The discrepancy between the archived run's `2026-07-01` label and the documented `2026-05-28` decision date is either fully explained (e.g., "the API field is a refresh timestamp, and the fix now correctly derives 2026-05-28") or shown not to be a bug (e.g., "confirmed the API had not yet been polled between 28 May and 1 July, and 1 July genuinely reflects a distinct, later data refresh with no rate change — value only changed relative to a stale cached JSON figure"). Either explanation is acceptable; silence is not.

### Risks / dependencies
- Depends on Work Item 1 being done first only in the loose sense that this investigation should not be treated as clearance to re-enable `fetch_and_apply()` in the runner — that remains blocked on Work Item 4 regardless of this item's outcome.
- Requires live network access to the SARB API to investigate properly; if that access is unavailable in the engineer's working environment, this item cannot be closed with evidence and must be flagged as blocked rather than assumed resolved.

---

## Work Item 3 — Add regression tests for data-mutating logic

### Root cause
No test files exist anywhere under `automation/` (confirmed: no `test_*.py`, no `tests/` directory). The functions with the highest blast radius if they regress — the ones that decide whether a write to production data is safe — currently have zero automated protection:
- `check_protected_fields()` in `automation/core/metadata.py`, which is the only mechanism preventing an automated update from silently changing a statistic ID, registry ID, or municipality code.
- `_validate_prime_spread()` in `automation/adapters/sarb.py`, the only mechanism preventing an internally inconsistent repo/prime pair from being written.
- `_transform_interest_rates()` in `automation/adapters/sarb.py`, which mutates the existing JSON document structure — a regression here could corrupt `interest-rates.json` silently, since nothing currently checks its output shape.
- `atomic_write()` / `atomic_write_text()` in `automation/core/files.py`, which is the shared write primitive every future adapter's write path will depend on.

Without tests, any future change to these functions (including the fixes required by Work Items 1, 2, and 4) has no regression protection, and a mistake would only be caught by another manual, ad hoc run against a live external API — the same weak verification pattern that produced the unresolved discrepancy in Work Item 2.

### Architectural reasoning
The architecture document's design principle §0.6 ("protected fields... treated as protected fields with their own validation rule") only holds in practice if that validation rule is itself verified to work, including its edge cases (nested dicts, lists of dicts, fields absent in one side of the comparison). Given that this framework's stated purpose is to be the safety layer standing between external data sources and production data, its own correctness-critical functions should be the most tested part of the codebase, not the least.

### Desired behaviour
- Add unit tests for `check_protected_fields()` covering: no violation (identical documents), a top-level protected field changed, a protected field changed inside a nested dict, a protected field changed inside a list of dicts, and a protected field present in `previous` but absent in `proposed`.
- Add unit tests for `_validate_prime_spread()` covering: exact match, match within tolerance (±0.001), and a genuine violation.
- Add unit tests for `_transform_interest_rates()` covering: a first-ever update to a document with no prior rate (current values `None`), an update where the new period label already exists in the series (in-place revision path), and an update that appends a new series point.
- Add unit tests for `atomic_write()` / `atomic_write_text()` covering: successful write, and failure-path cleanup (temp file removed if the write raises before `os.replace`).
- Tests should use fixtures/sample data structurally identical to the real `interest-rates.json` shape (a minimal representative excerpt is sufficient — do not require network access or the real dataset file).
- No live network calls in any test. Any test that would otherwise need `HTTPClient`/`with_retry` should mock or stub those dependencies.

### Files involved
- New: `automation/core/tests/test_metadata.py`
- New: `automation/core/tests/test_files.py`
- New: `automation/adapters/tests/test_sarb.py`
- Possibly new: a small `automation/tests/fixtures/` directory holding the minimal representative JSON excerpt referenced above, if a shared fixture is preferred over inlining sample dicts in each test file.
- No existing files require functional changes for this item; it is additive only.

### Functions / classes involved
- `check_protected_fields()` (`core/metadata.py`)
- `_validate_prime_spread()` (`adapters/sarb.py`)
- `_transform_interest_rates()` (`adapters/sarb.py`)
- `atomic_write()`, `atomic_write_text()` (`core/files.py`)

### What should not change
- Do not modify the implementation of any of the above functions as part of this item unless a test reveals an actual defect — if it does, treat that as a separate, explicitly logged finding rather than folding a behavioural fix silently into "adding tests."
- Do not introduce a new test framework dependency without checking what, if anything, the wider SA Data Hub repository already uses for its TypeScript/Python test suites (per `development-guide.md` and `ai-context.md` conventions) — prefer consistency with existing project tooling (e.g., `pytest` if already used elsewhere in the repo) over introducing a second one.

### Acceptance criteria
- Running the new test suite completes with no network access and no dependency on any live external file (`interest-rates.json` fixture data is inlined or committed as a fixture, not read from the real `src/data/datasets/` directory).
- Every case enumerated in "Desired behaviour" above has at least one corresponding test, and all pass.
- Test files are discoverable by whatever test runner convention the rest of the repository uses (confirm this rather than assuming pytest, since no test runner configuration currently exists inside `automation/`).

### Risks / dependencies
- None blocking. This item can be done in parallel with Work Item 2, but should be completed before Work Item 4, since Work Item 4 will modify the same write path these tests are meant to protect, and having the tests in place first makes that modification safely verifiable.

---

## Work Item 4 — Implement the staging → approval → promote pipeline

### Root cause
`SA-Data-Hub-Automation-Architecture.md` (§1 diagram, §5, §6, §7) specifies a ten-step pipeline: detect → fetch → transform → generic validation → diff/anomaly → **write to staging** → **open a PR** → **wait for human approval** → **promote (staging → production, transactional)** → equivalence tests → deployment report → merge/deploy. None of the staging, PR-opening, human-wait, or promote steps exist in the current codebase. What exists instead (`SARBAdapter.fetch_and_apply()`) collapses fetch → transform → validate → **write directly to the production JSON file** into one method, with a `VersionEntry` recorded as `status="pending"` afterward as the only trace of the intended review step. Nothing ever changes that status to `"approved"` (confirmed: no `approve_version()` function or equivalent exists anywhere in `automation/core/version.py` or elsewhere).

This is the central finding of the prior review: the framework currently has no mechanism that actually stops an automated write from reaching production, despite extensive documentation describing that mechanism as the system's core safety property.

### Architectural reasoning
This item does not introduce anything new — it implements exactly what `SA-Data-Hub-Automation-Architecture.md` already specifies in Sections 1, 6, and 7, using the folder structure and generic/source-specific/dataset-specific tiering already defined in Section 2 and Section 3 of that document. The key existing constraints this item must respect:
- The promote step must be transactional per dataset (§4.1: "if any later stage fails, the whole promotion for that release is rolled back in one transaction").
- GitHub Actions must never merge its own PRs, never push directly to `main` from a scheduled job, and must only run the promotion step post-merge (§7, "What Actions explicitly does not do").
- A rejected or pending PR must leave the previous approved data live — nothing should ever be blocked from serving traffic by a stuck review (§6.1, point 4).
- Track A (automated extraction, e.g., SARB) and Track B (manual entry, e.g., crime/education) must converge on the same promotion pipeline once data reaches staging (§6.2, closing paragraph) — this item should not build a SARB-only shortcut.

### Desired behaviour
- A staging write step that takes the already-existing transform output (e.g., `_transform_interest_rates()`'s return value) and writes it somewhere reviewable *instead of* the current direct write to `src/data/datasets/interest-rates.json`. The architecture document specifies a Postgres `staging.*` schema mirroring production tables as the eventual target; since no production database reads exist yet per `ai-context.md`, the interim staging target for this phase should be a clearly-separated location under version control review (e.g., a staged JSON artifact distinct from the live dataset file, sitting alongside the version-store entry), such that the live dataset file is genuinely untouched until promotion.
- A promote step that is the only code path permitted to write to `src/data/datasets/*.json`, and that only runs after a `VersionEntry`'s status has been explicitly set to `"approved"` by a human action.
- A concrete mechanism for a human to move a version entry from `pending` to `approved` (or `rejected`) — at minimum, a reviewable CLI command or a GitHub PR-merge-triggered step per the architecture document's Section 7. The specific mechanism (CLI vs. GitHub Actions post-merge hook) should follow whatever the existing SA Data Hub repository's deployment tooling already supports, per `ai-context.md`'s existing Vercel-on-push-to-main convention — this item should integrate with that, not invent a parallel deployment mechanism.
- `SARBAdapter.fetch_and_apply()` (and `StatsSAAdapter.fetch_and_apply()`, for the parts of it that eventually write) should be refactored so that its write step calls the new promote path instead of writing to the dataset file directly, and so that it cannot execute the write portion unless a corresponding version entry already carries `status="approved"`.
- Once this item is complete, the containment measure from Work Item 1 should be revisited: `fetch_and_apply()` can be safely reachable from `runner.py` again (e.g., behind an explicit flag), because the gate is now real rather than a label.

### Files involved
- `automation/core/version.py` — add the approve/reject transition function(s); this file already defines the `VersionEntry` dataclass and `pending_versions()`/`latest_approved_version()` helpers that the new mechanism will build on.
- New: a staging-writer module under `automation/core/` (e.g., alongside `files.py`/`report.py`), responsible only for writing/reading staged candidate data — generic, not dataset-aware, per the architecture document's tiering rule in Section 3.
- New: a promote module under `automation/core/`, responsible for the transactional staging→production write, generic and reusable across datasets.
- `automation/adapters/sarb.py` — `fetch_and_apply()` modified to write to staging instead of directly to `interest-rates.json`, and to call the promote path only when an approved version entry exists.
- `automation/adapters/statssa.py` — `fetch_and_apply()` reviewed for the same pattern once it reaches the point of writing data (it currently stops at archive, per its own docstring, so less change is needed here immediately, but the same constraint should apply when its write logic is eventually built).
- `automation/runner.py` — only if/when `fetch_and_apply()` is re-exposed via a flag (post-completion of this item); do not add this flag as part of Work Item 1.
- Possibly: a new file under `.github/workflows/` at the project root, if the GitHub Actions integration described in the architecture document's Section 7 is implemented as part of this item rather than deferred. This is a judgment call for the implementing engineer based on how much of Section 7 is feasible in one session — see "Risks/Dependencies" below.

### Functions / classes involved
- `VersionEntry`, `new_version_entry()`, `save_version_entry()`, `load_version_history()`, `pending_versions()`, `latest_approved_version()` (all in `core/version.py`) — the new approve/reject transition builds directly on these.
- `SARBAdapter.fetch_and_apply()` — refactored to split "produce a candidate" from "promote an approved candidate" into two distinguishable phases.
- `_transform_interest_rates()` — reused unchanged as the source of the staged candidate document.
- `check_protected_fields()` (`core/metadata.py`) — should run as part of the generic validation step before staging, exactly as it does today, but the point at which it runs should be clearly "before staging," not "before an unguarded write," once this item is complete.

### What should not change
- Do not change the actual data-fetching, business-rule validation, or transform logic inside `sarb.py` — this item changes *where the output goes and what gates it*, not *how the output is computed*. Work Item 2's fix to date handling should already be in place before this item touches the same functions.
- Do not build a SARB-specific staging/approval mechanism that would need to be duplicated for Stats SA, SAPS, or World Bank later — per the architecture document's Section 3 rule of thumb ("if two datasets sharing an organisation would need to duplicate the code to add a third, it belongs one tier up"), the staging writer and promoter must be dataset-agnostic, living in `core/`, not in `adapters/sarb.py`.
- Do not remove or weaken `check_protected_fields()` or `_validate_prime_spread()` — they remain exactly as strict as they are today; this item adds a gate after them, not a replacement for them.
- Do not attempt to build the full Postgres `staging.*` schema described in the architecture document's long-term vision if the project's database integration is not yet at that stage (per `ai-context.md`: "No production database reads yet"). Use a file-based staging area as the interim implementation of the same *principle* (separation between candidate and production data), and note explicitly in the code that this is an interim step pending the DB migration described in `migration-plan.md`.

### Acceptance criteria
- Running `fetch_and_apply()` (however it ends up being invoked) with no prior approval never modifies `src/data/datasets/interest-rates.json`. This must be demonstrable as a test case, not just an assertion in code comments.
- A version entry can be moved from `pending` to `approved` (or `rejected`) through a documented, reproducible mechanism, and that transition is itself recorded (who/when, even if "who" is just a developer's confirmation in a single-maintainer context for now).
- Only after a version entry is `approved` does a promote step write to the production dataset file, and that write uses the existing `atomic_write_text()` primitive (unchanged from Work Item 3's test coverage).
- A rejected or still-pending version entry leaves the previously-approved data in `src/data/datasets/interest-rates.json` completely untouched — demonstrable by running the pipeline against a `pending`-only state and confirming the file's mtime/content does not change.
- The new staging/promote modules are dataset-agnostic (contain no references to `interest-rates`, `repo-rate`, or any SARB-specific field name) and are placed under `automation/core/`.
- The regression tests from Work Item 3 for `_transform_interest_rates()` and `check_protected_fields()` still pass unmodified, confirming this item did not alter the logic those tests protect.

### Risks / dependencies
- Depends on Work Item 3 being complete, so that the refactor required here is verifiable against a known-good baseline rather than introduced alongside new, untested code.
- The full GitHub Actions PR-based approval flow described in the architecture document's Section 7 may be a larger undertaking than fits in one session, particularly the "merge is the approval action" semantics, which requires coordinating with the project's existing branch-protection and Vercel deploy setup. If the implementing engineer determines that the full CI integration cannot be completed alongside the staging/promote mechanism in the same session, it is acceptable to deliver a manually-invoked approve/promote command first (satisfying the acceptance criteria above via manual review) and treat the GitHub Actions automation of that same flow as a follow-on task — but the manual mechanism must still be a real gate, not a placeholder, and must not be skipped.
- This is the largest and highest-risk item in this specification. It should not be scoped down to "SARB only, forever" — the design must generalize, per the "What should not change" constraints above, even though SARB will be the first (and for now, only) adapter to exercise it end-to-end.

---

## Work Item 5 — Verify or replace the QLFS release-hub change-detection signal

### Root cause
`automation/adapters/statssa.py`'s `_fetch_release_hub_html()` and `_check_qlfs()` detect a new QLFS release by hashing the HTTP response body of the P0211 release hub page and comparing it to a previously-stored hash (`automation/reports/archive/versions/qlfs_hub.sha256`). The function's own docstring states this page is protected by Incapsula WAF and that the fetched bytes "may be a bot-challenge page rather than the actual release listing," while asserting, without supporting evidence, that this challenge page is "deterministic per client-state." No sample response, test fixture, or investigation log exists anywhere in the repository to substantiate that claim.

If the assertion is wrong in either direction, the detector fails silently: if the challenge page embeds a per-request nonce or timestamp, every run will report `update_available` regardless of whether a real release occurred (a false-positive-every-time failure mode); if the challenge page is a static block page Incapsula always returns to this client, the hash will never change even across real Stats SA releases, and QLFS updates will go undetected indefinitely (the same "looks current, isn't" failure the sourcing plan documents for `population.json`).

### Architectural reasoning
The architecture document's Section 4.1 explicitly designs around Stats SA being difficult to poll reliably (calendar pre-checks *plus* a hash watch, specifically to reduce reliance on a single fragile signal). The current implementation only has the hash watch; the calendar pre-check half of that design is not yet built. Before either building the calendar-check half or trusting the hash watch as-is, the actual behaviour of the WAF-protected page needs to be empirically confirmed, because the entire QLFS detection signal rests on this one assumption.

### Desired behaviour
- Make one or more real requests to the QLFS release hub URL (`https://www.statssa.gov.za/?page_id=1854&PPN=P0211`) from the environment where this framework will actually run (not necessarily a developer's local machine, if that differs from the eventual scheduled environment), and inspect whether repeated requests in a short window return byte-identical responses.
- If responses vary between identical, back-to-back requests (indicating a nonce/timestamp/session-dependent challenge page), the hash-based detection must be replaced or supplemented with a more stable signal — options to evaluate include: a HEAD request checking `Last-Modified`/`ETag` headers specifically (already supported by `HTTPClient.etag_check()`, which currently isn't being used for the QLFS check — `_check_qlfs()` calls `client.etag_check()` but only reads/compares `content_sha256`, not the `ETag` header itself, so this may already partially work and simply needs verification), or falling back to the calendar-based pre-check described in the architecture document as the primary signal with the hash watch as a secondary corroborating check rather than the sole signal.
- If responses are confirmed stable/deterministic per client-state as the code currently assumes, no functional change is needed — but the finding must be documented in the code with evidence (e.g., "confirmed N identical responses across N requests on DATE"), replacing the current unsupported comment.
- Either outcome must be recorded, so this is not re-opened as an unknown in a future review.

### Files involved
- `automation/adapters/statssa.py` — `_fetch_release_hub_html()`, `_check_qlfs()`, the `_QLFS_HUB_URL` constant and surrounding comments.
- `automation/core/http_client.py` — `HTTPClient.etag_check()` should be reviewed for whether its `ETag`-comparison branch is actually exercised by the QLFS check, given `_check_qlfs()`'s current reliance on `previous_sha256` rather than `previous_etag`.

### What should not change
- Do not change the retry policy (`STATSSA_POLICY`/`WATCH_POLICY`) as part of this item unless the investigation specifically reveals a retry-related cause.
- Do not extend this investigation to the GDP/CPI/population/housing stub checks in the same file — those are explicit stubs with no live detection logic yet (Work Item scope for a later session, not this one).
- Do not remove the existing `qlfs_hub.sha256` persistence mechanism even if it turns out to need a companion signal — it may still be useful as a secondary corroborating check.

### Acceptance criteria
- A documented finding (code comment plus, ideally, a short note in `developer-guide.md`) states definitively whether the QLFS release hub's WAF response is stable per client-state, based on actual observed requests, with a date and request count.
- If the finding shows instability, the detection logic is updated so that a normal, no-change scenario does not produce a false `update_available` signal, and this is demonstrable by running the check twice in immediate succession against the live site with no intervening release and confirming a consistent `up_to_date` result both times.
- If the finding confirms stability, the unsupported comment in the code is replaced with an evidenced one, and no functional change is required.

### Risks / dependencies
- Requires live network access to `statssa.gov.za` from the environment doing the investigation; if unavailable, this item must be explicitly logged as blocked rather than assumed resolved.
- Independent of Work Items 1–4; can be done in parallel with any of them, but should be completed before any future session attempts to build the GDP/CPI/population/housing live checks in `statssa.py`, since those will likely reuse the same release-hub-hashing pattern and would inherit the same unverified assumption if this item is skipped.

---

## Work Item 6 — Add a dependency manifest

### Root cause
No `requirements.txt`, `pyproject.toml`, or equivalent exists anywhere in the `automation/` package. `automation/core/config.py`'s `_load_yaml()` function silently falls back to a `.json`-suffixed sibling file (or an empty dict) if the `yaml` import fails, logging nothing above debug level. In an environment where PyYAML is not installed (a freshly provisioned CI runner, for instance), the framework would boot successfully but silently ignore every `automation/config/sources/*.yaml` and `automation/config/datasets/*.yaml` file, running with effectively no source or dataset configuration and no visible error — it would look like "0 sources configured, 0 datasets configured" in the run report, which is easy to miss.

### Architectural reasoning
The architecture document assumes this framework runs unattended, on a schedule, via GitHub Actions (§7). An unattended job that silently degrades to a no-op configuration state (rather than failing loudly) is a reliability risk specifically in the unattended context this framework is built for.

### Desired behaviour
- Add a manifest (whichever format matches the convention already used elsewhere in the SA Data Hub repository — check `etl/requirements.txt`, referenced in `etl-pipeline.md`'s GitHub Actions example, for the existing convention before choosing a new one) declaring at minimum the `PyYAML` dependency this package relies on.
- Additionally, consider (but this is secondary to adding the manifest itself) whether `_load_yaml()`'s silent fallback should be changed to a loud warning-level log line when YAML parsing is unavailable and no JSON sibling exists either — this is a minor, optional hardening and should not block this item's completion if the manifest alone resolves the underlying risk.

### Files involved
- New: `automation/requirements.txt` (or wherever the existing project convention places such files — check `etl/requirements.txt` first).
- `automation/core/config.py` — only if the optional logging hardening above is included; the loading logic itself (`_load_yaml()`) does not otherwise need to change.

### What should not change
- Do not change the config-loading fallback behavior's actual logic (JSON-sibling fallback) — it is a reasonable defensive pattern and should remain, even once a manifest exists, since the manifest prevents the scenario rather than replacing the fallback's value as a defense-in-depth measure.

### Acceptance criteria
- A manifest file exists, is discoverable by whatever CI process eventually runs this framework, and correctly installs everything needed for `python -m automation.runner --list` to run without falling back to the no-YAML code path.
- If the optional logging hardening is included, a test or manual check confirms that a missing-YAML scenario now produces a visible warning rather than silent empty configuration.

### Risks / dependencies
- None blocking. Low effort, no interaction with Work Items 1–5. Can be done at any point; placed here in priority order because it is real but low-severity compared to the write-path and detection-integrity issues above it.

---

## Work Item 7 — Remove the committed local filesystem path and prevent recurrence

### Root cause
`automation/reports/archive/versions/interest-rates.versions.json` contains an `archive_path` value of `C:\Users\Mahierh\Desktop\UBAYD\ubayd_side_quests\Data Project\stats_data\raw_data\archive\interest-rates\2026-07-01\sarb_194040z.json` — a full local Windows path, including a personal username and folder structure, from the one manual test run referenced throughout this document. This was committed as part of the archived version-store artifacts.

### Architectural reasoning
This is a low-severity information-leakage issue (a personal folder name, not a secret or credential), but committed artifacts should reflect paths meaningful to whoever reads the repository later, not one developer's local machine layout. It's also a symptom worth noting alongside Work Item 1: it is direct evidence that `fetch_and_apply()` was run by hand, from a local machine, outside of any environment this project's own conventions (Vercel deploys, GitHub Actions) would produce — reinforcing why Work Item 1's containment step matters.

### Desired behaviour
- Update the historical artifact's `archive_path` field to a relative or clearly-marked placeholder path (e.g., a repo-relative path or an explicit `<local-test-run, path redacted>` marker), preserving the rest of the entry's factual content (timestamps, checksums, rate values) since those remain useful historical record.
- Going forward, ensure `save_to_archive()` / `archive_path()` in `automation/core/files.py` write paths relative to the project root (or the configured `raw_archive_dir`) rather than absolute local paths, if they are not already doing so consistently — confirm this by re-checking what `archive_path()` actually returns relative to `AutomationConfig.raw_archive_dir` and whether that value could resolve to an absolute local path depending on how `raw_archive_dir` is configured.

### Files involved
- `automation/reports/archive/versions/interest-rates.versions.json` — historical data correction.
- `automation/core/files.py` — `archive_path()`, `save_to_archive()` — confirm/adjust so future entries store portable paths.
- `automation/core/version.py` — `VersionEntry.archive_path` field itself does not need a schema change, only the values written into it need to be portable.

### What should not change
- Do not delete the historical version entry — it is legitimate audit history (per the architecture document's §8, point 9: "Version everything, even manual entries... this is as much an accountability tool... as it is an engineering safeguard"). Redact the path, don't remove the record.

### Acceptance criteria
- The committed JSON no longer contains any developer-specific local filesystem path.
- A newly-generated version entry (e.g., produced while testing Work Item 3's fixtures, if that testing exercises the archive path) contains a portable, repo-relative or configured-root-relative path rather than an absolute local one.

### Risks / dependencies
- None blocking. Can be done at any point; ordered last because it is the lowest-severity item in this specification.

---

## Summary — Implementation Order

1. **Quarantine the unwired production write path** (containment; fast; must happen first)
2. **Resolve the SARB effective-date discrepancy** (data-integrity investigation; blocks trusting the SARB pattern as a template)
3. **Add regression tests for data-mutating logic** (protects the refactor in item 4)
4. **Implement the staging → approval → promote pipeline** (the core fix; largest item; depends on items 1–3)
5. **Verify or replace the QLFS WAF hash-detection signal** (independent; should precede extending Stats SA detection to GDP/CPI/etc. in a future session)
6. **Add a dependency manifest** (low effort, low severity; any time)
7. **Remove the committed local filesystem path** (lowest severity; any time)

Items 1–4 are the load-bearing sequence and should not be reordered. Items 5–7 are independent of that sequence and of each other, and may be scheduled around it as time permits.
