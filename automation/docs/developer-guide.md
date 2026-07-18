# SA Data Hub — Automation Framework Developer Guide

## Architecture

The automation framework is a source-agnostic runner designed to orchestrate the detection and execution of data updates. It exists alongside (but separate from) the ETL pipeline, acting as the trigger and validation gateway before any data touches the database.

The framework is divided into three tiers:
1. **Core (`automation/core/`)**: Generic, shared modules that know nothing about specific datasets or sources. Includes configuration loading, logging, HTTP client, retry/backoff utilities, file management (checksums, archiving), metadata utilities (freshness, protected fields), and report generation.
2. **Adapters (`automation/adapters/`)**: Source-specific plugins (e.g., Stats SA, SARB, SAPS, World Bank). Every adapter inherits from `BaseAdapter` and implements specific lifecycle methods (`validate_config`, `datasets`, `check_for_updates`, `describe`). Adapters are auto-discovered at startup.
3. **Configuration (`automation/config/`)**: YAML/JSON files mapping data sources and datasets. This declarative setup allows adding new datasets without modifying the core runner code.

## Execution Flow

When you run `python -m automation` (or `python -m automation.runner`), the following sequence occurs:

1. **Bootstrapping**: The runner configures logging and assigns a unique `run_id` to correlate all logs for the current invocation.
2. **Configuration Load**: Loads `automation.yaml`, merges local overrides (`local.yaml`), and reads all files in `config/sources/` and `config/datasets/`.
3. **Auto-Discovery**: Imports all modules in `automation/adapters/`. As these modules are imported, their `register()` calls execute, populating the adapter registry.
4. **Validation**: For each registered adapter, `validate_config()` is called to ensure prerequisites (e.g., readable directories, valid URLs) are met.
5. **Execution**: The runner iterates through each validated adapter in priority order. For each dataset assigned to the adapter, it calls `check_for_updates()`.
6. **Reporting**: After all adapters have run, a Markdown (and optional JSON) report is generated summarizing the statuses, skipped items, errors, warnings, and recommended actions. The report is saved to `automation/reports/archive/`.

## Adding New Sources

To add a new data source organization (e.g., a new government department API):

1. **Create the Adapter Class**: Create a new file in `automation/adapters/` (e.g., `new_source.py`). Subclass `BaseAdapter` and implement all abstract methods.
   ```python
   from automation.adapters import register
   from automation.adapters.base import BaseAdapter, DatasetCheckResult
   from automation.core.config import DatasetConfig

   class NewSourceAdapter(BaseAdapter):
       source_id = "new_source"
       display_name = "New Source Department"
       priority = 50

       def validate_config(self) -> list[str]:
           return []

       def datasets(self) -> list[str]:
           return ["my_new_dataset"]

       def check_for_updates(self, dataset_id: str, dataset_config: DatasetConfig | None) -> DatasetCheckResult:
           return DatasetCheckResult(dataset_id=dataset_id, status="unknown", message="Check implemented")

       def describe(self) -> dict:
           return {"source_id": self.source_id}

   register(NewSourceAdapter)
   ```
2. **Add Source Configuration**: Create `automation/config/sources/new_source.yaml`.
   ```yaml
   display_name: "New Source Department"
   base_url: "https://api.newsource.gov.za"
   enabled: true
   ```
3. The framework will automatically discover the new adapter on the next run.

## Adding New Datasets

If the source adapter already exists, adding a new dataset requires zero code changes to the runner:

1. **Add Dataset Configuration**: Create `automation/config/datasets/<dataset_id>.yaml`.
   ```yaml
   source_id: existing_source  # Must match a registered adapter's source_id
   display_name: "My New Dataset"
   enabled: true
   cadence: quarterly
   automation_level: auto
   ```
2. **Update the Adapter**: Depending on how the existing adapter is implemented, you may need to add the new `dataset_id` to its internal tracking list (e.g., `_STATSSA_DATASETS`) so that it returns it in its `datasets()` method and handles it in `check_for_updates()`.

## `fetch_and_apply()` and the Approval Pipeline

Some adapters (currently `SARBAdapter` and `StatsSAAdapter`) define an additional method, `fetch_and_apply()`, alongside the `check_for_updates()` method described in "Execution Flow" above.

This method operates within a strict staging → approval → promote pipeline to protect production data:

1. **Staging**: When run via `python -m automation.runner --apply`, the adapter fetches the data, validates it, and writes the transformed JSON to a safe staging directory (`automation/reports/staging/`), leaving production data entirely untouched. It records a `pending` version entry.
2. **Approval**: A human reviewer inspects the staged data and approves the version using `python -m automation.runner --approve <dataset_id> <version_id>`.
3. **Promotion**: The approved version is atomically written to the production dataset location (`src/data/datasets/`) using `python -m automation.runner --promote <dataset_id> <version_id>`.

This pipeline acts as the enforced gate, ensuring that automated/unattended runs cannot write directly to production datasets.

## QLFS Parse / Transform / Stage (Phase 2)

`StatsSAAdapter.fetch_and_apply()` covers the QLFS family (`unemployment`,
`youth-unemployment`, `labour-force`) — one Stats SA release, three JSON
outputs, per the "one release, one job" principle in
`SA-Data-Hub-Automation-Architecture.md` §0.

After the Phase 1 download/archive steps, this build adds:

1. **Parse** (`parse_qlfs_workbook()`): locates the seven required
   indicators (national unemployment, youth narrow/15-24/expanded, NEET,
   overall LFPR, female LFPR) by scanning each worksheet for a
   quarter-header row (e.g. `Q1 2026`) and, per indicator, a label-text
   match on the same sheet — not fixed cell coordinates. If a required
   indicator can't be located, or the file isn't a valid Excel workbook
   (including the case where the URL probe fell back to a PDF), this
   raises loudly. There is no PDF-parsing fallback in this phase.
2. **Transform** (`_transform_unemployment()` / `_transform_youth_unemployment()`
   / `_transform_labour_force()`): each follows the exact deep-copy,
   rate-bearing-fields-only, seed-or-append-series pattern already
   established by `SARBAdapter._transform_interest_rates()`.
3. **Validate**: percentage-range check, quarterly label format check,
   and `check_protected_fields()` (reused unchanged from `core/metadata.py`)
   per dataset. A protected-field violation or a range/format failure
   aborts staging **for that dataset only** — the other two QLFS outputs
   still stage normally if they pass.
4. **Anomaly flag**: a quarter-over-quarter jump beyond ±3.0 percentage
   points is logged and recorded in the version entry's notes for the
   human reviewer's attention — it does not block staging.
5. **Stage**: each dataset whose values actually changed is written via
   `write_staged_dataset()` with one `pending` version entry recorded via
   `new_version_entry()` / `save_version_entry()` — **one version entry
   per output dataset** (up to three per release), since `version.py`'s
   store and `promote_version()` are both keyed by a single `dataset_id`
   per call. If none of the three datasets' values differ from what's
   already on disk, the run returns `status="no_change"` with no staging
   and no version entries at all.

No dataset JSON is ever written directly by this adapter — reaching
production still requires the same `--approve` then `--promote` sequence
already used for `interest-rates.json`.

**Verification status of the Excel layout** (read before changing the
parser): no archived QLFS `.xlsx` file was available to inspect in the
session that built this parser, and no session to date has had network
access to `statssa.gov.za` to fetch one live. The label-matching rules in
`_QLFS_METRIC_SPECS` (`automation/adapters/statss.py`) were built against
the documented convention and tested only against synthetic fixtures (see
`automation/adapters/tests/test_statss.py`). Treat the first real run
against a downloaded workbook as the empirical test of this parser.

GDP, CPI, population, housing, census, and municipalities remain Phase A
stubs — out of scope for this build.

## Known Open Item: Stats SA QLFS WAF Signal (Work Item 5)

`StatsSAAdapter` explicitly detects the Stats SA release hub's Incapsula WAF
challenge page (by scanning the response body for `_Incapsula_Resource`/
`incapsula`) and raises a `WAF_BLOCKED` error rather than hashing it as a
candidate "no_change" signal. This avoids the specific failure mode the
original review flagged (a WAF challenge misread as a real release), but it
does **not** empirically confirm whether the challenge page's content hash
is actually stable across requests — no session to date has had network
access to `statssa.gov.za` to observe this directly. See the docstring on
`_fetch_release_hub_html()` in `automation/adapters/statss.py` for the full
finding. This item can be closed with an explicit, dated, request-counted
observation once real network access is available; until then it should be
treated as mitigated, not resolved.
