# SA Data Hub — Source Acquisition Architecture Review

**Date:** 21 July 2026
**Status:** Review only — no implementation, no code changes
**Inputs reviewed:** `automation/` package (as unzipped and inspected directly — `core/`, `adapters/statss.py`, `adapters/sarb.py`, `config/`), `CURRENT_STATE.md`, `SA-Data-Hub-Automation-Architecture.md`, `SA-Data-Hub-Dataset-Sourcing-Plan.md`, `CHANGELOG.md`, and the attached Perplexity research report
**Method note:** Claims about the current repository below are based on directly reading the unzipped `automation/` package, not on `CURRENT_STATE.md`'s summary of itself — where the two agree this is noted; where I found something `CURRENT_STATE.md` doesn't mention, it's flagged as **new finding**. Claims about external sources (ISIbalo, SAMADB, EconData, DataFirst) were independently checked against live web sources during this review, not accepted from the Perplexity report at face value — each is marked **verified**, **partially verified**, or **unverified** below.

---

## 0. Executive Summary

Your instinct that "the blocker is not networking anymore" is correct, but the repository evidence shows you're closer to the Perplexity report's recommended architecture than either document gives you credit for. `automation/adapters/statss.py` already implements a Tier-1 fallback that abandons the WAF-protected publication-page hub in favour of directly probing predictable file URLs — which *is* the "official artifact over scraped page" principle, just not yet generalized into a named, reusable abstraction. The right move is **not** to adopt the Perplexity report's implicit suggestion to route through Nesstar/SuperWEB2/DataFirst-style microdata systems (those solve a different problem — researcher access to unit records — not "get this quarter's headline unemployment rate"), and it is **not** to rewrite the pipeline. It is to:

1. **Formalize** the fallback pattern already living inside four copy-pasted `_check_*()` methods into a named `SourceResolver` concept, so adding dataset #14 doesn't mean copying WAF-detection code a fifth time.
2. **Add exactly one genuinely new acquisition class** the Perplexity report undersold and, in one important place (SAMADB/EconData), essentially missed the significance of: a third-party aggregator that already re-publishes Stats SA and SARB series through an automation-friendly interface, weekly-updated, built specifically so downstream systems don't have to scrape the primary site. This is worth evaluating as a **secondary, cross-validation source** — not a replacement for official sourcing — pending a licensing check that has not yet been done.
3. **Leave everything else in the pipeline alone.** `core/` — config, HTTP client/retry, staging, versioning, promotion, reporting — needs zero changes. The approval gate, the parser layer, and the dataset-specific transform/validation code are all acquisition-strategy-agnostic already; that's good design and should be preserved, not "improved."
4. **Do not adopt browser automation.** Nothing in the Perplexity report or my own checks provides strong evidence that Tier 2 (headless browser) is necessary. Every viable path identified — including the ones the report emphasizes — either has a direct-file equivalent or should stay a manual/Track-B dataset.

The single highest-leverage next action remains the one already at the top of `CURRENT_STATE.md`'s own priority list and is **not changed by this review**: running the existing QLFS/GDP/CPI/Population parsers against a real downloaded workbook from a session with actual `statssa.gov.za` network access. No amount of source-registry design substitutes for that empirical step.

---

## 1. Evaluation of the Perplexity Research

Going claim by claim, distinguishing verified/partially verified/unverified, and stating trust level for production use.

### 1.1 "Stats SA distributes data through at least three materially different channels" (time-series ZIPs, ISIbalo, Nesstar/SuperWEB2)

**Partially verified.** I independently confirmed `isibaloweb.statssa.gov.za` is a real, live Stats SA portal organizing products by theme (Labour Force, Vital Statistics, Poverty and Inequality, Census, Data Analytics, etc.) with an explicit "self-service data access" framing and a manual request channel for anything not self-service. I did not independently confirm the Nesstar/SuperWEB2 claims (no network access to `statssa.gov.za` proper in this session, consistent with every other session logged in `CURRENT_STATE.md`).

**Is it technically correct?** Broadly yes — Stats SA's publication ecosystem genuinely is fragmented across multiple sub-systems, this matches general knowledge of Stats SA's public offerings, and it's consistent with what your own sourcing plan independently found (time-series Excel/ASCII page, SuperWEB2/SuperCROSS for cross-tabulation).

**Does it solve your acquisition problem?** Only partially, and only for some datasets. This is the report's central weakness (see §1.4).

**Missing context / misleading:** The report frames these three channels as roughly interchangeable alternatives ("split model: official time-series downloads... and dedicated data portals for survey microdata"). It undersells that these channels serve **different data granularities**, not different distribution methods for the same data. ISIbalo, Nesstar, and SuperWEB2 are oriented around **survey/census microdata and custom cross-tabulation** — a researcher building their own table from underlying records. QLFS's headline national unemployment rate, GDP growth, and CPI headline inflation are not microdata products; they are **pre-computed headline figures published in a specific statistical release** (P0211, P0441, P0141). Those figures live in the release's own Excel/PDF tables — exactly the artifact your current architecture already targets — not in a microdata warehouse. Treating ISIbalo/Nesstar as a viable acquisition path for `unemployment-national` or `gdp-growth` specifically would be a design error the report doesn't warn you away from clearly enough.

**Would I trust it in production?** Only for the narrow claim that these systems exist and are official. Not for the implied claim that they're good replacements for your current headline-indicator sourcing.

### 1.2 "Stats SA time-series ZIP page... predictable ZIP names... P0141 CPI, P0441 provincial GDP..."

**Unverified in this session** (no live fetch performed against `statssa.gov.za`), but directionally consistent with what your own sourcing plan already documented independently ("Stats SA's general time-series Excel/ASCII download page," `SA-Data-Hub-Dataset-Sourcing-Plan.md` finding #5) and with what your codebase already assumes (`_build_qlfs_candidate_urls()`, `_build_gdp_candidate_urls()`, etc., all target direct publication-base URLs, not the JS hub).

**Important correction to the report:** it says this page covers "P0441 **provincial** GDP." Your dataset is national quarterly GDP growth (`gdp-growth`). Provincial GDP is a *different, annual* Stats SA product from national quarterly GDP. If a future engineer takes this claim at face value and points the GDP resolver at the provincial-GDP ZIP series, they'll acquire the wrong data — same publication number, different table. This is exactly the kind of "sounds authoritative, is subtly wrong" error the report should be independently checked for, and is a good example of why the report should not be trusted verbatim.

**Trust level:** Trust the *general pattern* (direct ZIP/Excel artifacts exist and are the right target). Do not trust the *specific product identification* without re-verifying against the actual release once network access exists.

### 1.3 SAMADB / EconData

**Verified — and more significant than the report credits.** I independently confirmed:
- SAMADB is real, described as "an open relational database with ~10,000 macroeconomic time series for South Africa, obtained from... SARB and... STATSSA and updated on a weekly basis via EconData and automated scraping," with **published R and Python packages** (`samadb` is on PyPI and CRAN, not just a private research tool).
- EconData (the platform SAMADB is built on top of, run by Codera Analytics) explicitly lists **QLFS, CPI, PPI, National Accounts, and Population** among its curated datasets, is built on the **SDMX** open standard specifically "to enable fully automatable workflows," and offers an **open API plus R and Python packages** for exactly this purpose. Use for research purposes is stated as free of charge; commercial/subscriber tiers exist for some datasets.

The Perplexity report mentions SAMADB only in passing as evidence "that automatic acquisition... is already being done in the wild" and doesn't surface EconData as the underlying automation-friendly layer at all. This is a gap in the report, not an error — but it means the report's own evidence base understates the single most promising *secondary* acquisition option available to you: a third party has already built and maintained, since 2023, exactly the "resolve to a stable, automatable, non-scraped artifact" layer you're trying to build for QLFS/CPI/GDP/Population.

**Is it misleading to treat it as a solution?** It would be, if adopted as your **primary** source without qualification, for three reasons:
1. **Licensing is unverified.** I found "free for research purposes," a commercial tier, and a citation-attribution requirement (cite Stats SA as producer, EconData as distributor) — none of which I've confirmed is compatible with SA Data Hub serving values on a public, indexed website. This needs a direct licensing conversation with Codera Analytics before any production dependency, not an assumption either way.
2. **It's still ultimately downstream of scraping.** EconData's own description says it obtains Stats SA data "via EconData... and automated scraping of the SARB and STATSSA websites" — i.e., it doesn't eliminate the WAF/scraping problem, it outsources it to someone else's infrastructure. That's a legitimate value-add (their WAF problem, not yours) but it's not "an official API," and its own SDMX API framing is EconData's product, not Stats SA's or SARB's.
3. **Availability lag/failure risk is not yours to control.** If Codera Analytics' scraper breaks, or Stats SA changes its site in a way that breaks EconData before it breaks you, you inherit their outage with less visibility into why.

**Recommended trust level:** Good candidate for a **secondary, cross-validation source** (a second signal to corroborate an anomaly-flagged value, or a stopgap during a confirmed Stats SA-side WAF outage) — not a primary source, and not adoptable without a licensing check.

### 1.4 DataFirst

**Verified as real** (UCT's DataFirst portal hosts Stats SA survey catalog entries with DOIs). **Same granularity mismatch as ISIbalo/Nesstar (§1.1):** DataFirst is built for microdata/survey-dataset redistribution with academic citation practices, not for a "give me this quarter's headline CPI print" API. It's a credible fallback for Census/GHS-style products if you ever need underlying microdata (you currently don't — `housing.json`, `census.json`, and `population.json` all consume headline aggregate figures, not unit records), but it is not a solution to your QLFS/CPI/GDP/Population acquisition problem as currently scoped.

**Trust level:** Correct that it exists and is a legitimate official-adjacent redistributor. Misleading if read as broadly applicable to your current 13 datasets — it's applicable to approximately zero of your currently-automated stats, and a plausible fit for approximately none of your currently-planned ones, since none of your dataset files consume microdata.

### 1.5 "No public official SDMX API, hidden JSON manifest... confirmed" / "did not confirm a general-purpose official bulk-download API"

**This is the report's most honest and most useful section.** It correctly declines to claim something it couldn't verify, which is the right epistemic posture. I have nothing to add or correct here — I also could not confirm an official Stats SA-run structured API beyond SARB's, and neither this review nor the report found one. Treat "no official Stats SA API exists beyond the confirmed SARB Web API" as the working assumption until directly disproven.

### 1.6 Overall verdict on the report

**Trust the report for:** confirming Stats SA's distribution ecosystem is genuinely fragmented, confirming ISIbalo/DataFirst/SAMADB exist and are real, and its honest "unknowns" section.

**Do not trust the report for:** its implicit recommendation to treat portal/microdata systems as acquisition alternatives for headline economic indicators (granularity mismatch, §1.1/§1.4), the provincial-vs-national GDP conflation (§1.2), and its underselling of EconData's actual relevance and its licensing caveats (§1.3). Overall, the report is useful **raw material for discovery**, not a design document to implement against — consistent with your own instruction to evaluate it independently rather than accept it.

---

## 2. Review of the Current Automation Architecture

### 2.1 What the repository actually does today (verified by direct inspection, not by `CURRENT_STATE.md`'s summary)

`automation/adapters/statss.py` (5,584 lines) implements, per Stats SA product (QLFS, GDP, CPI, Population), an identical three-step detection pattern:

1. `_fetch_release_hub_html()` fetches the JS-rendered publication hub, with an explicit Incapsula-WAF-challenge detector that raises `AutomationHTTPError(status=403, reason="WAF_BLOCKED...")` rather than silently hashing a challenge page as if it were content (this closes exactly the false-positive risk the report worries about, independently of anything in the report).
2. On a WAF block, each `_check_*()` method (`_check_qlfs`, `_check_gdp`, `_check_cpi`, `_check_population`) **falls through to a direct-URL probe** via `_build_{qlfs,gdp,cpi,population}_candidate_urls()` — a small set of predictable, publication-number-based URL patterns against Stats SA's direct file host, bypassing the hub page entirely. This is, in miniature, already the "Dataset → Best Official Source, not Publication Page → Workbook" principle the Perplexity report argues for. It is **new information relative to `CURRENT_STATE.md`**, which describes this ("Tier 1... direct-publication-URL probe on a WAF_BLOCKED hub response") but doesn't frame it as what it structurally is: a resolver with two ordered strategies.
3. The four `_check_*()` methods are near-identical copies of each other — the code comments even say so explicitly ("copied rather than shared, for the same reason as the WAF scan above"). This is a real, self-acknowledged duplication smell, and is exactly the "if two datasets sharing an org would need to duplicate the code to add a third, it belongs one tier up" pattern your own architecture document already names as the rule to apply.

**Conclusion:** your codebase has already, organically, started building the generalized resolver the Perplexity report proposes in the abstract — it just did it four times instead of once, and hasn't given it a name.

### 2.2 Should "Publication Page → Workbook → Parser" remain primary, or move to "Dataset → Best Official Source → Parser"?

**Recommendation: adopt the second framing, but as a formalization of what's already there, not a new build.** Concretely:

- The current implementation has *already* demoted the publication-page hub from "the source" to "one detection signal among two" (hub-diff vs. direct-URL-probe). Renaming this as `Dataset → SourceResolver (ordered strategies) → Parser` doesn't change behavior — it changes the shape of the code from four copy-pasted methods into one shared resolver class parameterized per dataset, which is a refactor, not a redesign.
- This satisfies your own constraint ("reuse as much of the existing automation framework as possible") better than either extreme: it doesn't touch `core/`, doesn't touch the parser layer, doesn't touch the transform/validate/stage/promote pipeline, and doesn't add browser automation. It touches exactly the ~200 lines of near-duplicated `_check_*()` logic that the codebase's own comments already flag as a problem.
- Whether to add a *third* strategy tier (third-party aggregator, per §1.3) is a separate decision from whether to formalize the resolver — the resolver abstraction is what makes adding that third tier cheap later, without being a reason to add it now.

---

## 3. Dataset-by-Dataset Acquisition Strategy

| Dataset | Recommended primary source | Recommended secondary/fallback | Stability | Automation difficulty | Long-term maintenance | Key risk |
|---|---|---|---|---|---|---|
| `unemployment`, `youth-unemployment`, `labour-force` (QLFS) | Stats SA P0211 direct Excel via existing candidate-URL resolver | EconData (QLFS is explicitly listed) as a cross-validation signal only, pending licensing check | Moderate — Stats SA controls URL pattern and table layout per release | Moderate (already built; unverified against a real download) | Low once empirically verified | WAF hub still unreliable as a detection signal; direct-URL pattern could change without notice |
| `inflation` (CPI half) | Stats SA P0141 direct Excel via existing resolver | EconData (CPI explicitly listed) | Moderate | Moderate (already built) | Low once verified | Same as QLFS; plus the `repo-rate` cross-dataset dedup already flagged as top open item |
| `gdp` (`gdp-growth`) | Stats SA P0441 **national quarterly** direct Excel (not the provincial-GDP ZIP series the Perplexity report cites — verify the exact product before trusting any cited URL) | EconData National Accounts, cross-validation only | Moderate | Moderate (already built; historical-revision overwrite logic already implemented) | Low once verified | Report's provincial/national conflation makes this the dataset most likely to be mis-sourced if the report is followed literally |
| `interest-rates` | SARB Web API (already implemented, "Easy" per your own sourcing plan) | None needed — already the best available source | High | Low (done) | Very low | None material; this is already correctly architected |
| `population` (`population-total`) | Stats SA P0302 MYPE direct Excel, **with the existing source guard enforced** (hard-fails if resolved host isn't `statssa.gov.za`) | Do **not** add EconData/World Bank as a silent fallback here — this is the exact dataset with the historical mis-sourcing bug; any secondary source must be advisory-only, never auto-substituted | Moderate | Moderate (already built) | Low once verified | Reintroducing a silent alternate-source fallback here would recreate the original bug the source guard exists to prevent |
| `housing` (GHS component) | Stats SA P0318 direct Excel, once confirmed to exist for the tracked indicators (per sourcing plan, unconfirmed) | ISIbalo portal manual check | Moderate | Moderate, pending confirmation | Low-Medium | Source confirmation (GHS vs. Census-only) still outstanding, independent of acquisition-channel choice |
| `census` | Static — no acquisition pipeline | ISIbalo/Census portal erratum watch (page-hash, low frequency) | High (static) | N/A | Very low | None — do not build acquisition automation for a decennial static dataset |
| `municipalities` | Static — no acquisition pipeline | Same erratum-watch pattern as census | High (static) | N/A | Very low | None |
| `provinces` | Downstream merge job over the above (no independent acquisition) | N/A | Depends entirely on upstream datasets | N/A | Low once upstream is stable | Inherits upstream staleness/bugs by design — re-run on upstream promotion, not its own schedule |
| `crime` (SAPS) | No structured/official machine-readable source identified by either this review or the Perplexity report | Weekly page-hash watch → human transcription (Track B, unchanged from your existing plan) | Low (unreliable SAPS calendar, confirmed independently by your own sourcing plan) | Difficult — do not attempt PDF-table extraction | Ongoing human effort, by design | Attempting automation here would be automating an admittedly unreliable, non-calendar, PDF-only process — not recommended by this review or by Perplexity |
| `education` (DBE NSC) | No structured source — press announcement | Scheduled reminder (mid-January) → human transcription (Track B, unchanged) | Low | Difficult | Ongoing human effort, by design | Same as crime — no acquisition-architecture change would fix this; it's a publisher-side limitation |

**Net effect on your Dataset Sourcing Plan:** no dataset changes automation tier as a result of this review. The Perplexity research's most concrete, checkable claims (ISIbalo, DataFirst, SAMADB/EconData existing) are confirmed real, but none of them changes the recommended primary source for any of your 13 datasets — they add one credible *secondary/cross-validation* option (EconData) for the four Stats SA economic series, gated on a licensing check that hasn't happened yet.

---

## 4. Existing Work Worth Adopting

| Project | What it is | Worth adopting? | How |
|---|---|---|---|
| **EconData / SAMADB** (Codera Analytics / Stellenbosch Econometrics) | SDMX-based, weekly-updated aggregator of SARB + Stats SA series, with R/Python packages and an open API, explicitly built for automatable workflows | **Idea, not code** — the *idea* of "cross-validate a scraped value against an independent aggregator's value before staging" is worth adopting as a diff-engine input. The *dependency* (calling their API/package in production) needs a licensing conversation first. | Add as an optional, non-blocking corroboration signal inside the existing anomaly/diff engine (`5. DIFF & ANOMALY ENGINE` in the architecture doc) — a match increases reviewer confidence, a mismatch is itself an anomaly flag, but production staging never *depends* on it being reachable. |
| **ISIbalo Data Portal** | Stats SA's own catalog/self-service portal | Worth it as a **discovery and erratum-watch layer** for census/GHS-type static datasets, and as a documented fallback contact channel ("write to Stats SA's user information services") for the genuinely stuck cases (crime, education) — not as a scraping target for headline economic indicators. | Point the existing static-dataset "erratum watch" pattern (already planned for census/municipalities) at ISIbalo's relevant theme pages instead of / in addition to the main site, since it's a lighter-weight, more stable page to hash-watch than a JS-heavy publication hub. |
| **DataFirst** | UCT-hosted Stats SA survey/microdata catalog with DOIs | Low priority given your current dataset scope (no microdata consumers today) | No action recommended now; keep on file as the fallback if a future dataset genuinely needs microdata. |
| **SuperWEB2 / Nesstar** | Stats SA's interactive table-builder/microdata browser | **Not recommended for production automation.** The one public description found (a gist walking through guest login + browser-based table export) is exactly the kind of workflow that would require Tier-2 browser automation to acquire programmatically — which your own constraints explicitly ask me not to assume is necessary without strong evidence, and I found none here. | None — treat as a manual research/discovery tool only, if used at all. |
| **`sarbR` package** | Community R wrapper around a private token-based API built on top of SARB data | Confirms SARB lacks a fully public, unauthenticated data API of the shape `sarbR` provides — but your `interest-rates` adapter already goes directly to the confirmed genuine SARB Web API, which is a better source than a third party's wrapper around it. | No action — your existing SARB integration is already the best-available path; don't downgrade it to a third-party proxy. |

---

## 5. Source Registry Architecture — Evaluation and Design

### 5.1 Is the direction right?

**Yes, with the scope correction from §2.2**: build it as a formalization of the resolver pattern already present in `statss.py`, not a new subsystem grafted alongside the existing one.

### 5.2 Design

```
Dataset config (automation/config/datasets/*.yaml)
        │
        │  declares an ordered list of acquisition strategies
        ▼
SourceResolver  (NEW — one per dataset, built from config, not hand-copied per adapter)
        │
        ├─ Strategy 1: DirectURLStrategy
        │     — today's _build_qlfs_candidate_urls() / _build_gdp_candidate_urls() / etc.,
        │       generalized into one parameterized class (publication number, date parts,
        │       URL template) instead of four near-identical functions
        │
        ├─ Strategy 2: HubDetectionStrategy
        │     — today's _fetch_release_hub_html() + WAF-challenge detection,
        │       generalized the same way; used for CHANGE DETECTION (has something new
        │       been published?), not as the primary fetch path — matches current behavior
        │
        ├─ Strategy 3 (NEW, optional, non-blocking): ThirdPartyCorroborationStrategy
        │     — queries EconData/SAMADB (once licensing is confirmed) for the same period;
        │       used ONLY by the diff/anomaly engine as a corroborating signal, never as
        │       a substitute fetch — if unreachable, the pipeline proceeds exactly as it
        │       does today with this strategy absent
        │
        └─ Strategy 4: StaticErratumWatchStrategy
              — today's planned census/municipalities page-hash watch, now also able to
                point at ISIbalo theme pages instead of/alongside the main site
        ▼
Raw bytes + provenance metadata (source strategy used, URL, checksum, timestamp)
        ▼
Parser layer (UNCHANGED — parse_qlfs_workbook() etc. don't know or care which
        strategy produced the bytes; they already only consume archived bytes)
        ▼
Transform → Validate → Diff/Anomaly → Stage → Approve → Promote
        (ALL UNCHANGED — core/ and dataset-specific transform/validation code
        are already acquisition-strategy-agnostic)
```

### 5.3 How much of the existing framework stays unchanged

**Unchanged, verified by direct inspection:**
- All of `core/`: `config.py`, `http_client.py`, `retry.py`, `files.py`, `metadata.py` (`check_protected_fields()`), `logging.py`, `report.py`, `version.py`, `staging.py`, `promote.py`.
- Every dataset-specific transform function (`_transform_unemployment`, `_transform_gdp`, `_transform_inflation`, `_transform_population`, and their `_apply_*_points()` helpers).
- Every validation function (rate bounds, label-format regexes, anomaly thresholds, `_assert_cpi_ownership_boundary()`, `_assert_population_source_guard()`, `_assert_population_ownership_boundary()`).
- The CLI (`runner.py`) and its `--dry-run` / `--apply` / `--approve` / `--reject` / `--promote` contract.
- The parser layer (`parse_qlfs_workbook()`, `parse_gdp_workbook()`, `parse_cpi_workbook()`, `parse_population_workbook()`) — these already operate purely on archived bytes and have no dependency on how those bytes arrived.

**Changed:** only the ~4×-duplicated detection/fetch logic inside `_check_qlfs`/`_check_gdp`/`_check_cpi`/`_check_population` and their corresponding candidate-URL builders — refactored from four copies into one parameterized resolver, plus one new optional strategy class for corroboration.

This is a small, mechanical, low-risk refactor by the standard your own review process already applies elsewhere in this project (e.g., the QLFS-family consolidation principle) — not a rewrite.

---

## 6. Recommended Roadmap

| # | Milestone | Objective | Expected outcome | Complexity | Dependencies | Risk |
|---|---|---|---|---|---|---|
| 1 | Real-workbook empirical verification (unchanged from `CURRENT_STATE.md` §6 item 6 — **not reordered by this review**) | Run the existing QLFS/GDP/CPI/Population parsers against genuine downloaded Stats SA workbooks | Confirms or corrects `_QLFS_METRIC_SPECS`/`_GDP_GROWTH_SPEC`/`_CPI_METRIC_SPECS`/`_POPULATION_METRIC_SPECS` against real layouts; unblocks the first real `--approve`/`--promote` cycle | Low (code exists; needs network access + a human review pass) | `statssa.gov.za` reachability from a real dev session | Parser label-matching may need adjustment on first real run — expected-possible, not a regression, per existing docs |
| 2 | Resolver formalization (§5) | Collapse the 4×-duplicated `_check_*()`/candidate-URL logic into one parameterized `SourceResolver` | Same runtime behavior, less duplicated code, one place to add future strategies | Low-Moderate (mechanical refactor) | None — independent of milestone 1 | Regression risk in the refactor itself; mitigate by keeping the existing 116-test suite green throughout |
| 3 | EconData/SAMADB licensing check | Determine, in writing, whether EconData/SAMADB data may be used as a corroboration signal (not redistributed as primary data) on a public site | A clear yes/no/conditional answer from Codera Analytics | Low (a conversation, not engineering) | None | If terms prohibit even non-redistributive internal use, this milestone simply closes with "don't adopt" — that's a valid, low-cost outcome |
| 4 | Third-party corroboration strategy (§5.2, Strategy 3) | Add EconData as an optional, non-blocking second signal inside the diff/anomaly engine for QLFS, CPI, GDP, Population | Reviewer sees "Stats SA scrape says X, EconData says Y" when both are reachable; absence of EconData never blocks staging | Low-Moderate | Milestone 3 approved; milestone 2 in place (cleaner integration point, not strictly blocking) | Low — additive and non-blocking by design |
| 5 | GitHub Actions PR-based approval flow (unchanged from `CURRENT_STATE.md` §6 item 3) | Replace the local CLI approval gate with the architecture document's §7 PR-based design | Scheduled detection runs on a feature branch; promotion only on merge | Moderate | Milestones 1–2 should be stable first, to avoid automating an unverified parser | Equivalence tests still don't exist yet (blocked on the Postgres write path, per `CURRENT_STATE.md` §6 item 4) — don't let CI automate promotion before that exists |
| 6 | `repo-rate`/`repo-rate-sarb` dedup and `annual-cpi-avg` automation (unchanged from `CURRENT_STATE.md` §7) | Close the two highest-priority open items already identified | Single canonical SARB value; `annual-cpi-avg` automated | Low-Moderate | None new | Unchanged from existing plan |
| 7 | Crime / Education — no acquisition-architecture change | Confirm, explicitly, that no source registry or resolver work applies here | Track B (manual, scheduled review) remains the permanent design, not deferred debt | N/A | None | The main risk is *treating this as unfinished automation work* rather than the deliberately-chosen end state it already is |

Note that milestones 2–4 (the actual subject of this review) are **not prerequisites** for milestone 1, which remains the single most valuable next action regardless of anything decided here.

---

## 7. Risks and Unknowns

- **WAF empirical behavior is still unconfirmed.** Every session to date, including this one, has lacked genuine `statssa.gov.za` network access. The Tier-1 direct-URL fallback is implemented and unit-tested against synthetic fixtures, not yet proven against a live block.
- **EconData/SAMADB licensing is unverified** for your specific use case (public website, not academic research) — do not integrate before this is resolved in writing.
- **The Perplexity report's provincial-vs-national GDP conflation (§1.2)** is a concrete example of why every cited URL/product needs re-verification against the actual release, not just against the report.
- **Nesstar/SuperWEB2 automatability is unverified and, on current evidence, likely requires browser automation** — explicitly not recommended, consistent with your constraint against assuming Tier 2 is necessary.
- **No official Stats SA API beyond SARB's has been confirmed to exist**, by either this review or the report. Treat this as the working assumption, not a settled fact — Stats SA could add one; nothing here has ruled that out permanently, only that it's unconfirmed today.
- **The GitHub Actions PR-based promotion flow (architecture doc §7) still has no equivalence-test safety net**, since there's no Postgres write path yet. Don't let CI-driven promotion (Roadmap milestone 5) get ahead of that dependency.

---

## 8. Final Recommendation

Keep the current architecture's core shape. Rename and consolidate its already-emerging "try the direct file first, fall back to hub detection" pattern into a small, shared `SourceResolver` abstraction — this is the one concrete structural change worth making, and it costs a refactor, not a rewrite. Do not adopt Nesstar/SuperWEB2/DataFirst as acquisition paths for your current dataset set; they solve a microdata problem you don't have. Do treat EconData/SAMADB as a promising **secondary corroboration signal**, worth a licensing conversation, but never as a primary source or a silent fallback — especially not for `population`, given the exact class of bug (silent alternate-source substitution) that dataset already has a dedicated guard against. Above all, don't let this architectural exercise displace the actual next milestone: a real `--apply` run against a genuine downloaded Stats SA workbook is still the thing standing between "mitigated by design" and "empirically resolved," and no amount of source-registry design substitutes for it.
