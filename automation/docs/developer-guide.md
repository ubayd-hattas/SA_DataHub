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
