"""
automation.adapters.saps — South African Police Service adapter.

Responsible datasets
--------------------
  - crime  (Police Recorded Crime Statistics — quarterly + annual)

Design principles (from architecture doc)
------------------------------------------
- SAPS is a human-in-the-loop dataset.  No automated download or PDF
  parsing.  The adapter's only job is to watch the SAPS crime-stats page
  for a new PDF and open a review ticket.
- Release cadence: quarterly, but NOT on a fixed calendar (releases have
  slipped by months in the current financial year).  Poll weekly year-round.
- Download strategy: archive the new PDF for the reviewer, but do NOT
  attempt table extraction.  The three headline figures (murder, contact
  crime, aggravated robbery) must be manually transcribed.
- Future path: revisit full automation only if the SAPS–Stats SA MoU
  results in SAPS data moving to Stats SA's Excel-based publication.
  The pipeline wiring (crime.pipeline.yaml) is intentionally easy to
  re-point at a 'statssa' source module later.

Known data gap
--------------
  Newest JSON point: FY2023/24 (26,232 murders, last_verified 2025-05-01)
  Missing: FY2024/25 annual, plus up to 4 quarterly FY2025/26 releases
  Q4 FY2025/26 (Jan–Mar 2026) was presented ~22 May 2026 to Parliament

Phase A scope
-------------
Validates configuration, describes the dataset, and implements a stub
check_for_updates that documents the manual-review workflow.
"""

from __future__ import annotations

from typing import Any

from automation.adapters import register
from automation.adapters.base import BaseAdapter, DatasetCheckResult
from automation.core.config import AutomationConfig, DatasetConfig, SourceConfig
from automation.core.logging import get_logger

log = get_logger(__name__)

_SAPS_CRIME_STATS_URL = "https://www.saps.gov.za/services/crimestats.php"
_SAPS_DATASETS: list[str] = ["crime"]

# Headline figures a reviewer must transcribe (shape enforced by manual-entry template)
_REQUIRED_TRANSCRIPTION_FIELDS: list[str] = [
    "murder_count",
    "contact_crime_total",
    "aggravated_robbery_total",
    "period_label",          # e.g. "Q4 FY2025/26 (Jan–Mar 2026)"
    "source_url",            # URL of the specific release document
    "source_date",           # Date the SAPS released/presented the report
]


class SAPSAdapter(BaseAdapter):
    """
    Adapter for the South African Police Service (saps.gov.za).

    Implements a manual-review (Track B) workflow — no automated extraction.
    """

    source_id = "saps"
    display_name = "South African Police Service"
    priority = 30
    version = "0.1.0"

    def validate_config(self) -> list[str]:
        """
        Validate SAPS adapter configuration.

        SAPS requires no credentials.  We validate:
        - Archive directory is writable (for PDF archiving in Phase B)
        """
        errors: list[str] = []
        try:
            self.config.raw_archive_dir.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            errors.append(f"Cannot create raw archive directory: {exc}")
        return errors

    def datasets(self) -> list[str]:
        return _SAPS_DATASETS

    def check_for_updates(
        self,
        dataset_id: str,
        dataset_config: DatasetConfig | None,
    ) -> DatasetCheckResult:
        """
        Phase A stub for SAPS dataset checks.

        Phase B will implement:
          - Weekly content-hash check on the SAPS crime-stats page
          - On change detected: archive the PDF, open a review ticket
          - Human reviewer manually transcribes required fields
          - Manual entry passes through generic validation before staging

        This is intentionally a manual-review (Track B) workflow —
        the watcher detects, humans decide, generic pipeline promotes.
        """
        if dataset_id == "crime":
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="unknown",
                message=(
                    "[Phase A] SAPS crime statistics — manual review (Track B). "
                    "Phase B will implement a weekly page-hash check on "
                    f"{_SAPS_CRIME_STATS_URL}. "
                    "On change detected: PDF archived, review ticket opened. "
                    "No automated PDF table extraction."
                ),
                current_period="FY2023/24 (most recent in JSON — significantly stale)",
                latest_period=(
                    "Q4 FY2025/26 (Jan–Mar 2026) presented ~22 May 2026. "
                    "FY2024/25 annual release also missing."
                ),
                source_url=_SAPS_CRIME_STATS_URL,
                notes=(
                    "This is the stalest dataset in the portfolio (absolute terms). "
                    "Manual transcription required: murder, contact crime, "
                    "aggravated robbery + period label. "
                    "Cadence: quarterly, but calendar is unreliable — poll weekly."
                ),
            )

        return DatasetCheckResult(
            dataset_id=dataset_id,
            status="unknown",
            message=f"[Phase A] No check implemented for {dataset_id} under SAPS adapter.",
        )

    def describe(self) -> dict[str, Any]:
        return {
            "source_id": self.source_id,
            "display_name": self.display_name,
            "base_url": "https://www.saps.gov.za",
            "crime_stats_url": _SAPS_CRIME_STATS_URL,
            "api_available": False,
            "pdf_only": True,
            "datasets": _SAPS_DATASETS,
            "automation_levels": {
                "crime": "manual (human-in-the-loop, Track B workflow)",
            },
            "cadence": (
                "Quarterly (police financial year Apr–Mar), "
                "but release calendar is unreliable — poll weekly year-round"
            ),
            "manual_entry_fields": _REQUIRED_TRANSCRIPTION_FIELDS,
            "retry_policy": "WATCH_POLICY (simple retry on page fetch)",
            "future_path": (
                "Revisit full automation if SAPS–Stats SA MoU results in "
                "Excel-based publication via Stats SA. Pipeline config "
                "(crime.pipeline.yaml) is designed to be easily re-pointed "
                "at the statssa adapter without structural changes."
            ),
            "phase_a_status": "Config validation + dataset description only",
            "phase_b_plan": (
                "Weekly page-hash watch → PDF archived on change → "
                "review ticket opened → human transcribes fields → "
                "generic validation → stage → approve → promote"
            ),
        }


# ---------------------------------------------------------------------------
# Register the adapter
# ---------------------------------------------------------------------------

register(SAPSAdapter)
