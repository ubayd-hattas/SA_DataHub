"""ETL data contracts."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any, Literal


@dataclass
class LoadObservation:
    stat_id: str
    geography_code: str
    period_label: str
    period_start: date
    value: float
    secondary_value: float | None = None
    is_estimate: bool = False


@dataclass
class StatisticSnapshot:
    stat_id: str
    display_value: str
    raw_value: float
    change: float | None
    change_label: str | None
    trend: Literal["up", "down", "stable"]
    last_updated: date


@dataclass
class PipelineResult:
    dataset_slug: str
    status: Literal["preview", "success", "failed"]
    rows_extracted: int = 0
    rows_transformed: int = 0
    rows_inserted: int = 0
    rows_updated: int = 0
    rows_skipped: int = 0
    duration_ms: int = 0
    version_id: int | None = None
    source_snapshot_path: str | None = None
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    preview: dict[str, Any] = field(default_factory=dict)
