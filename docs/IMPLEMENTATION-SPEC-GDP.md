# Implementation Specification — GDP (P0441) Quarterly Growth Write Path

**Prepared:** 2026-07-18
**Audience:** Implementation engineer (human or AI assistant) continuing the SA Data Hub automation framework
**Status:** Approved for implementation
**Milestone:** Phase 3a — the first of two milestones the Dataset Sourcing Plan groups under "Phase 3 — GDP and CPI"

---

## 0. Milestone Sequencing Decision (read first)

The Dataset Sourcing Plan (`SA-Data-Hub-Dataset-Sourcing-Plan.md`) and `CURRENT_STATE.md` §7 both name **GDP** as the immediate next milestone after the Stats SA QLFS Phase 2 closeout. The sourcing plan's own roadmap groups GDP and CPI into one *phase* ("Phase 3 — GDP and CPI, Weeks 12–18") but describes them as two separate extensions of the same reusable pattern, not one combined build: *"Extend the Excel-parsing infrastructure from Phase 2 to `gdp.json` (quarterly) and the CPI half of `inflation.json` (monthly)."*

**Decision: implement GDP and CPI as two separate milestones, GDP first.** This specification covers GDP only. Reasons:

1. **Different cadence, different scheduling surface.** GDP is quarterly (~67 days after quarter-end, per `automation/config/datasets/gdp.yaml`); CPI is monthly (~22nd of the following month). Combining them would force one `fetch_and_apply()` call to reason about two independent release calendars at once, for no shared benefit — they don't share a workbook, a hub page, or a release date.
2. **CPI shares a file with an adapter that already writes to it.** `inflation.json` holds both the Stats SA `cpi` stat and the SARB-owned `repo-rate` stat. Building CPI's write path requires a field-ownership boundary between two adapters writing to the same JSON file — a genuinely new concern that does not exist for GDP (`gdp.json` is Stats SA-only, touched by no other adapter). Solving that boundary is cleaner as its own, focused milestone rather than bundled with GDP's unrelated concerns.
3. **GDP already has everything it needs to stand alone.** `automation/config/datasets/gdp.yaml` already exists with `overwrites_historical_points: true`; `automation/config/sources/statssa.yaml` already has `release_hub_ids.gdp: "P0441"`; `StatsSAAdapter.check_for_updates()` already has a named (stub) branch for `"gdp"`. GDP is the most "shovel-ready" of the two.
4. **Minimises risk the same way Phase 2 did.** Phase 2 proved the Excel-parse → transform → validate → stage pattern on one adapter extension at a time (QLFS first, nothing else touched). Doing GDP next, alone, keeps that discipline: one new parsing surface, one new transform, one new set of tests, fully isolated from CPI's cross-adapter-ownership problem.

**Recommended order:** GDP (this document) → CPI (`inflation.json`, Stats SA component only) as the next milestone after this one closes.

---

## 1. Objectives

1. Give `gdp.json`'s **`gdp-growth`** statistic (quarterly, seasonally adjusted and annualised GDP growth rate) a real, gated write path, following the exact staging → approval → promote pattern already proven for `interest-rates.json` (SARB) and the QLFS family (`unemployment` / `youth-unemployment` / `labour-force`).
2. Parse the Stats SA P0441 GDP Excel release by header/label matching (not fixed cell coordinates), consistent with `parse_qlfs_workbook()`'s approach and for the same reason: Stats SA's per-release table layout is not a stable contract.
3. Correctly implement the **revision requirement** that is unique to GDP among everything built so far: Stats SA regularly revises previously published quarters' growth figures in later releases, so the writer must **overwrite existing historical series points that changed**, not just append the newest one. (`automation/config/datasets/gdp.yaml` already flags this: `overwrites_historical_points: true`.)
4. Upgrade `StatsSAAdapter.check_for_updates()`'s `"gdp"` branch from its current Phase A stub (hardcoded literal strings, `status="unknown"`) to a real ETag/content-hash check against the P0441 release hub, mirroring `_check_qlfs()`.
5. Reuse, not duplicate, every piece of existing infrastructure this doesn't need to reinvent: `core/staging.py`, `core/version.py`, `core/promote.py`, `core/metadata.py::check_protected_fields()`, and the already-generic parsing helpers in `statss.py` (`_fetch_release_hub_html`, `_extract_excel_url`, `_extract_release_period`, `_best_effort_publication_date`, `_check_qoq_jump`, `_validate_quarterly_label`).

---

## 2. Current State (verified against the uploaded `automation.zip`/`data.zip`, not assumed)

- `automation/config/datasets/gdp.yaml` exists: `source_id: statssa`, `cadence: quarterly`, `automation_level: hybrid`, `release_publication: "P0441"`, `release_window_days_after_quarter_end: 67`, `overwrites_historical_points: true`.
- `automation/config/sources/statssa.yaml` has `release_hub_ids.gdp: "P0441"` and the shared `release_hub_url: "https://www.statssa.gov.za/?page_id=1854"` base (identical pattern to QLFS's `PPN=P0211`).
- `StatsSAAdapter.check_for_updates()` (statss.py, the `if dataset_id == "gdp":` branch) is a **Phase A stub**: it returns `status="unknown"` with hardcoded literal strings ("Q4 2025" / "Q1 2026 (released 9 June 2026 — not yet in JSON)") and does not perform any live check. This is the block this milestone replaces.
- `StatsSAAdapter.fetch_and_apply()` currently handles the QLFS family only. It has no GDP branch at all — `gdp.json` is never touched by `fetch_and_apply()` today.
- `gdp.json` (`src/data/datasets/gdp.json`) has **four** statistics: `gdp-growth` (quarterly %, SAAR), `gdp-annual-growth` (annual %), `gdp-nominal` (annual, ZAR billion), `gdp-per-capita` (annual, ZAR). Only `gdp-growth` is in scope for this milestone — see §13 Out of Scope for why the other three are deliberately deferred.
- `dataset-analysis.md` flags a script note on the current (manual) GDP updater: *"World Bank USD/ZAR; ZAR figures should be verified against Stats SA."* This is additional, independent evidence that `gdp-nominal`/`gdp-per-capita` need a sourcing audit before they're safe to automate — not something to resolve as a side effect of this milestone.
- No code in the repository parses a GDP Excel workbook today. `parse_qlfs_workbook()` and its helpers are QLFS-specific in the sense that they read one column (the latest quarter) per metric; **this milestone cannot reuse `parse_qlfs_workbook()` as-is**, because the revision requirement (§1 item 3) means the parser must read every quarter column present in the growth table, not just the latest one. New, narrowly-scoped parsing helpers are required (see §5).

---

## 3. Scope

**In scope:**
- Real `check_for_updates()` detection for `dataset_id == "gdp"` (ETag/content-hash against the P0441 release hub).
- Excel discovery, download, and archival of the GDP publication (mirroring the QLFS discovery pattern, adapted for P0441's URL conventions).
- A new parser, `parse_gdp_workbook()`, that extracts **every** quarter-column value present in the GDP growth rate table (not just the latest), by label/header matching.
- A new transform, `_transform_gdp()`, that applies those points to `gdp-growth` only, correctly revising any historical point Stats SA has restated and appending any genuinely new point — leaving `gdp-annual-growth`, `gdp-nominal`, and `gdp-per-capita` completely untouched.
- Validation: plausibility range check for growth values, quarterly label format check (reuse `_validate_quarterly_label`), `check_protected_fields()` reuse, and a quarter-over-quarter anomaly flag (reuse `_check_qoq_jump()` with a GDP-specific threshold).
- Extending `StatsSAAdapter.fetch_and_apply()` so that a single `--apply` run processes **both** the QLFS family (unchanged behaviour) **and** GDP, each independently gated, each independently able to fail without affecting the other.
- One version entry, staged (not written directly), for `gdp` when `gdp-growth` has changed.
- Tests (see §10) and the specific documentation updates listed in §12.

**Explicitly not in scope** — see §13 for the full list and reasoning; the short version: `gdp-annual-growth` / `gdp-nominal` / `gdp-per-capita`, CPI, any other Stats SA dataset, any change to `core/*.py`, `runner.py`'s dispatch logic, the SARB or QLFS adapters, or any dataset JSON other than `gdp.json`.

---

## 4. Files Expected to Change

| File | Change |
|---|---|
| `automation/adapters/statss.py` | Add: `GDPExtract` dataclass; `_GDP_HUB_URL`, `_GDP_PUBLICATION_BASE`, `_GDP_DATASET_JSON`, `_GDP_GROWTH_STAT_ID`, `_GDP_GROWTH_SPEC`, `_GDP_GROWTH_JUMP_WARNING_THRESHOLD`, `_GDP_GROWTH_PLAUSIBLE_RANGE` module-level constants; `_find_all_quarter_columns()`, `_find_metric_row()`, `_read_row_values_at_columns()`, `parse_gdp_workbook()`, `_validate_gdp_growth_rate()`, `_apply_gdp_growth_points()`, `_transform_gdp()`, `_build_gdp_candidate_urls()`, `_determine_current_gdp_quarter()`, `_probe_gdp_publication_url()`, `_discover_gdp_excel()` module-level functions. Add `_check_gdp()`, `_gdp_hash_path()`, `_load_gdp_previous_hash()`, `_save_gdp_hash()` adapter methods. Replace the `"gdp"` stub branch in `check_for_updates()` with a real dispatch to `_check_gdp()` (same caching pattern as `_qlfs_check_cache`). Extend `fetch_and_apply()` to also run the GDP flow after the existing QLFS flow, adding new keys to its result dict (see §7) without changing any existing key's meaning. Update `describe()`: add a `phase_3a_status` entry; correct `phase_2_status`'s closing sentence, which currently claims GDP "remain[s] Phase A stubs" (no longer true once this ships). |
| `automation/adapters/tests/test_statss.py` | Add the GDP test class/functions listed in §10. No existing test is modified. |
| `src/data/datasets/gdp.json` | **Not edited by this implementation task itself.** It is written only at runtime, by `fetch_and_apply()` staging a candidate and a human running `--approve`/`--promote` — exactly as `unemployment.json` etc. are today. No manual edit to this file is part of "implementing the spec." |
| `CURRENT_STATE.md` | Append-pattern update once implementation is verified: adapter table (§1.2) gains GDP write-path description; §2 gains a new completed-milestone entry; §5/§6/§7 updated to move GDP off "remaining work" and name CPI as the new next milestone. (See §12 for the precise list — this mirrors exactly how the QLFS Phase 2 closeout updated this file.) |
| `CHANGELOG.md` | One new entry, prepended above the existing top entry, once implementation is complete and tests pass. Prior entries must remain byte-identical. |

**Files that must NOT change:** `automation/core/*.py`, `automation/runner.py`, `automation/adapters/sarb.py`, `automation/adapters/saps.py`, `automation/adapters/worldbank.py`, `automation/config/datasets/gdp.yaml` (already correct — see §2), `automation/config/sources/statssa.yaml` (already correct), any `src/data/datasets/*.json` other than `gdp.json`, any file under `src/lib/`.

---

## 5. Parsing Strategy

### 5.1 Why `parse_qlfs_workbook()` cannot simply be reused

`parse_qlfs_workbook()`'s helper `_find_latest_quarter_column()` deliberately returns only the single most recent quarter-header column. That is correct for QLFS (each dataset's headline value is always "the newest quarter's rate," and QLFS does not revise prior quarters as a matter of routine practice in this codebase's scope). GDP is different: Stats SA routinely restates prior quarters' growth figures in later releases, and §1 item 3's revision requirement is a **named, non-negotiable acceptance criterion** for this milestone, not a nice-to-have. A parser that reads only the newest column would silently miss every revision to an older point. New helpers are required.

### 5.2 New parsing helpers

```python
def _find_all_quarter_columns(ws: Any) -> list[tuple[int, str]]:
    """
    Scan the first several rows of a worksheet for quarter-header cells
    (e.g. "Q1 2026") and return every (column_index, "Qn YYYY") pair found,
    sorted chronologically ascending (oldest first). Deduplicates by
    column index. Returns an empty list if no quarter-header cell is found.

    Generalises _find_latest_quarter_column(), which this function does
    NOT replace or modify — QLFS keeps using the single-column version
    unchanged.
    """
```

```python
def _find_metric_row(
    ws: Any,
    include: tuple[str, ...],
    exclude: tuple[str, ...] = (),
) -> int | None:
    """
    Search every row of a worksheet for a label cell matching include/
    exclude (same case-insensitive substring rules as
    _find_metric_value()'s label matching). Returns the 1-indexed row
    number of the first match, or None.

    Factored out so the caller can read multiple columns from the same
    row (parse_gdp_workbook() needs this); _find_metric_value() itself is
    left unchanged for QLFS's continued single-column use.
    """
```

```python
def _read_row_values_at_columns(
    ws: Any,
    row_idx: int,
    columns: list[tuple[int, str]],
) -> list[tuple[str, float]]:
    """
    For each (col_idx, period_label) in `columns`, read the cell at
    (row_idx, col_idx). Uses the exact same numeric-coercion rules as
    _find_metric_value() (int/float pass through; numeric strings with a
    trailing '%' are stripped and parsed; bool and unparseable values are
    skipped, not raised). Columns whose cell is blank or unparseable are
    silently omitted from the result (a worksheet legitimately may not
    print a value for every historical column, e.g. a leading placeholder
    column) — this is not an error condition.

    Returns the list of (period_label, value) pairs actually found, in
    the same chronological order as `columns`.
    """
```

### 5.3 `GDPExtract` and `parse_gdp_workbook()`

```python
@dataclass
class GDPExtract:
    """Named values extracted from a single GDP Excel workbook."""
    release_period: str              # latest quarter found, e.g. "Q1 2026"
    publication_date: str            # ISO YYYY-MM-DD, best-effort
    growth_points: list[tuple[str, float]]   # [(period_label, value), ...], chronological
```

```python
def parse_gdp_workbook(file_bytes: bytes) -> GDPExtract:
    """
    Parse a GDP Excel workbook and extract every available quarterly
    GDP growth rate point (all columns present in the growth table, not
    just the latest — required for revision handling, see §1 item 3 of
    IMPLEMENTATION-SPEC-GDP.md).

    Algorithm
    ---------
    1. Open the workbook (openpyxl, data_only=True, read_only=True) —
       same error handling as parse_qlfs_workbook(): any exception opening
       the file is re-raised as ValueError with a clear message.
    2. For each worksheet, call _find_all_quarter_columns(). Skip
       worksheets where this returns an empty list.
    3. On the first worksheet with quarter columns, call
       _find_metric_row() using _GDP_GROWTH_SPEC's include/exclude terms.
    4. If a row is found, call _read_row_values_at_columns() to get every
       (period_label, value) pair present in that row.
    5. Stop at the first worksheet that yields at least one point.

    Raises
    ------
    ValueError
        If no worksheet yields both a quarter-header row AND a matching
        metric row with at least one readable value. The message must
        name what specifically could not be found (no quarter-header row
        found at all vs. a quarter-header row was found but no row
        matched the GDP growth label), mirroring parse_qlfs_workbook()'s
        fail-loudly contract and its explicit pointer to manual review
        (Track B) as the correct next step — not a PDF-parsing fallback
        (explicitly out of scope, same as Phase 2).

    release_period is the label of the last (chronologically latest)
    entry in growth_points. publication_date is obtained via the existing,
    already-generic _best_effort_publication_date(wb) — reused as-is, no
    changes needed.
    """
```

### 5.4 `_GDP_GROWTH_SPEC` label matching

```python
_GDP_GROWTH_SPEC: dict[str, tuple[str, ...]] = {
    "include": ("gdp growth",),
    "exclude": ("annual",),
}
```

This excludes an annual-growth row using the same table (in case one worksheet happens to contain both a quarterly and an annual growth row) without requiring knowledge of `gdp-annual-growth`'s exact label — consistent with `_QLFS_METRIC_SPECS`'s include/exclude convention. As with the QLFS `_QLFS_METRIC_SPECS`, **this label spec is unverified against a real Stats SA P0441 workbook** — no session to date has had network access to download one. This is carried forward explicitly (not silently), exactly as the QLFS layout assumption is (`CURRENT_STATE.md` §5). If the real label differs, `parse_gdp_workbook()` fails loudly by design (§5.3) rather than guessing, and `_GDP_GROWTH_SPEC`'s include/exclude terms are the first and only place that needs correcting.

### 5.5 URL discovery

Mirror the QLFS pattern exactly, parameterised for P0441:

```python
_GDP_HUB_URL = f"{_RELEASE_HUB_BASE}&PPN=P0441"
_GDP_PUBLICATION_BASE = "https://www.statssa.gov.za/publications/P0441/"
```

`_build_gdp_candidate_urls(quarter: int, year: int) -> list[str]` follows `_build_qlfs_candidate_urls()`'s structure: build a list of plausible filename prefixes against `_GDP_PUBLICATION_BASE` (e.g. `Presentation%20GDP%20Q{q}%20{y}`, `Statistical%20release%20P0441%20Q{q}%20{y}`, `P0441{ord_suffix}Quarter{y}` — following the same P0211-derived naming heuristics scaled to P0441), each tried with `.xlsx`, `.xls`, `.pdf` in that order. **This URL convention is unconfirmed**, exactly as the QLFS one was at the start of Phase 2 — carry the same disclosure forward in the docstring rather than presenting it as verified.

`_determine_current_gdp_quarter() -> tuple[int, int]` follows `_determine_current_qlfs_quarter()`'s month-boundary logic, but re-derived from GDP's own release windows (`_GDP_RELEASE_WINDOWS`: Q1→June, Q2→September, Q3→December, Q4→March — already present in the file) rather than copying QLFS's ~6-week offsets.

`_probe_gdp_publication_url()` and `_discover_gdp_excel()` are structurally identical to their QLFS counterparts (`_probe_qlfs_publication_url`, `_discover_qlfs_excel`), reusing the fully generic `_fetch_release_hub_html()`, `_extract_excel_url()`, and `_extract_release_period()` unchanged — **no edits to those three functions are needed or permitted**, since they take `hub_url`/`html` as parameters already and have no QLFS-specific logic in their bodies.

---

## 6. Validation Strategy

| # | Check | Behaviour on failure |
|---|---|---|
| 1 | `_validate_gdp_growth_rate(value, label) -> list[str]` — plausibility range `_GDP_GROWTH_PLAUSIBLE_RANGE = (-20.0, 20.0)` (percentage points). GDP growth is not a [0, 100] percentage like QLFS rates — it can be negative, and the codebase has real historical values outside a naive small range (`gdp.json` itself already contains `-6.2%` for 2020). This is a genuinely new validator, not a reuse of `_validate_percentage()`. | Hard fail for that value — abort staging for `gdp` this run, same as a QLFS range violation aborts that dataset only. |
| 2 | `_validate_quarterly_label(label)` — reused unchanged from Phase 2, applied to every period label in `growth_points`, not just the latest. | Hard fail if any label fails the `Q[1-4] YYYY` format check. |
| 3 | `check_protected_fields()` (`core/metadata.py`) — reused unchanged, applied once to the full candidate `gdp.json` document (proposed vs. current-on-disk), exactly as QLFS does it per-dataset. | Hard fail — abort staging for `gdp` this run; existing on-disk file is untouched. |
| 4 | Quarter-over-quarter anomaly flag — reuse `_check_qoq_jump()` unchanged, called once per revised/appended point against whatever the previous value for that same period was (or, for the newest point, against the prior quarter's value), with a GDP-specific threshold `_GDP_GROWTH_JUMP_WARNING_THRESHOLD = 5.0` (wider than QLFS's 3.0pp — GDP growth is inherently more volatile quarter to quarter; a tighter QLFS-style threshold would flag routine, non-anomalous revisions). | Warning only, recorded in the version-entry notes — never a hard failure, identical treatment to QLFS's anomaly flag. |
| 5 | Revision-count sanity note (not a hard check, a log line): if `_apply_gdp_growth_points()` revises more than 2 existing points in a single run, log an `INFO` line noting the count. This is informational only — large multi-quarter revisions are a normal, documented Stats SA practice, not a defect — and exists purely so a human reviewing the run report isn't surprised by seeing several historical points change at once. | No failure; informational log/note only. |

---

## 7. Transformation Rules

### 7.1 `_apply_gdp_growth_points()`

```python
def _apply_gdp_growth_points(
    doc: dict[str, Any],
    points: list[tuple[str, float]],
    *,
    stat_id: str = _GDP_GROWTH_STAT_ID,
    publication_date: str,
) -> list[str]:
    """
    Apply every (period_label, value) pair in `points` to the named stat
    in `doc["statistics"]`, in place. Returns a list of human-readable
    revision notes (e.g. "Revised Q2 2025: 0.8% -> 0.6%"), one per point
    that changed an EXISTING series value (as opposed to a genuinely new
    append) — these notes are surfaced in the version-entry notes for the
    human reviewer, since a silent multi-quarter revision is exactly the
    kind of change that benefits from an explicit summary.

    For each point, in the order given (chronological):
      - If the series already has a data point with this label:
          - If the value differs from the existing one by more than
            0.001, overwrite it in place and record a revision note.
            (Exact equality is not required — reuse the same 0.001
            tolerance _apply_qlfs_rate_map() already uses for its
            in-place-revision comparison.)
          - If it doesn't differ, leave it untouched (no note).
      - If the series has no data point with this label, append one.
      - If the stat has no series at all yet, seed it with the first
        point (mirrors _apply_qlfs_rate_map()'s seed case).

    After all points are applied, update the stat's headline fields
    (value, rawValue, change, changeLabel, trend, lastUpdated,
    source.publicationDate) from ONLY the chronologically last point in
    `points` (i.e. the newest release_period) — mirroring
    _apply_qlfs_rate_map()'s existing field-update logic and formatting
    (value as f"{rate:.1f}%"; change computed against the series' new
    second-to-last chronological point AFTER revisions are applied, not
    against whatever it was before this run).

    Only `stat_id`'s fields are touched. No other stat in `doc` (e.g.
    gdp-annual-growth, gdp-nominal, gdp-per-capita) is read or modified —
    this is the mechanism that keeps this milestone's blast radius
    limited to gdp-growth, per §1 item 3 and §13.
    """
```

This is a deliberate generalisation of `_apply_qlfs_rate_map()` (multiple points instead of one; explicit revision-note tracking) rather than a call to it — `_apply_qlfs_rate_map()` is left completely unchanged, still used only by the three QLFS transforms.

### 7.2 `_transform_gdp()`

```python
def _transform_gdp(
    doc: dict[str, Any],
    extract: GDPExtract,
) -> tuple[dict[str, Any], list[str]]:
    """
    Deep-copy `doc`, apply _apply_gdp_growth_points() to the gdp-growth
    stat only, update the shared _meta block (mirroring
    _update_qlfs_meta()'s pattern: last_verified, lastUpdated, source_url,
    and an `automation` sub-block with updatedBy="statssa-adapter/gdp"),
    and return (new_doc, warnings) where warnings is the combined list of
    revision notes (§7.1) and any anomaly flags from _check_qoq_jump().

    Matches _transform_unemployment()'s signature/contract exactly:
    input document is never mutated; the return value is a new dict.
    """
```

---

## 8. `check_for_updates()` — GDP detection

Replace the current stub branch (`if dataset_id == "gdp": return DatasetCheckResult(status="unknown", ...)` with hardcoded literals) with a real check, mirroring `_check_qlfs()` structurally exactly:

- New adapter method `_check_gdp(self, dataset_id, dataset_config) -> DatasetCheckResult`, cached via a new `self._gdp_check_cache` instance attribute (parallel to `self._qlfs_check_cache`), initialised in `__init__` alongside it.
- ETag/content-hash check against `_GDP_HUB_URL`, using `client.etag_check()` exactly as `_check_qlfs()` does, with the same `WATCH_POLICY` retry policy.
- Same WAF-detection guard (`_Incapsula_Resource` / `incapsula` substring check) — copy the check, do not attempt to factor it into a shared helper as part of this milestone (that would touch `_check_qlfs()`'s code path, which is out of scope; a future refactor can consolidate the two if desired).
- Hash persistence via new `_gdp_hash_path()`, `_load_gdp_previous_hash()`, `_save_gdp_hash()` methods, storing to `self.config.report_dir / "versions" / "gdp_hub.sha256"` — a sibling file to `qlfs_hub.sha256`, same pattern, same directory.
- `check_for_updates()`'s dispatch: add `if dataset_id == "gdp": ... return self._gdp_check_cache result` as a new branch, positioned before the remaining Phase A stub branches (population, housing, inflation, static datasets all remain untouched stubs).

---

## 9. `fetch_and_apply()` — extending the existing method

**Design constraint driving this section:** `runner.py --apply` calls `instance.fetch_and_apply(dry_run=dry_run, run_id=run_id)` exactly **once per adapter instance** (verified: `runner.py` line ~365, `if apply and hasattr(instance, "fetch_and_apply"):`), not once per dataset. `StatsSAAdapter` is one adapter instance covering all Stats SA datasets. Therefore GDP's write path can only become reachable through the standard `--apply` command by extending the *same* `fetch_and_apply()` method that already handles QLFS — not by adding a second, differently-named method, and not by modifying `runner.py`'s dispatch logic (both of which are explicitly out of scope; see §13).

**Required approach:** extend `fetch_and_apply()`'s body to run the QLFS flow (unchanged, byte-for-byte identical logic and control flow to today) followed by a new GDP flow, merging results into the same returned dict without changing the meaning of any existing key.

### 9.1 Result dict — additive changes only

Every key documented in the current `fetch_and_apply()` docstring (`status`, `hub_url`, `file_url`, `release_period`, `archive_path`, `sha256`, `file_size_bytes`, `version_ids`, `dry_run`, `notes`, `errors`) **keeps its existing meaning, describing the QLFS run only**, exactly as today. This is required so that none of the six existing `fetch_and_apply`-based tests in `test_statss.py` need to change.

Add one new key:

```python
result["gdp"] = {
    "status": "ok" | "no_change" | "no_publication_found" | "error",
    "hub_url": _GDP_HUB_URL,
    "file_url": ...,          # discovered publication URL, or None
    "release_period": ...,    # latest quarter label detected, e.g. "Q1 2026"
    "archive_path": ...,      # or None
    "sha256": ...,
    "file_size_bytes": ...,
    "version_id": ...,        # single version id, or None (gdp.json is one dataset, not three)
    "notes": ...,
    "errors": [...],
}
```

`result["version_ids"]` (the existing top-level list) gains GDP's version id appended to it when staging succeeds, consistent with its existing doc-comment ("one per changed dataset") — it was already dataset-agnostic in shape even though only QLFS populated it before. `result["errors"]` (top-level) also gains any GDP-flow errors appended to it, so a caller only interested in "did anything go wrong this run" doesn't have to know to look inside `result["gdp"]` — but the detailed GDP-specific errors additionally live in `result["gdp"]["errors"]` for anyone who does need the split.

### 9.2 Top-level `status` aggregation

Follow the existing precedent set by `test_fetch_and_apply_protected_field_violation_aborts_only_that_dataset` (one QLFS dataset failing does not flip the overall QLFS result to `"error"` as long as at least one dataset staged successfully). Extend the same tolerance across the QLFS/GDP boundary: the top-level `status` reflects the **QLFS flow's own status exactly as it does today** (this preserves all existing test assertions unchanged); GDP's outcome is visible only in `result["gdp"]["status"]` and, on failure, contributes to the top-level `errors` list. Do not attempt to invent a new combined status enum — that would be a new abstraction this milestone doesn't need and existing tests don't expect.

### 9.3 Control flow

```python
def fetch_and_apply(self, *, dry_run: bool = False, run_id: str = "") -> dict[str, Any]:
    result = { ... existing QLFS-shaped skeleton ... }
    result["gdp"] = { ... gdp skeleton, status="error" by default ... }

    # ---- existing QLFS flow: UNCHANGED, copy-pasted verbatim ----
    ...

    # ---- new: GDP flow ----
    gdp_client = _build_http_client(self.source_config)
    try:
        excel_url, release_period, hub_html = _discover_gdp_excel(gdp_client)
        result["gdp"]["hub_url"] = _GDP_HUB_URL
        if excel_url is None:
            q, y = _determine_current_gdp_quarter()
            excel_url = _probe_gdp_publication_url(gdp_client, q, y)
        if excel_url is None:
            result["gdp"]["status"] = "no_publication_found"
            result["gdp"]["errors"].append("No GDP publication URL discovered.")
        else:
            result["gdp"]["file_url"] = excel_url
            file_bytes = _download_publication(gdp_client, excel_url)
            # archive with checksum, same helper as QLFS (save_to_archive)
            ...
            if not dry_run:
                extract = parse_gdp_workbook(file_bytes)  # raises ValueError -> caught below, status="error"
                current_doc = _read_current_dataset_json(_GDP_DATASET_JSON)
                new_doc, warnings = _transform_gdp(current_doc, extract)

                range_errors = [
                    e for label, value in extract.growth_points
                    for e in _validate_gdp_growth_rate(value, label)
                ] + [
                    e for label, _ in extract.growth_points
                    for e in _validate_quarterly_label(label)
                ]
                if range_errors:
                    result["gdp"]["status"] = "error"
                    result["gdp"]["errors"].extend(range_errors)
                else:
                    protected_violations = check_protected_fields(current_doc, new_doc)
                    if protected_violations:
                        result["gdp"]["status"] = "error"
                        result["gdp"]["errors"].append(f"Protected field violation: {protected_violations}")
                    elif new_doc == current_doc:
                        result["gdp"]["status"] = "no_change"
                    else:
                        version_id = write_staged_dataset(..., dataset_id="gdp", ...)
                        result["gdp"]["version_id"] = version_id
                        result["version_ids"].append(version_id)
                        result["gdp"]["status"] = "ok"
                        result["gdp"]["notes"] = "; ".join(warnings) if warnings else ""
    except ValueError as exc:
        result["gdp"]["status"] = "error"
        result["gdp"]["errors"].append(str(exc))
    except AutomationHTTPError as exc:
        result["gdp"]["status"] = "error"
        result["gdp"]["errors"].append(f"GDP release hub/file HTTP error: {exc.status} {exc.reason}")
    except Exception as exc:
        result["gdp"]["status"] = "error"
        result["gdp"]["errors"].append(f"GDP fetch_and_apply failed: {exc}")

    if result["gdp"]["errors"]:
        result["errors"].extend(f"[gdp] {e}" for e in result["gdp"]["errors"])

    return result
```

This is illustrative pseudocode, not a literal patch — the implementer should follow the QLFS flow's actual existing exception-handling structure and variable names for consistency, and should reuse `save_to_archive()` / `write_staged_dataset()` / `new_version_entry()` / `save_version_entry()` exactly as the QLFS flow already does, with `dataset_id="gdp"`.

**`dry_run=True` behaviour:** identical contract to QLFS — download and parse happen (so a dry run can still report what *would* change), but no archive write, no staging write, and no version entry, exactly mirroring the existing QLFS dry-run branch's behaviour. Follow the same `if not dry_run:` gating structure already present in the QLFS flow.

---

## 10. Tests to Add

All new tests live in `automation/adapters/tests/test_statss.py`, appended after the existing QLFS tests. No existing test is modified. A new fixture-workbook builder is needed (GDP's layout — a header row of quarter labels plus a single "GDP growth" label row with a value under each quarter column — is structurally simpler than the QLFS fixture builder, since there's only one metric to place, but it must place values under **multiple** quarter columns, unlike the QLFS fixture which only needs the latest one populated per metric).

1. **`test_parse_gdp_workbook_extracts_all_quarter_points`** — build a fixture workbook with quarter headers `Q2 2025, Q3 2025, Q4 2025, Q1 2026` and a "GDP growth" row with a value under each; assert `parse_gdp_workbook()` returns all four points in chronological order and `release_period == "Q1 2026"`.
2. **`test_parse_gdp_workbook_missing_row_fails_loudly`** — fixture with quarter headers but no matching "GDP growth" label row; assert `ValueError` is raised naming that the growth row could not be located.
3. **`test_parse_gdp_workbook_no_quarter_headers_fails_loudly`** — fixture with a growth-labelled row but no recognisable quarter-header row; assert `ValueError`.
4. **`test_parse_gdp_workbook_skips_blank_columns`** — fixture where one interior quarter column's value cell is blank; assert that column is simply absent from the returned `growth_points`, not an error.
5. **`test_validate_gdp_growth_rate_in_range` / `test_validate_gdp_growth_rate_out_of_range`** — mirror the QLFS `_validate_percentage` tests' structure, using `_GDP_GROWTH_PLAUSIBLE_RANGE` boundaries, including one case using a real historical value from `gdp.json` itself (`-6.2`, the 2020 annual figure) to prove the range isn't naively `[0, 100]`.
6. **`test_apply_gdp_growth_points_appends_new_point`** — a `gdp-growth` fixture stat whose series ends at `Q4 2025`; apply a single new point `Q1 2026`; assert it's appended, headline fields update, and no revision note is produced (since nothing existing changed).
7. **`test_apply_gdp_growth_points_revises_historical_point`** — a `gdp-growth` fixture stat with an existing `Q2 2025` point; apply a `growth_points` list that includes a *different* value for `Q2 2025` alongside a new `Q1 2026` point; assert the `Q2 2025` series point is overwritten in place (not duplicated, not appended again), a revision note is returned mentioning `Q2 2025`, and the headline fields (`value`/`rawValue`/`trend`) are driven by `Q1 2026` (the newest point), not by the revised older one. **This is the single most important test in this milestone** — it is the direct proof of the `overwrites_historical_points: true` requirement from `gdp.yaml`.
8. **`test_apply_gdp_growth_points_seeds_empty_series`** — mirror `test_transform_unemployment_seeds_empty_series`'s "true first update" case (`del stat["rawValue"]`, empty series), applied to `gdp-growth`.
9. **`test_transform_gdp_only_touches_gdp_growth`** — a full four-stat `gdp.json`-shaped fixture document; run `_transform_gdp()`; assert `gdp-annual-growth`, `gdp-nominal`, and `gdp-per-capita` are byte-for-byte identical to the input (this is the direct proof that §13's scope boundary is enforced in code, not just in the spec text) — analogous in spirit to Phase 2's `test_transform_unemployment_updates_only_rate_bearing_fields`.
10. **`test_fetch_and_apply_stages_gdp_without_direct_write`** — network-mocked (following the `_patch_network`-style pattern, but for GDP's discovery functions), asserts `gdp.json` is not written directly, `result["gdp"]["status"] == "ok"`, `result["gdp"]["version_id"]` is set, and `result["version_ids"]` contains it. **Also asserts the existing QLFS portion of the same result dict is unaffected** (i.e. this single call still stages QLFS as before) — proving §9's additive-only contract.
11. **`test_fetch_and_apply_gdp_no_change_produces_no_change_status`** — mirrors the QLFS no-change test, for the GDP branch only.
12. **`test_fetch_and_apply_gdp_protected_field_violation_does_not_affect_qlfs`** — sabotage the GDP transform to violate a protected field; assert `result["gdp"]["status"] == "error"` while the QLFS portion of the same call still succeeds normally — direct proof that the two flows are properly isolated within the single extended method.
13. **`test_qoq_jump_flags_large_gdp_swing`** — reuse `_check_qoq_jump()` directly with the GDP threshold constant; assert a >5.0pp swing is flagged as a warning, not a hard failure (mirrors the existing QLFS `test_check_qoq_jump_beyond_threshold_flags_anomaly_not_error`, parameterised for GDP's threshold).
14. **`test_check_gdp_detects_hub_change`** — mirrors `_check_qlfs()`'s implicit test coverage pattern: mock `client.etag_check()` to report a change; assert `status="update_available"`; mock it to report no change; assert `status="up_to_date"`.
15. **`test_gdp_staged_candidate_requires_approve_then_promote`** — the GDP-specific equivalent of `test_qlfs_staged_candidate_requires_approve_then_promote` from the Phase 2 closeout: stage a real GDP version via `fetch_and_apply()`, assert `promote_version()` is refused before `approve_version()` is called, then assert promotion succeeds and the written file matches the staged document. This closes the same acceptance-criterion class Phase 2's closeout had to retroactively add for QLFS — build it as part of this milestone from the start, not as a follow-up closeout.

**Target: all 15 new tests passing, plus all 38 existing tests passing unchanged (53 total).**

---

## 11. Dependencies

- **No new third-party packages.** `openpyxl` is already a dependency (used by `parse_qlfs_workbook()`); nothing else this spec requires is new.
- **Depends on, and must not modify:** `core/staging.py::write_staged_dataset()`, `core/version.py::new_version_entry()`/`save_version_entry()`/`pending_versions()`/`approve_version()`, `core/promote.py::promote_version()`, `core/metadata.py::check_protected_fields()`, `core/files.py::save_to_archive()`, `core/http_client.py::HTTPClient.etag_check()`, `core/retry.py::with_retry()`/`WATCH_POLICY`/`STATSSA_POLICY`.
- **Depends on, and must not modify:** the already-generic `statss.py` helpers `_fetch_release_hub_html()`, `_extract_excel_url()`, `_extract_release_period()`, `_extract_hub_etag_and_hash()`, `_best_effort_publication_date()`, `_check_qoq_jump()`, `_validate_quarterly_label()`, `_read_current_dataset_json()`.
- **Depends on config already in place** (verified present, §2): `automation/config/datasets/gdp.yaml`, `automation/config/sources/statssa.yaml`'s `release_hub_ids.gdp`.
- **No dependency on CPI work** — this milestone must be independently completable and mergeable without any part of the CPI milestone existing yet.

---

## 12. Documentation Updates

**Only these two files, only these changes, only after implementation is complete and tests pass:**

1. **`CHANGELOG.md`** — one new entry prepended above the current top entry (`## 2026-07-18 — Stats SA QLFS Phase 2 Closeout`), dated the day of implementation, titled `## YYYY-MM-DD — GDP (P0441) Quarterly Growth Write Path`. Summary, Changed/Added/Verified/Known Issues sections, following the exact structure the two existing 2026-07-18 entries already use. Must explicitly state: (a) which four files changed, (b) that `gdp-annual-growth`/`gdp-nominal`/`gdp-per-capita` are out of scope and why, (c) that the P0441 URL-naming convention and `_GDP_GROWTH_SPEC` label match are unverified against a real workbook, exactly like QLFS's equivalent caveat. Prior entries must remain byte-identical — verify this the same way the Phase 2 closeout did (programmatic diff of everything below the insertion point).
2. **`CURRENT_STATE.md`** — update, not rewrite:
   - §1.2 adapter table: extend the `StatsSAAdapter` row's write-path description to mention `gdp-growth` alongside the QLFS family.
   - §1.4 test count: 38 → 53 (verify against actual `pytest` output, don't hardcode from this document).
   - §2 Completed Milestones: append a new milestone entry for this GDP work, following the exact structure of the Phase 2 Closeout entry already there (Shipped / Still open after this closeout).
   - §5 Known Limitations: remove any bullet this milestone resolves (none are expected to be fully resolved — the real-workbook-verification caveat pattern continues for GDP too); add a new bullet for the unverified P0441 URL/label conventions, worded to match the existing QLFS-equivalent bullet's tone (same "mitigated by design, not yet empirically resolved" framing).
   - §6/§7: replace the GDP entry in Remaining Work / Immediate Next Milestone with **CPI** (Stats SA component of `inflation.json`), per §0 of this document.
   - Do **not** touch §3 (Current Architecture) or §4 (Production Readiness) beyond factual corrections directly required by GDP now having a write path (mirror exactly how the Phase 2 closeout handled this — see that closeout's CHANGELOG entry for the precedent on what counts as an in-scope factual correction vs. an out-of-scope architecture rewrite).
3. **No other documentation file changes.** Do not touch `ai-context.md`, `README.md`, `dataset-analysis.md`, `SA-Data-Hub-Automation-Architecture.md`, `SA-Data-Hub-Dataset-Sourcing-Plan.md`, or `etl-pipeline.md` as part of this implementation task.

---

## 13. Out of Scope

Explicitly, for this milestone:

1. **`gdp-annual-growth`, `gdp-nominal`, `gdp-per-capita`.** These are annual-cadence figures that (a) are not necessarily present in every quarterly release (Stats SA finalises full-year figures alongside the Q4/Annual print, not every quarter), (b) live in a structurally different table (annual columns, ZAR units, not quarterly % columns) requiring separate label-matching and unit-handling work, and (c) per `dataset-analysis.md`'s own script note, may currently be sourced partly from World Bank USD/ZAR conversion rather than pure Stats SA figures — an unresolved sourcing question that must be audited and answered *before* these three are safely automatable, not as a side effect of building the quarterly growth path. Building all four in one milestone would mean guessing at an unverified annual-table layout on top of an already-unverified quarterly one, doubling the ambiguity this specification is trying to eliminate.
2. **CPI** (`inflation.json`, Stats SA component). See §0 — its own milestone, recommended immediately after this one, once the shared-file (SARB `repo-rate` + Stats SA `cpi`) field-ownership boundary can be given focused attention.
3. **The SARB `repo-rate` stat inside `inflation.json`.** Owned entirely by `SARBAdapter`; not touched by this or any Stats SA work.
4. **Any change to `automation/runner.py`'s dispatch logic**, `automation/core/*.py`, `automation/adapters/sarb.py`, `automation/adapters/saps.py`, or `automation/adapters/worldbank.py`. GDP's write path must be reachable purely by extending `StatsSAAdapter.fetch_and_apply()` (§9); if an implementer finds themselves wanting to touch `runner.py` to make GDP reachable, that is a signal to re-read §9, not a reason to expand scope.
5. **A GitHub Actions / CI-scheduled trigger for GDP.** The approval gate remains the local CLI (`--approve`/`--promote`), unchanged, exactly as it is for SARB and QLFS today.
6. **Empirical verification against a real, downloaded GDP Excel workbook.** Exactly as with QLFS in Phase 2, this cannot be done without live network access to `statssa.gov.za`, which has not been available in any implementation session to date. The parser must fail loudly (§5.3) rather than guess if the real layout differs from `_GDP_GROWTH_SPEC`'s assumptions — this is a known, disclosed, carried-forward limitation, not a defect to be silently worked around with a fabricated fixture presented as real.
7. **Retrying or re-litigating any part of the Stats SA QLFS Phase 2 work.** Per the task instructions, QLFS Phase 2 is complete and closed out; this specification does not touch `parse_qlfs_workbook()`, the `_transform_unemployment`/`_transform_youth_unemployment`/`_transform_labour_force` family, or `_apply_qlfs_rate_map()`.
8. **Any manual edit to `gdp.json` itself.** The only way this milestone's implementation changes `gdp.json`'s on-disk content is via the normal runtime `--apply` → `--approve` → `--promote` sequence, exercised by tests against `tmp_path` fixtures — never a direct hand-edit of the real file in `src/data/datasets/`.

---

## 14. Acceptance Criteria

1. `python -m automation.runner --list` and `python -m automation.runner --describe statssa` both run cleanly, and `describe()`'s output no longer describes GDP as a Phase A stub with hardcoded literals.
2. `python -m automation.runner --adapter statssa` (detection only, no `--apply`) reports a real `status` (`up_to_date` / `update_available` / `error`) for `gdp`, not `"unknown"`.
3. `parse_gdp_workbook()` correctly extracts every quarter-column value present in a representative fixture workbook, in chronological order, including the case where an interior column has been revised relative to a prior parse.
4. `_transform_gdp()` / `_apply_gdp_growth_points()`, applied to a fixture `gdp.json`-shaped document containing a genuine historical revision, produces a document where: (a) the revised historical series point is overwritten in place, not duplicated; (b) the newest point is appended; (c) headline fields (`value`, `rawValue`, `change`, `trend`, `lastUpdated`) reflect the newest point only; (d) `gdp-annual-growth`, `gdp-nominal`, `gdp-per-capita` are provably untouched (test §10 item 9).
5. A single `fetch_and_apply()` call (network-mocked for both QLFS and GDP) stages both a QLFS candidate and a GDP candidate, records the correct number of version entries, and writes to neither `gdp.json` nor any QLFS dataset JSON directly.
6. `promote_version()` is refused for the staged `gdp` version until `approve_version()` has been called, then succeeds and the written file matches the staged document exactly (test §10 item 15) — the same end-to-end proof QLFS has, built for GDP from the start of this milestone rather than retrofitted afterward.
7. A protected-field violation in the GDP transform aborts staging for `gdp` only, without affecting the QLFS portion of the same `fetch_and_apply()` call.
8. `pytest automation/` passes in full: all 38 pre-existing tests unchanged and passing, plus all new tests from §10 (53 total).
9. No file outside the list in §4 changes.
10. `CHANGELOG.md`'s prior entries remain byte-identical after the new entry is prepended (verified programmatically, same method as the Phase 2 closeout).

---

## 15. Definition of Done

- [ ] All 15 tests in §10 implemented and passing.
- [ ] All 38 pre-existing tests still passing, unmodified.
- [ ] `python -m automation.runner --list` / `--describe statssa` run cleanly.
- [ ] `check_for_updates("gdp", ...)` performs a real ETag/hash check against the P0441 hub (no hardcoded literals remaining in that code path).
- [ ] `fetch_and_apply()` stages a `gdp` candidate through the existing staging/version pipeline with zero direct writes to `gdp.json`, and the QLFS portion of the same method is behaviourally unchanged (proven by test §10 item 10).
- [ ] The GDP-specific approve→promote end-to-end test exists and passes (§10 item 15) — this criterion is satisfied at initial implementation, not deferred to a later closeout, unlike QLFS Phase 2 where this was retroactively added.
- [ ] `gdp-annual-growth`, `gdp-nominal`, `gdp-per-capita` are provably untouched by any code path this milestone adds (test §10 item 9).
- [ ] A historical-revision scenario is proven end-to-end: an existing series point changes value without being duplicated (test §10 item 7).
- [ ] `CHANGELOG.md` has exactly one new entry; prior entries verified byte-identical.
- [ ] `CURRENT_STATE.md` updated per the precise list in §12 item 2; CPI (not GDP) now named as the next milestone.
- [ ] No file outside §4's list has changed (verified by directory diff against the pre-implementation state, same method as the Phase 2 closeout).
- [ ] No change to `automation/core/*.py`, `automation/runner.py`, `sarb.py`, `saps.py`, `worldbank.py`, or any `src/data/datasets/*.json` other than `gdp.json` (and `gdp.json` itself is only ever touched at runtime by staging/promote, never hand-edited).
- [ ] The P0441 URL-naming convention and `_GDP_GROWTH_SPEC` label-match assumptions are explicitly disclosed as unverified against a real workbook, in the module docstring/code comments, in `CHANGELOG.md`, and in `CURRENT_STATE.md` — consistently worded, matching the existing QLFS-equivalent disclosure pattern.
