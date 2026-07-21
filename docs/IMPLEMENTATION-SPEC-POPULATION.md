# IMPLEMENTATION-SPEC-POPULATION.md

**Milestone:** Stats SA Population (MYPE, P0302) write path — Phase 4
**Adapter:** `automation/adapters/statss.py` (`StatsSAAdapter`)
**Target output:** `src/data/datasets/population.json`, `population-total` stat only
**Predecessor milestones:** QLFS Phase 2, GDP Phase 3a, CPI Phase 3b (all complete per `CURRENT_STATE.md`, 2026-07-20)
**Status of this document:** Proposed — not started, not yet reviewed against a real Stats SA P0302 workbook

---

## 0. Before You Read Further — Two Things That Make This Milestone Different From CPI

Everything in QLFS/GDP/CPI's "discover → download → archive → parse → transform → validate → stage" shape applies here unchanged. Two things don't carry over automatically and are the actual engineering content of this spec:

**0.1 — This is not a green-field automation. It is a data-integrity fix that happens to be shaped like an automation milestone.**
`automation/config/datasets/population.yaml` already states, in the codebase as it exists today:

```yaml
automation_level: manual   # Deliberately manual until source is corrected
source_guard_required: true
source_guard_domain: "statssa.gov.za"
# DATA INTEGRITY BUG: current JSON likely sourced from World Bank, not Stats SA.
# JSON shows 64.0M (2024); Stats SA MYPE 2025 says 63.1M.
```

`SA-Data-Hub-Dataset-Sourcing-Plan.md` §9 independently confirms this: the production `population.json` shows 64.0M for 2024, while Stats SA's own MYPE 2025 (released 28 July 2025, a full year later) reports 63.1 million — a *lower* figure a year on, which a legitimate Stats SA annual update would not produce. The sourcing plan's own recommendation is explicit: **"Fix the source first, then automate."**

This spec therefore treats the source-guard as the load-bearing new component of this milestone — the same role `_assert_cpi_ownership_boundary()` played for CPI — not an optional hardening pass added afterward.

**0.2 — Population has never had a live write path before.** Unlike CPI (which added a third flow next to two already-proven ones), this is the *first* time `population` moves from a Phase A stub (`check_for_updates()` returns a hardcoded advisory `DatasetCheckResult`, no `fetch_and_apply()` branch at all) to a real flow. There is more new code here than there was for CPI relative to GDP, but the shape of that code is not new — it is the QLFS/GDP/CPI pattern applied to a fourth publication.

---

## 1. Executive Summary

`population.json` carries three statistics: `population-total` (MYPE, annual, currently wrong), `population-urban` (Census 2022, decennial, correct and static), and `population-median-age` (Census 2022, decennial, correct and static). This milestone gives `population-total` a fifth working, gated write path — alongside SARB, QLFS, GDP, and CPI — sourced from Stats SA's Mid-Year Population Estimates (MYPE, Statistical Release P0302), reusing the staging → approval → promote pipeline unchanged. `population-urban` and `population-median-age` are explicitly untouched, protected by a dedicated ownership-boundary check in the same style as CPI's `_assert_cpi_ownership_boundary()`.

The genuinely new engineering problem this milestone solves is **provenance, not parsing**: the existing production value is wrong because some prior version of `update_population.py` silently drew from a non-Stats-SA source. This milestone's `fetch_and_apply()` flow must make that class of error structurally impossible going forward — every candidate value staged for `population-total` must carry provable Stats SA P0302 provenance, or staging must hard-fail. `_assert_population_source_guard()` is the mechanism, and it is this milestone's answer to `population.yaml`'s `source_guard_required: true`.

**Recommended next Stats SA dataset:** Population Estimates (MYPE, P0302), `population-total` stat only. This is consistent with the dataset config's own priority ordering — `population.yaml`'s `priority: 30` sits directly after `inflation.yaml`'s `priority: 25` (CPI, just shipped) and ahead of `housing.yaml`'s `priority: 40` — among the Stats SA datasets that are genuine new-adapter-flow candidates. `census` (priority 90) and `municipalities` (priority 91) are static/erratum-watch only, a different and much smaller class of work; `housing` (priority 40) bundles a static Census component with a GHS-refreshable component in one file, a more complex two-track design than any prior Stats SA milestone has needed and better tackled after Population's single-track pattern is proven. Note: `CURRENT_STATE.md` §7 separately nominates `repo-rate`/`repo-rate-sarb` de-duplication or `annual-cpi-avg` automation as the *highest-priority remaining item overall* — those are correct priorities for `inflation.json` specifically, but they are cross-dataset/ownership-design decisions requiring human judgement calls already logged as deferred, not new Stats SA adapter flows. This spec's scope is deliberately the latter category, and Population is the next dataset in that category's queue.

---

## 2. Scope of This Milestone

In scope:

1. Real ETag/content-hash change detection against the P0302 release hub (`_check_population()`), mirroring `_check_qlfs()` / `_check_gdp()` / `_check_cpi()` structurally.
2. Discover → download → archive the raw MYPE publication (Excel primary, PDF fallback for detection only — see §6).
3. Parse the workbook (`parse_population_workbook()`) to extract the latest year's total population figure, by header/label matching — same philosophy as the three prior parsers.
4. **Enforce Stats SA provenance** (`_assert_population_source_guard()`) as a hard-fail gate before any value is transformed or staged — the genuinely new complication this milestone introduces, playing the same structural role CPI's ownership boundary played for CPI.
5. Transform (`_transform_population()`) into `population.json`'s existing `population-total` stat only, following the seed-or-append annual-series pattern.
6. Validate (plausibility range, annual-label format, `check_protected_fields()` reuse, year-over-year anomaly threshold, and the source guard above).
7. Enforce an ownership boundary (`_assert_population_ownership_boundary()`) against `population-urban` and `population-median-age` — deep-compare, hard-fail on any difference, same shape as CPI's.
8. Stage the candidate via the existing `core/staging.py` / `core/version.py` pipeline. No direct write to `population.json` ever happens in this milestone's code.
9. A one-time, human-reviewed correction of the *current* production `population.json` value, run through the same staging → approve → promote path as the first live output of this new flow (not a manual JSON edit outside the pipeline — see §9).
10. Flip `automation/config/datasets/population.yaml`'s `automation_level` from `manual` to `hybrid` once the source guard is implemented and covered by tests, matching `unemployment.yaml`/`gdp.yaml`/`inflation.yaml`'s existing `hybrid` label. This is a config/metadata change only — `automation_level` is descriptive (surfaced via `describe()` and reports), not an enforcement mechanism; `promote_version()`'s approval gate is what actually protects production regardless of this label.

---

## 3. Explicitly Out of Scope

- **`population-urban`** and **`population-median-age`** — both Census 2022-sourced, decennial cadence, correctly static per `SA-Data-Hub-Dataset-Sourcing-Plan.md` §11 (`census.json`'s own entry: "up to date, correctly... no automation needed until 2032"). This flow must never read or write either stat; enforced by `_assert_population_ownership_boundary()`, not just convention (§7.4).
- **Age/sex/province breakdown tables** within the P0302 release. The sourcing plan confirms these exist in the MYPE release, but no current `population.json` stat consumes them. Do not add new stat IDs in this milestone — that is a separate "Adding a Dataset" workflow per `ai-context.md`, requiring its own review.
- **`housing.json`**, **`census.json`**, **`municipalities.json`** — untouched, no code path in this milestone reads or writes any of them.
- **`repo-rate`/`repo-rate-sarb` de-duplication** and **`annual-cpi-avg` automation** — both remain deferred per `CURRENT_STATE.md` §6 items 1–2; this milestone does not touch `inflation.json` or `interest-rates.json` at all.
- **PDF parsing / OCR fallback** — if the Excel workbook cannot be located or parsed, this flow fails loudly (§8), exactly as QLFS/GDP/CPI do. No PDF-table extraction is implemented.
- **GitHub Actions / CI-based approval flow** — the CLI-driven `--approve`/`--reject`/`--promote` gate remains the interim mechanism, per architecture doc §7 (still unbuilt for all adapters).
- **Retroactive correction of every historical point in `population-total`'s series** (2015–2024). This milestone corrects the methodology going forward and stages a correction for the *current/latest* MYPE figure (§9); a full historical-series audit against Stats SA's own back-series is a separate, larger data-quality task, flagged in §14 as a risk rather than undertaken here.
- **Automating `population_urban`/`population_median_age` from a future Census 2032 release.** Out of scope by construction — there is no next Census release for a decade.

---

## 4. Source Publication(s)

| Item | Value |
|---|---|
| Organisation | Statistics South Africa |
| Publication | Mid-Year Population Estimates (MYPE), Statistical Release **P0302** |
| Release hub | `https://www.statssa.gov.za/?page_id=1854&PPN=P0302` |
| Cadence | Annual, typically released **late July** |
| Format | Excel data tables released alongside the PDF statistical release (per `SA-Data-Hub-Dataset-Sourcing-Plan.md` §9 item 6); Stats SA's general time-series download page also carries population series |
| Latest confirmed figure (as of the sourcing plan's research pass) | MYPE 2025: **63.1 million**, released 28 July 2025 |
| Known complication | A 2026 court dispute (POPIA/Information Regulator) over Stats SA's publication mechanism for a *different* release was noted in the sourcing plan's discussion of annual press-release datasets generally — flagged here as a reminder that Stats SA's publication *mechanism*, not just its data, can shift year to year. No evidence this specifically affects P0302, but worth a manual sanity check on the first live run. |

`_STATSSA_DATASETS`'s existing docstring entry for `population` (module-level, `statss.py`) already reads `population (MYPE P0302)` — no change needed there. `automation/config/sources/statssa.yaml`'s `release_hub_ids` already maps `population: "P0302"` — no change needed there either.

---

## 5. Download Strategy

Mirror `_discover_cpi_excel()` / `_discover_gdp_excel()` exactly:

```python
_POPULATION_HUB_URL = f"{_RELEASE_HUB_BASE}&PPN=P0302"
_POPULATION_PUBLICATION_BASE = "https://www.statssa.gov.za/publications/P0302/"
```

1. `_fetch_release_hub_html()` (fully generic, reused unchanged) fetches the P0302 release hub.
2. `_extract_excel_url()` (fully generic, reused unchanged) looks for an Excel link on the hub page.
3. If the hub is WAF-blocked (Incapsula challenge — same detection string check as QLFS/GDP/CPI: `"_Incapsula_Resource" in body_text or "incapsula" in body_text.lower()`), fall through to the Tier 1 direct-URL probe (`_probe_population_publication_url()`), copied structurally from `_probe_cpi_publication_url()` — **not** factored into a shared helper, matching the existing project convention of copying this guard per-flow rather than consolidating it (explicitly noted as a deferred future refactor in the CPI implementation).
4. `_build_population_candidate_urls(year)` constructs candidate filenames against `_POPULATION_PUBLICATION_BASE`, parameterised by year (MYPE has no quarter/month component — one release per year):

```python
def _build_population_candidate_urls(year: int) -> list[str]:
    base = _POPULATION_PUBLICATION_BASE
    stat_release_prefix = f"Statistical%20release%20P0302%20{year}"
    media_release_prefix = f"MYPE%20Media%20Release%20{year}"
    data_prefix = f"P0302{year}"
    candidates: list[str] = []
    for prefix in [stat_release_prefix, media_release_prefix, data_prefix]:
        for ext in (".xlsx", ".xls", ".pdf"):
            candidates.append(f"{base}{prefix}{ext}")
    return candidates
```

   **Unconfirmed against a real release**, exactly as the QLFS/GDP/CPI URL conventions were at the start of their own milestones. Flag this in the module docstring the same way.

5. `_determine_current_population_year() -> int`: MYPE for year Y is released in July of year Y. Before ~1 August of the current year, the most recently expected release is for the *prior* year; from ~1 August onward, the current year's release is expected. (Simpler than CPI's day-of-month cutoff since there is exactly one release window per year, not twelve.)

```python
def _determine_current_population_year() -> int:
    today = date.today()
    return today.year if today.month > 7 or (today.month == 7 and today.day >= 28) else today.year - 1
```

6. `_download_publication()` (fully generic, reused unchanged) downloads the located file.
7. Archive via `save_to_archive()` (fully generic, reused unchanged) — same raw-file-archiving contract as QLFS/GDP/CPI, keyed by dataset id `"population"`.

---

## 6. Workbook Discovery Strategy

Same three-tier discovery order already established, applied to P0302:

1. **Hub-link extraction** (`_extract_excel_url()` against the fetched hub HTML) — first choice, most reliable if the hub itself isn't WAF-blocked.
2. **Direct-URL probing** (`_probe_population_publication_url()`) — Tier 1 WAF fallback, used when the hub returns an Incapsula challenge. Probes `_build_population_candidate_urls(year)` in order, accepting the first HTTP 200 response over 10 KB (same threshold as QLFS/GDP/CPI's `_probe_*_publication_url()` functions).
3. **Fail loudly** — if neither tier locates a candidate file, `fetch_and_apply()`'s population flow records an error in `result["population"]` (see §11) and does not proceed to parsing. No PDF-table fallback (§3).

`_extract_release_period()` (fully generic, reused unchanged) extracts a period label from the hub HTML for logging/reporting purposes; the authoritative period label actually applied to the transformed document comes from the parsed workbook itself (`PopulationExtract.release_period`, §7), not the hub page text — same division of responsibility as CPI.

---

## 7. Parsing Strategy

### 7.1 `PopulationExtract`

```python
@dataclass
class PopulationExtract:
    """Named values extracted from a single MYPE Excel workbook."""
    release_period: str          # the estimate year, e.g. "2026"
    publication_date: str        # ISO YYYY-MM-DD, best-effort
    total_population_millions: float   # e.g. 63.1
    source_domain: str           # the domain the workbook was downloaded from — feeds the source guard
```

`source_domain` is the one field with no analogue in `QLFSExtract`/`GDPExtract`/`CPIExtract`. It exists so the source guard (§7.3) can be enforced with data the parser itself observed, not just the URL the caller happened to pass in — see the rationale in §7.3.

### 7.2 `parse_population_workbook()`

```python
_POPULATION_METRIC_SPECS: dict[str, dict[str, tuple[str, ...]]] = {
    "total_population": {
        "include": ("total", "rsa", "south africa"),
        "exclude": (),
    },
}
```

Same header/label-matching philosophy as `parse_qlfs_workbook()` / `parse_gdp_workbook()` / `parse_cpi_workbook()`, adapted for an annual-year header instead of a quarterly or monthly one:

- A new `_find_latest_year_column(ws)` helper (parallel to `_find_latest_month_column()`) locates a header row of bare 4-digit years (e.g. `2026`, not `Q1 2026` or `May 2026`) and returns `(col_idx, year_label)` for the rightmost/latest one found.
- `_find_metric_value(ws, col_idx, include, exclude)` (fully generic, reused unchanged) locates the "Total population" row by label match within that column.
- Value is expected in the workbook as either raw headcount (e.g. `63100000`) or millions (e.g. `63.1`) — **this is genuinely unconfirmed** and must be resolved empirically on the first real run (see §14). `parse_population_workbook()` should apply a documented, single heuristic — e.g. "if the parsed numeric value is greater than 1000, treat it as a raw headcount and divide by 1,000,000; otherwise treat it as already-in-millions" — and log which branch it took, rather than guessing silently. If this heuristic is wrong on the real workbook, correcting it is a one-line, well-isolated fix, exactly the same class of correction QLFS/GDP/CPI's specs anticipated for their own label-matching assumptions.
- Fails loudly (raises `ValueError`, naming the missing indicator) if no year-header row or no matching "total population" row is found — **no PDF fallback, no guessing, no stale-value substitution** — matching `parse_qlfs_workbook()`'s / `parse_gdp_workbook()`'s / `parse_cpi_workbook()`'s established contract exactly.
- `publication_date` resolved via `_best_effort_publication_date()` (fully generic, reused unchanged), falling back to today's date with a logged warning if not found in the workbook, exactly as CPI does.

### 7.3 The source guard — this milestone's genuinely new complication

`_assert_population_source_guard()` is the direct implementation of `population.yaml`'s `source_guard_required: true` / `source_guard_domain: "statssa.gov.za"`. It is checked **before** transformation, at two independent points, deliberately redundant rather than relying on a single check:

1. **URL-level guard**, checked immediately after discovery (§5/§6), before download: the resolved publication URL's domain must be `statssa.gov.za` (or a documented Stats SA subdomain). If discovery ever resolves to any other domain — including, deliberately, `worldbank.org` or any World Bank mirror, since that is the specific wrong source the sourcing plan identified — `fetch_and_apply()` must hard-fail the population flow before a download is even attempted.

```python
_POPULATION_SOURCE_GUARD_DOMAIN = "statssa.gov.za"

def _assert_population_source_guard(url: str) -> list[str]:
    """
    Hard-fail check: `url` must resolve to the statssa.gov.za domain.
    This is the direct enforcement of population.yaml's
    source_guard_required — the mechanism that makes the World-Bank-
    sourced data-integrity bug (SA-Data-Hub-Dataset-Sourcing-Plan.md §9)
    structurally impossible to reintroduce via this flow.
    """
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    if not (domain == _POPULATION_SOURCE_GUARD_DOMAIN
            or domain.endswith(f".{_POPULATION_SOURCE_GUARD_DOMAIN}")):
        return [
            f"Population source guard violation: resolved publication URL "
            f"{url!r} does not originate from "
            f"{_POPULATION_SOURCE_GUARD_DOMAIN!r} (population.yaml's "
            f"source_guard_domain). This is the exact class of error that "
            f"produced the current data-integrity bug in population.json "
            f"(SA-Data-Hub-Dataset-Sourcing-Plan.md §9) and must hard-fail, "
            f"not warn."
        ]
    return []
```

2. **Extract-level guard**, checked again immediately before staging, using `PopulationExtract.source_domain` (set from the same URL the parser was actually given, not re-derived): a defensive, redundant check in the same spirit as `_transform_inflation()`'s internal `assert set(rate_map.keys()) <= _CPI_OWNED_STAT_IDS` — catching a wiring bug in this flow's own code, not a data problem, before it can ever reach staging.

Both checks are hard failures (abort staging, record an error in `result["population"]`, do not touch `population.json`), not warnings — this is deliberately stricter than the year-over-year anomaly check in §8, which is a flag for human review, not a hard-fail. Getting the source wrong is categorically worse than getting a plausible-but-surprising value from the right source.

### 7.4 Ownership boundary against `population-urban` / `population-median-age`

```python
_POPULATION_OWNED_STAT_IDS: frozenset[str] = frozenset({"population-total"})

def _assert_population_ownership_boundary(
    previous_doc: dict[str, Any],
    proposed_doc: dict[str, Any],
) -> list[str]:
    """Structurally identical to _assert_cpi_ownership_boundary(), scoped
    to population.json's non-owned stats (population-urban,
    population-median-age)."""
    ...  # same deep-compare-by-id, same stat-ID-set check, same violation shape
```

Implemented as a direct structural copy of `_assert_cpi_ownership_boundary()` with `_CPI_OWNED_STAT_IDS` replaced by `_POPULATION_OWNED_STAT_IDS` — no new design, reuse the proven pattern.

---

## 8. Transformation Logic

### 8.1 `_transform_population()`

```python
def _transform_population(
    current_doc: dict[str, Any],
    extract: PopulationExtract,
    source_url: str = "",
) -> dict[str, Any]:
    """Apply the MYPE total-population value to the existing
    population.json document shape. Touches population-total only.
    population-urban and population-median-age are never read or written
    — the deep-copy at the top preserves them exactly."""
    doc = copy.deepcopy(current_doc)
    _apply_population_total_point(
        doc, extract.total_population_millions,
        release_period=extract.release_period,
        publication_date=extract.publication_date,
    )
    _update_population_meta(doc, release_period=extract.release_period,
                             publication_date=extract.publication_date,
                             source_url=source_url)
    return doc
```

### 8.2 Why `_apply_qlfs_rate_map()` is **not** reused here (unlike CPI)

CPI's `_transform_inflation()` reused `_apply_qlfs_rate_map()` unchanged, because CPI values are percentage rates formatted as `f"{new_rate:.1f}%"`, use quarterly/monthly period labels, and compute `trend` via `_determine_qlfs_trend()`. Population's `population-total` stat has a materially different display shape (`"value": "64.0M"`, `"unit": "people"`, series values already stored in millions with **bare-year labels** like `"2024"`, not `"Q1 2024"` or `"May 2024"`), so a new, small, single-purpose helper is warranted here — this is a genuine formatting difference, not an unjustified new abstraction:

```python
_ANNUAL_LABEL_RE = re.compile(r"^\d{4}$")

def _apply_population_total_point(
    doc: dict[str, Any],
    new_value_millions: float,
    *,
    release_period: str,
    publication_date: str,
) -> None:
    """Seed-or-append-or-revise the population-total stat's series,
    following the same structural pattern as _apply_qlfs_rate_map() and
    _apply_gdp_growth_points(), but formatted for a millions-of-people
    magnitude with a bare-year label instead of a percentage rate with a
    quarterly/monthly label."""
    for stat in doc.get("statistics", []):
        if stat.get("id") != "population-total":
            continue
        prev_value = stat.get("rawValue")
        change_pct = None
        if isinstance(prev_value, (int, float)) and prev_value:
            change_pct = round(
                (new_value_millions * 1_000_000 - prev_value) / prev_value * 100, 1
            )
        stat["value"] = f"{new_value_millions:.1f}M"
        stat["rawValue"] = round(new_value_millions * 1_000_000)
        if change_pct is not None:
            stat["change"] = change_pct
        stat["changeLabel"] = f"from {int(release_period) - 1}"
        stat["trend"] = "up" if (change_pct or 0) >= 0 else "down"
        stat["lastUpdated"] = publication_date
        if isinstance(stat.get("source"), dict):
            stat["source"]["publicationDate"] = publication_date
            stat["source"]["publicationName"] = f"Mid-Year Population Estimates {release_period}"

        # Series: same seed-or-append-or-revise pattern as
        # _apply_qlfs_rate_map(), storing the value in millions (matching
        # the existing series' unit) not the raw headcount.
        series = stat.setdefault("series", [{"name": "Population (millions)", "unit": "million", "data": []}])[0]
        existing_labels = {pt["label"] for pt in series.get("data", [])}
        if release_period not in existing_labels:
            series.setdefault("data", []).append(
                {"label": release_period, "value": round(new_value_millions, 1)}
            )
        else:
            for pt in series["data"]:
                if pt["label"] == release_period:
                    pt["value"] = round(new_value_millions, 1)
                    break
    return
```

Note `rawValue` is stored as a raw headcount (`64000000`), matching the existing on-disk convention in `population.json` (`"rawValue": 64000000` alongside `"value": "64.0M"`), while the series stores millions (`"value": 64.0`) — this preserves the existing, if slightly inconsistent, dual convention already present in the production file rather than "fixing" it as an uninvited refactor.

### 8.3 `_update_population_meta()`

Follows `_update_qlfs_meta()`'s pattern (overwrite `_meta.last_verified`, `_meta.lastUpdated`, `_meta.source_url`, `_meta.automation`) rather than CPI's narrower `_update_cpi_meta()`, because — unlike `inflation.json` — `population.json`'s `_meta` block describes only Stats SA content; there is no SARB-owned prose sharing the file that a blanket `_meta` rewrite would clobber.

### 8.4 Pre-transform "did anything change" check

```python
def _population_value_changed(current_doc: dict[str, Any], extract: PopulationExtract) -> bool:
    """Mirrors _cpi_values_changed()'s pre-transform check, computed
    before _transform_population() runs (which always refreshes
    _meta.last_verified)."""
    for stat in current_doc.get("statistics", []):
        if stat.get("id") == "population-total":
            current_raw = stat.get("rawValue")
            new_raw = round(extract.total_population_millions * 1_000_000)
            return current_raw is None or abs(current_raw - new_raw) > 1000
    return True
```

---

## 9. The One-Time Production Correction

`population.json`'s current `population-total` value (64.0M, 2024, wrong methodology) is itself the first candidate this new flow will produce a correction for. This milestone does not hand-edit `population.json` outside the pipeline. Instead:

1. Ship the code in this spec.
2. Run `python -m automation.runner --adapter statssa --apply` against a real, current MYPE release.
3. The flow downloads the real Stats SA figure, passes it through the source guard, and — because `_population_value_changed()` will certainly be true (the current figure is wrong) — stages a `pending` version entry for `population`.
4. A human reviews the staged candidate (via the run report, `core/report.py`) with particular attention to §14's open verification items, then runs `--approve population <version>` followed by `--promote population <version>`.
5. This is the correction. It is fully auditable through `core/version.py`'s version history — a durable, reviewable record of exactly when and how the bad World-Bank-sourced figure was replaced with a real Stats SA one, which a silent manual JSON edit would not provide.

This sequencing is deliberate: it proves the source guard actually works, on the exact case it exists to prevent, as its first real invocation — not against a synthetic fixture.

---

## 10. Validation Rules

| Check | Function | Behaviour on failure |
|---|---|---|
| Plausible population magnitude | `_validate_population_total()` — range e.g. `(40.0, 90.0)` million, a deliberately wide band since South Africa's population is well-documented and slow-moving; exact bounds are this spec's own judgement call, flagged for stakeholder confirmation exactly as `_CPI_PLAUSIBLE_RANGE` was | Hard-fail, no staging |
| Annual label format | `_validate_annual_label()` — `^\d{4}$` | Hard-fail, no staging |
| Protected fields unchanged | `check_protected_fields()` (fully generic, reused unchanged) | Hard-fail, no staging |
| Year-over-year anomaly | `_check_yoy_jump()` — parallel to `_check_qoq_jump()`, threshold e.g. `_POPULATION_JUMP_WARNING_THRESHOLD = 2.0` (percent), reflecting that a healthy annual population change is typically 1–2% | **Flag only** — recorded in the staged candidate's notes for human review, does not block staging (same severity as QLFS's/GDP's/CPI's own anomaly flags) |
| Source guard (URL-level) | `_assert_population_source_guard()` (§7.3, step 1) | Hard-fail, no download attempted |
| Source guard (extract-level) | `_assert_population_source_guard()` (§7.3, step 2) | Hard-fail, no staging |
| Ownership boundary | `_assert_population_ownership_boundary()` (§7.4) | Hard-fail, no staging |

---

## 11. Ownership Boundaries

- This flow owns and may write only `population-total` within `population.json`.
- `population-urban` and `population-median-age` are owned by the (static, correct) Census 2022 baseline and must never be read for value or written by this flow — enforced by §7.4, not just convention.
- `housing.json`, `census.json`, `municipalities.json`, and every other dataset file are entirely untouched by this milestone.
- The SARB adapter, QLFS flow, GDP flow, and CPI flow are unaffected — this milestone adds a fourth/fifth independent flow inside the same `fetch_and_apply()` call, following the CPI flow's pattern of full independence (a population-specific failure must not affect `result["qlfs"]` / `result["gdp"]` / `result["cpi"]`, and vice versa — see §12).

---

## 12. Required Code Changes

All changes are localized to `automation/adapters/statss.py` and its test file, plus one config-value flip. No changes to `automation/core/*`, `runner.py`, `automation/adapters/sarb.py`, or any other adapter.

**`automation/adapters/statss.py`:**
1. New module-level constants: `_POPULATION_HUB_URL`, `_POPULATION_PUBLICATION_BASE`, `_POPULATION_DATASET_JSON`, `_POPULATION_OWNED_STAT_IDS`, `_POPULATION_PLAUSIBLE_RANGE`, `_POPULATION_JUMP_WARNING_THRESHOLD`, `_ANNUAL_LABEL_RE`, `_POPULATION_SOURCE_GUARD_DOMAIN`.
2. New `PopulationExtract` dataclass (§7.1).
3. New `_find_latest_year_column()` helper (§7.2).
4. New `parse_population_workbook()` (§7.2).
5. New `_build_population_candidate_urls()`, `_determine_current_population_year()`, `_probe_population_publication_url()`, `_discover_population_excel()` (§5/§6).
6. New `_validate_population_total()`, `_validate_annual_label()`, `_check_yoy_jump()` (§10).
7. New `_assert_population_source_guard()` (§7.3).
8. New `_assert_population_ownership_boundary()` (§7.4).
9. New `_apply_population_total_point()`, `_update_population_meta()`, `_transform_population()`, `_population_value_changed()` (§8).
10. `StatsSAAdapter.__init__()`: add `self._population_check_cache: DatasetCheckResult | None = None`, parallel to the existing three hub-check caches.
11. `StatsSAAdapter._check_population()`: new method, structurally identical to `_check_cpi()`, targeting `_POPULATION_HUB_URL`, including the same WAF-detection-and-Tier-1-fallback block.
12. `StatsSAAdapter._population_hash_path()` / `_load_population_previous_hash()` / `_save_population_hash()`: new methods, parallel to the CPI hash-persistence trio.
13. `StatsSAAdapter.check_for_updates()`: replace the existing hardcoded `population` stub branch with a dispatch to `self._check_population()`, using the same caching pattern as the `inflation` branch. **This removes the advisory-message stub, not just adds to it** — the stub's warning content (data-integrity bug, source guard requirement) migrates into this spec and into code comments/log messages, not left as dead advisory text once the real check exists.
14. `StatsSAAdapter.fetch_and_apply()`: add a fourth/fifth independent flow block (population), following the CPI flow's structure exactly — own `try`/`except`, own entry in the `result` dict (`result["population"]`), own errors kept out of the shared top-level `errors` list (mirroring the GDP/CPI precedent's documented rationale in §9.1-equivalent territory), hub hash updated at the end mirroring the QLFS/GDP/CPI hash-update steps.
15. `StatsSAAdapter.describe()`: extend to report the `population` flow's status, matching how GDP/CPI were added to `describe()`'s output.
16. `StatsSAAdapter.version`: bump, e.g. `0.5.0 -> 0.6.0`, with a changelog fragment appended to the class docstring's version-history comment, matching the existing convention (`"0.5.0 Phase 3b (CPI parse/transform/stage + ownership boundary)"`).
17. Module docstring: add a "Phase 4 scope (Population) — parse + transform + stage" section following the exact structure of the existing Phase 2/3a/3b sections, plus a "Population Excel layout — verification status" section following the exact structure of the existing QLFS/GDP/CPI verification-status sections (§14 supplies the content).

**`automation/config/datasets/population.yaml`:** flip `automation_level: manual` to `automation_level: hybrid` — **only after** the source guard is implemented, tested, and has been proven against the one-time correction run in §9. Leave `source_guard_required: true` and `source_guard_domain: "statssa.gov.za"` in place permanently as living documentation of why the guard exists, even once enforced in code — do not remove them once the code satisfies them, matching the project's existing convention of leaving `overwrites_historical_points: true` in `gdp.yaml` and `repo_rate_dedup_required: true` in `inflation.yaml` in place as descriptive flags after their corresponding logic shipped.

**No changes to:** `automation/core/*`, `automation/runner.py`, `automation/adapters/sarb.py`, `automation/adapters/saps.py`, `automation/adapters/worldbank.py`, any other dataset config, or any file under `src/`.

---

## 13. Required Tests

Extend `automation/adapters/tests/test_statss.py`, following the CPI section's structure (23 tests added for CPI; a comparable number is expected here). At minimum:

**Parser tests**
- `parse_population_workbook()` happy path against a synthetic fixture.
- Fails loudly when no year-header row is found (distinct error message).
- Fails loudly when the "total population" row can't be located (distinct error message).
- Non-Excel input raises `ValueError` cleanly.
- The raw-headcount-vs-millions heuristic (§7.2) is tested against both representations.

**Source guard tests (the highest-value tests in this milestone)**
- `_assert_population_source_guard()` **passes** for a `statssa.gov.za` URL.
- `_assert_population_source_guard()` **hard-fails** for a `worldbank.org` URL — this is the direct regression test against the actual historical bug and is the single most important test in this spec.
- `_assert_population_source_guard()` hard-fails for an unrelated third-party domain.
- `_assert_population_source_guard()` passes for a documented Stats SA subdomain if one is used.
- An end-to-end `fetch_and_apply()` test asserting that a mocked non-`statssa.gov.za` discovery result never reaches `_transform_population()` and never stages anything.

**Ownership boundary tests**
- `_assert_population_ownership_boundary()`: no-violation case.
- Tamper-detection case (a non-owned stat's value silently changed).
- Stat-ID-set-change case (a stat added/removed).

**Transform tests**
- `_apply_population_total_point()`: first-ever update (seed), in-place revision of an existing year's point, append of a genuinely new year.
- `_transform_population()`'s scope boundary: `population-urban`/`population-median-age` byte-for-byte unchanged after transform.

**Validation tests**
- `_validate_population_total()` in-range / out-of-range.
- `_validate_annual_label()` valid/invalid formats.
- `_check_yoy_jump()` flags a large jump without hard-failing.

**Detection tests**
- `_check_population()`: hub-changed / hub-unchanged / WAF-blocked-with-fallback / WAF-blocked-no-fallback, mirroring `_check_cpi()`'s existing four-case coverage.

**Integration tests**
- `fetch_and_apply()` `"ok"` / `"no_change"` / `"error"` paths for the population flow (network mocked), independent of the QLFS/GDP/CPI flows' own outcomes in the same call.
- `test_population_staged_candidate_requires_approve_then_promote` — the same end-to-end approve→promote proof pattern used for `interest-rates`, `unemployment`, `gdp`, and `inflation`, now for `population`. This is an explicit acceptance criterion (§15), not optional.

Full suite (currently 83/83) must continue to pass unmodified alongside the new population tests — no existing test's assertions should need to change, matching the discipline already documented for the GDP/CPI additions.

---

## 14. Risks and Assumptions

1. **The P0302 Excel layout is unverified.** Exactly as with QLFS, GDP, and CPI, no session to date has had network access to `statssa.gov.za`. `parse_population_workbook()` and `_POPULATION_METRIC_SPECS`'s label-matching rules are built against the *documented* convention (a year-header row with a "total population" indicator row), not an inspected real file. Mitigated by design (fail loudly, no guessing) — not resolved by observation. The first live `--apply` run is the actual empirical test, exactly as it was for the three prior parsers.
2. **Raw-headcount-vs-millions representation in the source workbook is unconfirmed** (§7.2). The documented heuristic is a reasonable default but must be verified on the first real run and is called out separately from risk 1 because it's a distinct failure mode (a successful parse with a wrong magnitude, rather than a failed parse).
3. **`_POPULATION_PLAUSIBLE_RANGE` and `_POPULATION_JUMP_WARNING_THRESHOLD` are this spec's own judgement calls**, not sourced from `dataset-analysis.md` or the sourcing plan — flagged for stakeholder confirmation, exactly as CPI's equivalent constants were.
4. **The P0302 URL-naming convention in `_build_population_candidate_urls()` is unconfirmed**, carried forward the same way the QLFS/GDP/CPI conventions were.
5. **Historical series integrity (2015–2023) is not audited by this milestone.** If those points were also drawn from the wrong source, they remain wrong after this milestone ships — only the current/latest point is corrected via the live `--apply` run in §9. Flagged as a follow-on data-quality task, not blocking this milestone, exactly as `labour-force-participation`'s ~18-point discrepancy was flagged and deferred in the QLFS Phase 2 closeout rather than blocking that milestone.
6. **Publication-mechanism instability**: the sourcing plan's note about a 2026 POPIA/Information Regulator dispute affecting a different Stats SA annual release is a reminder, not a confirmed risk to P0302 specifically — worth a manual check on the first live run, not a code change.
7. **The one-time correction run (§9) will produce a materially different number** (a multi-percent drop from 64.0M-equivalent to something near 63.1M-equivalent, or whatever the current MYPE actually reports). This is expected and correct, not an anomaly to suppress — the year-over-year anomaly check (§10) will very likely flag it, and the human reviewer should expect and accept that flag on this specific run rather than treating it as a parser bug.

---

## 15. Acceptance Criteria

1. `python -m automation.runner --list` / `--describe statssa` continue to run cleanly and now report a working `population` flow alongside `qlfs`/`gdp`/`cpi`.
2. `python -m automation.runner --adapter statssa` (detection only) returns a real `update_available`/`up_to_date`/`error` status for `population`, not the old hardcoded advisory stub.
3. `python -m automation.runner --adapter statssa --apply` (dry-run and live) executes the population flow independently of QLFS/GDP/CPI — a population-specific failure must not prevent the other three flows from staging their own candidates in the same call, and vice versa.
4. No code path in this milestone writes to `population.json` except through `promote_version()`.
5. `_assert_population_source_guard()` provably blocks a non-`statssa.gov.za` candidate from ever reaching `_transform_population()` or staging — proven by an automated test, not asserted in comments (§13).
6. `_assert_population_ownership_boundary()` provably blocks any change to `population-urban`/`population-median-age` from being staged.
7. `test_population_staged_candidate_requires_approve_then_promote` passes, closing the same acceptance-criterion class the QLFS/GDP/CPI milestones each explicitly closed for their own datasets.
8. The full regression suite (83 existing tests + new population tests) passes with zero collection errors and no modification to any existing test's assertions.
9. The one-time production correction (§9) has been run through the full staging → approve → promote cycle at least once against a real MYPE release, and `population.json`'s `population-total` reflects a value with verifiable `statssa.gov.za` provenance recorded in its version history.
10. `population.yaml`'s `automation_level` reads `hybrid`, not `manual`, only after criteria 5–9 are satisfied.

---

## 16. Post-Implementation Verification Checklist

- [ ] `pytest automation/` — full suite green, test count increased by the population additions, zero collection errors.
- [ ] `python -m automation.runner --describe statssa` — confirm `population` is reported as a live flow, not a Phase A stub.
- [ ] Live `--apply` run against a real, current MYPE release — confirm `parse_population_workbook()` succeeds or fails loudly with a clear, actionable message naming exactly which indicator/header couldn't be matched.
- [ ] If parsing fails on the real workbook: update `_POPULATION_METRIC_SPECS`/`_find_latest_year_column()`'s matching rules to the real layout, re-run, and only then treat the parser as empirically resolved — the same recovery procedure already established for QLFS/GDP/CPI.
- [ ] Confirm the resolved publication URL is genuinely `statssa.gov.za` on the real run (not just in a mocked test) — a final manual sanity check that the source guard is watching a real network call, not a stub.
- [ ] Review the staged `population` candidate's run report (`core/report.py` output) for the year-over-year anomaly flag (§14 risk 7) and confirm the reviewer understands why it fires on this specific run.
- [ ] `--approve population <version>` then `--promote population <version>` — confirm `population.json`'s `population-total` updates and `population-urban`/`population-median-age` are byte-for-byte unchanged in the promoted file.
- [ ] Confirm `population.json`'s `_meta.automation` block now shows `updatedBy: "statssa-adapter/population"` with a real `releasePeriod`/`sourceFile`.
- [ ] Sweep `src/lib/registry.ts`, `src/lib/citation.ts`, `src/lib/insights.ts` for any hardcoded assumption about `population-total`'s value or freshness that this correction might invalidate — same downstream-reference discipline already applied after the QLFS Phase 2 stat-ID changes (`CURRENT_STATE.md` §2 notes this sweep was previously blocked by those files being unavailable to the session; confirm availability before closing this item).
- [ ] Flip `population.yaml`'s `automation_level` to `hybrid` (§12) and update `CURRENT_STATE.md`'s "Completed Milestones" / "Production Readiness" sections to add Population alongside SARB/QLFS/GDP/CPI, following the exact update pattern used when CPI Phase 3b closed out.
- [ ] Log a follow-on backlog item for the historical-series audit (§14 risk 5) — do not silently drop it once this milestone closes.
