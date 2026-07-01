"""
automation.adapters.statssa — Statistics South Africa adapter.

Responsible datasets
--------------------
  - unemployment       (QLFS P0211 — part of the QLFS family)
  - youth-unemployment (QLFS P0211 — same release)
  - labour-force       (QLFS P0211 — same release)
  - gdp                (GDP P0441)
  - inflation          (CPI component only, P0141)
  - population         (MYPE P0302)
  - housing            (GHS component only, P0318)
  - census             (Census 2022 — erratum watch only)
  - municipalities     (Census 2022 Municipal Fact Sheet — erratum watch only)

Design principles (from architecture doc)
------------------------------------------
- The QLFS family (unemployment, youth-unemployment, labour-force) is ONE
  release.  ``check_for_updates`` returns the same result for all three.
- Census and municipalities are static — their check is a lightweight
  page-hash watch, not a download attempt.
- Population MUST use Stats SA P0302, not World Bank.  The source guard
  will be enforced in the download step (Phase B).
- Retry policy: STATSSA_POLICY (exponential backoff, up to 2 h — the
  release-day site-load scenario).

Phase A scope
-------------
This adapter does NOT yet perform downloads.  It:
  - Validates that required config keys are present
  - Describes its datasets and automation levels
  - Implements ``check_for_updates`` as a stub that returns ``"unknown"``
    with a clear explanation (Phase B implements the actual check)

This is a real, executable adapter class — it is not placeholder code.
"""

from __future__ import annotations

from typing import Any

from automation.adapters import register
from automation.adapters.base import BaseAdapter, DatasetCheckResult
from automation.core.config import AutomationConfig, DatasetConfig, SourceConfig
from automation.core.logging import get_logger

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# QLFS release calendar reference (from SA-Data-Hub-Automation-Architecture.md)
# Each quarter-end → approximate release window
# ---------------------------------------------------------------------------

_QLFS_RELEASE_WINDOWS: dict[str, str] = {
    "Q1": "May–June (6 weeks after 31 March)",
    "Q2": "August (6 weeks after 30 June)",
    "Q3": "November (6 weeks after 30 September)",
    "Q4": "February (6 weeks after 31 December)",
}

_GDP_RELEASE_WINDOWS: dict[str, str] = {
    "Q1": "June (~65–70 days after 31 March)",
    "Q2": "September",
    "Q3": "December",
    "Q4": "March",
}

# ---------------------------------------------------------------------------
# Datasets managed by this adapter
# ---------------------------------------------------------------------------

_STATSSA_DATASETS: list[str] = [
    "unemployment",
    "youth-unemployment",
    "labour-force",
    "gdp",
    "inflation",     # CPI component only
    "population",
    "housing",       # GHS component only
    "census",
    "municipalities",
]

# Datasets that are effectively static — light erratum-watch only
_STATIC_DATASETS: frozenset[str] = frozenset({"census", "municipalities"})

# QLFS family — all three are one release
_QLFS_FAMILY: frozenset[str] = frozenset({
    "unemployment",
    "youth-unemployment",
    "labour-force",
})


class StatsSAAdapter(BaseAdapter):
    """
    Adapter for Statistics South Africa (statssa.gov.za).

    Covers QLFS, GDP, CPI, MYPE, GHS, Census, and the Municipal Fact Sheet.
    """

    source_id = "statssa"
    display_name = "Statistics South Africa"
    priority = 10   # Run first — largest number of datasets
    version = "0.1.0"

    def validate_config(self) -> list[str]:
        """
        Validate Stats SA adapter configuration.

        Stats SA requires no API key or credentials — all data is publicly
        available via the release hub.  We validate that:
        - The automation raw archive directory is writable (Phase B dependency)
        - The source config, if present, has the expected base_url
        """
        errors: list[str] = []

        # Check that the archive directory can be created
        archive_root = self.config.raw_archive_dir
        try:
            archive_root.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            errors.append(
                f"Cannot create raw archive directory {archive_root}: {exc}"
            )

        # Validate base URL if configured
        if self.source_config.base_url and not self.source_config.base_url.startswith(
            "https://"
        ):
            errors.append(
                f"source_config.base_url should start with 'https://', "
                f"got: {self.source_config.base_url!r}"
            )

        return errors

    def datasets(self) -> list[str]:
        """Return all datasets this adapter is responsible for."""
        return _STATSSA_DATASETS

    def check_for_updates(
        self,
        dataset_id: str,
        dataset_config: DatasetConfig | None,
    ) -> DatasetCheckResult:
        """
        Phase A stub: report 'unknown' with release window context.

        Phase B will implement:
          - Calendar-windowed ETag/content-hash watch on the Stats SA
            release hub page for each dataset
          - QLFS family: one check, three outputs
          - Population: source guard that hard-fails if not statssa.gov.za
        """
        automation_level = (
            dataset_config.automation_level if dataset_config else "manual"
        )

        # Static datasets — Census and municipalities
        if dataset_id in _STATIC_DATASETS:
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="unknown",
                message=(
                    f"[Phase A] {dataset_id} is a static/erratum-watch dataset. "
                    "Phase B will implement a lightweight page-hash check on the "
                    "Stats SA release hub."
                ),
                notes=(
                    "No action needed unless Stats SA publishes an erratum. "
                    "municipalities.json is current (verified 2026-06-04). "
                    "census.json is correct until ~2032."
                ),
            )

        # QLFS family — all three from one release
        if dataset_id in _QLFS_FAMILY:
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="unknown",
                message=(
                    f"[Phase A] {dataset_id} is part of the QLFS family "
                    "(unemployment + youth-unemployment + labour-force = one release). "
                    "Phase B will implement a single calendar-windowed ETag check "
                    "on the P0211 release hub that produces output for all three."
                ),
                current_period="Q4 2025",
                latest_period="Q1 2026 (released 12 May 2026 — not yet in JSON)",
                source_url="https://www.statssa.gov.za/?page_id=1854&PPN=P0211",
                notes=(
                    "Known gap: Q1 2026 official rate 32.7% (unemployment), "
                    "46.3% (youth), LFPR Q1 2026 — none in JSON yet."
                ),
            )

        # GDP
        if dataset_id == "gdp":
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="unknown",
                message=(
                    "[Phase A] GDP P0441. Phase B will implement calendar-windowed "
                    "check (~65–70 days after quarter-end) with Excel download. "
                    "Note: GDP revisions require overwrite of historical points, "
                    "not blind append."
                ),
                current_period="Q4 2025",
                latest_period="Q1 2026 (released 9 June 2026 — not yet in JSON)",
                source_url="https://www.statssa.gov.za/?page_id=1854&PPN=P0441",
            )

        # CPI (inflation, Stats SA component only)
        if dataset_id == "inflation":
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="unknown",
                message=(
                    "[Phase A] CPI P0141 (Stats SA component only). "
                    "Repo rate component is handled by the SARB adapter. "
                    "Phase B will implement monthly Excel download on ~22nd of month."
                ),
                current_period="April 2026",
                latest_period="May 2026 (4.5% headline — not yet in JSON)",
                source_url="https://www.statssa.gov.za/?page_id=1854&PPN=P0141",
            )

        # Population (MYPE)
        if dataset_id == "population":
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="unknown",
                message=(
                    "[Phase A] Population MYPE P0302. "
                    "CRITICAL: current JSON may be sourced from World Bank, not "
                    "Stats SA. Phase B MUST include a source guard that hard-fails "
                    "if the resolved data does not originate from statssa.gov.za. "
                    "Current JSON (64.0M, 2024) conflicts with Stats SA MYPE 2025 "
                    "(63.1M) — this is a data-integrity bug, not just staleness."
                ),
                current_period="2024 (possibly wrong source)",
                latest_period="2025 MYPE: 63.1M (released 28 Jul 2025)",
                source_url="https://www.statssa.gov.za/?page_id=1854&PPN=P0302",
                notes=(
                    "Do not automate until source is corrected. "
                    "See automation architecture §5 Population-specific note."
                ),
            )

        # Housing (GHS component)
        if dataset_id == "housing":
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="unknown",
                message=(
                    "[Phase A] Housing P0318 (GHS component). "
                    "Phase B will implement annual GHS Excel download. "
                    "Census-baseline component is static. "
                    "Pending: confirm whether GHS 2024/2025 has updated the "
                    "three tracked indicators (piped water, electricity, formal dwellings)."
                ),
                source_url="https://www.statssa.gov.za/?page_id=1854&PPN=P0318",
            )

        # Fallback
        return DatasetCheckResult(
            dataset_id=dataset_id,
            status="unknown",
            message=f"[Phase A] No check implemented yet for {dataset_id}.",
        )

    def describe(self) -> dict[str, Any]:
        return {
            "source_id": self.source_id,
            "display_name": self.display_name,
            "base_url": "https://www.statssa.gov.za",
            "release_hub": "https://www.statssa.gov.za/?page_id=1854",
            "api_available": False,
            "datasets": _STATSSA_DATASETS,
            "qlfs_family": sorted(_QLFS_FAMILY),
            "static_datasets": sorted(_STATIC_DATASETS),
            "automation_levels": {
                "unemployment": "hybrid",
                "youth-unemployment": "hybrid",
                "labour-force": "hybrid",
                "gdp": "hybrid",
                "inflation": "hybrid (CPI only; repo-rate via SARB)",
                "population": "manual (source correction required first)",
                "housing": "hybrid (pending GHS source confirmation)",
                "census": "static (erratum watch only)",
                "municipalities": "static (erratum watch only)",
            },
            "qlfs_release_windows": _QLFS_RELEASE_WINDOWS,
            "gdp_release_windows": _GDP_RELEASE_WINDOWS,
            "retry_policy": "STATSSA_POLICY (up to 2 h on release day)",
            "notes": (
                "One release, one job: QLFS family uses a single extractor. "
                "Population source guard is mandatory in Phase B. "
                "GDP ETL must overwrite historical points (revisions), not append."
            ),
            "phase_a_status": "Config validation + dataset description only",
            "phase_b_plan": (
                "Calendar-windowed ETag check → Excel download → parse → validate "
                "→ diff → stage → PR → approve → promote"
            ),
        }


# ---------------------------------------------------------------------------
# Register the adapter
# ---------------------------------------------------------------------------

register(StatsSAAdapter)
