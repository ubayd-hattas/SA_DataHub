Implementation Spec: Stats SA WAF/Excel Production-Readiness Fixes (Repository-Grounded)

Status: Ready for implementation (Gemini)
Scope: automation/adapters/statss.py, automation/adapters/tests/test_statss.py, CURRENT_STATE.md, automation/docs/developer-guide.md, CHANGELOG.md. No other file.

1. Executive Summary

Direct repository inspection confirms one real, reproducible defect (AutomationHTTPError missing its url argument at statss.py:674) and one minor consistency gap (_download_publication()'s outgoing User-Agent). It also reveals that two of the audit's "High" findings are already implemented in the repository and should not be re-built: a PDF/non-Excel content-type guard already exists in all four fetch_and_apply() flows, and the Tier-1 WAF-fallback-to-direct-probe behaviour in check_for_updates() is already shipped and tested (12 passing tests). The audit's CPI finding (no confirmed publication URL) is confirmed as a real, unresolved gap, but one specific technical detail in the audit (a "P01412" naming pattern) does not match the actual _build_cpi_candidate_urls() code and should not be carried into any fix. This spec is therefore narrower than the audit implies: one mandatory one-line bug fix plus its regression test, one small header-consistency fix, and a set of documentation corrections — no new guard logic, no redesign.

2. Repository Findings
AutomationHTTPError.__init__(self, url, status, reason) (http_client.py:35) requires url positionally. _fetch_release_hub_html() (statss.py:674) calls it as AutomationHTTPError(status=403, reason=...) — missing url. Reproduced directly: raises TypeError: AutomationHTTPError.__init__() missing 1 required positional argument: 'url'.
_fetch_release_hub_html() is called from five sites: _discover_qlfs_excel() (922), _discover_gdp_excel() (1605), _discover_cpi_excel() (2374), _discover_population_excel() (2475), and directly inline inside QLFS's fetch_and_apply() (4277, wrapped in with_retry). All five are reachable only from fetch_and_apply() (--apply runs), confirming the audit's scope claim for this bug exactly.
check_for_updates()'s _check_qlfs(), _check_gdp(), _check_cpi(), _check_population() do not call _fetch_release_hub_html() at all. Each has its own inline Incapsula-marker scan operating on a DatasetCheckResult return value, never raising AutomationHTTPError. The line-674 bug does not affect check_for_updates() in any dataset. This narrows the bug's practical blast radius versus a naive reading of the audit.
The Tier-1 WAF-fallback (hub blocked → probe direct publication URL → return status="unknown" with the found URL in notes) is already implemented identically across _check_qlfs(), _check_gdp(), _check_cpi(), _check_population(), per IMPLEMENTATION-SPEC-STATSSA-WAF.md §6.1 and confirmed in CHANGELOG.md (2026-07-19, 2026-07-20, 2026-07-21 entries). 12 tests cover this (3 per dataset × 4 datasets), all passing.
A PDF/non-Excel guard already exists in all four fetch_and_apply() flows: if file_ext not in (".xlsx", ".xls"): ... status="error" at lines 4429 (QLFS), 4699 (GDP), 4929 (CPI), 5211 (Population), each with an explanatory message citing "PDF parsing is explicitly out of scope for this phase." This is functionally what the audit's Fix H1 asks for, already shipped under a different (but equally clear) status vocabulary ("error", not "publication_found_pdf_only").
_download_publication() (928) constructs its own HTTPClient with extra_headers={"Accept": "application/vnd.ms-excel,application/pdf,*/*"} only — it does not include _STATSSA_BROWSER_HEADERS (583), unlike _build_http_client() (599) which every other Stats SA call goes through. Confirmed as a real, isolated inconsistency.
_build_cpi_candidate_urls() (2267) builds P0141{MonthName}{Year} (e.g. P0141May2026), plus two other prefixes, each with .xlsx/.xls/.pdf. There is no "P01412"-style numeric-suffix pattern anywhere in the function. The audit's specific "the '2' suffix" detail does not correspond to this code.
test_statss.py has exactly 99 tests, all passing (confirmed by live run, 143s). Every test that touches _fetch_release_hub_html patches it at the module-attribute level (monkeypatch.setattr(statss_mod, "_fetch_release_hub_html", ...)), never exercising its real body — confirming the audit's "bug escaped test coverage" claim precisely.
automation/docs/developer-guide.md has a dedicated ## Known Open Item: Stats SA QLFS WAF Signal (Work Item 5) section with dated sub-headings (### Phase 0 finding — 2026-07-19, ### Tier 1 implementation — 2026-07-19) — this is the established place for new dated findings, not a new section.
3. Audit Validation Table
Audit finding	Verdict	Basis
Issue 1 / C1 — AutomationHTTPError missing url at line 674	Confirmed	Reproduced directly against live code
"All four dataset flows affected" (fetch_and_apply)	Confirmed	Traced all 5 call sites, all reachable only from fetch_and_apply
"check_for_updates() also affected" (implied by grouping under general WAF issues)	Incorrect	_check_* functions never call _fetch_release_hub_html; use separate inline scan, never raise
Bug escapes test coverage	Confirmed	All tests patch at module-attribute boundary, bypassing line 674
Issue 2/3 — Excel not discoverable via direct URL	Confirmed	Matches _build_*_candidate_urls() design; no code claims otherwise
Fix H1 — "missing piece: no content-type guard before parsing"	Already Fixed	Guard exists at 4429/4699/4929/5211, predates this audit, shipped across 4 phases
Issue 4 — Tier 1 WAF-fallback sufficiency table	Already Fixed / Confirmed accurate	Fallback-to-probe logic and 12 tests already present and passing
M1 — hub WAF-blocked → status="unknown" fallback	Already Fixed — correctly identified by audit as working, not a defect	Confirmed in code and tests
H2 — CPI has no confirmed URL pattern	Confirmed (general finding) / Incorrect (specific "P01412" detail)	Code uses P0141{MonthName}{Year}, not a numeric-suffix pattern; general "no confirmed pattern" conclusion stands independent of this detail
L1 — WAF marker scan duplicated	Confirmed, count corrected to 5 (not 3): _fetch_release_hub_html, _check_qlfs, _check_gdp, _check_cpi, _check_population	Grep + read of all 5 sites; already documented in code comments as deliberately deferred
L2 — _download_publication() bot User-Agent	Confirmed	Read of lines 928–952; no _STATSSA_BROWSER_HEADERS merge
"99 tests, all pass"	Confirmed	Live pytest run
4. Required Implementation Work

Work Item A (mandatory) — Fix the AutomationHTTPError call.
File: automation/adapters/statss.py. Function: _fetch_release_hub_html(), the single raise statement currently at line 674. Change the call from keyword-only status=/reason= to include hub_url as the first positional argument, matching AutomationHTTPError.__init__(self, url, status, reason). No other line in this function changes. The Incapsula-marker detection condition on line 673 is untouched.

Do not touch the four _check_* functions' inline scans as part of this item — they do not share this bug (confirmed in §2/§3), and "fixing" a call that isn't broken risks introducing a change with no test basis.

Work Item B (small, bundle with A) — Consistent headers in _download_publication().
File: automation/adapters/statss.py. Function: _download_publication(), the HTTPClient(...) construction (currently ~lines 942–945). Merge _STATSSA_BROWSER_HEADERS into the extra_headers dict alongside the existing Accept override, so the resulting headers include both the browser-identifying User-Agent/Sec-Fetch-*/etc. and the binary-file Accept value. Do not change the function's signature, return type, or the 1024-byte-minimum sanity check below it.

Work Item C — none required for Excel discovery or the PDF guard.
No code change: the guard already exists (§2, §3). Do not add a second guard, do not rename the existing status="error" outcome to "publication_found_pdf_only" — that would be an unnecessary API-shape change to fetch_and_apply()'s result dict for no functional gain, and risks breaking any caller/report code that currently matches on "error".

Work Item D — no code change for CPI URL discovery.
This requires a human to inspect the real Stats SA CPI hub page in a browser; no candidate-URL pattern can be responsibly written from this codebase alone (see §3). This spec does not propose new guessed patterns.

5. Required Tests
New regression test in automation/adapters/tests/test_statss.py, adjacent to the existing WAF-fallback test block (near line 1273 or a new block after it): call _fetch_release_hub_html() directly (not through a patched wrapper) with a mocked HTTPClient.get returning a body containing _Incapsula_Resource; assert pytest.raises(AutomationHTTPError), and assert exc_info.value.url == hub_url, .status == 403, "WAF_BLOCKED" in .reason. This is the one test in the whole suite that must not patch _fetch_release_hub_html itself, since the point is exercising its real body.
New test for _download_publication(): assert the constructed HTTPClient's effective headers include both _STATSSA_BROWSER_HEADERS's User-Agent and the existing Accept value — inspect via a spy/mock on HTTPClient.__init__ or by asserting on extra_headers directly, not by making a real network call.
No new tests for Work Item C (none needed — nothing changed) or Work Item D (would create false confidence against unconfirmed URLs).
Full existing 99-test suite must be re-run and pass unmodified after both changes.
6. Documentation Updates
CURRENT_STATE.md: append a dated (2026-07-21) note under the existing "Known limitations" style section (§5) recording: the AutomationHTTPError argument-order bug and its fix, and that CPI's publication URL remains unconfirmed pending manual browser investigation (do not imply CPI is fixed).
automation/docs/developer-guide.md: add a new dated sub-heading under the existing ## Known Open Item: Stats SA QLFS WAF Signal (Work Item 5) section (e.g. ### AutomationHTTPError argument fix — 2026-07-21), consistent with the existing ### Phase 0 finding / ### Tier 1 implementation pattern already there. Also record explicitly that the PDF/Excel content-type guard was already present prior to this audit (correcting any future reader who might assume it was newly added).
CHANGELOG.md: one new dated entry following the established format (see the 2026-07-19/2026-07-21 entries as templates), listing exactly the two code changes (Work Items A and B) and the two new tests, and explicitly stating what was investigated-but-not-changed (Excel discovery, PDF guard, CPI URL pattern) so the entry doesn't overstate scope.
7. Acceptance Criteria
_fetch_release_hub_html() raises AutomationHTTPError(hub_url, 403, "WAF_BLOCKED: ...") (not TypeError) — verified by the new regression test (§5.1).
_download_publication()'s outgoing headers include _STATSSA_BROWSER_HEADERS merged with the existing Accept override — verified by the new test (§5.2).
All 99 pre-existing tests plus the 2 new tests pass with zero regressions.
No change to any _check_* function's control flow or exception semantics.
No change to the PDF/Excel guard already present at lines 4429/4699/4929/5211, and no change to fetch_and_apply()'s result-status vocabulary.
No change to _build_cpi_candidate_urls() or any other candidate-URL builder.
CURRENT_STATE.md, developer-guide.md, CHANGELOG.md updated per §6, accurately distinguishing "fixed this session" from "already present" from "still unresolved."
No file outside automation/adapters/statss.py, automation/adapters/tests/test_statss.py, CURRENT_STATE.md, automation/docs/developer-guide.md, CHANGELOG.md is modified.
8. Implementation Order
Fix Work Item A (line 674) in isolation.
Add and pass the Work Item A regression test; run the full suite — this is a hard gate before touching anything else, since it is the highest-value, lowest-risk change and any unexpected failure here (e.g. a test that was silently depending on the buggy behaviour) must be investigated before proceeding.
Fix Work Item B (_download_publication headers).
Add and pass the Work Item B test; run the full suite again.
Documentation pass (§6) — can happen in parallel with steps 1–4 but must land in the same commit/PR.
9. Risks
Low — Work Item A is a one-line, mechanically-verifiable change against an already-correct constructor signature; the only realistic risk is an existing test that (incorrectly) asserts on the current TypeError text, which would need correcting, not treated as a reason to revert.
Low — Work Item B only changes outgoing request headers; no control-flow or return-value change, so it cannot affect any existing assertion about parsed content or status.
None — no risk from Work Items C/D since no code changes are proposed for them.
10. Explicit Non-Goals
Do not add a new PDF/content-type guard — one already exists.
Do not rename or restructure fetch_and_apply()'s status vocabulary.
Do not touch _check_qlfs(), _check_gdp(), _check_cpi(), _check_population() — their WAF handling is correct and untouched by the bug.
Do not consolidate the 5-way duplicated WAF-marker scan (L1) — deliberately deferred, unaffected by this fix.
Do not write new CPI candidate-URL patterns without a human-verified real URL.
Do not introduce browser automation, Playwright, or Selenium.
11. Final GO / NO-GO Assessment

Conditional GO for Work Items A and B as scoped here — both are small, isolated, fully test-covered, and correct exactly one confirmed defect plus one confirmed inconsistency. NO-GO for declaring the Stats SA adapter fully production-ready, independent of this fix: CPI remains non-functional pending manual URL investigation (a human, not an engineering task), and QLFS/GDP/Population's Excel discovery remains structurally unresolved (detection works via the PDF probe; real Excel data still cannot be staged end-to-end). Conditions for full production readiness: (1) Work Items A/B merged and tested; (2) a human-confirmed CPI publication URL pattern implemented and tested, or CPI explicitly excluded from any production claim; (3) CURRENT_STATE.md accurately reflects that QLFS/GDP/Population's write path is "detection-capable, Excel-staging-incapable" until a real discovery mechanism exists.