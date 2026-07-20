# Implementation Specification — CPI (P0141) Stats SA Write Path

**Prepared:** 2026-07-20
**Audience:** Implementation engineer (human or AI assistant) continuing the SA Data Hub automation framework
**Status:** Draft — for review before implementation begins
**Milestone:** Phase 3b — the second of two milestones the Dataset Sourcing Plan groups under "Phase 3 — GDP and CPI"; named as the immediate next milestone in `CURRENT_STATE.md` §7

This document does not implement anything. It specifies CPI's write path at the same level of detail as `IMPLEMENTATION-SPEC-STATSSA-PHASE2.md` (QLFS) and `IMPLEMENTATION-SPEC-GDP.md`, grounded in the automation package and dataset JSON as they exist today (verified directly against the uploaded `automation.zip` / `data.zip`, not assumed from prose descriptions).

---

## 0. Milestone Context (read first)

`CURRENT_STATE.md` §7 names CPI as the immediate next milestone, following the same reusable pattern proven three times already: SARB (JSON API), Stats SA QLFS (Excel parse, single-column-per-metric), and Stats SA GDP (Excel parse, multi-column-per-metric with revision handling). CPI is explicitly called out as introducing **one genuinely new concern** neither prior milestone had:

> "CPI shares a file with an adapter that already writes to it. `inflation.json` holds both the Stats SA `cpi` stat and the SARB-owned `repo-rate` stat... a genuinely new field-ownership boundary against the SARB-owned `repo-rate` stat living in the same `inflation.json` file, not just a repeat of the GDP pattern." (`IMPLEMENTATION-SPEC-GDP.md` §0)

This document treats that boundary as the central design constraint, not an afterthought. Per this task's explicit instructions, **enforcing the boundary — not extending automation to the repo-rate stat, and not performing the `repo-rate` / `repo-rate-sarb` de-duplication described in the sourcing plan — is what this milestone does.** See §0.1 for why the de-duplication itself is deliberately out of scope here, despite being named as part of "the CPI milestone" in `CURRENT_STATE.md` and the sourcing plan.

### 0.1 Scope decision: the `repo-rate` de-duplication is NOT part of this milestone

Both `SA-Data-Hub-Dataset-Sourcing-Plan.md` (Phase 3) and `CURRENT_STATE.md` §6 item 1 describe the CPI milestone as also "retiring the duplicate `repo-rate` stat via the SARB API repo-rate reference." That work item requires **editing the `repo-rate` stat itself** — either replacing its value fields with a live reference/lookup against `interest-rates.json`, or removing the stat and repointing any downstream consumer (`stories.ts`, `registry.ts`, citations) at `repo-rate-sarb`.

This task's explicit instructions state: *"The implementation MUST ONLY update the Stats SA owned CPI statistics. It MUST NOT modify, overwrite, or independently fetch the SARB-owned repo-rate data already present in inflation.json."* Editing `repo-rate` — even to turn it into a reference rather than a duplicated fetch — is a modification of SARB-owned data by definition, and `id` is a protected field per `core/metadata.py::PROTECTED_FIELDS`, making any restructuring of that stat (e.g. removing it, or changing its shape to a lookup) a change that would need to go through `ai-context.md`'s "NEVER Change Without Asking" gate (statistic IDs) regardless of which adapter does it.

**Decision:** this milestone builds the Stats SA CPI write path only, and treats `repo-rate` as **read-only, untouched, and unreachable** by any code this milestone adds. The de-duplication (retiring `repo-rate` in favour of a reference to `interest-rates.json`'s `repo-rate-sarb`) is recorded as a **separate, follow-on milestone** requiring its own review, since it changes a protected field's role and needs the same "genuinely new concern, isolated build" treatment `IMPLEMENTATION-SPEC-GDP.md` §0 gave GDP relative to QLFS. This is flagged in §17 as an open question for stakeholder confirmation, not silently resolved.

### 0.2 Scope decision: `annual-cpi-avg` is deferred, mirroring the GDP precedent

`inflation.json` has four statistics. Three are Stats SA-owned: `cpi-headline`, `food-inflation`, `annual-cpi-avg`. One is SARB-owned: `repo-rate` (§0.1). Of the three Stats SA stats, `cpi-headline` and `food-inflation` are both monthly-cadence figures sourced from the **same row-per-metric table** in each month's P0141 Excel release. `annual-cpi-avg`, by contrast, is a once-a-year figure (the full-year average, confirmed each January alongside the December CPI print) that — per `dataset-analysis.md`'s own per-dataset table — is not published on the same monthly cadence and, per the existing `inflation.json` data, uses annual labels (`"2025"`) rather than monthly ones (`"Apr 2026"`).

This is structurally the same situation `IMPLEMENTATION-SPEC-GDP.md` §13 item 1 faced with `gdp-annual-growth` / `gdp-nominal` / `gdp-per-capita`: a different cadence, a different label format, and — because no live Stats SA workbook has been inspected in any implementation session to date (§17) — an unverified table layout that would double the guesswork if bundled into the same parser as the monthly figures.

**Decision, by direct analogy to the GDP precedent:** this milestone's write path covers `cpi-headline` and `food-inflation` only. `annual-cpi-avg` is deferred to its own follow-on milestone, exactly as `gdp-annual-growth` etc. were deferred from GDP. This narrows "the Stats SA owned CPI statistics" (this task's phrasing) to the two monthly stats for the purposes of this build; §17 records this explicitly as a scoping call this document is making, not a fact discovered in the source documentation, so it can be revisited if the stakeholder disagrees.

---

## 1. Scope

**In scope:**
- Real `check_for_updates()` detection for `dataset_id == "inflation"` (ETag/content-hash against the P0141 release hub), replacing the existing Phase A stub.
- Excel discovery, download, and archival of the monthly CPI publication (mirroring the QLFS/GDP discovery pattern, adapted for P0141's URL conventions and monthly cadence).
- A new parser, `parse_cpi_workbook()`, that extracts the **latest month's** value for `cpi-headline` and `food-inflation` only (see §10 for why CPI does not need GDP's multi-column revision handling).
- A new transform, `_transform_inflation()`, that applies those two values to `cpi-headline` and `food-inflation` only, updates only the narrowly-scoped subset of the shared `_meta` block described in §12.3, and leaves `repo-rate` and `annual-cpi-avg` byte-for-byte untouched.
- A dedicated, hard-fail **ownership boundary assertion** (§11 item 5) — new, not a reuse of any existing check — that proves the untouched stats are in fact untouched before anything is staged.
- Extending `StatsSAAdapter.fetch_and_apply()` so that a single `--apply` run processes QLFS (unchanged), GDP (unchanged), **and** CPI, each independently gated, each independently able to fail without affecting the others.
- One version entry, staged (not written directly), for `inflation` when either or both of the two owned stats have changed.
- Tests (§15) and the specific documentation updates listed in §16.

**Explicitly not in scope** — see §17 for the full reasoning:
- The `repo-rate` / `repo-rate-sarb` de-duplication (§0.1).
- `annual-cpi-avg` (§0.2).
- Any change to `automation/core/*.py`, `automation/runner.py`'s dispatch logic, `automation/adapters/sarb.py`, `automation/adapters/saps.py`, or `automation/adapters/worldbank.py`.
- Any change to `interest-rates.json`, or any read of it by this milestone's code. (The ownership boundary is enforced by leaving `repo-rate` alone within `inflation.json` — it does not require reading `interest-rates.json` at all, since no reference/lookup is being built yet; see §0.1.)
- Empirical verification against a real, downloaded CPI Excel workbook (no session to date has had network access to `statssa.gov.za` — same carried-forward limitation as QLFS and GDP).
- Population, housing, census, municipalities — untouched, remain Phase A stubs.

---

## 2. Goals

1. Give `inflation.json`'s **`cpi-headline`** and **`food-inflation`** statistics a real, gated write path, following the exact staging → approval → promote pattern already proven for SARB, QLFS, and GDP.
2. Parse the Stats SA P0141 CPI Excel release by header/label matching (not fixed cell coordinates), consistent with `parse_qlfs_workbook()` and `parse_gdp_workbook()`, for the same reason: Stats SA's per-release table layout is not a stable contract.
3. Establish, for the first time in this codebase, an explicit, tested, hard-fail **ownership boundary** between two adapters writing into the same dataset JSON file — a mechanism that did not need to exist for GDP (`gdp.json` is Stats SA-only) and does not exist anywhere in `core/*.py` today.
4. Upgrade `StatsSAAdapter.check_for_updates()`'s `"inflation"` branch from its current Phase A stub (hardcoded literal strings, `status="unknown"`) to a real ETag/content-hash check against the P0141 release hub, mirroring `_check_qlfs()` / `_check_gdp()`.
5. Reuse, not duplicate, every piece of existing infrastructure this doesn't need to reinvent — including, where the existing helper is already dataset-agnostic in its implementation despite a QLFS-flavoured name (see §5), reusing the function itself rather than writing a CPI-specific copy.

---

## 3. Non-goals

1. Automating `repo-rate` in any way, or reading/writing `interest-rates.json` (§0.1).
2. Automating `annual-cpi-avg` (§0.2).
3. Redesigning the shared `_meta` block convention, the staging/version/promote pipeline, or the CLI. This milestone extends `StatsSAAdapter` only, exactly as GDP did.
4. Building a single generalised Excel-table parser shared across QLFS/GDP/CPI. Each of the three existing/new parsers (`parse_qlfs_workbook`, `parse_gdp_workbook`, `parse_cpi_workbook`) remains its own function, matching the precedent GDP set (§10.1) rather than refactoring QLFS's parser to be more generic than this milestone needs.
5. A GitHub Actions / CI-scheduled trigger for CPI. The approval gate remains the local CLI (`--approve`/`--promote`), unchanged.
6. Any manual edit to `inflation.json` itself. The only way this milestone changes `inflation.json`'s on-disk content is via the normal runtime `--apply` → `--approve` → `--promote` sequence.

---

## 4. Architecture impact

**None at the `core/*.py` or architecture-document level.** This milestone is, by design, a third instance of the same pattern the architecture document's §1–§5 already describe and `CURRENT_STATE.md` §3 already diagrams:

```
official sources → adapters/*.py → core/staging.py → core/version.py → core/promote.py → src/data/datasets/*.json
```

The one architecturally new element is confined entirely to the **adapter layer**, inside `StatsSAAdapter`: a dedicated ownership-boundary assertion that runs *before* staging, for `inflation` only. This is a dataset-specific safeguard (per `SA-Data-Hub-Automation-Architecture.md` §3's tier classification: "business/plausibility rules... are dataset-specific"), not a generic core mechanism — `check_protected_fields()` in `core/metadata.py` already exists and is reused for structural protection (IDs, slugs), but it does not check *values*, which is what the ownership boundary here specifically needs (§11 item 5). Adding a general-purpose "field-ownership" primitive to `core/metadata.py` was considered and rejected for this milestone: CPI is the only dataset with a cross-adapter ownership split today, so a generic mechanism would be built for a population of one, in direct tension with this task's instruction to avoid introducing abstractions not justified by the current milestone. If a second shared-file, cross-adapter dataset ever appears, promoting this helper into `core/metadata.py` at that point would be a well-justified, minimal generalisation — not now.

No change to `runner.py`'s dispatch logic, the CLI surface, or the promotion contract (`promote_version()` still refuses anything not `"approved"`, unchanged).

---

## 5. Existing code that will be reused

| Function / class | Location | Reused as-is for CPI? |
|---|---|---|
| `_build_http_client()`, `with_retry()`, `STATSSA_POLICY`, `WATCH_POLICY`, `AutomationHTTPError` | `statss.py` / `core/retry.py` / `core/http_client.py` | Yes, unchanged. |
| `_fetch_release_hub_html()`, `_extract_excel_url()`, `_extract_release_period()`, `_extract_hub_etag_and_hash()` | `statss.py` | Yes, unchanged — all four are already parameterised by `hub_url`/`html` with no QLFS-specific logic in their bodies, exactly as GDP already established (`IMPLEMENTATION-SPEC-GDP.md` §5.5). |
| `_download_publication()` | `statss.py` | Yes, unchanged. |
| `_best_effort_publication_date()` | `statss.py` | Yes, unchanged — takes a workbook, has no metric-specific logic. |
| `_find_metric_value(ws, col_idx, include, exclude)` | `statss.py` | Yes, unchanged — already fully generic over the column index and label terms; CPI supplies its own `include`/`exclude` tuples (§10.3) and its own column index (from a new month-header finder, §10.2), but calls this exact function. |
| `check_protected_fields()` | `core/metadata.py` | Yes, unchanged — run once against the full `inflation.json` candidate document (previous vs. proposed), exactly as QLFS/GDP already do per-dataset. |
| `_check_qoq_jump()` | `statss.py` | Yes, unchanged — the function's logic (compare two floats, flag if the delta exceeds a threshold, return a warning string) is not actually quarter-specific despite its name; reused with a CPI-specific threshold (§11 item 4), exactly as GDP reused it with its own wider threshold. No rename — see §10.1 for why this codebase's convention is "reuse the generic function, don't rename it for a new caller." |
| `_apply_qlfs_rate_map()` | `statss.py` | **Yes, unchanged, and this is the most important reuse decision in this document** — see §12.1. Despite its name, this function's body has no QLFS-specific logic: it takes a `dict[stat_id, float]` and applies only those stat IDs, seed-or-append-or-revise, to whatever document is passed in. It requires no modification and no CPI-specific copy to serve `cpi-headline` / `food-inflation`. |
| `_get_current_stat_rate()`, `_determine_qlfs_trend()` | `statss.py` | Yes, unchanged — both are generic (stat_id lookup; float-comparison direction), despite their names, same reasoning as `_apply_qlfs_rate_map()`. |
| `_read_current_dataset_json()` | `statss.py` | Yes, unchanged. |
| `core/staging.py::write_staged_dataset()`, `core/version.py::new_version_entry()` / `save_version_entry()`, `core/promote.py::promote_version()` | `core/` | Yes, unchanged — the entire staging/version/promote pipeline. |
| `_QLFS_HUB_URL` / `_GDP_HUB_URL` construction pattern (`f"{_RELEASE_HUB_BASE}&PPN=..."`) | `statss.py` | Pattern reused for `_CPI_HUB_URL`; `automation/config/sources/statssa.yaml`'s `release_hub_ids.inflation: "P0141"` already provides the publication code — **no config change needed**, exactly as GDP's `gdp.yaml`/`statssa.yaml` entries were already correct before that milestone started. |
| `automation/config/datasets/inflation.yaml` | `automation/config/datasets/` | Already exists and already encodes the ownership split declaratively: `cpi_source_id: statssa`, `repo_rate_source_id: sarb`, `repo_rate_dedup_required: true` (flagging the §0.1 follow-on, not asking this milestone to do it). **No config change needed.** |

**Not reused, because the existing version is deliberately narrower or would silently violate the ownership boundary if reused verbatim:**

| Function | Why not reused as-is |
|---|---|
| `_find_latest_quarter_column()` | Matches `Q[1-4] YYYY` headers; CPI headers are month-year (`May 2026`), a different regex shape entirely. A new `_find_latest_month_column()` is required (§10.2) — this is a direct parallel to `_find_all_quarter_columns()` in the GDP milestone, not a modification of the quarterly version. |
| `_update_qlfs_meta()` / `_update_gdp_meta()` | Both unconditionally overwrite `_meta.source_url` and implicitly assume the whole `_meta` block belongs to one organisation. `inflation.json`'s `_meta` block is prose shared across Stats SA and SARB (its `notes` field explicitly describes SARB's MPC cadence). Reusing either function verbatim would risk touching shared prose without a clear ownership story. A narrower `_update_cpi_meta()` is required (§12.3). |
| `parse_qlfs_workbook()` / `parse_gdp_workbook()` | Neither is reusable as-is: QLFS's is keyed to `_QLFS_METRIC_SPECS` and quarter columns; GDP's is keyed to `_GDP_GROWTH_SPEC` and multi-column revision extraction, which CPI does not need (§10.1). A new `parse_cpi_workbook()` is required, structurally closer to `parse_qlfs_workbook()` than to `parse_gdp_workbook()`. |

---

## 6. Files expected to change

| File | Change |
|---|---|
| `automation/adapters/statss.py` | Add: `CPIExtract` dataclass; `_CPI_HUB_URL`, `_CPI_PUBLICATION_CODE`, `_CPI_PUBLICATION_BASE`, `_CPI_DATASET_JSON`, `_CPI_HEADLINE_STAT_ID`, `_CPI_FOOD_STAT_ID`, `_CPI_OWNED_STAT_IDS`, `_CPI_METRIC_SPECS`, `_CPI_PLAUSIBLE_RANGE`, `_CPI_JUMP_WARNING_THRESHOLD`, `_MONTHLY_LABEL_RE`, `_MONTH_HEADER_PATTERN` module-level constants. Add `_find_latest_month_column()`, `parse_cpi_workbook()`, `_validate_cpi_rate()`, `_validate_monthly_label()`, `_assert_cpi_ownership_boundary()`, `_update_cpi_meta()`, `_transform_inflation()`, `_build_cpi_candidate_urls()`, `_determine_current_cpi_month()`, `_probe_cpi_publication_url()`, `_discover_cpi_excel()` module-level functions. Add `_check_cpi()`, `_cpi_hash_path()`, `_load_cpi_previous_hash()`, `_save_cpi_hash()` adapter methods. Replace the `"inflation"` stub branch in `check_for_updates()` (statss.py, the literal-string block returning `current_period="April 2026"` / `latest_period="May 2026 (4.5%...)"`) with a real dispatch to `_check_cpi()` (same `self._cpi_check_cache` pattern as `_qlfs_check_cache` / `_gdp_check_cache`). Extend `fetch_and_apply()` to also run the CPI flow after the existing QLFS and GDP flows, adding a `result["cpi"]` nested dict (mirroring `result["gdp"]`'s shape) without changing any existing key's meaning. Update `describe()`: add a `phase_3b_status` entry; bump `version` from `0.4.1` to `0.5.0`. |
| `automation/adapters/tests/test_statss.py` | Add the CPI test functions listed in §15. No existing test is modified. |
| `src/data/datasets/inflation.json` | **Not edited by this implementation task itself.** Written only at runtime via staging → approve → promote, exactly as `gdp.json` / `unemployment.json` are today. |
| `CURRENT_STATE.md` | Append-pattern update once implementation is verified: adapter table (§1.2) gains the CPI write-path description; §2 gains a new completed-milestone entry; §5/§6/§7 updated — CPI moved off "remaining work"; population (or the next-named dataset, per the sourcing plan's ordering) named as the new next milestone. |
| `CHANGELOG.md` | One new entry, prepended above the existing top entry. Prior entries must remain byte-identical. |

**Files that must NOT change:** `automation/core/*.py`, `automation/runner.py`, `automation/adapters/sarb.py`, `automation/adapters/saps.py`, `automation/adapters/worldbank.py`, `automation/config/datasets/inflation.yaml` (already correct — see §5), `automation/config/sources/statssa.yaml` (already correct), `src/data/datasets/interest-rates.json`, any other `src/data/datasets/*.json`, any file under `src/lib/`.

---

## 7. Dataset ownership analysis

`inflation.json`'s four statistics, verified directly against the file (not summarised secondhand):

| stat `id` | Owning organisation | Owning adapter (today) | In scope for this milestone? |
|---|---|---|---|
| `cpi-headline` | Stats SA (CPI, P0141) | None yet — this milestone builds it | **Yes** |
| `food-inflation` | Stats SA (CPI, P0141) | None yet — this milestone builds it | **Yes** |
| `annual-cpi-avg` | Stats SA (CPI, P0141, annual table) | None yet | **No** — deferred (§0.2) |
| `repo-rate` | SARB (MPC decision) | `SARBAdapter` (writes `interest-rates.json`'s `repo-rate-sarb`; does **not** currently write `repo-rate` inside `inflation.json` — that stat is presently updated only by the legacy manual `scripts/update_inflation.py`, per `dataset-analysis.md`) | **No — explicitly forbidden from being touched by this milestone (§0.1)** |

Two important, verified facts that shape the design:

1. **No adapter currently writes `inflation.json`'s `repo-rate` stat.** `SARBAdapter._transform_interest_rates()` (per `CURRENT_STATE.md` §1.2) writes `interest-rates.json` only. The `repo-rate` stat inside `inflation.json` is presently stale relative to `repo-rate-sarb` — the uploaded `inflation.json` shows `6.75%` (March 2026 MPC) while `interest-rates.json` shows `7.00%` (July 2026 MPC), i.e. **two MPC decisions out of date** — exactly the staleness `SA-Data-Hub-Dataset-Sourcing-Plan.md` §4 documents. This milestone does not fix that staleness (§0.1); it only guarantees it does not make it worse or touch that field in any way.
2. **`automation/config/datasets/inflation.yaml` already documents the split** (`cpi_source_id: statssa`, `repo_rate_source_id: sarb`, `repo_rate_dedup_required: true`), confirming the ownership boundary was anticipated at the configuration layer before any adapter code existed for CPI. This spec operationalises that existing config; it does not introduce the ownership concept from scratch.

**Ownership boundary enforcement mechanism (see §11 item 5 for the full contract):** `_transform_inflation()` never iterates over `doc["statistics"]` blindly — it looks up only `cpi-headline` and `food-inflation` by ID (via the reused `_apply_qlfs_rate_map()`, §12.1) and never reads or writes anything else in the document. As defense-in-depth against a future accidental change to that call site (e.g. a rate_map dict that someday, by bug, includes `"repo-rate"` as a key), a dedicated `_assert_cpi_ownership_boundary(previous_doc, proposed_doc)` runs immediately after transform and before staging, deep-comparing every stat **not** in `_CPI_OWNED_STAT_IDS` between the previous on-disk document and the proposed candidate, and hard-fails staging for `inflation` if any difference — of any kind, not just a protected-field change — is found in `repo-rate` or `annual-cpi-avg`. This is stricter than `check_protected_fields()` (which only flags ID/slug/code changes, not value changes) and is the single most load-bearing new function in this milestone.

---

## 8. CPI source analysis

Drawn directly from `SA-Data-Hub-Dataset-Sourcing-Plan.md` §4 and `dataset-analysis.md`'s `inflation.json` entry — no new research performed by this document; both are treated as source of truth per the project instructions.

| Attribute | Finding |
|---|---|
| Organisation | Statistics South Africa (Stats SA) |
| Publication | Consumer Price Index, Statistical Release P0141 |
| Webpage | `https://www.statssa.gov.za/?page_id=1854&PPN=P0141` |
| Cadence | Monthly, released **~22nd of the month for the prior month's figure** (the sourcing plan notes this drifts and should not be treated as a fixed calendar day) |
| API? | No REST/JSON API for CPI (the SARB API referenced elsewhere in the sourcing plan covers the repo rate only, not CPI) |
| Excel/CSV available? | Yes — Excel data tables are published alongside each P0141 PDF release, per the sourcing plan's §Headline finding 5 |
| PDF-only? | No |
| Automation suitability (sourcing plan's own rating) | "Moderate" — Excel parse, monthly cadence, high public visibility |
| Recommended strategy (sourcing plan) | Automated Excel download on the known post-release schedule, with mandatory human sign-off given market sensitivity — i.e. exactly the staging → approval → promote pattern this milestone builds |

**What is genuinely new relative to QLFS/GDP:** cadence (monthly, not quarterly), label format (month-year, not quarter-year), and — the reason this document exists — shared-file ownership with a second adapter. What is **not** new: the discovery mechanism (release hub + direct-URL probing), the retry/backoff policy, the staging/version/promote pipeline, or the general shape of "parse an Excel table by label, fail loudly if the label can't be found."

---

## 9. Download/discovery strategy

Mirrors the QLFS/GDP pattern exactly, parameterised for P0141 and monthly cadence:

```python
_CPI_HUB_URL = f"{_RELEASE_HUB_BASE}&PPN=P0141"
_CPI_PUBLICATION_CODE = "P0141"
_CPI_PUBLICATION_BASE = "https://www.statssa.gov.za/publications/P0141/"
```

`config/sources/statssa.yaml`'s `release_hub_ids.inflation: "P0141"` already matches — no config change.

`_determine_current_cpi_month() -> tuple[int, int]` (month, year): CPI for calendar month *M* is released around the 22nd of month *M+1*. Mirroring `_determine_current_qlfs_quarter()`'s month-boundary style:

```python
def _determine_current_cpi_month() -> tuple[int, int]:
    """
    Determine the most recently expected CPI release month.

    CPI for month M is released ~22nd of month M+1 (dataset-analysis.md;
    SA-Data-Hub-Dataset-Sourcing-Plan.md §4 notes this drifts and is not
    a fixed calendar day). Before the ~22nd of the current month, the
    most recently released figure is for two months prior; from the
    22nd onward, it is for the previous month.
    """
```

`_build_cpi_candidate_urls(month: int, year: int) -> list[str]` follows `_build_qlfs_candidate_urls()` / `_build_gdp_candidate_urls()`'s structure: a list of plausible filename prefixes against `_CPI_PUBLICATION_BASE` (e.g. `Statistical%20release%20P0141%20{MonthName}%20{Year}`, `CPI%20Media%20Release%20{MonthName}%20{Year}` — following the same P0211/P0441-derived naming heuristics scaled to P0141), each tried with `.xlsx`, `.xls`, `.pdf` in that order. **This URL convention is unconfirmed**, exactly as the QLFS and GDP ones were at the start of their respective milestones — same disclosure, same reason (§17).

`_probe_cpi_publication_url()` and `_discover_cpi_excel()` are structurally identical to their QLFS/GDP counterparts, reusing `_fetch_release_hub_html()`, `_extract_excel_url()`, and `_extract_release_period()` unchanged — no edits to those three functions are needed or permitted.

The existing WAF-detection block in `_check_qlfs()` / `_check_gdp()` (Incapsula challenge check, Tier 1 fallback to the direct-URL probe per `IMPLEMENTATION-SPEC-STATSSA-WAF.md` §6.1) is mirrored in `_check_cpi()` using the same `_STATSSA_BROWSER_HEADERS` / probe-fallback logic already implemented — no new WAF-handling code is written; the existing Tier 1 mechanism is reused verbatim, parameterised by `_CPI_HUB_URL` and `_determine_current_cpi_month()` in place of the QLFS/GDP equivalents.

---

## 10. Parsing strategy

### 10.1 Why CPI needs its own parser, and why it's simpler than GDP's, not more complex

`parse_gdp_workbook()` exists specifically because GDP **routinely revises prior quarters**, requiring every available column to be read (`IMPLEMENTATION-SPEC-GDP.md` §1 item 3). CPI does not have an equivalent routine-revision requirement in any of the source documents reviewed for this spec (`dataset-analysis.md`, the sourcing plan) — CPI base-year rebasing happens, but rarely, and is not described anywhere as a routine per-release event the way GDP's quarterly restatement is. **Assumption, flagged for confirmation (§17):** this document assumes CPI, like QLFS, only needs the newest month's value per metric, not a revision-aware multi-column read. If this assumption is wrong, the fix is structurally the same one GDP already made — generalise the single-column finder into a multi-column one — and the `_find_latest_month_column()` / `_find_all_month_columns()` relationship would mirror `_find_latest_quarter_column()` / `_find_all_quarter_columns()` exactly.

Given that assumption, `parse_cpi_workbook()` is structurally closer to `parse_qlfs_workbook()` (single newest-column read per metric) than to `parse_gdp_workbook()` (multi-column). It is still a new function — not a reuse of `parse_qlfs_workbook()` — because the header-matching regex is different (month-year vs. quarter-year) and the metric spec table is different (`_CPI_METRIC_SPECS` vs. `_QLFS_METRIC_SPECS`). Per §3 item 4 (non-goals) and matching the precedent GDP set by not refactoring QLFS's parser to be shared, this milestone does not attempt to unify all three parsers behind one generic table-reader — that generalisation is not justified by two data points (QLFS, GDP) and would not be justified by three either, per this task's instruction to avoid introducing abstractions not required by the current milestone.

### 10.2 New parsing helper — `_find_latest_month_column()`

```python
_MONTH_HEADER_PATTERN = re.compile(
    r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})",
    re.IGNORECASE,
)

def _find_latest_month_column(ws: Any) -> tuple[int, str] | None:
    """
    Scan the first several rows of a worksheet for CPI month-header
    cells (e.g. "May 2026" or "May-2026") and return the column index
    and normalised "Mon YYYY" label of the chronologically latest one
    found.

    Direct parallel to _find_latest_quarter_column() for month-year
    headers instead of quarter-year headers. Does not replace or modify
    _find_latest_quarter_column() — QLFS keeps using its own version,
    unchanged.

    Returns None if no month-header cell is found in this sheet.
    """
```

Normalises the matched month name to its three-letter form (`"May"`, not `"MAY"` or `"may"`) so the returned label matches the `Mon YYYY` convention already used by `inflation.json`'s existing series data (`"May 2025"`, `"Apr 2026"`) and by `_validate_monthly_label()` (§11 item 2). Handles both a bare month name and one immediately followed by a hyphen/period, since Stats SA workbook header conventions are not confirmed (§17) and a slightly looser match here is a deliberate hedge against layout drift, consistent with the "match by label, don't assume a rigid format" philosophy `parse_qlfs_workbook()` already established.

### 10.3 `CPIExtract` and `parse_cpi_workbook()`

```python
@dataclass
class CPIExtract:
    """Named values extracted from a single CPI Excel workbook."""
    release_period: str        # latest month found, e.g. "May 2026"
    publication_date: str      # ISO YYYY-MM-DD, best-effort
    cpi_headline: float
    food_inflation: float
```

```python
_CPI_METRIC_SPECS: dict[str, dict[str, tuple[str, ...]]] = {
    "cpi_headline": {
        "include": ("all items",),
        "exclude": ("food",),
    },
    "food_inflation": {
        "include": ("food",),
        "exclude": (),
    },
}
```

```python
def parse_cpi_workbook(file_bytes: bytes) -> CPIExtract:
    """
    Parse a CPI Excel workbook and extract the latest month's headline
    and food CPI values, by label/header matching (not fixed cell
    coordinates) — same philosophy as parse_qlfs_workbook().

    Algorithm
    ---------
    1. Open the workbook (openpyxl, data_only=True, read_only=True) —
       same error handling as parse_qlfs_workbook(): any exception
       opening the file is re-raised as ValueError with a clear message.
    2. For each metric in _CPI_METRIC_SPECS, for each worksheet, call
       _find_latest_month_column(); if found, call _find_metric_value()
       (REUSED, UNCHANGED) with that column index and the metric's
       include/exclude terms. Stop at the first worksheet that yields a
       value for that metric — mirrors parse_qlfs_workbook()'s loop
       structure exactly.
    3. If either metric resolves to a different release_period than the
       other, log a warning and use the period most metrics agree on
       (same drift-detection behaviour parse_qlfs_workbook() already
       has, reused as a pattern, not as shared code).

    Raises
    ------
    ValueError
        If either _CPI_METRIC_SPECS entry cannot be located by label
        match in any worksheet. The message names exactly which
        metric(s) failed to resolve, mirroring parse_qlfs_workbook()'s
        and parse_gdp_workbook()'s fail-loudly contract — no PDF
        fallback, no guessing, no stale-value substitution.

    publication_date is obtained via the existing, already-generic
    _best_effort_publication_date(wb) — reused as-is, no changes needed.
    """
```

**`_CPI_METRIC_SPECS`'s label terms are unverified against a real Stats SA P0141 workbook** — no session to date has had network access to download one. This is carried forward explicitly, exactly as `_QLFS_METRIC_SPECS` and `_GDP_GROWTH_SPEC` are (`CURRENT_STATE.md` §5). If the real labels differ, `parse_cpi_workbook()` fails loudly by design rather than guessing, and `_CPI_METRIC_SPECS` is the first and only place that needs correcting.

---

## 11. Validation rules

| # | Check | Behaviour on failure |
|---|---|---|
| 1 | `_validate_cpi_rate(value, label) -> list[str]` — plausibility range `_CPI_PLAUSIBLE_RANGE = (-5.0, 30.0)` (percentage points). **New validator, not a reuse of `_validate_percentage()`'s `[0, 100]` range.** CPI is year-on-year % change and can, in principle, be negative (deflation) even though this codebase's existing `inflation.json` history (2015–2026) never goes below 2.8%; the upper bound is set well above the highest historical value in the file (6.9% in 2022) to tolerate a genuine future spike without being a meaningless `[0, 100]` check. **Assumption, flagged for confirmation (§17):** the exact bounds are this document's judgement call, not sourced from any of the uploaded documentation. | Hard fail for that value — abort staging for `inflation` this run, same as a QLFS/GDP range violation aborts that dataset only. |
| 2 | `_validate_monthly_label(label) -> list[str]` — new, format check against `_MONTHLY_LABEL_RE = re.compile(r"^[A-Z][a-z]{2} \d{4}$")`, matching `dataset-analysis.md`'s own documented `monthly_label` rule (`^[A-Z][a-z]{2} \d{4}$`) verbatim. Applied to `release_period` and to the label of any series point touched. | Hard fail if the label doesn't match. |
| 3 | `check_protected_fields()` (`core/metadata.py`) — reused unchanged, applied once to the full candidate `inflation.json` document (proposed vs. current-on-disk), exactly as QLFS/GDP do it. | Hard fail — abort staging for `inflation` this run; existing on-disk file untouched. |
| 4 | Month-over-month anomaly flag — reuse `_check_qoq_jump()` unchanged (§5), called once per touched stat, with a CPI-specific threshold `_CPI_JUMP_WARNING_THRESHOLD = 1.5` (percentage points). Narrower than GDP's `5.0` and QLFS's `3.0`: CPI's own historical series in `inflation.json` moves by well under 1pp month-to-month in almost every observed case (the `+0.9pp` April 2026 jump already on file being the one existing exception), so a 1.5pp threshold flags genuinely unusual moves without being noisy on ordinary ones. **Assumption, flagged for confirmation (§17).** | Warning only, recorded in the version-entry notes — never a hard failure, identical treatment to QLFS's and GDP's anomaly flags. |
| 5 | **`_assert_cpi_ownership_boundary(previous_doc, proposed_doc) -> list[str]`** — new, and the load-bearing check this entire milestone exists to add. Deep-compares every `statistics[]` entry in `proposed_doc` whose `id` is **not** in `_CPI_OWNED_STAT_IDS = frozenset({"cpi-headline", "food-inflation"})` against the corresponding entry in `previous_doc` (matched by `id`). Any difference at all — not just a protected-field change, a value change too — in `repo-rate` or `annual-cpi-avg` is a violation. Also asserts the **set of stat IDs** present is unchanged (no stat silently added or removed). | Hard fail — abort staging for `inflation` entirely; this is checked *before* anything is written to staging, not as a post-hoc audit. |
| 6 | Structural sanity note (informational only): if `_transform_inflation()`'s rate_map (built from `parse_cpi_workbook()`'s output) contains any key outside `_CPI_OWNED_STAT_IDS`, this is a programming error in the transform itself, not a data problem — log an `ERROR` and abort before check #5 even runs, since check #5 comparing against a rate_map that already violates the boundary is redundant with a simpler pre-condition assertion at the call site. | Hard fail (defensive assertion, not expected to ever trigger in correct code). |

---

## 12. Transformation strategy

### 12.1 Reuse `_apply_qlfs_rate_map()` directly — do not write `_apply_cpi_rate_map()`

Per §5, `_apply_qlfs_rate_map(doc, rate_map, *, release_period, publication_date)` has no QLFS-specific logic in its body: it iterates `doc["statistics"]`, skips any stat whose `id` is not a key in `rate_map`, and for matched stats applies the shared value/change/trend/series seed-or-append-or-revise logic already proven for SARB, unemployment, youth-unemployment, and labour-force. `_transform_inflation()` calls it exactly as `_transform_unemployment()` does:

```python
def _transform_inflation(
    current_doc: dict[str, Any],
    extract: CPIExtract,
    source_url: str,
) -> dict[str, Any]:
    """
    Apply CPI values to the existing inflation.json document shape.
    Touches cpi-headline and food-inflation only. repo-rate and
    annual-cpi-avg are never read or written by this function — the
    deep-copy at the top preserves them exactly as they were in
    current_doc, and _apply_qlfs_rate_map() only mutates stats whose id
    is a key in rate_map.
    """
    doc = copy.deepcopy(current_doc)
    rate_map = {
        _CPI_HEADLINE_STAT_ID: extract.cpi_headline,
        _CPI_FOOD_STAT_ID: extract.food_inflation,
    }
    assert set(rate_map.keys()) <= _CPI_OWNED_STAT_IDS  # see §11 item 6
    _apply_qlfs_rate_map(
        doc, rate_map,
        release_period=extract.release_period,
        publication_date=extract.publication_date,
    )
    _update_cpi_meta(
        doc,
        release_period=extract.release_period,
        publication_date=extract.publication_date,
    )
    return doc
```

This is the single clearest instance in this specification of the task's instruction to "reuse existing code wherever possible" and "avoid introducing abstractions not justified by this milestone" — the correct amount of new code for the value-application step is **zero**, because the existing function, despite its name, was already general enough.

### 12.2 `changeLabel` and `trend` semantics carry over unchanged

`_apply_qlfs_rate_map()`'s existing `changeLabel` (`"from {prev_label}"`) and `_determine_qlfs_trend()`'s up/down/stable logic apply to CPI's percentage-point deltas with no adjustment needed — this is the same kind of "value went up/down/stable since last period" semantics QLFS's rates already use, and CPI's `change`/`trend` fields in the existing JSON (`"change": 0.9, "trend": "up"`) already follow this exact convention.

### 12.3 `_update_cpi_meta()` — deliberately narrower than `_update_qlfs_meta()` / `_update_gdp_meta()`

```python
def _update_cpi_meta(
    doc: dict[str, Any],
    *,
    release_period: str,
    publication_date: str,
) -> None:
    """
    Update ONLY doc["_meta"]["last_verified"] and doc["_meta"]["automation"].

    Deliberately does NOT touch _meta["source"], _meta["source_url"],
    _meta["update_frequency"], or _meta["notes"] — unlike
    _update_qlfs_meta()/_update_gdp_meta(), which overwrite source_url
    unconditionally. inflation.json's _meta block is shared prose
    describing BOTH the Stats SA CPI component and the SARB repo-rate
    component (see its "notes" field, which explicitly mentions MPC
    cadence). Rewriting those fields is a documentation/copy decision
    that belongs to a human editing the file deliberately, not something
    an automated CPI-only write path should do as a side effect of
    updating two numbers. If a future milestone (e.g. the repo-rate
    de-duplication, §0.1) needs to change those fields, that is its own,
    separate, reviewed decision.
    """
    if "_meta" not in doc:
        doc["_meta"] = {}
    doc["_meta"]["last_verified"] = date.today().isoformat()
    doc["_meta"]["automation"] = {
        "updatedBy": "statssa-adapter/cpi",
        "updatedAt": datetime.now(tz=timezone.utc).isoformat(),
        "releasePeriod": release_period,
        "sourceFile": publication_date,
    }
```

This is a genuine, intentional deviation from the `_update_qlfs_meta()` / `_update_gdp_meta()` precedent, made necessary by §7's finding that `inflation.json`'s `_meta` block is not single-owner the way `gdp.json`'s and the QLFS files' are. It is documented here rather than silently diverging from the established pattern, per this task's instruction to explain trade-offs when a proposed change deviates from prior precedent.

---

## 13. Change detection strategy

`_check_cpi()` mirrors `_check_qlfs()` / `_check_gdp()` exactly:

1. Build the HTTP client (`_build_http_client()`, reused).
2. Load the previous hub-page hash (`_load_cpi_previous_hash()`, new but structurally identical to `_load_qlfs_previous_hash()` / the GDP equivalent — a one-line-different file path under `self.config.report_dir / "versions" / "cpi_hub.sha256"`).
3. `client.etag_check(_CPI_HUB_URL, previous_sha256=previous_hash)` via `with_retry(..., policy=WATCH_POLICY)` — reused unchanged.
4. WAF-challenge check on the response body (`"_Incapsula_Resource"` / `"incapsula"` substring match) — reused unchanged, with the Tier 1 fallback (`_probe_cpi_publication_url()`) on a WAF-blocked hub, returning `status="unknown"` with a probe-based signal, exactly as `_check_qlfs()` / `_check_gdp()` already do per `IMPLEMENTATION-SPEC-STATSSA-WAF.md` §6.1.
5. If unchanged: `status="up_to_date"`.
6. If changed: save the new hash, return `status="update_available"`, with `notes` naming any Excel URL found via `_extract_excel_url()` (best-effort, same as QLFS).

`check_for_updates()`'s dispatch gains:

```python
if dataset_id == "inflation":
    if self._cpi_check_cache is None:
        self._cpi_check_cache = self._check_cpi(dataset_id, dataset_config)
    return self._cpi_check_cache
```

replacing the existing hardcoded-literal stub block (the one currently returning `current_period="April 2026"` / `latest_period="May 2026 (4.5%..."`). This is the same replacement pattern GDP used for its own stub (`IMPLEMENTATION-SPEC-GDP.md` §2, "the block this milestone replaces").

A `self._cpi_check_cache: DatasetCheckResult | None = None` instance attribute is added to `__init__()`, alongside the existing `_qlfs_check_cache` / `_gdp_check_cache`.

---

## 14. Integration into `fetch_and_apply()`

Following the exact additive pattern GDP established relative to QLFS (`IMPLEMENTATION-SPEC-GDP.md` §7, verified in the actual code at `statss.py`'s `fetch_and_apply()`): the QLFS flow runs first (unchanged), then the GDP flow (unchanged), then a third, fully independent CPI flow is appended. `result["cpi"]` is a new nested dict with the same shape as `result["gdp"]`:

```python
result["cpi"] = {
    "status": "error",
    "hub_url": _CPI_HUB_URL,
    "file_url": None,
    "release_period": "",
    "archive_path": None,
    "sha256": None,
    "file_size_bytes": None,
    "version_id": None,   # singular — inflation.json is one dataset
    "notes": "",
    "errors": [],
}
```

**Isolation contract (identical to GDP's, verified against the existing GDP integration in `fetch_and_apply()`):**
- A CPI failure (discovery failure, parse failure, validation failure, ownership-boundary violation) never changes the top-level `status` key, which continues to describe the QLFS run only, and never affects `result["gdp"]`.
- A GDP failure never affects the CPI flow, and vice versa — each of the three flows independently discovers, downloads, archives, parses, validates, and (if changed) stages its own dataset(s).
- Staging one `pending` version entry for `inflation` (singular — unlike QLFS's up-to-three entries, `inflation.json` is one file with one version entry per run, same cardinality as GDP's `gdp`).
- A pre-transform "did anything actually change" comparison (mirroring QLFS's `dataset_changed` pattern and GDP's equivalent) so a genuine no-op run reports `status="no_change"` for the `cpi` sub-result rather than always re-staging due to `_meta`'s ever-fresh `last_verified` timestamp.

No change to `runner.py` is needed to reach this — exactly as GDP required none — because `runner.py --apply` already invokes `fetch_and_apply()` on any adapter that defines it, and `StatsSAAdapter.fetch_and_apply()` is being extended in place, not replaced.

---

## 15. Testing strategy

New tests to add to `automation/adapters/tests/test_statss.py`, following the existing QLFS/GDP test class naming and structure (no existing test modified):

1. `test_parse_cpi_workbook_extracts_both_metrics()` — happy path, fixture workbook.
2. `test_parse_cpi_workbook_missing_metric_fails_loudly()` — one of the two metrics absent → `ValueError` naming which one.
3. `test_parse_cpi_workbook_no_month_headers_fails_loudly()` — no month-header row found at all → distinct error message from #2 (mirrors `parse_gdp_workbook()`'s two distinct fail-loudly messages).
4. `test_parse_cpi_workbook_not_an_excel_file_fails_loudly()`.
5. `test_validate_cpi_rate_in_range_and_out_of_range()`.
6. `test_validate_monthly_label_ok()` / `test_validate_monthly_label_bad_format()`.
7. `test_check_cpi_jump_beyond_threshold_flags_anomaly_not_error()` — reuse of `_check_qoq_jump()` with the CPI threshold.
8. `test_transform_inflation_updates_only_cpi_headline_and_food_inflation()` — direct analogue of `test_transform_gdp_only_touches_gdp_growth()`; asserts `repo-rate` and `annual-cpi-avg` are unchanged (deep-equal) after transform.
9. **`test_transform_inflation_never_touches_repo_rate_value()`** — the single most important new test in this milestone: constructs a candidate document where, if the ownership boundary were violated (e.g. by a hypothetical bug in `rate_map`), `repo-rate`'s value would change; asserts it does not.
10. `test_assert_cpi_ownership_boundary_detects_repo_rate_tamper()` — directly unit-tests `_assert_cpi_ownership_boundary()` against a deliberately tampered proposed document (repo-rate's `rawValue` changed) and asserts it returns a violation.
11. `test_assert_cpi_ownership_boundary_detects_stat_removed_or_added()` — asserts the stat-ID-set check (§11 item 5) catches a stat silently dropped or added.
12. `test_assert_cpi_ownership_boundary_passes_on_legitimate_cpi_only_change()` — negative-control test: a normal CPI-only update produces zero violations.
13. `test_update_cpi_meta_does_not_touch_source_or_notes()` — asserts `_meta["source"]`, `_meta["source_url"]`, `_meta["notes"]`, `_meta["update_frequency"]` are byte-identical before/after, while `last_verified` and `automation` change.
14. `test_check_cpi_detects_hub_change()` — mirrors `test_check_gdp_detects_hub_change()`.
15. `test_check_cpi_waf_blocked_fallback_probe_succeeds_returns_unknown()` / `test_check_cpi_waf_blocked_fallback_probe_also_fails_returns_error()` / `test_check_cpi_no_waf_fallback_probe_not_invoked()` — three tests, directly mirroring the six existing WAF tests for QLFS/GDP, scoped to CPI.
16. `test_fetch_and_apply_stages_cpi_without_direct_write(tmp_path, monkeypatch)` — mirrors `test_fetch_and_apply_stages_gdp_without_direct_write()`; also asserts the QLFS and GDP portions of the same call are unaffected.
17. `test_fetch_and_apply_cpi_no_change_produces_no_change_status(tmp_path, monkeypatch)`.
18. `test_fetch_and_apply_cpi_protected_field_violation_aborts_only_that_dataset(tmp_path, monkeypatch)`.
19. **`test_fetch_and_apply_cpi_ownership_violation_aborts_staging(tmp_path, monkeypatch)`** — end-to-end proof that a corrupted rate_map (or a deliberately tampered fixture) never reaches `write_staged_dataset()` for `inflation`; distinct from #18, which covers the existing protected-*field* check, not the new ownership-*value* check.
20. `test_cpi_staged_candidate_requires_approve_then_promote(tmp_path, monkeypatch)` — the CPI-specific end-to-end approve→promote proof, built from the start of this milestone (matching GDP's precedent, not retrofitted afterward as QLFS's was).

**Target: 20 new tests, 80 total (60 existing + 20 new), all passing, zero regressions to the existing 60.**

---

## 16. Documentation updates

1. **`automation/adapters/statss.py` module docstring** — add a "Phase 3b scope (CPI)" section immediately after the existing "Phase 3a scope (GDP)" section, following that section's exact structure and tone (numbered steps, explicit "unverified" disclosures). Update the closing sentence that currently reads "CPI, population, housing, census, and municipalities remain Phase A stubs" to remove CPI from that list and add a pointer to this document. Add a "CPI Excel layout — verification status" section mirroring the existing GDP and QLFS equivalents.
2. **`CURRENT_STATE.md`**, once implementation is verified:
   - §1.2 adapter table: extend the `StatsSAAdapter` row's write-path description with the CPI flow, following the exact prose style already used for the GDP addition.
   - §2 Completed Milestones: add a new dated entry ("CPI (P0141) write path — Phase 3b"), following the GDP entry's structure (what shipped, what's still open).
   - §4 Production Readiness: "Ready" list gains CPI; "Not ready for" list removes CPI from the "currently write nothing" enumeration.
   - §5 Known Limitations: add a CPI-Excel-layout-unverified bullet, worded to match the existing QLFS/GDP bullets; explicitly note the ownership-boundary mechanism as implemented (not "mitigated" — this one, unlike the layout questions, is fully testable without live network access, per §15 items 9–12/19).
   - §6/§7: replace CPI in Remaining Work / Immediate Next Milestone with whatever the sourcing plan names next (population, per its Automation Priority table — subject to its own pre-existing source-integrity concern, §0.2's cross-reference), or the `repo-rate` de-duplication follow-on from §0.1, whichever the stakeholder confirms per §17's open question.
3. **`CHANGELOG.md`** — one new entry, prepended, following the exact section structure of the 2026-07-19 WAF entry and the GDP entry (Summary / Added / files changed / no other files changed).
4. **No other documentation file changes** — do not touch `ai-context.md`, `README.md`, `dataset-analysis.md`, `SA-Data-Hub-Automation-Architecture.md`, `SA-Data-Hub-Dataset-Sourcing-Plan.md`, or `etl-pipeline.md` as part of this implementation task.

---

## 17. Risks and assumptions

**Assumptions made by this document (flagged, not silently resolved):**

1. **CPI does not require GDP-style multi-column revision handling** (§10.1). If wrong, the fix generalises `_find_latest_month_column()` into an `_find_all_month_columns()` the same way GDP generalised the quarter finder — a bounded, well-understood change, not a redesign.
2. **`_CPI_PLAUSIBLE_RANGE = (-5.0, 30.0)` and `_CPI_JUMP_WARNING_THRESHOLD = 1.5`** (§11 items 1 and 4) are this document's judgement calls, not sourced from `dataset-analysis.md` or the sourcing plan, which specify no numeric bounds for CPI. Recommend the approving reviewer explicitly confirm or adjust both before implementation, the same way `_GDP_GROWTH_PLAUSIBLE_RANGE` and its jump threshold were confirmed during the GDP milestone.
3. **`_CPI_METRIC_SPECS`'s label terms (`"all items"`, `"food"`) and `_build_cpi_candidate_urls()`'s filename conventions** are unverified against a real Stats SA P0141 workbook, for the same reason QLFS's and GDP's label specs and URL conventions were unverified at the start of their milestones: no implementation session to date has had network access to `statssa.gov.za`. This is a carried-forward, disclosed limitation, not a defect. The parser fails loudly rather than guessing if wrong (§10.3).
4. **`inflation.json`'s `_meta` block is genuinely shared prose**, not just structurally shared JSON (§12.3) — inferred directly from the `notes` field's text mentioning both CPI and MPC cadence in the uploaded file. This inference drives the decision to narrow `_update_cpi_meta()`'s scope; flagged in case the stakeholder considers `_meta.source_url` fair game to update since it happens to already be a P0141 URL.

**Open questions, recorded rather than resolved by this document, per the task's explicit instruction:**

1. **Is the `repo-rate` de-duplication (§0.1) actually intended to be part of "the CPI milestone," or a separate follow-on?** `CURRENT_STATE.md` §6 item 1 and the sourcing plan both describe it as bundled with CPI; this document's scope decision (driven by this task's explicit "MUST NOT modify... repo-rate" instruction) treats it as separate. This is a direct tension between two of the project's own source-of-truth documents and this task's instructions, and should be confirmed with the stakeholder before implementation, not assumed either way.
2. **Is `annual-cpi-avg` intended to be in scope for "the Stats SA owned CPI statistics"?** Neither `CURRENT_STATE.md` nor the sourcing plan explicitly excludes it the way GDP's annual stats were explicitly excluded; §0.2's deferral is this document's own reasoned-by-analogy decision, not a fact found in the source documentation.
3. **Does Stats SA ever revise a previously published CPI figure** (e.g. following a base-year rebasing), and if so, on what cadence? None of the uploaded documentation answers this. Assumption #1 above depends on the answer being "not routinely, unlike GDP" — if evidence emerges otherwise, revisit before implementation rather than after.
4. **What should replace CPI as "the next milestone" in `CURRENT_STATE.md` §7 once this ships?** The sourcing plan's Automation Priority table suggests `housing.json` or `population.json` next, but `population.json` has its own, larger, pre-existing data-integrity problem (§9 in the sourcing plan — wrong source entirely) that arguably needs its own audit milestone before an automation milestone. Not resolved here; flagged for the same closeout process GDP used when it named CPI as next.

---

## 18. Definition of Done

- [ ] All 20 tests in §15 implemented and passing.
- [ ] All 60 pre-existing tests still passing, unmodified.
- [ ] `python -m automation.runner --list` / `--describe statssa` run cleanly; `describe()`'s output no longer describes CPI as a Phase A stub with hardcoded literals.
- [ ] `check_for_updates("inflation", ...)` performs a real ETag/hash check against the P0141 hub (no hardcoded literals remaining in that code path).
- [ ] `fetch_and_apply()` stages an `inflation` candidate through the existing staging/version pipeline with zero direct writes to `inflation.json`, and the QLFS and GDP portions of the same method are behaviourally unchanged (proven by test §15 item 16).
- [ ] `parse_cpi_workbook()` correctly extracts both `cpi-headline` and `food-inflation` from a representative fixture workbook, and fails loudly (with a message naming the missing metric) when either cannot be found.
- [ ] **The ownership boundary is proven, not asserted in comments:** tests §15 items 9–12 and 19 all pass, demonstrating that no code path added by this milestone can alter `repo-rate` or `annual-cpi-avg`, under both a "normal operation" and a "deliberately tampered input" scenario.
- [ ] `_update_cpi_meta()` is proven to leave `_meta["source"]`, `_meta["source_url"]`, `_meta["notes"]`, and `_meta["update_frequency"]` untouched (test §15 item 13).
- [ ] The CPI-specific approve→promote end-to-end test exists and passes (§15 item 20) — satisfied at initial implementation, not deferred to a later closeout.
- [ ] `CHANGELOG.md` has exactly one new entry; prior entries verified byte-identical (programmatic diff, same method as prior closeouts).
- [ ] `CURRENT_STATE.md` updated per the precise list in §16 item 2; the §17 open question about what's named as the next milestone is resolved by the stakeholder, not guessed by the implementer.
- [ ] No file outside §6's list has changed (verified by directory diff against the pre-implementation state).
- [ ] No change to `automation/core/*.py`, `automation/runner.py`, `sarb.py`, `saps.py`, `worldbank.py`, `interest-rates.json`, or any `src/data/datasets/*.json` other than `inflation.json` (and `inflation.json` itself is only ever touched at runtime by staging/promote, never hand-edited).
- [ ] The `_CPI_METRIC_SPECS` label-match assumptions, the P0141 URL-naming convention, and the numeric thresholds in §11 items 1 and 4 are explicitly disclosed as unverified/judgement-call assumptions, in the module docstring/code comments, in `CHANGELOG.md`, and in `CURRENT_STATE.md` — consistently worded, matching the existing QLFS/GDP disclosure pattern.
- [ ] §17's open questions (repo-rate de-dup scoping, annual-cpi-avg scoping, CPI revision cadence, next-milestone naming) are recorded in `CURRENT_STATE.md` as open items if not resolved by the stakeholder before implementation begins — they are not silently decided by the implementer mid-build.
