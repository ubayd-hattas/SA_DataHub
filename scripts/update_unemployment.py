"""
scripts/update_unemployment.py — fetch latest SA unemployment data

PRIMARY SOURCE (annual trend): World Bank Open Data API
  - SL.UEM.TOTL.ZS = Unemployment, total (% of total labour force, ILO estimate)
  - SL.UEM.1524.ZS = Youth unemployment (% ages 15-24)
  No API key required.

LIMITATION: World Bank publishes annual modelled estimates — not the
  quarterly QLFS figures. For precise quarterly figures, update manually from:
  https://www.statssa.gov.za/?page_id=1854&PPN=P0211
  (published Feb, May, Aug, Nov each year)

SAFETY (2026-10-19):
  This script is now DRY-RUN ONLY by default.  It will NOT write to
  src/data/datasets/unemployment.json unless --allow-overwrite is passed
  explicitly on the command line.  Verified quarterly QLFS data is in place;
  running the write path would replace it with annual World Bank modelled
  figures under the Stats SA source label.

HOW TO RUN:
    python scripts/update_unemployment.py              # report-only (safe)
    python scripts/update_unemployment.py --dry-run    # same
    python scripts/update_unemployment.py --allow-overwrite  # DANGER: writes files
"""

from __future__ import annotations

import argparse

from utils import fetch, load_dataset, save_dataset, report_changes, today_iso


WB_BASE = "https://api.worldbank.org/v2/country/ZA/indicator"
WB_UNEM_URL      = f"{WB_BASE}/SL.UEM.TOTL.ZS?format=json&per_page=15&mrv=15"
WB_YOUTH_URL     = f"{WB_BASE}/SL.UEM.1524.ZS?format=json&per_page=15&mrv=15"
WB_LFPR_URL      = f"{WB_BASE}/SL.TLF.CACT.ZS?format=json&per_page=15&mrv=15"


def _parse_wb(url: str, n: int = 10) -> list[dict]:
    resp   = fetch(url)
    raw    = resp.json()
    points = [
        {"label": str(e["date"]), "value": round(float(e["value"]), 1)}
        for e in raw[1]
        if e.get("value") is not None
    ]
    points.sort(key=lambda p: p["label"])
    return points[-n:]


def run(dry_run: bool = False, allow_overwrite: bool = False) -> None:
    # Safety guard — refuse to write unless explicitly overridden.
    if not allow_overwrite:
        dry_run = True
        print(
            "  [PROTECTED] update_unemployment is running in report-only mode.\n"
            "  It will NOT write to unemployment.json.\n"
            "  Pass --allow-overwrite to enable writes (DANGER: overwrites verified QLFS data).\n"
        )
    existing  = load_dataset("unemployment")
    old_stats = existing.get("statistics", [])

    print("  Fetching unemployment rate from World Bank…")
    unem_series = _parse_wb(WB_UNEM_URL, n=10)

    print("  Fetching youth unemployment from World Bank…")
    youth_series = _parse_wb(WB_YOUTH_URL, n=10)

    print("  Fetching labour force participation rate from World Bank…")
    lfpr_series = _parse_wb(WB_LFPR_URL, n=10)

    new_stats = []
    for stat in old_stats:
        s = dict(stat)

        if s["id"] == "unemployment-national" and unem_series:
            latest = unem_series[-1]
            prev   = unem_series[-2] if len(unem_series) > 1 else None
            change = round(latest["value"] - prev["value"], 1) if prev else 0.0
            s["rawValue"]    = latest["value"]
            s["value"]       = f"{latest['value']}%"
            s["change"]      = change
            s["changeLabel"] = f"from {prev['label']}" if prev else s["changeLabel"]
            s["trend"]       = "down" if change < 0 else ("up" if change > 0 else "stable")
            # Keep existing quarterly series — append annual WB as a note
            if not s.get("series"):
                s["series"] = [{"name": "Unemployment Rate", "unit": "%", "data": unem_series}]
            print(f"\n  ⚠  QUARTERLY UPDATE NEEDED for '{s['id']}':")
            print(f"     World Bank annual figure: {latest['value']}% ({latest['label']})")
            print(f"     For quarterly QLFS figures visit:")
            print(f"     https://www.statssa.gov.za/?page_id=1854&PPN=P0211")
            print(f"     Published in: February, May, August, November\n")

        elif s["id"] == "youth-unemployment" and youth_series:
            latest = youth_series[-1]
            prev   = youth_series[-2] if len(youth_series) > 1 else None
            change = round(latest["value"] - prev["value"], 1) if prev else 0.0
            s["rawValue"]    = latest["value"]
            s["value"]       = f"{latest['value']}%"
            s["change"]      = change
            s["changeLabel"] = f"from {prev['label']}" if prev else s["changeLabel"]
            s["trend"]       = "down" if change < 0 else ("up" if change > 0 else "stable")

        elif s["id"] == "labour-force-participation" and lfpr_series:
            latest = lfpr_series[-1]
            prev   = lfpr_series[-2] if len(lfpr_series) > 1 else None
            change = round(latest["value"] - prev["value"], 1) if prev else 0.0
            s["rawValue"]    = latest["value"]
            s["value"]       = f"{latest['value']}%"
            s["change"]      = change
            s["changeLabel"] = f"from {prev['label']}" if prev else s["changeLabel"]
            s["trend"]       = "up" if change > 0 else ("down" if change < 0 else "stable")

        new_stats.append(s)

    print("  Changes:")
    report_changes(old_stats, new_stats)

    updated = {
        **existing,
        "statistics": new_stats,
        "_meta": {
            **existing.get("_meta", {}),
            "last_verified": today_iso(),
            "auto_updated":  today_iso(),
        },
    }
    save_dataset("unemployment", updated, dry_run=dry_run)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--allow-overwrite",
        action="store_true",
        dest="allow_overwrite",
        help="DANGER: allow writes — will overwrite verified QLFS values with World Bank annual data",
    )
    args = parser.parse_args()
    run(dry_run=args.dry_run, allow_overwrite=args.allow_overwrite)
