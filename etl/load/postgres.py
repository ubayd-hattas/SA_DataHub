"""Load observations and derived tables into PostgreSQL."""

from __future__ import annotations

from datetime import date
from typing import Any

import psycopg

from etl.lib.db import get_connection
from etl.lib.types import LoadObservation, StatisticSnapshot


def _resolve_dataset_ids(
    cur: psycopg.Cursor, stat_ids: set[str]
) -> dict[str, int]:
    cur.execute(
        "SELECT stat_id, dataset_id FROM datasets WHERE stat_id = ANY(%s)",
        (list(stat_ids),),
    )
    rows = {row[0]: row[1] for row in cur.fetchall()}
    missing = stat_ids - set(rows)
    if missing:
        raise RuntimeError(
            f"Dataset rows missing in PostgreSQL (run db migrations/seed first): {sorted(missing)}"
        )
    return rows


def _resolve_geography_ids(
    cur: psycopg.Cursor, codes: set[str]
) -> dict[str, int]:
    cur.execute(
        "SELECT code, geography_id FROM geographies WHERE code = ANY(%s)",
        (list(codes),),
    )
    rows = {row[0]: row[1] for row in cur.fetchall()}
    missing = codes - set(rows)
    if missing:
        raise RuntimeError(f"Geography rows missing: {sorted(missing)}")
    return rows


def _fetch_existing_observations(
    cur: psycopg.Cursor, dataset_ids: list[int]
) -> dict[tuple[int, int, date], dict[str, Any]]:
    cur.execute(
        """
        SELECT dataset_id, geography_id, period_start, value, period_label
        FROM observations
        WHERE dataset_id = ANY(%s)
        """,
        (dataset_ids,),
    )
    existing: dict[tuple[int, int, date], dict[str, Any]] = {}
    for row in cur.fetchall():
        key = (row[0], row[1], row[2])
        existing[key] = {"value": float(row[3]), "period_label": row[4]}
    return existing


def load_observations(
    observations: list[LoadObservation],
    *,
    version_id: int,
) -> tuple[int, int, int]:
    """Upsert observations. Returns (inserted, updated, skipped)."""
    if not observations:
        return 0, 0, 0

    stat_ids = {o.stat_id for o in observations}
    geo_codes = {o.geography_code for o in observations}

    inserted = updated = skipped = 0

    with get_connection() as conn:
        with conn.cursor() as cur:
            dataset_map = _resolve_dataset_ids(cur, stat_ids)
            geo_map = _resolve_geography_ids(cur, geo_codes)
            existing = _fetch_existing_observations(cur, list(dataset_map.values()))

            for obs in observations:
                dataset_id = dataset_map[obs.stat_id]
                geography_id = geo_map[obs.geography_code]
                key = (dataset_id, geography_id, obs.period_start)

                prior = existing.get(key)
                if prior is not None:
                    if (
                        abs(prior["value"] - obs.value) < 1e-9
                        and prior["period_label"] == obs.period_label
                    ):
                        skipped += 1
                        continue
                    updated += 1
                else:
                    inserted += 1

                cur.execute(
                    """
                    INSERT INTO observations (
                        dataset_id, geography_id, period_start, period_label,
                        value, version_id
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (dataset_id, geography_id, period_start)
                    DO UPDATE SET
                        value = EXCLUDED.value,
                        period_label = EXCLUDED.period_label,
                        version_id = EXCLUDED.version_id
                    """,
                    (
                        dataset_id,
                        geography_id,
                        obs.period_start,
                        obs.period_label,
                        obs.value,
                        version_id,
                    ),
                )

        conn.commit()

    return inserted, updated, skipped


def load_statistic_snapshots(snapshots: list[StatisticSnapshot]) -> int:
    """Upsert headline snapshots. Returns rows written."""
    if not snapshots:
        return 0

    with get_connection() as conn:
        with conn.cursor() as cur:
            for snap in snapshots:
                cur.execute(
                    """
                    INSERT INTO statistic_snapshots (
                        stat_id, display_value, raw_value, change,
                        change_label, trend, last_updated
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (stat_id) DO UPDATE SET
                        display_value = EXCLUDED.display_value,
                        raw_value = EXCLUDED.raw_value,
                        change = EXCLUDED.change,
                        change_label = EXCLUDED.change_label,
                        trend = EXCLUDED.trend,
                        last_updated = EXCLUDED.last_updated,
                        computed_at = now()
                    """,
                    (
                        snap.stat_id,
                        snap.display_value,
                        snap.raw_value,
                        snap.change,
                        snap.change_label,
                        snap.trend,
                        snap.last_updated,
                    ),
                )
        conn.commit()

    return len(snapshots)


def create_dataset_version(
    *,
    dataset_slug: str,
    source_snapshot_path: str,
    row_count: int,
    status: str,
    duration_ms: int,
    notes: str | None = None,
) -> int:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO dataset_versions (
                    dataset_id, slug, source_snapshot_path,
                    row_count, status, duration_ms, notes
                )
                VALUES (
                    (SELECT dataset_id FROM datasets WHERE slug = %s LIMIT 1),
                    %s, %s, %s, %s, %s, %s
                )
                RETURNING version_id
                """,
                (
                    dataset_slug,
                    dataset_slug,
                    source_snapshot_path,
                    row_count,
                    status,
                    duration_ms,
                    notes,
                ),
            )
            version_id = cur.fetchone()[0]
        conn.commit()
    return version_id


def record_update_event(
    *,
    dataset_slug: str,
    event_date: date,
    summary: str,
    source_url: str | None = None,
) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO update_events (dataset_slug, event_date, event_type, summary, source_url)
                VALUES (%s, %s, 'data-update', %s, %s)
                """,
                (dataset_slug, event_date, summary, source_url),
            )
        conn.commit()
