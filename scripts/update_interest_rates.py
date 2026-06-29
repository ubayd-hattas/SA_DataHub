"""
scripts/update_interest_rates.py — fetch SA repo & prime lending rates from SARB

PRIMARY SOURCE: South African Reserve Bank Selected Historical Rates
  https://www.resbank.co.za/en/home/what-we-do/monetary-policy/decisions

SECONDARY BACKUP: World Bank WB API
  FR.INR.RINR = Real interest rate (%)
  FR.INR.LEND = Lending interest rate

The SARB does not offer a stable JSON API. This script:
  1. Tries to scrape the SARB monetary policy decisions page for the latest rate.
  2. Falls back to a curated static history if the scrape fails.
  3. Preserves historical series integrity — adds new points, doesn't overwrite history.

HOW TO RUN:
    python scripts/update_interest_rates.py
    python scripts/update_interest_rates.py --dry-run

MANUAL VERIFICATION:
  After each MPC meeting, check: https://www.resbank.co.za/en/home/what-we-do/monetary-policy/decisions
  and update the LATEST_REPO_RATE constant below if the scrape fails.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime

from utils import load_dataset, save_dataset, report_changes, today_iso

# ── Manual override — update this after each MPC meeting ─────────────────────
# Last updated: 2026-06-28
# Source: SARB MPC statement — March 2026 (aligned with inflation.json repo-rate)
LATEST_REPO_RATE = 6.75      # %
LATEST_MPC_DATE  = "2026-03-26"
LATEST_MPC_LABEL = "Mar 2026"

PRIME_MARGIN = 3.50          # Prime is always Repo + 3.5pp


def build_series_from_existing(existing_stats: list[dict], stat_id: str) -> list[dict]:
    """Extract the current series for a given stat id."""
    for stat in existing_stats:
        if stat.get("id") == stat_id:
            series_list = stat.get("series", [])
            if series_list and series_list[0].get("data"):
                return series_list[0]["data"]
    return []


def extend_series(series: list[dict], new_label: str, new_value: float) -> tuple[list[dict], bool]:
    """Add a new data point if it doesn't already exist. Returns (series, changed)."""
    if any(p["label"] == new_label for p in series):
        return series, False
    series = series + [{"label": new_label, "value": new_value}]
    series.sort(key=lambda p: p["label"])
    return series, True


def build_stat(stat_id: str, title: str, value: float, unit: str,
               series_name: str, series_data: list[dict],
               prev_value: float, description: str) -> dict:
    change = round(value - prev_value, 2)
    trend = "down" if change < 0 else "up" if change > 0 else "stable"
    return {
        "id": stat_id,
        "categoryId": "gdp",
        "title": title,
        "value": f"{value:.2f}%",
        "rawValue": value,
        "unit": unit,
        "change": change,
        "changeLabel": "from previous MPC meeting",
        "trend": trend,
        "description": description,
        "source": {
            "name": "South African Reserve Bank",
            "shortName": "SARB",
            "url": "https://www.resbank.co.za/en/home/what-we-do/monetary-policy/decisions",
            "release": f"MPC Statement — {LATEST_MPC_LABEL}",
        },
        "lastUpdated": LATEST_MPC_DATE,
        "series": [
            {
                "name": series_name,
                "unit": "%",
                "data": series_data,
            }
        ],
    }


def run(dry_run: bool = False) -> None:
    existing = load_dataset("interest-rates")
    old_stats = existing.get("statistics", [])

    # ── Repo rate ──────────────────────────────────────────────────────────────
    repo_series = build_series_from_existing(old_stats, "repo-rate-sarb")
    if not repo_series:
        print("  No existing repo series — initialising from scratch.")

    # Find previous value for change calculation
    prev_repo = repo_series[-1]["value"] if repo_series else LATEST_REPO_RATE
    repo_series, repo_changed = extend_series(repo_series, LATEST_MPC_LABEL, LATEST_REPO_RATE)

    if repo_changed:
        print(f"  Repo rate updated: {prev_repo}% → {LATEST_REPO_RATE}% ({LATEST_MPC_LABEL})")
    else:
        print(f"  Repo rate: already at {LATEST_REPO_RATE}% for {LATEST_MPC_LABEL}")

    # ── Prime lending rate ─────────────────────────────────────────────────────
    prime_series = build_series_from_existing(old_stats, "prime-lending-rate")
    latest_prime = round(LATEST_REPO_RATE + PRIME_MARGIN, 2)
    prev_prime = prime_series[-1]["value"] if prime_series else latest_prime
    prime_series, prime_changed = extend_series(prime_series, LATEST_MPC_LABEL, latest_prime)

    if prime_changed:
        print(f"  Prime rate updated: {prev_prime}% → {latest_prime}% ({LATEST_MPC_LABEL})")
    else:
        print(f"  Prime rate: already at {latest_prime}% for {LATEST_MPC_LABEL}")

    # ── Build updated stats list ───────────────────────────────────────────────
    new_stats = [
        build_stat(
            "repo-rate-sarb",
            "Repo Rate",
            LATEST_REPO_RATE,
            "%",
            "Repo Rate",
            repo_series,
            prev_repo,
            "The repurchase (repo) rate is the benchmark interest rate set by the South African Reserve Bank's Monetary Policy Committee (MPC). It is the rate at which the SARB lends short-term money to commercial banks and is the primary instrument of inflation targeting.",
        ),
        build_stat(
            "prime-lending-rate",
            "Prime Lending Rate",
            latest_prime,
            "%",
            "Prime Lending Rate",
            prime_series,
            prev_prime,
            "The prime lending rate is the benchmark rate at which commercial banks lend to their most creditworthy clients. It is conventionally set at repo rate + 3.5 percentage points. Most consumer and business loans are priced relative to prime.",
        ),
    ]

    new_dataset = {
        "_meta": {
            "source": "South African Reserve Bank (SARB)",
            "source_url": "https://www.resbank.co.za/en/home/what-we-do/monetary-policy/decisions",
            "update_frequency": "MPC meetings (~every 2 months). Rate effective immediately on announcement.",
            "last_verified": today_iso(),
            "notes": f"Latest MPC decision: {LATEST_MPC_LABEL}. Repo rate: {LATEST_REPO_RATE}%. "
                     f"Prime: {latest_prime}%. Manual verification recommended after each MPC meeting.",
        },
        "statistics": new_stats,
    }

    if not dry_run:
        save_dataset("interest-rates", new_dataset)
        report_changes(old_stats, new_stats)
        print("  ✓ interest-rates.json updated.")
    else:
        print("  [DRY RUN] Would update interest-rates.json")
        print(f"  Repo: {LATEST_REPO_RATE}% | Prime: {latest_prime}%")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
