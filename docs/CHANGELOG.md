# Changelog

All notable changes to the SA Data Hub automation framework are documented in this file.

---

## 2026-07-19 — Stats SA Release-Hub WAF Access: Tier 1 Implemented

### Summary
Implements `IMPLEMENTATION-SPEC-STATSSA-WAF.md` §6.1 (Tier 1), following on
from the same-day "Phase 0 Attempted, No Code Change" entry below. A real
developer environment with genuine `statssa.gov.za` network access has
since confirmed the core Phase 0 fact directly: the release hub is
reachable, the adapter reaches the correct URL, the response is a genuine
Imperva Incapsula WAF challenge, and `StatsSAAdapter` correctly reports
`WAF_BLOCKED` — matching the symptom already on file in
`automation/reports/archive/2026-07-19/run_cfc0d1ae2e99.md`. With that
confirmation in hand, Tier 1 is implemented exactly as specified: no
redesign, no re-evaluation of whether it should exist. Exactly two files
changed code (`automation/adapters/statss.py`,
`automation/adapters/tests/test_statss.py`), plus this file,
`CURRENT_STATE.md`, and `automation/docs/developer-guide.md` — no parser,
transform, validation, staging, approval, or promotion code touched, and no
`src/data/datasets/*.json` file touched.

### Added
- `automation/adapters/statss.py::_STATSSA_BROWSER_HEADERS` — a new
  module-level constant: an ordinary-browser-equivalent header set
  (non-"bot" `User-Agent`, `Accept-Language`, `Sec-Fetch-*`,
  `Upgrade-Insecure-Requests`) for Stats SA requests only.
  `Accept-Encoding` is pinned to `"identity"`, not a real browser's
  `"gzip, deflate, br"`, because `core/http_client.py` (unchanged, out of
  scope) has no response-decompression support — advertising compression
  support without decompressing it would silently corrupt the raw hub-page
  body this adapter both WAF-scans and parses for the release period.
- `automation/adapters/tests/test_statss.py` — 7 new tests (§8 of the
  spec): for both `_check_qlfs()` and `_check_gdp()` — WAF-blocked hub +
  successful direct-URL fallback probe → `status="unknown"` with `notes`
  naming the found URL (2 tests); WAF-blocked hub + fallback probe also
  fails → `status="error"`, exact pre-existing `WAF_BLOCKED` message
  unchanged (2 tests); hub succeeds normally → unchanged
  `status="update_available"`, with a call-count assertion proving the new
  fallback probe is never invoked on this path (2 tests) — plus one direct
  test asserting the new header set on `_build_http_client()`'s
  constructed client, including the deliberate `Accept-Encoding: identity`
  choice. Test count: 53 → 60 (36 → 43 in `test_statss.py`).

### Changed
- `automation/adapters/statss.py::_build_http_client()` — now returns an
  `HTTPClient` configured with `_STATSSA_BROWSER_HEADERS` instead of the
  previous single `Accept` header (which relied on the client's default,
  self-identifying `SA-Data-Hub-Automation/0.1 (...; data-automation-bot)`
  User-Agent). No other adapter's HTTP client construction is affected.
- `automation/adapters/statss.py::_check_qlfs()` / `_check_gdp()` — on
  detecting the Incapsula WAF marker, each now falls through to the
  existing `_probe_qlfs_publication_url()` / `_probe_gdp_publication_url()`
  direct-URL probe (the same functions `fetch_and_apply()` already uses
  for discovery — no new probing mechanism introduced) before returning:
  a reachable candidate now produces `status="unknown"` with `notes`
  naming the found URL and an explicit "probe-based signal, not a
  hub-diff signal" message; no reachable candidate leaves today's
  `status="error"` / `WAF_BLOCKED` message exactly as it was. Both
  functions' pre-existing WAF-marker scan is byte-for-byte unchanged, and
  the deliberate duplication between the two (rather than a shared helper)
  is preserved, per the spec's explicit non-goal (§6.1 step 3) —
  consolidating it remains a separate, out-of-scope refactor. The
  fallback probe is wrapped in its own `try/except`, so a probe-level
  exception degrades to the unchanged `status="error"` path rather than
  propagating.
- `automation/adapters/statss.py::describe()` — added one new, additive
  `waf_access_status` key summarizing the Tier 1 change; every existing
  key keeps its exact prior shape and meaning.
- `automation/adapters/statss.py::StatsSAAdapter.version` bumped
  `0.4.0` → `0.4.1`.

### Verified (no code change)
- **The full pre-existing 53-test suite passes unmodified** both before
  and after this change (`pytest automation/` — 53 passed pre-change, 60
  passed post-change, zero regressions).
- **`fetch_and_apply()`'s own, separate use of
  `_probe_qlfs_publication_url()` / `_probe_gdp_publication_url()` for
  discovery is untouched** — the new fallback call site in
  `check_for_updates()` is additive, not a replacement, and does not
  change either function's signature or behavior.
- **A live CLI run (`python -m automation.runner --adapter statssa`)
  behaves identically pre- and post-change** in this session's own
  sandbox (still no `statssa.gov.za` route here — see the Phase 0 entry
  below): the sandbox's proxy-level `HTTP 403` is raised as an
  `AutomationHTTPError` before the WAF-marker check is ever reached, so
  the new fallback branch is correctly never exercised by a non-WAF-shaped
  failure. This is expected and consistent with the fallback only firing
  on a genuine `_Incapsula_Resource`/`incapsula` marker in the response
  body, not on any 4xx generally.

### Known Issues
- **Whether the direct-publication-URL path is itself WAF-free has not
  been independently re-confirmed by this session** — the developer-
  environment confirmation described above establishes the hub-block
  reproduces, not the direct-URL path's own status. Tier 1's fallback
  probe is written to handle either outcome correctly at runtime (a
  reachable candidate is used; an unreachable one leaves `status="error"`
  unchanged), so this does not block or invalidate the implementation —
  it is simply the fact the next live run (`IMPLEMENTATION-SPEC-STATSSA-
  WAF.md` §9 Phase 2) will observe directly, not a re-opened
  investigation.
- **The candidate-filename guessing problem in `_build_qlfs_candidate_urls()`
  / `_build_gdp_candidate_urls()` remains exactly as unconfirmed as
  before** — explicitly out of scope for this milestone (spec §4.2); a
  reachable hub-fallback probe still depends on the candidate list
  eventually matching Stats SA's real naming convention.
- **Tier 2 (browser automation) remains not adopted**, per the spec's own
  recommendation (§5.C) and this milestone's explicit instruction not to
  redesign or re-evaluate the solution.

### Next Milestone
Unchanged from `CURRENT_STATE.md` §7: CPI write path
(`inflation.json`, Stats SA component only). This WAF-access milestone
does not block or reorder that sequencing.

---

## 2026-07-19 — Stats SA Release-Hub WAF Access: Phase 0 Attempted, No Code Change

### Summary
Implements the investigation phase of `IMPLEMENTATION-SPEC-STATSSA-WAF.md`.
This milestone exists to restore reliable detection for the QLFS
(`unemployment`, `youth-unemployment`, `labour-force`) and `gdp` datasets,
which currently fail with `WAF_BLOCKED: Incapsula WAF challenge detected`
on every `--adapter statssa` run (`automation/reports/archive/2026-07-19/run_cfc0d1ae2e99.md`).
The spec's proposed fix (Tier 1: browser-equivalent request headers in
`_build_http_client()`, plus a fallback probe against the existing direct
publication-URL functions in `_check_qlfs()`/`_check_gdp()` when the hub is
WAF-blocked) is explicitly **gated on a Phase 0 empirical reachability
check** that must run from an environment with genuine `statssa.gov.za`
network access. This implementation session's sandbox does not have that
access: all 10 Phase 0 requests attempted (the QLFS and GDP hub URLs and
their direct publication-base URLs, each with both the adapter's existing
headers and a browser-equivalent header set, plus a one-time check of
Stats SA's general time-series download page) were rejected by the
session's own egress proxy with `HTTP 403`, `x-deny-reason:
host_not_allowed`, before any request reached Stats SA's servers — a
distinctly different failure mode from the live Incapsula `WAF_BLOCKED`
response already captured in the referenced run report from a different
environment. Per the spec's own Definition of Done ("implementing \[Tier
1\] unconditionally without Phase 0 evidence is explicitly not 'done'... the
entire point of this milestone is closing an *empirical* gap, not a
hypothetical one"), **no change was made to
`automation/adapters/statss.py`** in this session: not to
`_build_http_client()`'s headers, not to `_check_qlfs()`/`_check_gdp()`'s
WAF-block handling, and not to any parser, transform, validation, staging,
approval, or promotion code (all of which were out of scope regardless).
Exactly two files changed: `automation/docs/developer-guide.md` and
`CURRENT_STATE.md`, plus this entry — no adapter or test code.

### Added
- `automation/docs/developer-guide.md` — a new dated "Phase 0 finding —
  2026-07-19" subsection under the existing "Known Open Item: Stats SA
  QLFS WAF Signal" heading, recording the exact `host_not_allowed` denial
  (verbatim response body, status code, header) for all 10 attempted
  requests, contrasting it explicitly with the genuine `WAF_BLOCKED`
  symptom already on file, and recording the Tier 2 (browser automation)
  decision required by the spec's §12 item 7: **not adopted**, and not yet
  a live question, since the one fact that would trigger it (the
  direct-publication-URL path being WAF-blocked from a genuinely reachable
  environment) remains unconfirmed either way.

### Verified (no code change)
- **The existing WAF-marker detection logic in `_fetch_release_hub_html()`,
  `_check_qlfs()`, and `_check_gdp()` is unchanged** — confirmed by the full
  existing 53-test suite passing unmodified (`pytest automation/` — 53
  passed, zero regressions, zero new tests, since no new adapter behavior
  was introduced for a test to cover).
- **`_probe_qlfs_publication_url()` / `_probe_gdp_publication_url()` and the
  candidate-URL builders remain exactly as they were** — the spec's §4.2
  scope boundary (candidate-filename guessing accuracy is separate,
  follow-on work) was never reached, since Tier 1 itself did not implement.

### Known Issues
- **The direct-publication-URL path's WAF status is still unconfirmed.**
  This is the single fact §9 Phase 0 exists to establish, and it remains
  open — carried forward unchanged from `CURRENT_STATE.md`'s existing
  "mitigated, not empirically resolved" framing, now with an explicit,
  dated record that this session tried and could not obtain the evidence
  from its own sandboxed network.
- **QLFS/GDP detection remains `status="error"` (undifferentiated) on every
  WAF-blocked hub fetch.** The Tier 1 fallback probe that would produce a
  more informative `status="unknown"` on a WAF block was not implemented,
  per the spec's own evidence-gating requirement. This is not a regression:
  it is the documented, already-correct pre-existing behavior, left
  unchanged because implementing around it without evidence would violate
  this milestone's Definition of Done.
- **A Tier 2 (browser automation) decision remains explicitly open, not
  defaulted.** Per the spec's §15, the interim state
  (`status="error"`/manual monitoring) continues to apply while that
  decision is made deliberately by whoever owns the compliance/product call
  — this milestone does not make that call implicitly by doing nothing.

### Next Milestone
Re-run this spec's Phase 0 (§9) from an environment whose network egress
configuration genuinely includes `statssa.gov.za` — a CI runner or
developer machine, not this sandbox — and record the four data points it
requires. Only once that evidence exists should Tier 1 (§6.1) be
implemented against `automation/adapters/statss.py`. This does not block
or change the sequencing of the CPI write path (`CURRENT_STATE.md` §7),
which remains the next feature milestone independent of this access
question.

---

## 2026-07-19 — GDP (P0441) Quarterly Growth Write Path

### Summary
Implements `IMPLEMENTATION-SPEC-GDP.md` (Phase 3a). `gdp.json`'s `gdp-growth` statistic now has a real, gated write path, following the exact staging → approval → promote pattern already proven for `interest-rates.json` (SARB) and the QLFS family. `StatsSAAdapter.fetch_and_apply()` now runs two fully independent flows in a single call: the existing QLFS flow (byte-for-byte unchanged) followed by a new GDP flow. GDP is parsed by header/label matching (`parse_gdp_workbook()`), reading **every** available quarter column in the growth table — not just the latest — so that Stats SA's routine revisions to previously published quarters are overwritten in place rather than silently missed, per `gdp.yaml`'s `overwrites_historical_points: true`. Exactly four files changed: `automation/adapters/statss.py`, `automation/adapters/tests/test_statss.py`, `CURRENT_STATE.md`, and this file; `src/data/datasets/gdp.json` itself was not hand-edited — it is only ever written at runtime via the normal `--apply` → `--approve` → `--promote` sequence, exercised in tests against `tmp_path` fixtures. `gdp-annual-growth`, `gdp-nominal`, and `gdp-per-capita` are explicitly out of scope: they are annual-cadence figures living in a structurally different table, and per `dataset-analysis.md`'s own script note may currently be sourced partly from World Bank USD/ZAR conversion rather than pure Stats SA figures — an unresolved sourcing question that must be audited before they are safely automatable, not guessed at as a side effect of this build. CPI (`inflation.json`) is the next milestone, not this one — see `IMPLEMENTATION-SPEC-GDP.md` §0 for the sequencing rationale (different cadence/scheduling surface, and a genuinely new field-ownership boundary against the SARB-owned `repo-rate` stat in the same file).

### Added
- `automation/adapters/statss.py::parse_gdp_workbook()` — pure function, workbook bytes in, a `GDPExtract` (release period, publication date, and **every** available `(period_label, value)` growth point, chronological) out. Locates the growth table by scanning for a quarter-header row plus a label-text match (`_GDP_GROWTH_SPEC`, excluding an annual-growth row on the same sheet) — not fixed cell coordinates — and fails loudly (`ValueError`, distinguishing "no quarter-header row found at all" from "a quarter-header row was found but no row matched the GDP growth label") rather than guessing or falling back to a stale value. New helpers `_find_all_quarter_columns()`, `_find_metric_row()`, `_read_row_values_at_columns()` generalise QLFS's single-column `_find_latest_quarter_column()`/`_find_metric_value()` without modifying either — QLFS continues to use the single-column versions unchanged. **No archived GDP `.xlsx` file was available in this session to verify the parser against a real release** (no session to date has had network access to `statssa.gov.za`); it has been tested only against synthetic fixtures built to the documented Stats SA convention. The P0441 URL-naming convention used by `_build_gdp_candidate_urls()` is likewise unconfirmed. Both are flagged explicitly in the module docstring's "GDP Excel layout — verification status" section, `describe()`'s `phase_3a_status`, and this changelog entry — the same class of open item as QLFS's Excel-layout caveat, mitigated by design (fail loudly, label-based lookup, no guessing), not resolved by observation.
- `automation/adapters/statss.py::_apply_gdp_growth_points()` — a deliberate generalisation of `_apply_qlfs_rate_map()` (multiple points instead of one; explicit revision-note tracking), not a call to it. For each `(period_label, value)` point, in chronological order: an existing series point with the same label is overwritten in place (with a human-readable revision note, e.g. `"Revised Q2 2025: 0.8% -> 0.6%"`) if it differs by more than the same `0.001` tolerance `_apply_qlfs_rate_map()` uses; a genuinely new label is appended; an empty series is seeded from the first point. Headline fields (`value`, `rawValue`, `change`, `changeLabel`, `trend`, `lastUpdated`, `source.publicationDate`) are updated from **only** the chronologically last point, with `change` computed against the series' new second-to-last point **after** all revisions are applied. A GDP-specific quarter-over-quarter anomaly check (`_check_qoq_jump()`, reused unchanged, with a new, wider `_GDP_GROWTH_JUMP_WARNING_THRESHOLD = 5.0` — GDP growth is inherently more volatile than QLFS rates) runs per revised/appended point and is folded into the same notes list, surfaced to the human reviewer — never a hard failure. `automation/adapters/statss.py::_transform_gdp()` deep-copies the input document, applies `_apply_gdp_growth_points()` to the `gdp-growth` stat only, and updates the shared `_meta` block (mirroring `_update_qlfs_meta()`'s pattern); `gdp-annual-growth`, `gdp-nominal`, and `gdp-per-capita` are never read or modified — proven directly by a new test (see below), not just asserted in comments.
- `automation/adapters/statss.py::_validate_gdp_growth_rate()` — a genuinely new plausibility-range validator (`_GDP_GROWTH_PLAUSIBLE_RANGE = (-20.0, 20.0)`), not a reuse of QLFS's `_validate_percentage()`'s `[0, 100]` assumption: GDP growth can be negative (`gdp.json` itself already contains `-6.2%` for 2020).
- `automation/adapters/statss.py::_check_gdp()` — real ETag/content-hash detection against the P0441 release hub, structurally mirroring `_check_qlfs()` exactly (same WAF-challenge guard, copied rather than factored into a shared helper so `_check_qlfs()`'s code path is untouched), cached per run via a new `self._gdp_check_cache` instance attribute, and persisted via new `_gdp_hash_path()` / `_load_gdp_previous_hash()` / `_save_gdp_hash()` methods to a sibling `gdp_hub.sha256` file. `check_for_updates()`'s `"gdp"` branch is replaced with a real dispatch to this method (previously a Phase A stub returning `status="unknown"` with hardcoded literal strings).
- `automation/adapters/statss.py::StatsSAAdapter.fetch_and_apply()` — extended, additively, to also run a GDP flow after the existing (unchanged) QLFS flow within the same method call, since `runner.py --apply` invokes `fetch_and_apply()` once per adapter instance, not once per dataset. Discovers, downloads, and archives the GDP Excel publication (`_discover_gdp_excel()`, `_probe_gdp_publication_url()`, `_build_gdp_candidate_urls()`, `_determine_current_gdp_quarter()` — all structurally identical to their QLFS counterparts, reusing the fully generic `_fetch_release_hub_html()` / `_extract_excel_url()` / `_extract_release_period()` unchanged), parses it, and — if the extracted growth point(s) actually differ from what's already in `gdp.json` — transforms, validates (range, quarterly-label format, `check_protected_fields()` reuse), and stages exactly one candidate document via the existing `core/staging.py`/`core/version.py` pipeline, recording a single `pending` version entry for `gdp`. No dataset JSON is ever written directly. The result dict gains one new, additive `result["gdp"]` key (status, hub_url, file_url, release_period, archive_path, sha256, file_size_bytes, a single `version_id`, notes, errors) describing the GDP flow's own outcome; every previously documented top-level key keeps its exact existing meaning, describing the QLFS run only — required so none of the six pre-existing `fetch_and_apply`-based tests needed to change.
- `automation/adapters/tests/test_statss.py` — 15 new tests (§10 of the spec), appended after the existing QLFS tests: full multi-quarter parser extraction against a fixture workbook; two fail-loudly parser paths (no quarter-header row; a quarter-header row with no matching growth row); a blank-interior-column skip case; the GDP growth-rate range validator (in-range, and out-of-range using `-6.2`, the real 2020 annual figure from `gdp.json`, to prove the range isn't naively `[0, 100]`); `_apply_gdp_growth_points()`'s append, in-place-revision (**the single most important test in this milestone** — the direct proof of `overwrites_historical_points: true`), and empty-series-seed cases; `_transform_gdp()`'s scope boundary (`gdp-annual-growth`/`gdp-nominal`/`gdp-per-capita` provably byte-for-byte untouched); the GDP-specific quarter-over-quarter anomaly threshold; `_check_gdp()`'s hub-change detection; and four `fetch_and_apply()` integration tests (network mocked for both QLFS and GDP) covering: staging a GDP candidate with zero direct writes while the QLFS portion of the same call is unaffected; a GDP no-change run producing `status="no_change"` with no staging; a GDP protected-field violation aborting only the GDP portion while QLFS still succeeds normally in the same call; and the GDP-specific approve→promote end-to-end proof (built from the start of this milestone, not retrofitted afterward as QLFS's equivalent test was in the Phase 2 closeout). Test count: 38 → 53.

### Changed
- `automation/adapters/statss.py::check_for_updates()` — the `"gdp"` branch is no longer a Phase A stub; it dispatches to `_check_gdp()`, cached the same way as the QLFS family's branch, and is now positioned before the remaining Phase A stubs (population, housing, inflation, static datasets — all unchanged).
- `automation/adapters/statss.py::describe()` — added a new `phase_3a_status` entry describing the GDP write path; corrected `phase_2_status`'s closing sentence, which previously claimed GDP "remain[s] Phase A stubs" (no longer true). `notes` updated to reflect that the GDP revision-overwrite requirement is now implemented, not just planned.
- `automation/adapters/statss.py::StatsSAAdapter.version` bumped `0.3.0` → `0.4.0`.
- `automation/adapters/statss.py` module docstring — added a "Phase 3a scope (GDP)" section and a "GDP Excel layout — verification status" section, following the exact structure and tone of the existing QLFS-equivalent sections.

### Verified (no code change)
- **The "did anything actually change" check for GDP is computed from the raw extracted growth points against the current on-disk document, before `_transform_gdp()` runs** — mirroring the QLFS flow's pre-transform `dataset_changed` check. This was a deliberate implementation decision, not an oversight: `_transform_gdp()` always refreshes `_meta.last_verified`/`_meta.automation.updatedAt` to the current run, so comparing the *full transformed* document against the current-on-disk document would never be equal even on a genuine no-op run, which would have made `status="no_change"` unreachable in practice. Verified directly by `test_fetch_and_apply_gdp_no_change_produces_no_change_status`.
- **GDP-flow errors are recorded only in `result["gdp"]["errors"]`, not merged into the shared top-level `result["errors"]`** — a deliberate, documented deviation from `IMPLEMENTATION-SPEC-GDP.md` §9.1's own illustrative pseudocode (which is explicitly labeled non-literal). The six pre-existing `fetch_and_apply`-based tests assert on `result["errors"]` describing the QLFS run alone (e.g. `assert not result["errors"]` on a successful QLFS-only stage); merging GDP's own errors into that shared list would silently change its meaning the moment GDP's discovery doesn't find a publication — its default outcome whenever a caller/test only mocks QLFS's discovery functions, since `_fetch_release_hub_html()` is shared between both flows. This preserves the spec's own, higher-priority constraint that all 38 pre-existing tests keep passing unmodified.

### Known Issues
- **`parse_gdp_workbook()` and `_build_gdp_candidate_urls()`'s P0441 URL-naming convention have never been run against a real, downloaded Stats SA GDP workbook** — only synthetic fixtures, exactly the same open item as QLFS's Excel-layout caveat. The first live `--apply` run against a real GDP workbook is the actual empirical test; a parse or discovery failure there is expected-possible, not a regression — the correct response is to update `_GDP_GROWTH_SPEC` and/or `_build_gdp_candidate_urls()` to match the real layout/convention, re-run, and only then treat this item as resolved.
- **`gdp-annual-growth`, `gdp-nominal`, and `gdp-per-capita` remain entirely unautomated**, deliberately deferred pending (a) confirmation of their real table layout in the P0441 workbook, and (b) a sourcing audit given `dataset-analysis.md`'s existing flag that the current manual updater may partly rely on World Bank USD/ZAR conversion rather than pure Stats SA figures for these three stats specifically.
- **CPI (`inflation.json`, Stats SA component) is the next milestone, not yet started.** Its own field-ownership boundary against the SARB-owned `repo-rate` stat in the same file needs focused attention, per `IMPLEMENTATION-SPEC-GDP.md` §0.

### Next Milestone
Per `CURRENT_STATE.md` §7 (updated in this build): CPI write path (`inflation.json`, Stats SA component only), following the same staging/approval/promote pattern now proven for SARB, QLFS, and GDP. GDP's real-workbook verification (URL convention and `_GDP_GROWTH_SPEC` label match) remains open, tracked, and does not block starting CPI.

---

## 2026-07-18 — Stats SA QLFS Phase 2 Closeout

### Summary
Closes out the five gaps identified by the post-implementation audit of Phase 2 (`IMPLEMENTATION-SPEC-STATSSA-PHASE2-CLOSEOUT.md`). This is a closeout, not a new feature: no core module, no adapter other than `automation/adapters/statss.py`'s tests, and no dataset outside the two listed below were touched.

### Changed
- `src/data/datasets/unemployment.json` — removed the `labour-force-participation` stat. `unemployment.json`'s `statistics` array now contains exactly one stat: `unemployment-national`.
- `src/data/datasets/labour-force.json` — `labour-force-participation` added back as a new, distinct stat (id, title, value, rawValue, unit, change, changeLabel, trend, description, source, lastUpdated, series preserved byte-for-byte from `unemployment.json`; `categoryId` set to `"unemployment"` to match `lfpr-overall`'s existing value). `labour-force.json`'s `statistics` array now contains three stats: `lfpr-overall`, `female-labour-participation`, `labour-force-participation`. This is a structural/labeling fix only — the ~18-percentage-point disagreement between `lfpr-overall` (60.6%) and `labour-force-participation` (42.7%) for approximately the same period is **not** resolved by this change and is not a value judgment this session made. `labour-force.json`'s `_meta.notes` now documents the discrepancy explicitly and states it must be verified against the Stats SA QLFS P0211 release before either stat is touched by a future automated run.
- `automation/adapters/statss.py::_transform_labour_force()` and `_QLFS_STAT_TO_DATASET` — confirmed unchanged (verification only, no code edit): they still map only `lfpr-overall` and `female-labour-participation`. `labour-force-participation` remains outside the QLFS automated pipeline's scope until the value discrepancy above is resolved by a human.

### Added
- `automation/adapters/tests/test_statss.py::test_qlfs_staged_candidate_requires_approve_then_promote` — the QLFS-specific end-to-end "staged candidate cannot reach production without approve→promote" test that Phase 2's acceptance criterion 4 required but did not deliver. Uses a real version produced by `StatsSAAdapter.fetch_and_apply()` (not a hand-built fixture) to prove, for the `unemployment` dataset: promotion is refused before approval (`ValueError`, `"requires 'approved'"`), `unemployment.json` is unchanged on disk immediately after staging, and only after `approve_version()` + `promote_version()` does the on-disk file change to match the staged document. Test count: 37 → 38.

### Verified (no code change)
- **Downstream reference sweep for the removed bare `youth-unemployment` statistic ID.** Searched the full `src/` tree available to this session (`src/data/mock.ts`, `src/data/stories.ts`, `src/data/update-history.ts`, `src/data/changelog.ts`, `src/data/providers/*.ts`, and all `src/data/datasets/*.json`) for the literal string `youth-unemployment` used as an exact statistic ID. No genuine hits found: the only matches are the correct `youth-unemployment-narrow` / `youth-unemployment-1524` / `youth-unemployment-expanded` stat IDs and the correct `youth-unemployment` dataset/registry ID (file name, import name, `datasetId` field) — none of which refer to the removed bare statistic ID. **`src/lib/registry.ts`, `src/lib/citation.ts`, and `src/lib/insights.ts` were not available to this session** (only `src/data/` was provided in `data.zip`, not `src/lib/`) and so could not be swept — this is the same gap the audit flagged after Phase 2 and remains open; see Known Issues.
- `automation/adapters/statss.py`'s module docstring, `automation/docs/developer-guide.md`, and this file's own prior entries — confirmed the real-workbook parser-verification notes are still present and worded consistently; none of the edits in this closeout touched or contradicted them.

### Known Issues
- **`parse_qlfs_workbook()` has still never been run against a real, downloaded Stats SA QLFS workbook** — only synthetic fixtures. This closeout does not attempt to fabricate or simulate a real workbook to close this item, per explicit instruction; it remains open and is now tracked directly in `CURRENT_STATE.md` §5 and §7, not only in this changelog. The first live `--apply` run against a real workbook is the actual empirical test; a parse failure there is expected-possible, not a regression.
- **The `labour-force-participation` (42.7%) vs. `lfpr-overall` (60.6%) value discrepancy is relocated, not resolved.** Both stats now live in `labour-force.json` with the disagreement documented in `_meta.notes`, but which value (if either) is correct has not been checked against the Stats SA QLFS P0211 release tables — that remains a human data-verification task.
- **`src/lib/registry.ts`, `src/lib/citation.ts`, `src/lib/insights.ts` remain unswept** for the removed `youth-unemployment` statistic ID — not available to this session. Per `ai-context.md`, these are exactly the files most likely to break silently on a statistic-ID removal; this should be checked in a session where `src/lib/` is available before treating the Phase 2 schema fix as fully safe.

### Next Milestone
Per `CURRENT_STATE.md` §7 (updated in this closeout): GDP write path, following the Stats SA QLFS pattern now proven twice. The real-workbook QLFS parser verification and the `src/lib/` reference sweep remain open, tracked items, neither of which blocks starting GDP.

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
