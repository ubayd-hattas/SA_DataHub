"""
automation.adapters.worldbank — World Bank adapter.

Responsible datasets
--------------------
  None currently assigned — see notes below.

Design principles (from architecture doc)
------------------------------------------
- The World Bank adapter is kept for datasets that are LEGITIMATELY sourced
  from the World Bank (confirmed against data_sources, not assumed).
- population.json is NOT a legitimate World Bank dataset — it should come
  from Stats SA P0302 (MYPE).  The Stats SA adapter handles it with a
  source guard.  The World Bank adapter must NOT claim population.json.
- The failure mode to prevent: silently using World Bank as a stand-in for
  a Stats SA dataset.  Every dataset assigned to this adapter must be
  explicitly confirmed as legitimately World-Bank-sourced.
- World Bank has a genuine REST API (api.worldbank.org), similar profile
  to SARB — no file parsing required for properly-structured indicators.

Current status
--------------
  No datasets are currently confirmed as legitimately World-Bank-sourced
  in the SA Data Hub portfolio.  The adapter is registered and ready;
  datasets will be added after an explicit audit per the sourcing plan's
  recommendation ("Audit every auto-labelled dataset before trusting the
  label").

  When a dataset IS confirmed for World Bank:
  1. Add it to _WORLDBANK_DATASETS below.
  2. Add a config file automation/config/datasets/<dataset_id>.yaml with
     source_id: worldbank.
  3. Implement the check in check_for_updates().
  4. Document the audit outcome in the dataset's config file.

Phase A scope
-------------
Validates configuration (no credentials needed for World Bank public API)
and describes the adapter. Returns 'skipped' for all dataset checks since
no datasets are currently assigned.
"""

from __future__ import annotations

from typing import Any

from automation.adapters import register
from automation.adapters.base import BaseAdapter, DatasetCheckResult
from automation.core.config import AutomationConfig, DatasetConfig, SourceConfig
from automation.core.logging import get_logger

log = get_logger(__name__)

_WORLDBANK_API_ROOT = "https://api.worldbank.org/v2"
_WORLDBANK_DATASETS: list[str] = []   # Intentionally empty — see module docstring


class WorldBankAdapter(BaseAdapter):
    """
    Adapter for the World Bank Data API (api.worldbank.org).

    No datasets are currently assigned.  The adapter is registered so
    Phase B can add datasets without modifying the runner.
    """

    source_id = "worldbank"
    display_name = "World Bank"
    priority = 40
    version = "0.1.0"

    def validate_config(self) -> list[str]:
        """
        Validate World Bank adapter configuration.

        The World Bank API is public — no API key required.  We validate:
        - Base URL is correctly set (or use the default)
        - Archive directory is writable
        """
        errors: list[str] = []

        configured_url = self.source_config.base_url
        if configured_url and not configured_url.startswith("https://"):
            errors.append(
                f"source_config.base_url should start with 'https://', "
                f"got: {configured_url!r}"
            )

        try:
            self.config.raw_archive_dir.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            errors.append(f"Cannot create raw archive directory: {exc}")

        return errors

    def datasets(self) -> list[str]:
        """
        Return the list of confirmed World-Bank-sourced datasets.

        This list is intentionally empty until an explicit audit confirms
        that a dataset is legitimately World-Bank-sourced.
        """
        return _WORLDBANK_DATASETS

    def check_for_updates(
        self,
        dataset_id: str,
        dataset_config: DatasetConfig | None,
    ) -> DatasetCheckResult:
        """
        Check for updates via the World Bank API.

        Phase B will implement:
          - REST API call to api.worldbank.org for the specific indicator
          - Compare last data point date with current JSON
          - Validate that the source is appropriate for this indicator

        The source guard here is conceptual — for World Bank datasets,
        the check must confirm that World Bank is the *correct* source,
        not just that the data is *available* from World Bank.
        """
        # Currently no datasets are assigned — this should not be called
        return DatasetCheckResult(
            dataset_id=dataset_id,
            status="skipped",
            message=(
                f"[Phase A] Dataset {dataset_id!r} is not currently assigned to the "
                "World Bank adapter. "
                "Add it to _WORLDBANK_DATASETS only after explicit audit confirms "
                "World Bank is the correct source (not a stand-in for Stats SA data). "
                "See population.json for the canonical example of what to avoid."
            ),
        )

    def describe(self) -> dict[str, Any]:
        return {
            "source_id": self.source_id,
            "display_name": self.display_name,
            "base_url": _WORLDBANK_API_ROOT,
            "api_available": True,
            "api_notes": (
                "Public REST API — no key required. "
                "Indicator data at: /country/ZA/indicator/<CODE>?format=json"
            ),
            "datasets": _WORLDBANK_DATASETS,
            "datasets_note": (
                "EMPTY INTENTIONALLY. "
                "Do not add population.json here — that dataset must come from "
                "Stats SA P0302 (MYPE). "
                "Only add datasets confirmed as legitimately World-Bank-sourced "
                "via an explicit audit (see sourcing plan §Cross-Cutting Observations)."
            ),
            "automation_levels": {},
            "audit_requirement": (
                "Every candidate dataset must be audited against data_sources "
                "table and sourcing plan before being added here."
            ),
            "phase_a_status": "Registered and ready — no datasets currently assigned",
            "phase_b_plan": (
                "After audit: REST API call → compare last data point → "
                "validate → stage → approve → promote"
            ),
        }


# ---------------------------------------------------------------------------
# Register the adapter
# ---------------------------------------------------------------------------

register(WorldBankAdapter)
