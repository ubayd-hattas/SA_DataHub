# Implementation Specification — Stats SA QLFS Phase 2

**Prepared:** 2026-07-16
**Audience:** Implementation engineer (human or AI assistant) continuing the SA Data Hub automation framework
**Status:** Approved for implementation
**Depends on:** Automation Framework Hardening Sprint (complete — see `CURRENT_STATE.md`, `CHANGELOG.md`)
**Precedent authority:** `SA-Data-Hub-Automation-Architecture.md`, `SA-Data-Hub-Dataset-Sourcing-Plan.md`, `etl-pipeline.md`, `dataset-analysis.md`

---

## 0. Framing

This is **not** a new subsystem. The staging → approval → promote pipeline, the generic core (`config`, `http_client`, `retry`, `files`, `metadata`, `version`, `report`), and the `BaseAdapter` contract are all complete and are to be reused as-is. `StatsSAAdapter.fetch_and_apply()` already implements the correct first half of this work (discover → download → archive raw QLFS file → record a `pending` version entry) and deliberately stops there. This specification covers only the second half: **parse the archived file, transform it into the three existing JSON schemas, and route the result through the existing gate.**

Do not redesign the staging/approval/promote flow. Do not introduce a new CLI flag beyond what's needed to invoke this path (reuse `--apply`/`--approve`/`--promote`, exactly as SARB does). Do not implement GDP, CPI, population, or housing in this pass — those are explicitly out of scope and are separate future milestones per `SA-Data-Hub-Dataset-Sourcing-Plan.md`'s roadmap.

---

## 1. Objectives

1. Turn the QLFS publication file already being downloaded and archived by `StatsSAAdapter.fetch_and_apply()` into updated `unemployment.json`, `youth-unemployment.json`, and `labour-force.json` documents, matching their existing schema exactly.
2. Route all three outputs through the existing staging → approval → promote pipeline — no direct writes to `src/data/datasets/*.json`, consistent with the framework's one non-negotiable rule.
3. Resolve, as part of this same build (not a follow-up), the two duplicate/misplaced stat IDs the sourcing plan and dataset analysis both flag: the duplicate `youth-unemployment` ID appearing in both `unemployment.json` and `youth-unemployment.json`, and `labour-force-participation` currently living in `unemployment.json` instead of `labour-force.json`.
4. Preserve every non-QLFS field in the three JSON files untouched (descriptions, categories, colors, chart config, etc.) — only rate-bearing fields and their series/`_meta` are updated, exactly as `SARBAdapter._transform_interest_rates()` already does for `interest-rates.json`.

---

## 2. Scope

**In scope:**
- One new extractor that parses a single downloaded QLFS Excel workbook and fans out into three dataset-shaped documents.
- Cell-range/table lookup logic specific to the current QLFS Excel layout.
- Dataset-specific validation rules (rate bounds, quarter-over-quarter jump plausibility, quarterly label format).
- Wiring the parse/transform step into `StatsSAAdapter.fetch_and_apply()`, immediately after the existing archive step.
- Resolving the two stat-ID inconsistencies listed in Objective 3, as a one-time schema correction bundled with this build.

**Out of scope (do not implement):**
- GDP, CPI, population, housing, census, municipalities parsing — all remain Phase A/stub per `CURRENT_STATE.md` §3.
- Any change to the generic core (`staging.py`, `promote.py`, `version.py`) — reuse as-is.
- GitHub Actions / CI integration.
- PostgreSQL writes — the ETL layer (`etl/`) already owns loading JSON into PostgreSQL per `etl-pipeline.md`; this work produces JSON only, as every other dataset does today.
- PDF parsing as a fallback — if the Excel file cannot be located or parsed, fail loudly (see §5) rather than attempting a PDF-scraping fallback in this pass.

---

## 3. Files Likely to Change

| File | Nature of change |
|---|---|
| `automation/adapters/statss.py` | Add a QLFS Excel parser and a transform function (or a small set of them, one per output dataset, sharing the parsed table); wire both into `fetch_and_apply()` after the existing archive step, staging three documents and recording three version entries (or one version entry covering all three — see §9, open question for the engineer to resolve during design, not before). |
| `src/data/datasets/unemployment.json` | Corrected at build time (schema fix): remove the duplicate `youth-unemployment` stat ID and the misplaced `labour-force-participation` stat ID. This is a manual, reviewed, one-time edit — not something the automated transform does on every run. |
| `src/data/datasets/youth-unemployment.json` | No structural change; receives updated values through the new pipeline once live. |
| `src/data/datasets/labour-force.json` | Gains `labour-force-participation` (moved from `unemployment.json`) as part of the one-time schema fix. |
| `automation/adapters/tests/test_statss.py` (new) | Regression tests for the parser and transform functions, mirroring the structure and rigor of `adapters/tests/test_sarb.py`. |
| `automation/docs/developer-guide.md` | Short addition documenting the QLFS parse/transform step, consistent with how the SARB write path is already documented. |
| `CHANGELOG.md` | New entry for this milestone once delivered (append-only, per existing convention). |

Do not modify `automation/core/*.py` or `automation/runner.py` beyond what's already needed to invoke an existing adapter's `fetch_and_apply()` — no new argument shapes should be required.

---

## 4. Implementation Order

1. **Resolve the stat-ID inconsistencies first, as a standalone, manually-reviewed data-shape correction**, independent of and prior to any code. This must happen before the transform is built, not after, per the sourcing plan's explicit warning that "one extractor, three outputs" repeats the youth-unemployment duplication mistake if the target shape isn't fixed first.
2. Confirm the current QLFS Excel layout by inspecting the most recent archived file (from `StatsSAAdapter.fetch_and_apply()`'s existing archive step) — do not assume a layout from documentation; the sourcing plan explicitly warns Stats SA's Excel structure is a per-release idiom, not a stable API contract.
3. Build the table-locating/cell-range parser as a pure function: raw file bytes in, a small number of named values out (national unemployment rate, youth narrow/1524/expanded rates, NEET rate, LFPR overall, female LFPR), with no knowledge of any JSON schema.
4. Build the three schema-mapping transforms (unemployment, youth-unemployment, labour-force), each following the exact pattern of `_transform_interest_rates()`: deep-copy the current document, update only rate-bearing fields, append/seed series history, update `_meta`.
5. Build validation (rate bounds, label format, quarter-over-quarter plausibility) — reuse `check_protected_fields()` from `core/metadata.py` unchanged; do not write a new protected-field mechanism.
6. Wire into `fetch_and_apply()`, staging all three documents and recording version entries.
7. Write tests, then run them — do not report this milestone complete without having executed `pytest` and `python -m automation.runner --list` yourself, per the standard this framework is now held to (see `CHANGELOG.md`'s 2026-07-16 entry for why this is stated explicitly).

---

## 5. Parsing Strategy

- Source file: whatever `StatsSAAdapter.fetch_and_apply()` has already downloaded and archived (Excel, per the sourcing plan's confirmation that Stats SA publishes structured Excel tables alongside every P0211 release).
- Locate the specific tables needed by header/label matching, not fixed cell coordinates alone — Stats SA's layout is release-idiomatic, not guaranteed stable row-for-row between quarters, per the sourcing plan.
- If the expected tables cannot be located (structure changed, unexpected sheet name, etc.), the parser must fail loudly with a clear, specific error — it must not guess, silently skip a value, or fall back to a stale/cached figure. This mirrors `SARBAdapter.fetch_and_apply()`'s existing behavior of returning `status="error"` with a populated `validation_errors` list on any extraction failure.
- Do not attempt PDF parsing as a fallback in this pass (see §2, out of scope). If the Excel file is unavailable, the correct behavior is the same `error` status the SARB path already uses for a failed fetch — this dataset falls back to the existing manual-review path (Track B in the architecture document), not a best-effort automated guess.
- Reuse `automation.core.files.save_to_archive()` / `portable_archive_path()` for any additional raw artifacts if the parser needs to persist an intermediate representation — do not invent a second archiving mechanism.

---

## 6. Validation Strategy

Apply the same layered approach already established for SARB, using existing infrastructure only:

1. **Schema/range validation** (dataset-specific, new code): each rate is a percentage in `[0, 100]`; quarterly labels match `/^Q[1-4] \d{4}$/` per the rule already codified in `dataset-analysis.md`'s `RULES` pseudocode.
2. **Protected-field check** (existing, reuse unchanged): call `core.metadata.check_protected_fields(current_doc, updated_doc)` exactly as `SARBAdapter.fetch_and_apply()` does, for each of the three output documents, before staging. A protected-field violation must abort staging for that document with the violation recorded in the result, exactly as the SARB path already does.
3. **Plausibility/anomaly check** (dataset-specific, new code): flag (do not necessarily hard-fail) a quarter-over-quarter jump beyond a defined threshold as a warning in the version entry's notes — this is a review aid for the human approver, not an automatic rejection, consistent with the architecture document's distinction between "hard failure" and "anomaly flag for reviewer."
4. **Cross-file consistency** (new, dataset-specific): if the national unemployment period and any provincial/youth period being written in the same run disagree, log a warning — do not hard-fail; this is exactly the class of bug (`provinces.json` Q3-vs-Q4 lag) already logged as a known issue, and this pipeline should not introduce a fresh instance of it silently.

Do not build a new validation framework. Everything above is either a direct reuse of `check_protected_fields()` or a small, dataset-specific rule function in the same style as `_validate_prime_spread()`.

---

## 7. Transformation Rules

Each of the three output documents follows the same rule `SARBAdapter._transform_interest_rates()` already established, and should not diverge from it without a stated reason:

- Deep-copy the current on-disk document; never mutate in place.
- Update only the fields whose value actually changed (`value`, `rawValue`, `change`, `changeLabel`, `trend`, `lastUpdated`, `source.publicationDate`) for each affected stat ID.
- Series history: append a new labeled data point if the period label is new; update the existing point in place if the label already exists (a revision) — and, per this sprint's fix to the same bug in the SARB adapter, correctly seed a first data point if a stat's `series` list is currently empty rather than silently doing nothing.
- Update the shared `_meta` block (`last_verified`, `lastUpdated`, `source_url`, an `automation` sub-block recording adapter version and endpoint/file details) consistently with the SARB pattern.
- Never alter `id`, `categoryId`, `unit`, or any other protected/structural field — this is exactly what `check_protected_fields()` exists to catch if violated.
- The one-time schema fix (moving `labour-force-participation`, de-duplicating `youth-unemployment`) is not part of this transform function's job — it is a prerequisite data correction applied once, manually, before this code is ever run (§4, step 1). The transform function should assume the corrected shape as its starting point and must not need to know that a fix ever happened.

---

## 8. Integration with the Existing ETL Pipeline

No new integration work is required beyond continuing to produce correctly-shaped JSON. Per `etl-pipeline.md` and `ai-context.md`:

- The `etl/` pipeline (extract → transform → validate → load into PostgreSQL) is a separate, downstream system that already expects `src/data/datasets/*.json` as its JSON-fallback source shape (`Dual-Write Period` section of `etl-pipeline.md`). This automation framework's job ends at producing correct, approved JSON in that location — it does not call into `etl/` directly, and this phase does not change that boundary.
- If `etl/pipelines/unemployment.py` (or equivalents for youth-unemployment/labour-force) exist or are built in parallel, they should be able to read the JSON this pipeline produces with no special-casing, because the schema is unchanged (aside from the one-time, upfront ID correction in §4 step 1, which `etl/` should also be made aware of if/when it starts reading these three files).
- Do not build a direct database write path in this milestone. That remains explicitly gated behind the wider PostgreSQL migration (`migration-plan.md`), which is unaffected by this work.

---

## 9. Integration with PostgreSQL

There is no PostgreSQL integration in this milestone. `DATA_SOURCE=db` vs `json` remains a future feature flag per `ai-context.md`; this automation framework, including this QLFS Phase 2 work, continues to write only to `src/data/datasets/*.json`. Note this explicitly in the deliverable so it is not mistaken for a gap: it is a scope boundary, not an omission.

**Open question for the implementing engineer to resolve during design (not before):** whether one version entry should cover all three output documents (since they come from a single QLFS release), or three separate version entries referencing a shared source archive. Either is compatible with the existing `version.py` API; pick whichever keeps the approve/promote step simplest for a human reviewer, and document the choice in the code and in `developer-guide.md`. Do not treat this as license to modify `version.py`'s schema — if the existing `VersionEntry` fields are insufficient, stop and raise it rather than silently extending the shared data model, per the "stop and explain" instruction governing this work.

---

## 10. Acceptance Criteria

1. `python -m automation.runner --list` and `--describe statssa` complete without error after this work lands (i.e., no regression of the syntax-safety bar this sprint just established).
2. A new test suite (`adapters/tests/test_statss.py` or equivalent) covers, at minimum: successful parse of a representative archived QLFS file; correct transform output for all three datasets against a known-good fixture; the empty-series first-update case (mirroring the bug class fixed for SARB in this sprint); a protected-field violation correctly aborting staging; and a missing/unparseable source file correctly producing `status="error"` rather than a partial or guessed write.
3. `pytest automation/` passes in full, including all pre-existing tests — this is a hard requirement, not a target; the engineer must run it and report the actual result, not an assumed one.
4. An end-to-end demonstration (automated test, following the pattern of `core/tests/test_pipeline_integration.py`) proves: a staged QLFS candidate cannot reach `unemployment.json`/`youth-unemployment.json`/`labour-force.json` without an explicit approve → promote step, exactly as already proven for SARB.
5. The duplicate `youth-unemployment` stat ID and the misplaced `labour-force-participation` field no longer exist in their old locations, and this is a reviewed, standalone commit distinct from the parser/transform code.
6. No field outside the rate-bearing/`_meta` scope in any of the three JSON files changes as a side effect of a run with no real data change (i.e., running the pipeline against unchanged source data should produce `status="no_change"`, identical to the SARB adapter's existing behavior).
7. `CHANGELOG.md` gains an appended entry for this milestone, following the existing format, without altering prior entries.

---

## 11. Risks

- **Excel layout drift.** Stats SA's per-release table layout is not a stable contract (sourcing plan, Finding 5). The parser must fail loudly on an unrecognized layout rather than silently mis-mapping a cell — this is the single highest-severity risk in this milestone, directly analogous to the transform bug found and fixed for SARB in the prior sprint.
- **Re-introducing the youth-unemployment/labour-force duplication.** The sourcing plan is explicit that this exact mistake has already happened once; doing the schema fix (§4 step 1) as an afterthought rather than a prerequisite is how it would happen again.
- **GDP-style revisions.** Unlike SARB's append-only rate history, Stats SA is known to revise prior-quarter figures for some series. Confirm during implementation whether QLFS is subject to the same revision behavior GDP has (the sourcing plan flags this specifically for GDP, not explicitly for QLFS) — if so, the transform must overwrite historical points by period, not blindly append, exactly as the architecture document requires for GDP.
- **Scope creep into GDP/CPI.** The temptation to generalize the Excel parser immediately to other Stats SA datasets should be resisted in this milestone — build it correctly for the QLFS family first, prove it end-to-end, and let GDP/CPI be a deliberate follow-on, per the architecture document's own "prove one adapter before multiplying exposure" reasoning.
- **Stale documentation recurrence.** The prior sprint found docstrings/`describe()` output describing behavior the code no longer matched. Any new docstrings written in this milestone must describe what the code actually does at time of delivery, verified by running `--describe statssa` and reading the output, not by assumption.

---

## 12. Definition of Done

- All items in §10 (Acceptance Criteria) are met and independently verified by running the commands, not by summary.
- `CURRENT_STATE.md` is updated to reflect that Stats SA QLFS now has a working, gated write path, in the same style as this document's own creation reflected the automation framework's completion.
- No change has been made to `automation/core/*.py`, `automation/runner.py`'s CLI surface, or any adapter other than `StatsSAAdapter`, beyond what's explicitly listed in §3.
- The one-time schema correction (§4 step 1) is committed separately from the parsing/transform code, with its own clear commit message, so it can be reviewed and reasoned about independently of the automation logic.
