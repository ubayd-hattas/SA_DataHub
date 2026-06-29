"""Transform JSON statistics into PostgreSQL load contracts."""

from __future__ import annotations

from datetime import date
from typing import Any

from etl.lib.periods import period_label_to_date
from etl.lib.types import LoadObservation, StatisticSnapshot


def transform_time_series_dataset(
    data: dict[str, Any],
    *,
    default_geography_code: str = "ZA",
) -> tuple[list[LoadObservation], list[StatisticSnapshot]]:
    observations: list[LoadObservation] = []
    snapshots: list[StatisticSnapshot] = []

    for stat in data.get("statistics", []):
        stat_id = stat["id"]
        snapshots.append(_transform_snapshot(stat))

        for series in stat.get("series", []):
            for point in series.get("data", []):
                label = point["label"]
                observations.append(
                    LoadObservation(
                        stat_id=stat_id,
                        geography_code=default_geography_code,
                        period_label=label,
                        period_start=period_label_to_date(label),
                        value=float(point["value"]),
                    )
                )

    return observations, snapshots


def _transform_snapshot(stat: dict[str, Any]) -> StatisticSnapshot:
    last_updated = date.fromisoformat(stat["lastUpdated"])
    trend = stat["trend"]
    if trend not in ("up", "down", "stable"):
        raise ValueError(f"Invalid trend for {stat['id']}: {trend}")

    return StatisticSnapshot(
        stat_id=stat["id"],
        display_value=stat["value"],
        raw_value=float(stat["rawValue"]),
        change=float(stat["change"]) if stat.get("change") is not None else None,
        change_label=stat.get("changeLabel"),
        trend=trend,
        last_updated=last_updated,
    )
