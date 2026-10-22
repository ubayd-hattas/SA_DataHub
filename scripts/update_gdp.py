"""
scripts/update_gdp.py — fetch latest SA GDP data

PRIMARY SOURCE: World Bank Open Data API
  - NY.GDP.MKTP.CD = GDP (current USD)
  - NY.GDP.MKTP.KD.ZG = GDP growth (annual %)
  - NY.GDP.PCAP.CD = GDP per capita (current USD)
  No API key required.

NOTE on ZAR values:
  World Bank publishes in USD. We convert to ZAR using SARB average annual
  exchange rate. For accuracy, the ZAR conversion should be manually verified
  against Stats SA's own GDP release in ZAR:
  https://www.statssa.gov.za/?page_id=1854&PPN=P0441

SAFETY (2026-10-19):
  This script is now DRY-RUN ONLY by default.  It will NOT write to
  src/data/datasets/gdp.json unless --allow-overwrite is passed.
  Verified quarterly Stats SA data (Q2 2026 = -0.2%) is in place.
  Additionally, Stats SA is rebasing national accounts to 2022 (expected
  Oct 2026) — all GDP history will change; do not overwrite until then.

HOW TO RUN:
    python scripts/update_gdp.py             # report-only (safe)
    python scripts/update_gdp.py --dry-run   # same
    python scripts/update_gdp.py --allow-overwrite  # DANGER: writes files
"""

from __future__ import annotations

import argparse

from utils import fetch, load_dataset, save_dataset, report_changes, today_iso


# World Bank API — SA GDP indicators
WB_BASE = "https://api.worldbank.org/v2/country/ZA/indicator"
WB_GROWTH_URL   = f"{WB_BASE}/NY.GDP.MKTP.KD.ZG?format=json&per_page=20&mrv=20"
WB_NOMINAL_URL  = f"{WB_BASE}/NY.GDP.MKTP.CN?format=json&per_page=10&mrv=10"  # local currency units
WB_PERCAP_URL   = f"{WB_BASE}/NY.GDP.PCAP.CN?format=json&per_page=10&mrv=10"  # local currency


def _parse_wb(url: str, n: int = 10) -> list[dict]:
    """Fetch a World Bank indicator and return [{label, value}] sorted chronologically."""
    resp = fetch(url)
    raw  = resp.json()
    if not raw or len(raw) < 2 or not raw[1]:
        raise RuntimeError(f"Unexpected World Bank response: {url}")
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
            "  [PROTECTED] update_gdp is running in report-only mode.\n"
            "  It will NOT write to gdp.json.\n"
            "  Pass --allow-overwrite to enable writes (DANGER: overwrites verified Stats SA quarterly data).\n"
        )
    existing  = load_dataset("gdp")
    old_stats = existing.get("statistics", [])

    print("  Fetching GDP growth from World Bank…")
    growth_series = _parse_wb(WB_GROWTH_URL, n=12)

    print("  Fetching nominal GDP (ZAR) from World Bank…")
    nominal_series_raw = _parse_wb(WB_NOMINAL_URL, n=8)
    # Convert from ZAR units to ZAR billion for display
    nominal_series = [
        {"label": p["label"], "value": round(p["value"] / 1e9, 0)}
        for p in nominal_series_raw
    ]

    print("  Fetching GDP per capita (ZAR) from World Bank…")
    percap_series = _parse_wb(WB_PERCAP_URL, n=8)

    new_stats = []
    for stat in old_stats:
        s = dict(stat)

        if s["id"] == "gdp-growth" and growth_series:
            latest = growth_series[-1]
            prev   = growth_series[-2] if len(growth_series) > 1 else None
            change = round(latest["value"] - prev["value"], 1) if prev else 0.0
            s["rawValue"]    = latest["value"]
            s["value"]       = f"{latest['value']}%"
            s["change"]      = change
            s["changeLabel"] = f"from {prev['label']}" if prev else s["changeLabel"]
            s["trend"]       = "up" if change > 0 else ("down" if change < 0 else "stable")
            s["series"]      = [{"name": "GDP Growth (%)", "unit": "%", "data": growth_series}]

        elif s["id"] == "gdp-nominal" and nominal_series:
            latest = nominal_series[-1]
            prev   = nominal_series[-2] if len(nominal_series) > 1 else None
            pct    = round((latest["value"] - prev["value"]) / prev["value"] * 100, 1) if prev else 0.0
            # Format: R7.28T or R850B
            val_b  = latest["value"]
            fmt    = f"R{val_b/1000:.2f}T" if val_b >= 1000 else f"R{val_b:.0f}B"
            s["rawValue"]    = latest["value"]
            s["value"]       = fmt
            s["change"]      = pct
            s["changeLabel"] = f"from {prev['label']}" if prev else s["changeLabel"]
            s["trend"]       = "up" if pct > 0 else ("down" if pct < 0 else "stable")
            s["series"]      = [{"name": "Nominal GDP (ZAR billion)", "unit": "ZAR billion", "data": nominal_series}]

        elif s["id"] == "gdp-per-capita" and percap_series:
            latest = percap_series[-1]
            prev   = percap_series[-2] if len(percap_series) > 1 else None
            pct    = round((latest["value"] - prev["value"]) / prev["value"] * 100, 1) if prev else 0.0
            s["rawValue"]    = latest["value"]
            s["value"]       = f"R{latest['value']:,.0f}"
            s["change"]      = pct
            s["changeLabel"] = f"from {prev['label']}" if prev else s["changeLabel"]
            s["trend"]       = "up" if pct > 0 else ("down" if pct < 0 else "stable")
            s["series"]      = [{"name": "GDP Per Capita (ZAR)", "unit": "ZAR", "data": percap_series}]

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
    save_dataset("gdp", updated, dry_run=dry_run)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--allow-overwrite",
        action="store_true",
        dest="allow_overwrite",
        help="DANGER: allow writes — will overwrite verified Stats SA quarterly GDP with World Bank annual data",
    )
    args = parser.parse_args()
    run(dry_run=args.dry_run, allow_overwrite=args.allow_overwrite)
