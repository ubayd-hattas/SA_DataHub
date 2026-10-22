"""
scripts/update_inflation.py — fetch latest SA CPI data

PRIMARY SOURCE: World Bank Open Data API
  - Indicator FP.CPI.TOTL.ZG  = Inflation, consumer prices (annual %)
  - No API key required, JSON format, reliable and stable

LIMITATION: World Bank publishes annual averages, not monthly.
  For monthly CPI you need to manually pull from Stats SA publications.
  This script fetches annual CPI trend data and updates the series.
  The headline monthly figure must be updated manually from:
  https://www.statssa.gov.za/?page_id=1854&PPN=P0141

SAFETY (2026-10-19):
  This script is now DRY-RUN ONLY by default.  It will NOT write to
  src/data/datasets/inflation.json unless --allow-overwrite is passed.
  Verified monthly CPI data (to Sep 2026) is in place; running the write
  path would replace the monthly series with annual World Bank averages.

HOW TO RUN:
    python scripts/update_inflation.py             # report-only (safe)
    python scripts/update_inflation.py --dry-run   # same
    python scripts/update_inflation.py --allow-overwrite  # DANGER: writes files
"""

from __future__ import annotations

import argparse
from datetime import datetime

from utils import fetch, load_dataset, save_dataset, report_changes, today_iso


WORLD_BANK_CPI_URL = (
    "https://api.worldbank.org/v2/country/ZA/indicator/FP.CPI.TOTL.ZG"
    "?format=json&per_page=20&mrv=20"
)

WORLD_BANK_INTEREST_URL = (
    "https://api.worldbank.org/v2/country/ZA/indicator/FR.INR.LEND"
    "?format=json&per_page=10&mrv=10"
)


def fetch_annual_cpi() -> list[dict]:
    """Fetch annual CPI % from World Bank. Returns list of {label, value}."""
    print("  Fetching annual CPI from World Bank…")
    resp = fetch(WORLD_BANK_CPI_URL)
    data = resp.json()

    if not data or len(data) < 2 or not data[1]:
        raise RuntimeError("Unexpected World Bank response format")

    points = []
    for entry in data[1]:
        if entry.get("value") is not None:
            points.append({
                "label": str(entry["date"]),
                "value": round(float(entry["value"]), 1),
            })

    # World Bank returns newest first — reverse to chronological
    points.sort(key=lambda p: p["label"])
    # Keep last 10 years
    return points[-10:]


def build_updated_inflation(existing: dict, dry_run: bool) -> dict:
    annual_cpi = fetch_annual_cpi()
    print(f"  Fetched {len(annual_cpi)} annual CPI data points")

    old_stats = existing.get("statistics", [])
    new_stats  = []

    for stat in old_stats:
        s = dict(stat)

        if s["id"] == "cpi-headline":
            # Update the annual trend series from World Bank
            # The headline VALUE (monthly) must be updated manually — we flag this.
            if annual_cpi:
                latest = annual_cpi[-1]
                prev   = annual_cpi[-2] if len(annual_cpi) > 1 else None

                # Update the series to annual World Bank data
                s["series"] = [{
                    "name": "Annual CPI (%)",
                    "unit": "%",
                    "data": annual_cpi,
                }]

                print(f"\n  ⚠  MANUAL STEP REQUIRED for '{s['id']}':")
                print(f"     World Bank latest annual CPI: {latest['value']}% ({latest['label']})")
                print(f"     For the current monthly figure, check:")
                print(f"     https://www.statssa.gov.za/?page_id=1854&PPN=P0141")
                print(f"     Update 'value', 'rawValue', 'change', 'changeLabel', and 'lastUpdated'")
                print(f"     in src/data/datasets/inflation.json manually.\n")

        new_stats.append(s)

    new_data = dict(existing)
    new_data["statistics"] = new_stats
    new_data["_meta"] = {
        **existing.get("_meta", {}),
        "last_verified": today_iso(),
        "auto_updated": today_iso(),
    }

    print("  Changes detected:")
    report_changes(old_stats, new_stats)
    return new_data


def run(dry_run: bool = False, allow_overwrite: bool = False) -> None:
    # Safety guard — refuse to write unless explicitly overridden.
    if not allow_overwrite:
        dry_run = True
        print(
            "  [PROTECTED] update_inflation is running in report-only mode.\n"
            "  It will NOT write to inflation.json.\n"
            "  Pass --allow-overwrite to enable writes (DANGER: replaces monthly CPI with annual WB averages).\n"
        )
    existing = load_dataset("inflation")
    updated  = build_updated_inflation(existing, dry_run)
    save_dataset("inflation", updated, dry_run=dry_run)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--allow-overwrite",
        action="store_true",
        dest="allow_overwrite",
        help="DANGER: allow writes — will replace monthly CPI series with World Bank annual averages",
    )
    args = parser.parse_args()
    run(dry_run=args.dry_run, allow_overwrite=args.allow_overwrite)
