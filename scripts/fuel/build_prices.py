"""
Builds src/data/fuel/prices.json from the Department of Mineral and Petroleum
Resources (DMPR) monthly fuel price schedules.

The schedules are the "Fuel Regulations" or "Fuel Price Schedule" spreadsheets
the DMPR publishes each month. They are kept in sources/releases/fuel/, which is
not committed: publishers' files are not redistributed.

Reference prices, as the DMPR uses them in its own history tables:
  inland  = zone 9C (Gauteng)
  coastal = zone 1A

Petrol prices are regulated retail (pump) prices. Diesel and illuminating
paraffin prices are wholesale list prices. All values are SA cents per litre,
exactly as printed.

This script makes no network request.

Months come from two lists beside this script:
  sources.json        one spreadsheet per month, with the document name and URL
  manual-months.json  months with no spreadsheet online, typed by hand from
                      the named DMPR documents. null where no held file gives a price.

Usage:
  python scripts/fuel/build_prices.py check <spreadsheet> [...]   print parsed values
  python scripts/fuel/build_prices.py build <checked-on YYYY-MM-DD>  write src/data/fuel/prices.json

To add a month: save the spreadsheet as sources/releases/fuel/regs-YYYY-MM.xlsx,
add its entry to sources.json, run build, check the diff, commit.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

import openpyxl

PRODUCTS = ("petrol93", "petrol95", "diesel500ppm", "diesel50ppm", "paraffin")
ZONES = {"1A": "coastal", "9C": "inland"}
MONTHS = {m: i for i, m in enumerate(
    ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST",
     "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"], start=1)}
EFFECTIVE = re.compile(r"EFFECTIVE\s+(\d{1,2})\s+([A-Z]+)\s+(\d{4})", re.I)

# Plausible range for any price in cents per litre. A value outside it means
# the wrong cell was read, not a real price.
MIN_CENTS, MAX_CENTS = 800, 6000


class ScheduleError(ValueError):
    pass


def _block_for(sheet: str, text: str) -> str | None:
    """Which product a header row starts, or None if the row is not a header."""
    t = text.upper()
    if sheet == "PETROL":
        if "93 RON" in t:
            return "petrol93"
        if "95 RON" in t and "LEAD REPLACEMENT" in t:
            return "skip"  # 95 LRP: same price as 95 unleaded, not published separately here
        if "95 RON" in t:
            return "petrol95"
    if sheet == "DIESEL":
        if "0.005%" in t:
            return "diesel50ppm"
        if "0.05%" in t:
            return "diesel500ppm"
    if sheet == "ILLUMINATING PARAFFIN" and "ILLUMINATING PARAFFIN" in t:
        return "paraffin"
    return None


def parse_schedule(path: Path) -> dict:
    """Reads one monthly schedule. Returns the effective date header and the ten reference prices."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    prices: dict[str, dict[str, float]] = {p: {} for p in PRODUCTS}
    headers: set[tuple[int, int, int]] = set()
    sheets = {ws.title.strip().upper(): ws for ws in wb.worksheets}
    for name in ("PETROL", "DIESEL", "ILLUMINATING PARAFFIN"):
        ws = sheets.get(name)
        if ws is None:
            raise ScheduleError(f"{path.name}: no sheet called {name.title()}")
        block: str | None = None
        first_row: tuple[list, set[int]] | None = None
        for row in ws.iter_rows(values_only=True):
            cells = list(row)
            texts = [str(c).strip() for c in cells if c not in (None, "")]
            if not texts:
                continue
            joined = " ".join(texts)
            m = EFFECTIVE.search(joined)
            if m:
                month = MONTHS.get(m.group(2).upper())
                if month is None:
                    raise ScheduleError(f"{path.name}: unreadable month in '{m.group(0)}'")
                headers.add((int(m.group(3)), month, int(m.group(1))))
            new_block = _block_for(name, joined)
            if new_block:
                block, first_row = new_block, None
                continue
            if block in (None, "skip"):
                continue
            zone = texts[0].upper()
            if zone not in ZONES:
                continue
            # The price is in the rightmost column that holds a number in both the 1A
            # and the 9C row. Some files carry stray working numbers to the right of
            # one row or the other (March 2025 beside 1A, January 2022 beside 9C).
            numeric = {i for i, c in enumerate(cells) if isinstance(c, (int, float))}
            if zone == "1A":
                first_row = (cells, numeric)
                continue
            if first_row is None:
                raise ScheduleError(f"{path.name}: {block} 9C row comes before its 1A row")
            a_cells, a_numeric = first_row
            shared = a_numeric & numeric
            if not shared:
                raise ScheduleError(f"{path.name}: {block} 1A and 9C rows share no number column")
            col = max(shared)
            prices[block]["coastal"] = round(float(a_cells[col]), 3)
            prices[block]["inland"] = round(float(cells[col]), 3)
            first_row = None
    for product in PRODUCTS:
        for zone in ("inland", "coastal"):
            if zone not in prices[product]:
                raise ScheduleError(f"{path.name}: no {zone} price for {product}")
    if not headers:
        raise ScheduleError(f"{path.name}: no 'EFFECTIVE <date>' line")
    if len(headers) > 1:
        raise ScheduleError(f"{path.name}: sheets disagree on the effective date: {sorted(headers)}")
    return {"header": headers.pop(), "prices": prices}


def check_prices(prices: dict, label: str) -> list[str]:
    """Problems with one month's prices. An empty list means the month passes."""
    problems = []
    for product, zones in prices.items():
        for zone, cents in zones.items():
            if cents is None:
                continue
            if not MIN_CENTS <= cents <= MAX_CENTS:
                problems.append(f"{label}: {product} {zone} {cents} is outside {MIN_CENTS} to {MAX_CENTS}")
        inland, coastal = zones.get("inland"), zones.get("coastal")
        if inland is not None and coastal is not None and not inland > coastal:
            problems.append(f"{label}: {product} inland {inland} is not above coastal {coastal}")
    for zone in ("inland", "coastal"):
        p93, p95 = prices["petrol93"].get(zone), prices["petrol95"].get(zone)
        if p93 is not None and p95 is not None and p95 < p93:
            problems.append(f"{label}: petrol 95 {zone} {p95} is below petrol 93 {p93}")
        for product in ("petrol93", "petrol95"):
            v = prices[product].get(zone)
            if v is not None and v != int(v):
                problems.append(f"{label}: petrol pump price {product} {zone} {v} is not whole cents")
    return problems


def effective_date(header: tuple[int, int, int], expected_month: str) -> tuple[str, str | None]:
    """The effective date, and a note when the file's own header has the wrong year."""
    y, m, d = header
    ey, em = (int(x) for x in expected_month.split("-"))
    if (y, m) == (ey, em):
        return date(y, m, d).isoformat(), None
    if m == em and y != ey:
        fixed = date(ey, m, d).isoformat()
        return fixed, f"The file's header says {date(y, m, d).isoformat()}. The year is a typo in the file: it was published for {expected_month}."
    raise ScheduleError(f"header date {date(y, m, d)} does not belong to {expected_month}")


ROOT = Path(__file__).resolve().parents[2]
RELEASES = ROOT / "sources" / "releases" / "fuel"
SOURCES = Path(__file__).with_name("sources.json")
MANUAL = Path(__file__).with_name("manual-months.json")
OUTPUT = ROOT / "src" / "data" / "fuel" / "prices.json"

META = {
    "description": "Official monthly fuel prices in South Africa, one record per monthly adjustment.",
    "publisher": "Department of Mineral and Petroleum Resources (DMPR)",
    "publisher_url": "https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices",
    "units": "South African cents per litre, exactly as printed by the DMPR",
    "zones": {
        "inland": "Zone 9C, Gauteng: the inland reference price the DMPR uses in its own history tables",
        "coastal": "Zone 1A, the coastal reference price",
    },
    "price_types": {
        "petrol93": "Regulated retail (pump) price, 93 unleaded",
        "petrol95": "Regulated retail (pump) price, 95 unleaded",
        "diesel500ppm": "Wholesale list price, diesel 0.05% sulphur (500 ppm)",
        "diesel50ppm": "Wholesale list price, diesel 0.005% sulphur (50 ppm)",
        "paraffin": "Wholesale list price, illuminating paraffin",
    },
    "terms": "DMPR material may be reproduced if it is accurate, not used for financial or commercial gain, not misleading, and credited to the DMPR with its website address (https://www.dmpr.gov.za/Terms-Conditions).",
    "built_by": "scripts/fuel/build_prices.py from the files in sources/releases/fuel/ (not committed)",
    "null_values": "null means no file SA Data Hub holds gives that price for that month",
}


def build(checked_on: str) -> int:
    sources = json.loads(SOURCES.read_text(encoding="utf-8"))
    manual = {m["month"]: m for m in json.loads(MANUAL.read_text(encoding="utf-8"))}
    records, problems = [], []
    for month, src in sources.items():
        path = RELEASES / src["file"]
        try:
            parsed = parse_schedule(path)
            effective, note = effective_date(parsed["header"], month)
        except (ScheduleError, FileNotFoundError) as e:
            problems.append(f"{month}: {e}")
            continue
        record = {"month": month, "effectiveFrom": effective,
                  **({"releasedOn": src["releasedOn"]} if "releasedOn" in src else {}),
                  "source": {"document": src["document"], "url": src["url"]},
                  "enteredFrom": "spreadsheet", "prices": parsed["prices"]}
        if note:
            record["note"] = note
        records.append(record)
    for month, m in manual.items():
        if any(r["month"] == month for r in records):
            problems.append(f"{month}: in both sources.json and manual-months.json")
            continue
        records.append({**m, "enteredFrom": "hand"})
    records.sort(key=lambda r: r["month"])
    for r in records:
        r["prices"] = {p: {z: r["prices"][p].get(z) for z in ("inland", "coastal")} for p in PRODUCTS}
        problems += check_prices(r["prices"], r["month"])
    months = [r["month"] for r in records]
    def index(month: str) -> int:
        y, m = map(int, month.split("-"))
        return y * 12 + m

    for a, b in zip(months, months[1:]):
        if index(b) != index(a) + 1:
            problems.append(f"gap or repeat between {a} and {b}")
    if problems:
        print("Not written. Problems:\n" + "\n".join(problems))
        return 1
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    out = {"_meta": {**META, "checked_on": checked_on}, "adjustments": records}
    OUTPUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} adjustments, {months[0]} to {months[-1]}, to {OUTPUT.relative_to(ROOT)}")
    return 0


def main(argv: list[str]) -> int:
    if len(argv) == 2 and argv[0] == "build":
        return build(argv[1])
    if len(argv) >= 2 and argv[0] == "check":
        status = 0
        for f in argv[1:]:
            try:
                r = parse_schedule(Path(f))
            except ScheduleError as e:
                print("ERROR", e)
                status = 1
                continue
            problems = check_prices(r["prices"], Path(f).name)
            print(Path(f).name, r["header"], json.dumps(r["prices"]))
            for p in problems:
                print("  PROBLEM", p)
                status = 1
        return status
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
