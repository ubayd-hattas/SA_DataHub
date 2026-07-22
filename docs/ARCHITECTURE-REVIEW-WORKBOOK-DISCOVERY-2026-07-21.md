# SA Data Hub — Workbook Discovery Architecture Review

**Date:** 21 July 2026
**Status:** Review only — no implementation, no patches, no spec
**Scope:** Narrowed from the broader source-acquisition review to the specific problem of *reliably discovering the correct Excel workbook URL for a newly published Stats SA release*
**Method:** Every claim about the current implementation below is from direct inspection of `automation/adapters/statss.py` as it exists in the uploaded `automation.zip` (line numbers cited), not from `CURRENT_STATE.md`'s summary of itself. Where this review finds something `CURRENT_STATE.md` does not mention, it is flagged as a **new finding**.

---

## Headline finding, up front

Before ranking approaches or designing new architecture: **the current implementation has a control-flow bug, not a strategy-design gap.** The "Tier 1" direct-URL-probe fallback that the codebase's own comments describe as the fix for WAF blocks is wired so that it is only reachable when the release hub is *not* WAF-blocked — i.e., in exactly the case where it isn't needed. This is verified by reading the code (§3.1), is present identically in all four flows (QLFS, GDP, CPI, Population), and is a more urgent, more specific, and cheaper-to-fix problem than anything in the "should we add a new discovery channel" question this document was asked to answer. It changes the shape of the recommended next milestone (§7).

---

## 1. Ranking Discovery Approaches

Ranked for **production reliability of discovering a newly published Stats SA Excel workbook**, evaluated on reliability, maintainability, dependence on site changes, automation suitability, and long-term viability.

### Rank 1 — Direct-URL construction from a known, confirmed naming convention
**What it is:** Build the exact file URL from the publication code, quarter/month/year, and a *confirmed* naming pattern (this is what `_build_qlfs_candidate_urls()` etc. already attempt).
**Reliability:** High, but only where the pattern is actually confirmed — today this is true for QLFS's **PDF** pattern only (the code's own docstring says so explicitly: "PDFs: confirmed working... Excel: No confirmed pattern yet"). For Excel it is currently a **guess across ~7 candidate name variants × 3 extensions per release**, not a confirmed pattern.
**Maintainability:** High once confirmed (a handful of format strings per dataset). Low today, because the guesswork itself has to be maintained and re-verified whenever a probe stops matching.
**Dependence on site changes:** Moderate — survives content changes, breaks on filename-convention changes, which Stats SA has no obligation to keep stable.
**Automation suitability:** Highest of any approach *once confirmed*, because it needs no page parsing or session state.
**Verdict:** This should remain the primary strategy, but its current implementation is **unconfirmed guesswork wearing the clothes of a confirmed pattern** for Excel specifically. Confirming it against a real release is higher priority than adding new discovery channels (see headline finding and §7).

### Rank 2 — HTML scraping of the release hub, when reachable
**What it is:** `_extract_excel_url()` / `_EXCEL_HREF_PATTERNS`, already implemented — regex over `<a href>` tags for `.xlsx`/`.xls` links.
**Reliability:** High when the hub isn't WAF-blocked — this is genuine discovery (reading a real link off a real page), not guessing. Its reliability is gated entirely on WAF-block frequency, which `CURRENT_STATE.md` §5 already confirms is a real, reproducible condition, not a hypothetical one.
**Maintainability:** Low-moderate — regex-over-HTML is exactly as fragile as any HTML scraper to markup changes, but it's a small, isolated function.
**Dependence on site changes:** High — this is the one strategy most exposed to Stats SA's own front-end changing.
**Automation suitability:** Good when reachable, useless when not.
**Verdict:** Correctly demoted to a secondary signal, but see the headline finding — today it's not actually reachable as a *fallback after* Rank 1, because the hub fetch itself throws before either strategy gets a chance to run in sequence for the fetch (not detection) path.

### Rank 3 — Third-party aggregator cross-check (EconData/SAMADB)
**What it is:** Not implemented. Covered in depth in the prior review (source-acquisition review, same date). Relevant here only as a **corroboration signal for whether the value you already found is right**, not as a workbook-discovery mechanism — EconData doesn't give you "the URL of this quarter's QLFS Excel file," it gives you an already-extracted number through its own pipeline.
**Verdict:** Out of scope for *workbook discovery* specifically; still relevant for *value validation*, unchanged from the prior review.

### Rank 4 — Government/CKAN-style open-data catalog (`data.gov.za`)
**What it is:** South Africa's national open-data portal, confirmed to run DKAN (a CKAN-compatible open-source data-portal platform) with dataset cataloging and an API.
**Reliability:** **Unverified for this specific use case.** I confirmed the portal exists and is CKAN-compatible; I did **not** confirm that Stats SA's quarterly QLFS/GDP/CPI/Population releases are catalogued there promptly (or at all) — national open-data portals frequently lag the originating agency's own publication by weeks or months, and are commonly populated with older/static datasets rather than fast-moving statistical releases. Treat this as **unconfirmed, not disproven** — worth a single manual check, not worth building against on assumption.
**Maintainability:** Would be high *if* it works, since CKAN's API is stable and self-documenting.
**Verdict:** Worth a one-time manual verification (does `data.gov.za` actually carry a current QLFS entry, and how many days after the official release?) before any engineering investment. Do not assume it solves your timeliness requirement.

### Rank 5 — ISIbalo portal as a discovery layer (not a fetch target)
**What it is:** Verified to exist (from the prior review) — an official Stats SA portal organized by theme, exposing "published data products and services," with QLFS/Census/Vital-Statistics theme pages.
**Reliability:** Plausibly more stable to hash-watch than the JS-heavy publication hub (`?page_id=1854`), since it's structured as a catalog rather than a single dynamic page — unverified without direct access, but structurally more promising for change *detection* than the current hub.
**Verdict:** Worth evaluating as a **detection-layer alternative to the current release-hub hash-watch**, not as a workbook-fetch source. This is a genuinely new candidate this review did not previously emphasize enough — see §7 Phase 2.

### Rank 6 — Browser automation / headless rendering (Tier 2)
**What it is:** Rendering the JS-heavy hub page with a real browser engine to get past Incapsula's challenge, or automating SuperWEB2/Nesstar-style logged-in sessions.
**Reliability:** Potentially high against the WAF specifically (browser automation is the standard answer to "the page needs a JS challenge solved"), but introduces an entirely different class of fragility (headless-browser detection countermeasures, session/cookie handling, infrastructure to run and maintain a browser in CI).
**Maintainability:** Low, long-term — this is explicitly the trade your constraints ask me not to make without strong evidence it's unavoidable.
**Verdict:** **Not recommended.** Nothing found in this review — including the confirmed, reproducible WAF block in `CURRENT_STATE.md` §5 — constitutes evidence that Tier 2 is *unavoidable*, because Rank 1 (direct URL) already demonstrably works for at least the PDF case without any browser involved, and the actual blocking issue found in this review (§3.1) is a bug in existing code, not a ceiling on what direct-URL discovery can achieve.

### Rank 7 — Filename guessing without a confirmed convention (the current Excel behavior)
Listed separately from Rank 1 deliberately: probing ~21 unconfirmed candidate strings per release is **not the same reliability class** as Rank 1's "confirmed pattern" case, even though it's the same code path. It is the least reliable approach that still counts as "not scraping" — better than nothing, worse than anything actually confirmed. This is today's real-world Excel-discovery mechanism and should be understood as such, not conflated with the (better) confirmed-pattern case it will hopefully graduate into once verified against a live release.

---

## 2. Can the Public Website Be Avoided Entirely?

**Short answer: not entirely, and you shouldn't try to — but the *hub page* specifically (the JS/WAF-protected `?page_id=1854` listing) can and mostly already has been designed around.**

Going through your list of examples:

- **Official APIs:** None confirmed to exist for Stats SA beyond SARB's (unchanged from the prior review — this is the one clean exception, already correctly used as a direct API for `interest-rates`).
- **Hidden APIs / JSON endpoints / browser network requests:** Not investigated in this session (would require live browser DevTools access to `statssa.gov.za`, which no session to date has had, per `CURRENT_STATE.md` §5). This is a **genuinely open, cheap-to-check item**: the first real session with browser access to the release hub should open DevTools' Network tab before anything else, specifically looking for an XHR/fetch call that returns file metadata as JSON — Incapsula-protected sites sometimes still expose an internal API the human-facing page calls after the challenge is solved. Unverified either way; flagged as the single highest-value 10-minute check for the next live session.
- **RSS / XML feeds / sitemap.xml:** Not confirmed to exist for Stats SA specifically in this review; generic government-RSS practice varies widely and nothing found suggests Stats SA maintains one. Low priority to chase further without a concrete lead.
- **CKAN (`data.gov.za`):** Real, confirmed to exist and be CKAN-compatible; timeliness for your specific datasets unconfirmed (see §1 Rank 4).
- **DataFirst / GitHub mirrors:** Covered in the prior review — DataFirst is a microdata catalog, granularity-mismatched to your headline-indicator needs; no relevant GitHub mirror of Stats SA's *raw release files* (as opposed to already-extracted series, e.g. SAMADB) was found in either review.
- **Government mirrors (EconData/SAMADB):** Covered in the prior review — a value-extraction mirror, not a workbook-file mirror; doesn't answer "what's the URL of the Q1 2026 QLFS Excel file," it answers "what's Q1 2026's unemployment rate," which is a different (and, for your validation/anomaly-detection purposes, still useful) thing.
- **Release metadata (e.g. a publication calendar API):** Not found. Stats SA does publish a release calendar as a human-readable page/PDF; no machine-readable calendar feed was identified.

**Conclusion:** the public website's *hub page* is already, correctly, being treated as a fallback rather than a primary source by the existing direct-URL-probe design — this part of the architecture doesn't need to change. What *can't* currently be avoided is the public website's *file host* (`statssa.gov.za/publications/...`) — every candidate path in this review, including the ones this review is most confident about (direct URL construction), still ultimately fetches the actual bytes from Stats SA's own servers. That's appropriate: it's the authoritative source, and every third-party alternative found in either review is itself downstream of it.

---

## 3. Evaluation of the Current Implementation

### 3.1 Confirmed bug: the WAF fallback is unreachable in the fetch path, though it works in the detection path

This is the most important finding of this review and is **new relative to `CURRENT_STATE.md`**, which describes the Tier-1 fallback as implemented and treats it as settled pending only empirical WAF-determinism verification (§5 of that document). Reading the code directly shows something more specific:

- In `_check_qlfs()` / `_check_gdp()` / `_check_cpi()` / `_check_population()` (the **detection-only** methods, used by `runner.py` without `--apply`), the WAF-block branch explicitly catches the raised `AutomationHTTPError`, logs it, and **falls through to `_probe_*_publication_url()`** — this part is real, implemented, and tested (per `CURRENT_STATE.md`'s test-count description).
- In `fetch_and_apply()` (the method that actually downloads the workbook — QLFS around line 4280, GDP around line 4640, and structurally identical for CPI/Population per the module's own comments), the sequence is:
  1. Call `_discover_qlfs_excel()` / `_discover_gdp_excel()` / etc., which internally calls `_fetch_release_hub_html()`.
  2. `_fetch_release_hub_html()` raises `AutomationHTTPError` immediately on detecting a WAF challenge — it does not return a value that a caller could inspect and route around.
  3. The **outer** `try`/`except` block around the whole discovery-through-staging sequence catches `AutomationHTTPError` and terminates that dataset's flow with an error (e.g. `"GDP release hub/file HTTP error: 403 ... WAF_BLOCKED"`).
  4. The candidate-URL probe (`_probe_gdp_publication_url()` etc.) is only ever reached in the **separate** branch that runs *after* hub discovery succeeds but finds no scrapable link (`if excel_url is None:`) — a WAF-raised exception never reaches that branch at all.

**Net effect:** on a confirmed WAF block — the exact condition `CURRENT_STATE.md` §5 says has been reproduced against a real developer environment — the actual download path (not just detection) fails outright for all four flows, without ever attempting the direct-URL probe that the same file's comments describe as the fix for this scenario. The detection path (`--apply` not required) correctly falls back; the fetch path (which is what actually needs to obtain the file to make progress) does not.

This is a bug, not a design gap, and it's a small one: the fetch path's exception handling needs the same try/except-and-fall-through structure the detection path already has, reusing the exact same `_probe_*_publication_url()` functions that already exist and are already tested in isolation. No new discovery strategy needs to be invented to fix it.

### 3.2 What should remain exactly as it is

- **The overall pipeline downstream of "bytes obtained":** archive → parse → transform → validate → stage → version → approve → promote. Nothing in this review touches any of it.
- **`_fetch_release_hub_html()`'s WAF-marker detection itself** (`"_Incapsula_Resource" in body_text or "incapsula" in body_text.lower()`) — correctly conservative, correctly raises rather than silently treating a challenge page as content.
- **`_extract_excel_url()` / `_EXCEL_HREF_PATTERNS`** — legitimate discovery when the hub is reachable; keep as-is.
- **The four parsers** (`parse_qlfs_workbook()` etc.) — entirely decoupled from discovery, correctly so; no change indicated by this review.
- **The retry/backoff policy (`STATSSA_POLICY`)** — appropriate for release-day load, unrelated to the discovery question.

### 3.3 What discovery logic should be replaced

- **Nothing needs outright replacing.** The two strategies that exist (hub scrape, direct-URL probe) are the right two strategies, in the right priority order conceptually. What needs to change is *how they're composed* in the fetch path (§3.1), not *which strategies exist*.
- **The candidate-URL guess list for Excel** (`_build_qlfs_candidate_urls()`'s 7-prefix × 3-extension combinatorial guess) should be **replaced by a confirmed pattern once one is empirically observed** — not replaced by a different mechanism, just tightened from "guess broadly" to "construct precisely" once the first real download succeeds and reveals which of the ~21 patterns was actually right. Everything else in the list can then be deleted.

### 3.4 What should become explicit fallback mechanisms

- The **ISIbalo theme page for each dataset family** (Labour Force, Vital Statistics, Census, etc. — verified to exist, §1 Rank 5) is worth adding as a **third detection-layer signal**, tried after the hub and before giving up entirely — not because it's more reliable than the hub when the hub works, but because it may be a more stable page to hash-watch when the hub is having a bad week, independent of the WAF question specifically.
- **`data.gov.za`'s CKAN API**, *if* the one manual check recommended in §1 Rank 4 confirms it carries timely Stats SA releases — otherwise, drop it without further investment.

### 3.5 What should be removed entirely

- Nothing in the current discovery logic warrants outright removal. The closest candidate is the unconfirmed portion of the Excel candidate-URL list (§3.3), and even that should be *pruned to the confirmed pattern*, not removed and replaced with something else.

### 3.6 What should remain detection-only

- **The release hub hash/ETag watch** — its job is "has something changed," not "here is the file," and it should stay scoped to that even after the §3.1 fix, since its own docstring already frames it this way for the detection path.
- **Any future ISIbalo/CKAN addition (§3.4)** — same reasoning: useful as a second "has something changed" signal, not as a replacement for direct-URL construction as the actual fetch mechanism.

---

## 4. Ideal Discovery Architecture

```
Discovery Layer  (per dataset: QLFS / GDP / CPI / Population)
        │
        ▼
Strategy 1 — Direct URL construction
        (confirmed naming pattern once §7 Phase 1 verifies it;
         today: best-available candidate list, tried first)
        │  found?  ──yes──▶ Download
        │  no
        ▼
Strategy 2 — Release-hub scrape
        (_extract_excel_url() against the hub HTML — attempted
         whether or not the hub raised a WAF error; a WAF-raised
         exception here is caught HERE, not three call-frames up,
         and simply means "this strategy is unavailable this run",
         not "the whole fetch failed")
        │  found?  ──yes──▶ Download
        │  no
        ▼
Strategy 3 — Secondary catalog scrape (ISIbalo theme page; CKAN
        if §1 Rank 4's manual check confirms timeliness)
        │  found?  ──yes──▶ Download
        │  no
        ▼
Fallback — Archive the raw hub HTML (whatever was retrievable,
        even a WAF challenge page) for manual inspection, and open
        a review-ticket state (matches the architecture document's
        existing "escalate to a manual-review ticket automatically"
        design for exactly this failure mode) — this is not a new
        concept, it's Track B already designed for crime/education,
        reused here for "the automated discovery genuinely failed"
        │
        ▼
Download  (unchanged — _download_publication(), with the existing
        suspiciously-small-file guard)
        │
        ▼
Validation  (unchanged — parse, plausibility rules, protected-field
        diff, ownership-boundary/source-guard checks)
        │
        ▼
Approval  (unchanged — staging → version entry → --approve/--promote,
        or the future PR-based flow)
        │
        ▼
Publication  (unchanged — promote_version() → production JSON)
```

**The only structural change from today's actual (not documented) behavior:** each strategy in the Discovery Layer catches its *own* failure (including a WAF exception) and returns "not found by this strategy" rather than letting an exception unwind past the strategy boundary and abort the whole dataset's flow. This is the fix for §3.1, generalized into a shape that also accommodates Strategy 3 cleanly if you choose to add it later.

---

## 5. Would I Build This Differently From Scratch?

**Partially — one structural change, not a rebuild.** If starting today, I would write discovery as a small ordered list of `(name, callable) -> url | None` strategies from the outset, where every strategy is required to catch its own exceptions and return `None` on failure rather than propagating — exactly the shape in §4. That would have made the §3.1 bug structurally impossible to write, because "a strategy raising instead of returning `None`" would be the anomaly, not the default.

**What I would *not* change:** the decision to prefer direct-URL construction over browser automation, the decision to keep parsers decoupled from discovery, the decision to keep discovery entirely separate from the approval/staging pipeline, and the decision to fail loudly rather than guess when a workbook layout doesn't match expectations. These are all sound and are the parts of the current design worth explicitly preserving.

**Technical debt to name explicitly:**
1. The §3.1 exception-handling asymmetry between detection and fetch paths — the highest-priority item.
2. Four independent, copy-pasted implementations of the same discovery-composition logic (already self-acknowledged in the code's own comments as "copied rather than shared") — worth consolidating *at the same time* as fixing §3.1, since the fix is identical across all four and doing it once in a shared helper avoids re-introducing the same asymmetry in dataset #5 later.
3. The Excel candidate-URL list's unconfirmed status (§3.3) — not a design flaw, but a standing risk that should be closed by the first real download, not carried indefinitely.

**Recommendation before additional implementation:** fix (1) and (2) together as one small, mechanical change, verified by the existing test suite (which already tests the detection-path fallback and should be extended to test the fetch-path fallback the same way) before spending any effort on new discovery channels (ISIbalo, CKAN, or anything else in §1).

---

## 6. Existing Projects/Tooling to Incorporate

(Carried forward from the prior review where still relevant to *discovery* specifically; not repeated in full.)

| Candidate | Mature enough for production use here? |
|---|---|
| **EconData/SAMADB** | Not for *discovery* (it doesn't expose source file URLs, only extracted values) — potentially useful downstream for value corroboration, per the prior review, pending licensing. |
| **`data.gov.za` (DKAN/CKAN)** | Unconfirmed — verify timeliness manually before any engineering investment (§1 Rank 4). If confirmed, its API is mature (CKAN's API is a stable, widely-used standard) and would be low-effort to integrate as Strategy 3. |
| **ISIbalo portal** | Confirmed to exist; not yet confirmed as a reliable file-discovery source, but promising as a detection-layer addition (§3.4). No production-readiness blocker beyond "hasn't been tried yet." |
| **DataFirst** | Not applicable to discovery of headline-indicator workbooks (granularity mismatch, per prior review). |
| **Browser automation frameworks (Playwright/Selenium, generically)** | Deliberately not evaluated for production-readiness here, because no evidence in either review shows they're needed (§1 Rank 6). |

No project or library found in this review is mature enough, or even applicable enough, to replace the custom direct-URL/hub-scrape logic you already have. The right move is fixing and consolidating what exists, not importing a new dependency.

---

## 7. Roadmap for the Next Milestone

### Phase 1 — Immediate work
1. **Fix the fetch-path WAF-fallback asymmetry (§3.1)** for all four flows (QLFS, GDP, CPI, Population), reusing the exact fallback logic already proven in the detection path. *Why here:* it's a confirmed bug blocking the exact scenario (`CURRENT_STATE.md`'s reproduced WAF block) the Tier-1 work was meant to solve; fixing it is small, low-risk, and testable against the existing suite's patterns.
2. **Consolidate the four copy-pasted discovery-composition blocks into one shared helper**, done in the same change as (1) since the fix is identical across all four. *Why here:* doing this separately later would mean touching the same code twice; doing it now costs nothing extra.
3. **The first real `--apply` run against a genuine downloaded Stats SA workbook** — unchanged from `CURRENT_STATE.md`'s own top priority, and *not* superseded by anything in this review. *Why here:* it's still the only way to convert the Excel candidate-URL list from "guess" to "confirmed" (§3.3), and nothing else in this roadmap depends on waiting for it first.

### Phase 2 — Recommended improvements
4. **A 10-minute DevTools/network-tab check of the release hub during the first real live session** (§2), looking for an internal JSON/XHR endpoint. *Why here, not Phase 1:* it's cheap and worth doing, but it's exploratory, not a fix for a known problem — shouldn't block or delay Phase 1's known fix.
5. **Manual verification of `data.gov.za` timeliness for QLFS/GDP/CPI/Population specifically** (§1 Rank 4). *Why here:* low cost, but its value is entirely conditional on an unconfirmed fact; don't build Strategy 3 tooling before this returns an answer.
6. **Evaluate ISIbalo theme pages as an additional detection signal** (§3.4), only after (4) and (5) are resolved, so effort isn't split across three unverified candidates at once. *Why here:* genuinely promising but unproven; sequenced after the free/cheap checks in this phase.

### Phase 3 — Future enhancements
7. **Extend the shared discovery-strategy list (from Phase 1's consolidation) with whichever of Phase 2's candidates actually check out**, as additional ordered strategies — this is cheap specifically because Phase 1 turned four copy-pasted blocks into one composable list. *Why here:* it's genuinely optional and its shape depends entirely on Phase 2's findings; doing it earlier would mean guessing at a design Phase 2 hasn't informed yet.
8. **Revisit whether direct-URL construction can be fully confirmed (not just probed) for GDP/CPI/Population the same way it will be for QLFS after Phase 1's first live run** — each dataset's Excel naming convention needs its own confirmation; QLFS being verified first doesn't automatically verify the others, since Stats SA's naming conventions are per-publication-series, not uniform.
9. **GitHub Actions PR-based approval flow** (unchanged from the prior review and from `CURRENT_STATE.md`'s own roadmap) — belongs here specifically because it should not automate promotion of a discovery mechanism that hasn't yet had its Phase-1 bug fixed or its Phase-3 confirmations completed.

---

## Final Recommendation

Do the Phase 1 work first, and treat it as small: this is a bug fix and a mechanical consolidation, not new architecture. The direct-URL-first, hub-scrape-second discovery design you already have is the right design — the problem this review found is that a WAF-raised exception unwinds past both strategies instead of being caught by the first one and handled by falling through to the second, exactly the pattern the detection path already implements correctly. Fix that, run it against a real release, and only then decide — informed by Phase 2's cheap, concrete checks rather than by speculation — whether ISIbalo or `data.gov.za` are worth adding as a third strategy. Nothing found in this review, or in the Perplexity report evaluated in the prior session, provides evidence that browser automation or a wholesale architecture change is warranted.
