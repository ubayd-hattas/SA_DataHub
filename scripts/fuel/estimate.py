"""
Works out the expected change in next month's official fuel prices, as a range
(docs/fuel.md, section 4).

  midpoint = -(CEF average over-recovery so far in the averaging period)
             + changes an official document has already announced
  range    = the midpoint, less the 90th and 10th percentile of past errors at
             the same number of working days into the period (backtest.py
             defines error as estimate minus outcome)

The CEF part covers the import cost only. Slate levy moves are not announced
ahead and are not in the range; the page says so.

It writes a JSON file only under sources/releases/fuel/ (ignored by git) and
prints only where it wrote it: CEF has not agreed to reuse of its figures, and
the repository is public. A test fails if src/data/fuel/estimate.json holds an
estimate.

Usage:
  python scripts/fuel/estimate.py sources/releases/fuel/estimate.json
"""
from __future__ import annotations

import json
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from backtest import group_key, load_sheets, periods, private_path  # noqa: E402
from cef_daily import PRODUCTS  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CEF_DIR = ROOT / "sources" / "releases" / "fuel" / "cef"
BACKTEST = ROOT / "sources" / "releases" / "fuel" / "backtest" / "backtest.json"
KNOWN = ROOT / "src" / "data" / "fuel" / "known-changes.json"
PRICES = ROOT / "src" / "data" / "fuel" / "prices.json"

MIN_WORKING_DAYS = 6
MIN_PAST_MONTHS = 12
# A period starts a few working days before the price it follows took effect.
PERIOD_LEAD = timedelta(days=12)


def next_month(month: str) -> str:
    y, m = map(int, month.split("-"))
    return f"{y + (m == 12)}-{m % 12 + 1:02d}"


def compute(window, known: dict, errors: dict, target_month: str) -> dict:
    """window: the sheets of the current averaging period, oldest first."""
    latest = window[-1]
    days = len(window)
    base = {"asOf": latest.day.isoformat(), "workingDays": days, "targetMonth": target_month}
    if days < MIN_WORKING_DAYS:
        return {"status": "too-early", **base}
    key = group_key(days)
    products = {}
    for prod in PRODUCTS:
        stats = errors[prod]["groups"][key]
        if (stats.get("n") or 0) < MIN_PAST_MONTHS:
            continue  # too few past periods to set a range for this product and stage
        known_cents = sum(c["cents"].get(prod, 0) for c in known.get(target_month, []))
        mid = round(-latest.average_recovery[prod] + known_cents, 1)
        products[prod] = {
            "low": round(mid - stats["import_p90"], 0),
            "mid": round(mid, 0),
            "high": round(mid - stats["import_p10"], 0),
            "knownCents": known_cents,
            "pastMonths": stats["n"],
        }
    if not products:
        return {"status": "too-early", **base}
    return {"status": "ok", **base, "group": key, "products": products}


def current_window(sheets, latest_effective: date):
    """The newest averaging period, checked to belong to the adjustment after the latest one held."""
    start, window = list(periods(sheets).items())[-1]
    if not (start <= latest_effective + timedelta(days=1) and latest_effective - start <= PERIOD_LEAD):
        raise SystemExit(
            f"The newest CEF period starts {start}, which does not lead into the next adjustment after "
            f"{latest_effective}. Enter the latest official prices in prices.json first."
        )
    return window


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__)
        return 2
    out = private_path(argv[0])
    prices = json.loads(PRICES.read_text(encoding="utf-8"))["adjustments"]
    known = {}
    for c in json.loads(KNOWN.read_text(encoding="utf-8"))["changes"]:
        known.setdefault(c["month"], []).append(c)
    errors = json.loads(BACKTEST.read_text(encoding="utf-8"))["stats"]
    sheets, rejected = load_sheets(str(CEF_DIR))
    if not sheets:
        raise SystemExit("No usable CEF sheets. Run scripts/fuel/fetch_cef.py first.")
    window = current_window(sheets, date.fromisoformat(prices[-1]["effectiveFrom"]))
    result = compute(window, known, errors, next_month(prices[-1]["month"]))
    result["generatedOn"] = date.today().isoformat()
    result["rejectedSheets"] = len(rejected)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out} (status {result['status']}, {len(rejected)} sheet(s) rejected).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
