"""
Works out the expected change in next month's official fuel prices, as a range
(docs/fuel.md, section 4).

  midpoint = -(CEF average over-recovery so far) + changes already announced
  range    = midpoint adjusted by the 10th to 90th percentile of past errors
             for the same number of working days into the month (backtest.py)

The CEF part covers the import cost only. Slate levy moves, which are not
announced in advance, are not in the range; the page states that.

It writes a JSON file. While CEF's reuse terms are unknown it must be written
to sources/releases/fuel/ (ignored by git), never into src/: a test fails if
src/data/fuel/estimate.json holds an estimate.

Usage:
  python scripts/fuel/estimate.py <out.json>
"""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cef_daily import PRODUCTS, SheetError, parse_pdf  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CEF_DIR = ROOT / "sources" / "releases" / "fuel" / "cef"
BACKTEST = ROOT / "sources" / "releases" / "fuel" / "backtest" / "backtest.json"
KNOWN = ROOT / "src" / "data" / "fuel" / "known-changes.json"
PRICES = ROOT / "src" / "data" / "fuel" / "prices.json"
CALENDAR_NEXT = ROOT / "src" / "data" / "release-calendar.ts"

MIN_WORKING_DAYS = 6
GROUPS = [(1, 5), (6, 10), (11, 15), (16, 99)]


def group_for(days: int) -> str:
    for lo, hi in GROUPS:
        if lo <= days <= hi:
            return f"{lo}-{hi}"
    raise ValueError(days)


def compute(sheets, known: dict, errors: dict, target_month: str) -> dict:
    """sheets: parsed sheets of the current window, oldest first. errors: backtest stats per product."""
    latest = sheets[-1]
    days = len(sheets)
    base = {"asOf": latest.day.isoformat(), "workingDays": days, "targetMonth": target_month}
    if days < MIN_WORKING_DAYS:
        return {"status": "too-early", **base}
    key = group_for(days)
    products = {}
    for prod in PRODUCTS:
        stats = errors[prod]["groups"][key]
        if stats.get("n", 0) < 12:
            continue  # too few past months to set a range for this product and stage
        known_cents = sum(c["cents"].get(prod, 0) for c in known.get(target_month, []))
        mid = round(-latest.average_recovery[prod] + known_cents, 1)
        # Error = estimate - outcome, so the outcome lies between estimate - p90 and estimate - p10.
        products[prod] = {
            "low": round(mid - stats["import_p90"], 0),
            "mid": round(mid, 0),
            "high": round(mid - stats["import_p10"], 0),
            "knownCents": known_cents,
            "pastMonths": stats["n"],
        }
    return {"status": "ok", **base, "group": key, "products": products, "knownChanges": known.get(target_month, [])}


def window_sheets():
    sheets = []
    for f in sorted(CEF_DIR.glob("cef-*.pdf")):
        try:
            s = parse_pdf(f)
        except SheetError:
            continue
        if not s.problems:
            sheets.append(s)
    if not sheets:
        raise SystemExit("No usable CEF sheets in sources/releases/fuel/cef/. Run scripts/fuel/fetch_cef.py first.")
    latest = max(sheets, key=lambda s: s.day)
    return sorted([s for s in sheets if s.price_from == latest.price_from], key=lambda s: s.day)


def next_month(prices: list) -> str:
    y, m = map(int, prices[-1]["month"].split("-"))
    return f"{y + (m == 12)}-{m % 12 + 1:02d}"


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__)
        return 2
    out = Path(argv[0]).resolve()
    if (ROOT / "src") in out.parents:
        raise SystemExit("Refusing to write the estimate into src/: CEF has not agreed to its figures being published.")
    prices = json.loads(PRICES.read_text(encoding="utf-8"))["adjustments"]
    known = {}
    for c in json.loads(KNOWN.read_text(encoding="utf-8"))["changes"]:
        known.setdefault(c["month"], []).append(c)
    errors = json.loads(BACKTEST.read_text(encoding="utf-8"))["stats"]
    result = compute(window_sheets(), known, errors, next_month(prices))
    result["generatedOn"] = date.today().isoformat()
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
