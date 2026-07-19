# Implementation Spec: Stats SA Release-Hub WAF Access

**Status:** Investigation complete — proposed for implementation
**Author:** Lead architect (this document)
**Date:** 2026-07-19
**Milestone type:** Access/infrastructure only — no parsing, transform, validation, staging, approval, or promotion logic is touched.

---

## 0. Investigation method

This document is based on direct inspection of the code as it exists in
`automation.zip`, not on assumptions about what the adapter "should" do:

- `automation/adapters/statss.py` (the full `StatsSAAdapter` implementation)
- `automation/core/http_client.py`, `automation/core/retry.py`, `automation/adapters/base.py`
- `automation/config/sources/statssa.yaml`, `automation/config/automation.yaml`
- `automation/runner.py` (CLI dispatch — confirms exactly what `--adapter statssa`
  without `--apply` does and does not invoke)
- `automation/reports/archive/2026-07-19/run_cfc0d1ae2e99.md` — a real, dated run
  report showing the exact failure described in the task
- `CURRENT_STATE.md`, `CHANGELOG.md`, `automation/docs/developer-guide.md`,
  `SA-Data-Hub-Dataset-Sourcing-Plan.md`, `SA-Data-Hub-Automation-Architecture.md`

No code was written or modified to produce this document. Where a claim could
not be verified from the artifacts above (e.g. whether `statssa.gov.za`'s
Incapsula tier requires JavaScript execution, or whether the direct
publication-URL path is *currently* still reachable), it is flagged
explicitly as an assumption, not stated as fact. My own sandboxed environment
for this task has network egress restricted to a fixed allow-list that does
not include `statssa.gov.za`, so I could not independently re-test live
reachability while writing this spec — this is disclosed here rather than
elided, and is itself a relevant infrastructure fact (§2.4).

---

## 1. Problem statement

`python -m automation.runner --adapter statssa` (detection-only; no `--apply`)
calls `StatsSAAdapter.run()` → `check_for_updates()` for each of the
adapter's nine datasets. For the QLFS family (`unemployment`,
`youth-unemployment`, `labour-force`) and for `gdp`, this dispatches to
`_check_qlfs()` / `_check_gdp()`, both of which fetch a release-hub page —
`https://www.statssa.gov.za/?page_id=1854&PPN=P0211` (QLFS) and
`...&PPN=P0441` (GDP) — to compute a content-hash change signal.

The confirmed, reproduced symptom (`reports/archive/2026-07-19/run_cfc0d1ae2e99.md`):

```
Dataset unemployment: check failed — WAF_BLOCKED: Incapsula WAF challenge detected.
Dataset youth-unemployment: check failed — WAF_BLOCKED: Incapsula WAF challenge detected.
Dataset labour-force: check failed — WAF_BLOCKED: Incapsula WAF challenge detected.
Dataset gdp: check failed — WAF_BLOCKED: Incapsula WAF challenge detected.
```

The adapter behaves correctly here — it fails loudly with a distinct,
diagnosable status rather than silently misreading a WAF challenge page as
"no change" or "new release." The problem is entirely upstream: the adapter
cannot currently obtain a real signal (page content, ETag, or file) from the
one URL it queries for detection.

This in turn blocks the stated downstream goal: `parse_qlfs_workbook()` and
`parse_gdp_workbook()` have only ever been exercised against synthetic
fixtures (confirmed in both functions' module-docstring "verification
status" sections and in `CURRENT_STATE.md` §5–§7). Reliable access to a real
release document is the prerequisite for that first empirical test — this
spec's job is to get a real file into the pipeline, not to touch the parser.

---

## 2. Root cause analysis

### 2.1 Exactly where the WAF occurs

The WAF challenge is hit at **one specific class of URL**: the WordPress-style
release-hub page built from `_RELEASE_HUB_BASE = "https://www.statssa.gov.za/?page_id=1854"`
(`_QLFS_HUB_URL`, `_GDP_HUB_URL`). This is fetched by:

- `_fetch_release_hub_html()` — the shared helper, used by `_discover_qlfs_excel()` /
  `_discover_gdp_excel()` (only reachable from `fetch_and_apply()`, i.e. `--apply`)
- `_check_qlfs()` and `_check_gdp()` — each contains its own **inline, duplicated**
  copy of the same WAF-marker scan (documented in the code as a deliberate,
  not-yet-refactored duplication — see the comment above `_check_gdp()`'s WAF
  check), invoked by plain `check_for_updates()`, i.e. every `--adapter statssa`
  run with no flags.

This is the exact code path the task's reproduction hit, since `--apply` was
not used.

**What is *not* confirmed blocked, because it was never exercised in this
failure:** `_QLFS_PUBLICATION_BASE` / `_GDP_PUBLICATION_BASE`
(`https://www.statssa.gov.za/publications/P0211/` and `.../P0441/`), probed by
`_probe_qlfs_publication_url()` / `_probe_gdp_publication_url()`. These are
only called from inside `fetch_and_apply()`, which only runs under `--apply`
— not exercised by the reported `--adapter statssa` run. The module docstring
records a prior finding (dated 2026-07-12, source: code comment, not an
automated test) that this path is "confirmed accessible without WAF." That
finding predates this session and has not been re-verified here. This
distinction — hub page blocked vs. direct-file path status unknown — is the
single most important fact this investigation surfaces, because it directly
determines which of §5's approaches is actually necessary.

### 2.2 Current detection logic (review)

`_fetch_release_hub_html()` / the inline copies in `_check_qlfs()` and
`_check_gdp()` do the following, verified from source:

1. Issue a plain `HTTPClient.get()` (`urllib`-based, no cookie jar, no
   JS execution) against the hub URL.
2. Decode the body as UTF-8 (`errors="replace"`).
3. Scan for the literal substrings `_Incapsula_Resource` or `incapsula`
   (case-insensitive).
4. If found, raise/return a distinct `WAF_BLOCKED` status rather than
   computing a content hash from the challenge page.

This is a **correct and adequate design for what it does**. Per the
2026-07-16 hardening-sprint history (`CHANGELOG.md`, `developer-guide.md`
"Known Open Item: Stats SA QLFS WAF Signal"), this guard was added
specifically to close a prior review finding: hashing an undetected WAF
challenge page risked misreporting a block as "no_change" or "update
available." The current code cannot make that mistake — it fails loudly and
distinguishably, which is the right behavior for a system with a human
approval gate downstream. **This detection logic should be kept, unchanged
in its detection semantics**, for exactly the reason it was built: it is the
safety property, not the access problem.

Two non-functional issues are worth naming (not fixing here, per constraints):

- The WAF-marker scan is duplicated verbatim in three places
  (`_fetch_release_hub_html()`, `_check_qlfs()`, `_check_gdp()`) — already
  flagged in the code itself as a known, deliberately deferred refactor
  ("consolidating this is a future refactor, out of scope here"). This spec
  agrees it is out of scope, but any new hub-adjacent detection logic
  proposed in §5 must not add a *fourth* copy — see §7.
- `check_for_updates()` currently maps a WAF block to `status="error"`. Per
  `base.py`, an `"error"` status on any single dataset check sets the whole
  adapter result to `status="error"` (via `add_warning` → the dataset-level
  `"error"` status triggers `result.add_warning`, and `result.errors` being
  non-empty forces `AdapterResult.status = "error"` in `run()`'s final
  status computation) — actually, tracing `base.py` precisely: a
  dataset-level `status="error"` triggers `result.add_warning(...)`, which
  appends to `result.warnings`, not `result.errors`; the adapter's overall
  status becomes `"warning"`, matching the real run report's `⚠️ WARNING`
  header. This is accurate today and does not need to change: "we could not
  determine dataset status" is correctly a warning, not a hard adapter
  failure. Kept as background, not a change item.

### 2.3 Should the existing probe strategy remain?

**Yes.** `_probe_qlfs_publication_url()` / `_probe_gdp_publication_url()`
(direct candidate-URL construction + probing under `_QLFS_PUBLICATION_BASE` /
`_GDP_PUBLICATION_BASE`) is architecturally sound and should not be replaced:

- It reuses the existing `HTTPClient` / `STATSSA_POLICY` retry machinery
  unmodified.
- It is the one documented, if unverified, data point suggesting a
  WAF-free path exists on this domain (§2.1).
- It already fails gracefully (`None` return, not an exception, on
  exhausted candidates), which `fetch_and_apply()` already handles via its
  `no_publication_found` status.

Its known weakness is **not** the WAF — it is that the candidate-filename
list (`_build_qlfs_candidate_urls()` / `_build_gdp_candidate_urls()`) is a
guessed, unconfirmed naming convention (explicitly documented as such in
both functions and in `CURRENT_STATE.md`). That is a discovery-accuracy
problem, not an access problem, and this spec treats it as **out of scope**
(§4.2) — it is the natural next question only *after* reachability is
confirmed, and conflating the two would violate the "only change what is
required to solve the WAF access problem" constraint.

### 2.4 A structural fact worth naming: sandboxed execution environments

Every session that has worked on this codebase to date — per `statss.py`'s
own module docstring, `CHANGELOG.md`, and `CURRENT_STATE.md` §5 — records
"no session to date has had network access to `statssa.gov.za`." This
session's task description implies a *different* environment (the one
running `python automation/runner.py --adapter statssa`) does have network
access, since it produced a real WAF response rather than a connection
failure. My own environment for writing this spec does not have
`statssa.gov.za` on its network allow-list at all (confirmed from this
session's own tool configuration) — a `ConnectionError`/DNS failure, not a
WAF block, would be the failure mode here.

This matters for implementation planning: **whichever environment eventually
runs this adapter unattended (a CI runner, a scheduled job, a developer's own
machine) needs both (a) an outbound network allow-list that includes
`statssa.gov.za`, and (b) an IP/network profile that Incapsula does not
already reputation-flag** (e.g. shared CI-provider IP ranges are more likely
to be pre-flagged than a residential/office IP — this is a general,
well-documented Incapsula behavior, not statssa.gov.za-specific, and is
flagged as an assumption about Incapsula's general operation, not a verified
fact about this specific deployment). This is an operational prerequisite
independent of any code change proposed below, and should be confirmed
before Phase 1 (§9) is attempted from whatever environment will run it in
production.

---

## 3. Current architecture (as built)

```
runner.py --adapter statssa [--apply]
        │
        ▼
StatsSAAdapter.run()                          (base.py, unchanged by this spec)
        │
        ▼
check_for_updates(dataset_id, cfg)            (statss.py)
        │
        ├── QLFS family → _check_qlfs() ──────► GET _QLFS_HUB_URL (?page_id=1854&PPN=P0211)
        │                                          │
        │                                          ├─ Incapsula marker found → WAF_BLOCKED (status="error")
        │                                          ├─ unchanged → status="up_to_date"
        │                                          └─ changed   → status="update_available"
        │
        └── gdp → _check_gdp() ────────────────► GET _GDP_HUB_URL (?page_id=1854&PPN=P0441)
                                                     (identical structure, duplicated code)

fetch_and_apply() [only under --apply]
        │
        ├── _discover_qlfs_excel() → _fetch_release_hub_html() (same hub URL, same WAF guard)
        │        │
        │        └── on success: _extract_excel_url() scrapes an <a href> from hub HTML
        │
        ├── _probe_qlfs_publication_url() → GET candidate URLs under
        │        _QLFS_PUBLICATION_BASE ("confirmed accessible without WAF", 2026-07-12,
        │        unverified this session) — PRIMARY discovery strategy per the
        │        function's own docstring; HTML-scrape above is the fallback
        │
        ├── _download_publication() → archive → parse_qlfs_workbook() → transform → validate
        │        → write_staged_dataset() → save_version_entry()  [pending, gated]
        │
        └── (independent, mirrored GDP flow — same structure, same WAF caveats)
```

`HTTPClient` (`core/http_client.py`) is intentionally stdlib-only
(`urllib.request`), sends a self-identifying User-Agent
(`SA-Data-Hub-Automation/0.1 (...; data-automation-bot)`) plus an
`Accept: text/html,application/xhtml+xml,*/*` header for hub fetches, and
nothing else — no cookie jar, no TLS fingerprint tuning, no JavaScript
execution capability. `retry.py` provides `STATSSA_POLICY` (up to 5 attempts,
2 h max delay — explicitly calibrated for release-day server load, not for
WAF challenges, which are not classified as retryable by `_is_retryable()`
since `AutomationHTTPError` isn't in that set unless its status is ≥500).

---

## 4. Scope

### 4.1 In scope

- Diagnosing and, where the evidence supports it, fixing **why the adapter
  cannot get a usable HTTP response from official Stats SA release
  infrastructure** for the QLFS and GDP flows.
- Deciding whether the release-hub URL should remain the primary detection
  signal, and if not, what (already-existing) mechanism should take over
  that role.
- Any change to `HTTPClient` request behavior (headers) needed to test
  whether the block is header/UA-driven rather than JS-challenge-driven.
- A **documented, evidence-gated decision** on whether browser automation is
  warranted, and if so, the minimal integration shape — without actually
  adding it in this milestone unless Phase 1's empirical test proves it
  necessary (§9).
- A one-time, low-cost spike to check whether Stats SA's general
  time-series download page / SuperWEB2 tool (referenced in
  `SA-Data-Hub-Dataset-Sourcing-Plan.md` item 5) is a viable, non-WAF-gated
  alternative signal — investigation only, no adapter change committed
  until reachability is confirmed.

### 4.2 Out of scope

Per the task's explicit constraints, and confirmed independently correct by
this investigation (none of the below is implicated in the WAF problem):

- `parse_qlfs_workbook()` / `parse_gdp_workbook()` and their label-matching
  specs (`_QLFS_METRIC_SPECS`, `_GDP_GROWTH_SPEC`) — unaffected by access
  method; their own empirical-verification gap (§1) is a *downstream*
  problem this spec unblocks but does not solve.
- `_transform_unemployment()` / `_transform_youth_unemployment()` /
  `_transform_labour_force()` / `_transform_gdp()` / `_apply_gdp_growth_points()`
  / `_apply_qlfs_rate_map()`.
- `check_protected_fields()`, `_validate_percentage()`,
  `_validate_gdp_growth_rate()`, `_check_qoq_jump()`.
- `core/staging.py`, `core/version.py`, `core/promote.py`, the
  approve/reject/promote CLI flow.
- The `_QLFS_PUBLICATION_BASE`/`_GDP_PUBLICATION_BASE` **candidate-filename
  guessing logic** itself (`_build_qlfs_candidate_urls()` /
  `_build_gdp_candidate_urls()`) — improving the accuracy of the guessed
  naming convention is a separate, follow-on piece of work once reachability
  is confirmed (see §11, Remaining Work).
- CPI, population, housing, census, municipalities — untouched.
- Any change to the SARB or SAPS or World Bank adapters.
- Browser automation **implementation** (only its evaluation is in scope —
  see §5.C and §9 Phase 2 gating).
- Any anti-bot bypass technique that relies on TLS/JA3 fingerprint spoofing,
  header forgery beyond ordinary browser-equivalent headers, CAPTCHA
  solving, or third-party scraping-proxy services. These are explicitly
  rejected in §5.F as inappropriate for a public-good project accessing a
  government data source, independent of technical feasibility.

---

## 5. Approaches investigated

Six candidate approaches were evaluated against the existing architecture.
For each: advantages, disadvantages, maintenance cost, reliability,
compatibility with the current framework, and any assumption the approach
depends on.

### A. Direct publication/document URLs (already partially implemented)

The existing `_probe_qlfs_publication_url()` / `_probe_gdp_publication_url()`
mechanism, used as both the discovery **and** potentially the detection
signal.

- **Advantages:** Already built and tested against synthetic fixtures; the
  only path in the codebase with any documented (if unverified) evidence of
  being WAF-free; reuses 100% of existing `HTTPClient`/`STATSSA_POLICY`
  infrastructure with zero new dependencies; deterministic, auditable, easy
  to reason about in code review.
- **Disadvantages:** The candidate-filename list is a guess, not a confirmed
  convention (out of scope to fix here, §4.2); provides no cheap
  "has anything changed" signal on its own — a full or partial file
  probe/download is needed to know; if Stats SA changes their static-file
  hosting path (e.g. moves off `/publications/P0211/`), this breaks
  silently until the candidate list is updated.
- **Maintenance cost:** Low, assuming the naming-guess problem (out of
  scope) is handled separately. Otherwise **Medium**, since every release
  with an unrecognized filename requires a manual candidate-list update.
- **Reliability:** Currently **unverified** for QLFS/GDP in production (no
  real run has completed this path successfully); the SARB-equivalent
  pattern (API-based, not file-probing) has no analogue here to compare
  against. Rated **medium-high** conditional on §9 Phase 1's empirical test
  passing.
- **Compatibility:** Full — no architectural change required to keep using
  it; only the *role* it plays (primary vs. fallback detection signal)
  changes under this spec's recommendation (§6).
- **Assumption stated explicitly:** the 2026-07-12 code-comment claim that
  `_QLFS_PUBLICATION_BASE`/`_GDP_PUBLICATION_BASE` are WAF-free has not been
  re-verified in this session and must be the first thing confirmed in
  Phase 1 before anything else in this document is actioned.

### B. Browser-like request headers (header/UA hardening only, no JS execution)

Adding a fuller, ordinary-browser-equivalent header set (`Accept-Language`,
`Accept-Encoding`, `Sec-Fetch-*`, a non-"bot"-labelled `User-Agent`, a
`Referer` consistent with organic navigation) to `HTTPClient` calls made
against `statssa.gov.za`, with no change to the underlying `urllib` transport.

- **Advantages:** Cheapest possible change; no new dependency; directly
  testable in isolation (compare hub-fetch outcome with and without the
  richer header set); worth doing regardless of outcome, since the current
  User-Agent (`SA-Data-Hub-Automation/0.1 ...data-automation-bot`)
  self-identifies as a bot, which is itself a plausible contributing signal
  to Incapsula's bot-scoring — though this framework's honesty about being
  an automated client is also a defensible design choice on its own
  merits, worth flagging as a tradeoff, not a free win.
- **Disadvantages:** The observed response contains an
  `_Incapsula_Resource` marker, which is characteristic of Incapsula's
  interstitial JS/cookie-challenge tier (the page that would normally run a
  JavaScript check and set a `reese84`/`incap_ses` cookie before letting a
  real request through), not merely a header-based block. Header changes
  alone are very unlikely to satisfy a JS-challenge tier, since no
  JavaScript is executed by `urllib`. This is stated as an assumption based
  on the general, widely documented behavior of Incapsula's challenge
  pages — not confirmed for this specific Stats SA deployment, since no
  live re-test was possible in this session (§0, §2.4).
- **Maintenance cost:** Very low — a handful of static header values in
  `_build_http_client()`.
- **Reliability:** Low-to-medium; should be attempted first for its
  near-zero cost, but should not be assumed sufficient without an empirical
  test (§9 Phase 1, sub-step).
- **Compatibility:** Full — `HTTPClient(extra_headers=...)` already supports
  this with no signature change.

### C. Full browser automation (headless browser to solve the JS/cookie challenge)

Using a headless browser engine (e.g. Playwright) to load the release-hub
page, let its JavaScript execute and satisfy the Incapsula challenge,
extract the resulting session cookies, and hand those cookies to the
existing `HTTPClient` for subsequent requests — or use the browser directly
to download the file.

- **Advantages:** The most technically reliable way to satisfy a genuine
  JS/cookie challenge, if that is in fact what is being served (see B's
  caveat); could also serve as a fallback for the HTML-scrape discovery
  path (`_extract_excel_url()`) if the hub becomes reachable this way.
- **Disadvantages:** This is the most disruptive option relative to the
  framework's own stated design principle in `http_client.py`
  ("stdlib-only, no external dependency... intentionally thin"); adds a
  browser-binary runtime dependency that must be provisioned in whatever
  environment eventually runs this (CI, cron host), which is a materially
  larger operational footprint than anything else in `automation/`; slower
  per-run (seconds-to-tens-of-seconds vs. sub-second `urllib` calls);
  headless-browser detection is itself an active arms race on Incapsula's
  side, so this is not a one-time fix but an ongoing maintenance
  commitment; and — independent of technical feasibility — deliberately
  defeating a security control on a government website's public data
  release page raises a compliance/terms-of-use question that is a
  business decision, not an engineering one, and should not be made
  implicitly by shipping code.
- **Maintenance cost:** **High** — new dependency, new CI/runtime
  provisioning, ongoing arms-race maintenance.
- **Reliability:** Potentially **high** if the challenge is genuinely
  JS-based, but operationally fragile over time.
- **Compatibility:** **Poor** relative to the existing architecture — this
  is the only approach that would require a new fetch abstraction alongside
  (not instead of) `HTTPClient`, since the rest of the adapter (retry
  policy, archive, parse, stage) has no reason to change.
- **Recommendation:** Do not adopt in this milestone. Revisit only if Phase
  1 (§9) empirically proves the direct-URL path (§5.A) is *also*
  WAF-blocked, and even then, treat it as a decision requiring explicit
  product/compliance sign-off before implementation, not a default
  engineering fallback.

### D. Cached/manually-refreshed release metadata

A small, human-refreshable state artifact (e.g. a JSON file recording the
last known release period and file URL per publication, analogous to the
existing `qlfs_hub.sha256` / `gdp_hub.sha256` hash-cache files), updated
out-of-band by a person occasionally checking the hub in a real browser, used
as a fallback detection signal when both the hub fetch and the direct-URL
probe fail.

- **Advantages:** Fully sidesteps the WAF for the *detection* signal;
  trivially cheap to build; consistent with the architecture's existing,
  deliberate human-in-the-loop philosophy (the same philosophy that already
  gates every write with `--approve`/`--promote`); does not block or depend
  on any other approach — it is a safety net, not a replacement.
- **Disadvantages:** Not real-time; requires a person to actually do the
  manual check (this is a discipline/process risk, not a technical one);
  does not by itself solve `fetch_and_apply()`'s need for a *working,
  fetchable* file URL — approach A (or a human-supplied URL fed into the
  same field) is still required to actually retrieve the document.
- **Maintenance cost:** Low, ongoing (a recurring calendar reminder, not a
  one-time engineering task).
- **Reliability:** High *for its narrow purpose* (a quarterly, predictable
  release calendar already exists in `_QLFS_RELEASE_WINDOWS` /
  `_GDP_RELEASE_WINDOWS`), low if the human step is skipped.
- **Compatibility:** Full — additive, no change to existing hash-cache
  mechanism required; can literally sit next to `qlfs_hub.sha256` as
  `qlfs_last_known_good.json` / `gdp_last_known_good.json`.

### E. Alternative official Stats SA endpoints (general time-series download page, SuperWEB2/SuperCROSS)

`SA-Data-Hub-Dataset-Sourcing-Plan.md` (item 5, cross-cutting finding) notes
that Stats SA, in addition to the per-release PDF/Excel pattern, publishes "a
general time-series Excel/ASCII download page and an interactive
SuperWEB2/SuperCROSS query tool." Neither has been evaluated against the WAF
in any session to date.

- **Advantages:** If hosted on a different subdomain or served through a
  different application stack than the WordPress-based `?page_id=` hub,
  Incapsula policy could plausibly differ per-path/per-subdomain (a general,
  documented WAF administration pattern — see §0's search findings —
  not something confirmed for this specific Stats SA deployment). Worth a
  cheap look before investing further in either A or C.
- **Disadvantages:** Completely unconfirmed reachability, content shape, and
  machine-readability. `SuperWEB2` tools are, in Stats SA's general usage
  pattern and in the broader family of statistical-agency SuperWEB2
  deployments, typically stateful, session/cookie-driven interactive web
  applications built for human point-and-click querying, not simple
  GET-a-file endpoints — this is a general characteristic of the SuperWEB2
  product line, stated as an assumption, not verified against Stats SA's
  specific instance. If true, integrating it would require a materially
  different, session-aware client than anything in `core/http_client.py`
  today — a change of similar architectural weight to browser automation
  (§5.C), not a lightweight addition.
- **Maintenance cost:** Unknown until investigated; potentially **high** if
  session-stateful interaction is required.
- **Reliability:** Unknown.
- **Compatibility:** Good *if* it resolves to a plain fetchable file URL;
  poor *if* it requires interactive session handling.
- **Recommendation:** A time-boxed, read-only reachability spike (§9 Phase
  0) — check whether the page loads and whether the WAF marker appears —
  before any commitment to build against it. If the time-series download
  page turns out to be a plain static-file listing, it would be a strictly
  better long-term detection surface than the `?page_id=` hub, since a
  single stable listing page could serve all of QLFS, GDP, CPI, MYPE, and
  GHS rather than one hub-URL guess per publication code.

### F. Third-party anti-bot bypass services / TLS-fingerprint spoofing / CAPTCHA solving

Commercial scraping-proxy services or fingerprint-spoofing libraries
specifically marketed at defeating Incapsula (referenced generically in
public documentation on the topic, not evaluated against any specific
vendor here).

- **Advantages:** None weighed as relevant to this project — see below.
- **Disadvantages:** Introduces a paid, external, third-party data-flow
  dependency for a project whose own `ai-context.md` explicitly states
  "Prefer simple, maintainable solutions over enterprise patterns" and is
  described as a "portfolio + public good" solo project; deliberately
  defeating a security control via fingerprint spoofing on a government
  website is a compliance/ethics question this document is not positioned
  to resolve, and — separately from that question — is simply
  disproportionate engineering weight for what remains, at its core, a
  request for one publicly-available quarterly Excel file.
- **Maintenance cost:** N/A — rejected.
- **Reliability:** N/A — rejected.
- **Compatibility:** N/A — rejected.
- **Recommendation:** Do not pursue. Included here only because the task
  asked for investigation to be exhaustive ("including but not limited
  to"); this is the one approach in the survey with no scenario in this
  project's context where it should be adopted.

---

## 6. Proposed solution

Given §5's findings, the recommended architecture makes the **smallest
change consistent with the evidence**, in two tiers:

### 6.1 Tier 1 — request-hardening + role change for the existing probe (no new dependency)

1. Add an ordinary-browser-equivalent header set to `_build_http_client()`
   for Stats SA requests only (approach B) — cheap, zero-risk, testable in
   isolation as the very first empirical step.
2. **Promote the existing direct-URL probing mechanism (approach A) from
   "fetch_and_apply-only, fallback-only" to a role it can also play in
   `check_for_updates()`.** Concretely: when the hub fetch in `_check_qlfs()`
   / `_check_gdp()` returns `WAF_BLOCKED`, instead of stopping at
   `status="error"`, fall through to a lightweight reachability probe
   (`HEAD`, or a `GET` capped by an early-abort on `Content-Length`/status —
   no full download) against the current-quarter candidate URLs already
   computed by `_determine_current_qlfs_quarter()` /
   `_determine_current_gdp_quarter()` and `_build_qlfs_candidate_urls()` /
   `_build_gdp_candidate_urls()`. This changes `check_for_updates()`'s
   *outcome* on a WAF block from an undifferentiated `"error"` to one of:
   - a candidate file is reachable → `status="unknown"` with
     `notes` pointing at the found URL and a message explicitly stating
     this is a probe-based signal, not a hub-diff signal, so a human knows
     to treat it differently from the QLFS/GDP change-detection status they
     are used to reading;
   - no candidate is reachable either → keep today's `status="error"`
     behavior unchanged, since this genuinely is the same "we cannot tell"
     state the adapter already reports correctly.

   This is additive to `_check_qlfs()`/`_check_gdp()`, does not change their
   non-WAF-blocked code paths at all, and does not touch
   `fetch_and_apply()`'s own use of the same probing functions.
3. Do **not** consolidate the three duplicated WAF-marker scans (§2.2) as
   part of this change — that refactor is legitimate but orthogonal, and
   bundling it here would violate "minimise code changes" for no access-
   related benefit. Recorded as a follow-on item (§11).

### 6.2 Tier 2 — evidence-gated escalation (conditional, not committed)

4. Run the Phase 0 reachability spike for approach E (alternative
   endpoints) as pure investigation — no adapter code change unless it
   returns a positive, simple (non-session-stateful) result.
5. **Explicitly do not implement browser automation (approach C) in this
   milestone.** Its adoption is gated on a negative Phase 1 result for
   approach A/B (§9) *and* a separate, explicit decision outside this
   spec's engineering scope. This is the correct "smallest architectural
   change" answer required by the task's own fallback instruction: if the
   WAF cannot be addressed within the current architecture, the smallest
   necessary change is Tier 1 above, not a browser-automation rewrite,
   until Tier 1 is empirically proven insufficient.

### 6.3 What does not change

- The WAF-detection logic itself (§2.2) — kept exactly as-is; it is correct.
- `parse_qlfs_workbook()` / `parse_gdp_workbook()` and everything downstream
  of a successfully retrieved file — untouched, per the task's constraints,
  and because nothing in this investigation implicates them.
- The staging/approval/promotion pipeline — untouched; nothing here writes
  data any differently than today.
- `STATSSA_POLICY` retry semantics — a WAF block is correctly *not*
  currently retried by `with_retry()`'s policy (a 403-class
  `AutomationHTTPError` is non-retryable per `_is_retryable()`), which is
  correct: retrying an unmodified request against an active WAF challenge
  wastes the 2-hour backoff budget on a class of failure retries cannot fix.
  This spec's Tier 1 change does not alter that.

---

## 7. Expected files to change

All changes are confined to `automation/adapters/statss.py` and its test
file, plus documentation. No other module in `automation/` needs to change
to implement Tier 1.

| File | Nature of change |
|---|---|
| `automation/adapters/statss.py` | `_build_http_client()`: add browser-equivalent headers for Stats SA requests (approach B). `_check_qlfs()` / `_check_gdp()`: on `WAF_BLOCKED`, fall through to a lightweight probe against `_probe_qlfs_publication_url()` / `_probe_gdp_publication_url()` (or a new, cheaper `HEAD`-based sibling if a full `GET` proves wasteful in practice — see §9) before returning; new `status="unknown"` branch with an explicit, distinct message. No change to `_fetch_release_hub_html()`'s own detection semantics, to `fetch_and_apply()`'s existing use of the same probing functions, to any transform/validate/stage code, or to `describe()`'s existing keys (a new note may be *added* to `describe()`'s existing `phase_*_status` strings, consistent with how GDP's status was added in Phase 3a, but no existing key changes shape). |
| `automation/adapters/tests/test_statss.py` | New tests only, appended in the same style as the existing 53 (see §8). No existing test is modified, since no existing behavior changes. |
| `automation/docs/developer-guide.md` | Update the "Known Open Item: Stats SA QLFS WAF Signal" section with this milestone's findings: confirmed hub-block evidence (dated, this session), the still-open direct-URL-path status, and the new fallback-probe behavior in `check_for_updates()`. |
| `CHANGELOG.md` | New dated entry describing exactly what changed, following the existing entry style/verbosity in this file. |
| `CURRENT_STATE.md` | Update §5 (Known Limitations) to reflect whichever outcome Phase 1 (§9) actually produces — this file is explicitly described as "verified by direct execution... not by summary," so it must not be updated speculatively ahead of the real run. |

No change to: `core/http_client.py`, `core/retry.py`, `core/staging.py`,
`core/version.py`, `core/promote.py`, `core/metadata.py`, `adapters/base.py`,
`adapters/sarb.py`, `adapters/saps.py`, `adapters/worldbank.py`,
`config/sources/statssa.yaml` (unless Phase 0 (§9) surfaces a genuinely new
endpoint worth adding as a documented URL constant — see §11), or any
`src/data/datasets/*.json` file.

---

## 8. Required tests

All new tests are unit tests with the network layer mocked, following the
existing pattern in `test_statss.py` (which already mocks `HTTPClient.get`
for both QLFS and GDP flows) — no test in this milestone requires live
network access, consistent with how every other test in this suite already
works.

1. `_check_qlfs()` / `_check_gdp()`: hub fetch returns an Incapsula-marker
   body, direct-URL probe **succeeds** → result is `status="unknown"`
   (not `"error"`), with `notes` naming the probe-found URL and stating
   explicitly that this is a probe-based, not hub-diff-based, signal.
2. `_check_qlfs()` / `_check_gdp()`: hub fetch returns an Incapsula-marker
   body, direct-URL probe **also fails** (all candidates 404/unreachable)
   → result is `status="error"` with the existing `WAF_BLOCKED` message,
   proving today's fallback behavior is preserved when the new path
   provides no signal.
3. `_check_qlfs()` / `_check_gdp()`: hub fetch succeeds normally (no WAF
   marker) → unchanged from today's existing tests; explicitly assert the
   new fallback probe is **not** invoked in this case (e.g. via a mock
   call-count assertion), to prove Tier 1 is additive-only and does not
   change the non-blocked code path.
4. `_build_http_client()`: the new header set is present on the request
   object passed to `HTTPClient` for Stats SA calls (a direct assertion on
   constructed headers, not a live-network test).
5. A regression run of the full existing 53-test suite, unmodified, must
   still pass — proving no existing behavior changed.

Explicitly **not** required by this milestone (would depend on parser/
transform code out of scope, §4.2): any test asserting on
`parse_qlfs_workbook()`/`parse_gdp_workbook()` output against a real file,
since no real file exists yet to build such a fixture from truthfully.

---

## 9. Implementation phases

### Phase 0 — Investigation spike (no code change; time-boxed)

From an environment with genuine `statssa.gov.za` network access (not this
authoring session, per §2.4):

1. Re-fetch `_QLFS_HUB_URL` / `_GDP_HUB_URL` with the current, unmodified
   headers and record the raw response (status, headers, first 2 KB of
   body) — establishes a dated, reproducible baseline beyond the one run
   report already captured.
2. Fetch `_QLFS_PUBLICATION_BASE` / `_GDP_PUBLICATION_BASE` directly (e.g.
   the base path itself, or one plausible candidate) and record whether an
   Incapsula marker appears. **This single data point determines whether
   Tier 2 (§6.2) is even a live question.**
3. With the browser-equivalent headers from §6.1 step 1 applied, repeat
   step 1 against the hub URL and record whether the outcome changes.
4. Spend no more than a few requests checking whether Stats SA's general
   time-series download page (approach E) loads without a WAF marker.
   Do not attempt to script SuperWEB2 interaction in this phase — a single
   page-load check is sufficient to decide whether it merits further work.

Deliverable: a short, dated findings note appended to
`automation/docs/developer-guide.md`'s existing WAF section, stating exactly
what was observed for each of the four checks above — closing (or formally
re-opening with new detail) the "is this deterministic/WAF-free" question
that has been carried as an open item since 2026-07-16.

### Phase 1 — Tier 1 implementation (gated on Phase 0's findings)

- If Phase 0 step 2 confirms the direct-URL path is reachable: implement
  §6.1 exactly as specified — header hardening + `check_for_updates()`
  fallback probe. This is the expected, minimal-change outcome.
- If Phase 0 step 2 shows the direct-URL path is *also* WAF-blocked: Tier 1
  as specified provides no benefit for detection, but the header-hardening
  half (§6.1 step 1) should still be attempted and measured in isolation
  before escalating, since it is nearly free. If headers alone don't help
  either, this is the trigger condition for Tier 2 (§6.2) — document the
  negative result and route the browser-automation decision to whoever owns
  the compliance/product call, rather than implementing it unilaterally.

### Phase 2 — Verification against the live pipeline

- A real (not `--dry-run`) `python -m automation.runner --adapter statssa`
  detection run, from an environment with genuine access, confirming the
  new `status="unknown"` (or continued `status="error"`, per Phase 1's
  branch) appears as expected and that no dataset regressed to a worse
  status than before.
- If Phase 0/1 also happened to yield a working file URL: an `--apply`
  --dry-run` run to check whether `parse_qlfs_workbook()`/
  `parse_gdp_workbook()` succeed against a real file for the first time.
  **This is explicitly a bonus outcome of this milestone, not its goal** —
  a parse failure here is expected-possible per the parser's own documented
  verification status (§1) and must not be treated as a regression of this
  WAF-access milestone; it would simply become the next, separate, already-
  anticipated piece of work (§11).

---

## 10. Documentation updates

- `automation/docs/developer-guide.md` — Phase 0's dated findings (§9);
  update the "Known Open Item" section's framing once Phase 0 produces a
  real, dated, request-counted observation (closing the specific gap
  `CURRENT_STATE.md` §5 names).
- `CHANGELOG.md` — one dated entry, in the file's existing style, describing
  exactly which functions changed and why, plus an explicit "Verified (no
  code change)" or "Known Issues" line for whichever Phase 0/1 outcome
  actually occurred (do not pre-write this before the phases run).
- `CURRENT_STATE.md` — §5 (Known Limitations) updated to either (a) close
  the WAF-determinism open item with a dated observation, or (b) formally
  restate it with new detail if Phase 0 shows the direct-URL path is also
  blocked. §6 (Remaining Work) gains or loses the WAF item depending on
  outcome.
- `automation/adapters/statss.py` module docstring's existing "Excel layout
  — verification status" sections should **not** be touched by this
  milestone unless Phase 2's bonus outcome (a real file successfully
  parsed, or failing informatively) actually occurs — updating them
  speculatively would misrepresent what this milestone verified.

---

## 11. Risks

- **Medium — Phase 0 may show the direct-URL path is also WAF-blocked**,
  in which case Tier 1 alone does not restore detection capability and the
  project is left choosing between Tier 2 (browser automation, §5.C, high
  cost) and accepting `status="error"`/manual monitoring as the durable
  state for QLFS/GDP detection. This is a real possible outcome, not
  hedging — it is exactly why Phase 0 is a separate, gating phase rather
  than an assumption baked into Tier 1's design.
- **Low — the candidate-filename guessing problem (§4.2, explicitly out of
  scope) means even a WAF-free direct-URL path may still fail to find a
  real file**, independent of this milestone's success. A clean Phase 1
  outcome (WAF resolved) does not guarantee `fetch_and_apply()` succeeds
  end-to-end; it only guarantees the adapter can *try* without being
  blocked. This should be communicated clearly so a partial win here isn't
  mistaken for the whole problem being solved.
- **Low — Incapsula's bot-detection behavior can change over time**
  (general, documented characteristic of the product, not specific to this
  deployment). A Tier 1 fix that works during Phase 0/1/2 testing is not a
  permanent guarantee; the existing WAF-marker detection (§2.2, unchanged)
  is exactly the mechanism that keeps a future re-block from silently
  corrupting data, so its preservation (§6.3) is itself part of this
  milestone's risk mitigation, not just a constraint being honored.
- **Low — operational environment mismatch (§2.4).** If Phase 0 is run from
  a different network/IP profile than the eventual production runner
  (e.g. a developer's laptop vs. a CI runner's shared IP range), a clean
  Phase 0 result may not transfer. Recommend running Phase 0 from
  whichever environment is actually intended to run this in steady state,
  or explicitly re-verifying there before declaring Phase 1 complete.

---

## 12. Acceptance criteria

1. A dated, request-level Phase 0 finding exists in
   `automation/docs/developer-guide.md` for each of the four checks in §9,
   replacing "no session to date has had network access" with an actual
   observation.
2. `_check_qlfs()` and `_check_gdp()` no longer return an undifferentiated
   `status="error"` on every WAF block when a direct-URL fallback signal is
   available — verified by the new tests in §8, items 1–3.
3. The existing WAF-marker detection logic (§2.2) is provably unchanged —
   verified by §8 item 3 (fallback not invoked on the non-blocked path) and
   by the full existing 53-test suite continuing to pass unmodified.
4. No file outside `automation/adapters/statss.py`,
   `automation/adapters/tests/test_statss.py`, and the documentation files
   in §7/§10 is modified.
5. Zero changes to any `src/data/datasets/*.json` file, and zero changes to
   `parse_qlfs_workbook()` / `parse_gdp_workbook()` / any `_transform_*`
   function's logic.
6. If (and only if) Phase 2's bonus outcome occurs (a real file
   successfully retrieved and parsed), that fact is recorded honestly in
   `CURRENT_STATE.md` — including an honest record of a parse *failure* if
   that's what happens, per §1's expectation that this is "expected-
   possible, not a regression."
7. A decision on Tier 2 (browser automation) is explicitly recorded —
   either "not needed, Tier 1 sufficient" or "needed, routed for
   product/compliance sign-off before any implementation" — rather than
   left implicit.

---

## 13. Definition of Done

- Phase 0 findings are committed to `developer-guide.md` with a date and
  request count, per §9.
- Tier 1 code (§6.1) is implemented **only if** Phase 0 shows it will
  provide real signal (§9 Phase 1's gating logic) — implementing it
  unconditionally without Phase 0 evidence is explicitly not "done," even
  if the code compiles and passes mocked tests, because the entire point of
  this milestone is closing an *empirical* gap, not a hypothetical one.
- All required tests (§8) exist and pass; the full existing suite (53
  tests plus new ones) passes with zero regressions.
- `CHANGELOG.md`, `CURRENT_STATE.md`, and `developer-guide.md` are updated
  to reflect the actual, observed outcome — not a hoped-for one.
- The Tier 2 decision (§12 item 7) is explicitly recorded, whichever way it
  goes.
- No parser, transform, validation, staging, approval, or promotion code
  changed, per the task's constraints — confirmed by a diff review against
  §7's file list before this milestone is called complete.

---

## 14. Rollback strategy

Every change proposed here is additive and behind existing control flow
(only reached when a WAF block is already detected), which makes rollback
low-risk by construction:

- **Header hardening (§6.1 step 1):** a single revert of the
  `extra_headers` dict passed to `_build_http_client()` for Stats SA calls.
  No state, cache, or on-disk artifact depends on these headers' presence,
  so reverting is a pure code change with no data migration.
- **`check_for_updates()` fallback probe (§6.1 step 2):** revert the new
  branch in `_check_qlfs()` / `_check_gdp()`; the pre-change behavior
  (`status="error"` on any WAF block) is restored exactly, since the new
  branch only fires *after* the existing WAF check, never replaces it. No
  new persistent state is introduced by this change — it does not touch
  `qlfs_hub.sha256` / `gdp_hub.sha256`'s existing read/write behavior at
  all.
- **No database, staging, or version-store rollback is ever required**,
  since this milestone cannot reach `write_staged_dataset()` or
  `save_version_entry()` on its own — those are only reachable via
  `fetch_and_apply()`, whose parse/transform/stage steps are explicitly
  untouched by this spec (§4.2, §7). A bad Tier 1 change can, at worst,
  cause `check_for_updates()` to report a misleading `status="unknown"`
  when it shouldn't — a monitoring/reporting-quality regression, not a
  data-integrity one, and correctable by reverting the two files in §7
  with no cleanup of production data required.
- If Phase 0 or Phase 1 surfaces a Tier 2 (browser automation) requirement
  and it is subsequently implemented in a **future** milestone (explicitly
  not this one), that future spec must define its own rollback strategy
  separately — this document's rollback guarantees apply only to the Tier 1
  scope actually proposed here.

---

## 15. Explicit answer to the task's fallback instruction

> *"If investigation determines that the WAF cannot be addressed within the
> current architecture, explicitly state that and recommend the smallest
> architectural change necessary."*

The WAF **can** plausibly be addressed within the current architecture,
using infrastructure that already exists (`HTTPClient`, the existing direct-
URL probing functions, the existing retry policy) — **conditional on Phase
0's empirical confirmation that the direct-publication-URL path is
reachable**, which is the one fact this investigation could not verify from
this authoring session (§2.4). If that confirmation fails, the smallest
architectural change necessary is still **not** browser automation by
default — it is accepting `status="error"`/manual monitoring as the interim
state for QLFS/GDP detection (a zero-code-change, already-correct fallback
the adapter already implements today) while a Tier 2 decision is made
deliberately, outside this document's engineering scope, rather than
reactively.
