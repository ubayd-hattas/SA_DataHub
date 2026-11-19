"""
Builds src/data/fuel/breakdown.json: what each litre is made of, from the
DMPR's "Petrol Margins" and "Diesel Margins" tables (.docx, in the monthly
fuel price pack). Each table lists every element of the inland (Gauteng)
price for every month of the year so far.

Covered: petrol 95, diesel 0.05% and diesel 0.005%, inland only. The DMPR
tables give no breakdown for petrol 93, illuminating paraffin or the coast.

Every month's elements must add up to the price in src/data/fuel/prices.json,
or nothing is written: within half a cent for petrol (pump prices are rounded
to whole cents) and within 0.005 cents for diesel (wholesale prices are not).
The tables cover one calendar year, so a January pack starts a new year: pass
that year's files and keep the earlier year's breakdown by hand until the
script is extended. A month and product that fails for a known reason is
listed in breakdown-exclusions.json and left out, with the reason recorded.
No network requests.

Usage:
  python scripts/fuel/build_breakdown.py <petrol-margins.docx> <diesel-margins.docx> <document name> <url> <released YYYY-MM-DD> <checked YYYY-MM-DD>
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
PRICES = ROOT / "src" / "data" / "fuel" / "prices.json"
OUTPUT = ROOT / "src" / "data" / "fuel" / "breakdown.json"
EXCLUSIONS = Path(__file__).with_name("breakdown-exclusions.json")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

# Column heading in the DMPR table -> (id, plain label, group)
ELEMENTS = [
    (r"^BFP$", "basicFuelPrice", "Basic fuel price (the import cost)", "import"),
    (r"^FUEL ?TAX$", "fuelLevy", "General fuel levy (fuel tax)", "taxes"),
    (r"^CUSTOMS", "customsExcise", "Customs and excise duty", "taxes"),
    (r"^EQUALI[SZ]ATION", "equalisationFund", "Equalisation fund levy", "taxes"),
    (r"TRACER DYE", "tracerDye", "Tracer dye levy", "taxes"),
    (r"PIPELINE|PETROLEUM PRODUCTS", "pipelinesLevy", "Petroleum pipelines levy", "taxes"),
    (r"^ROAD ACCIDENT", "rafLevy", "Road Accident Fund levy", "taxes"),
    (r"^SLATE", "slateLevy", "Slate levy (pays back months when the price was set too low)", "taxes"),
    (r"^TRANSPORT", "transport", "Transport to Gauteng", "transport"),
    (r"^DELIVERY", "delivery", "Delivery cost", "transport"),
    (r"^WHOLESALE", "wholesaleMargin", "Wholesale margin", "margins"),
    (r"^SECONDARY STORAGE", "secondaryStorage", "Secondary storage", "margins"),
    (r"^SECONDARY DISTRIBUTION", "secondaryDistribution", "Secondary distribution", "margins"),
    (r"^RETAIL", "retailMargin", "Retail margin (filling station)", "margins"),
]


class BreakdownError(ValueError):
    pass


def _text(el) -> str:
    return "".join(t.text or "" for t in el.iter(W + "t")).strip()


def _clean(heading: str) -> str:
    """Join hyphenated line breaks ("Whole-sale", "Deliv-ery") and drop stray characters."""
    h = re.sub(r"[^\x20-\x7e]", " ", heading)
    h = re.sub(r"(\w)-(\w)", r"\1\2", h)
    h = h.replace("&", " ")
    return re.sub(r"\s+", " ", h).strip().upper()


def _element_for(heading: str):
    h = _clean(heading)
    for pattern, ident, label, group in ELEMENTS:
        if re.search(pattern, h):
            return ident, label, group
    return None


TOLERANCE = {"petrol95": 0.5, "diesel500ppm": 0.005, "diesel50ppm": 0.005}


def _number(cell: str) -> float:
    """A cell must be one number. A space (or non-breaking space) may only separate thousands: "11 056.14"."""
    c = cell.replace("\u00a0", " ").replace("\u2212", "-").strip()
    if not re.fullmatch(r"-?(\d{1,3}( \d{3})+|\d+)(\.\d+)?", c):
        raise BreakdownError(f"not a plain number: '{cell}'")
    return float(c.replace(" ", ""))


def parse_tables(path: Path) -> list[dict]:
    """Every margins table in the document: its product, year and monthly elements."""
    root = ET.fromstring(zipfile.ZipFile(path).read("word/document.xml"))
    out = []
    for tbl in root.iter(W + "tbl"):
        # findall, not iter: a table can hold nested tables whose rows are not its own.
        rows = [[_text(tc) for tc in tr.findall(W + "tc")] for tr in tbl.findall(W + "tr")]
        caption = " ".join(" ".join(r) for r in rows[:2]).upper()
        if "0.005%" in caption:
            product = "diesel50ppm"
        elif "0.05%" in caption:
            product = "diesel500ppm"
        elif "95 OCTANE" in caption:
            product = "petrol95"
        else:
            continue
        year_match = re.search(r"(20\d\d)", caption)
        if not year_match:
            raise BreakdownError(f"{path.name}: no year in table caption")
        header = next((r for r in rows if any(_clean(c) == "BFP" for c in r)), None)
        if header is None:
            raise BreakdownError(f"{path.name}: {product} table has no BFP column")
        columns = []
        for i, h in enumerate(header):
            if not h.strip():
                continue
            el = _element_for(h)
            if el is None:
                raise BreakdownError(f"{path.name}: unknown column '{h}' in the {product} table")
            columns.append((i, el))
        months, seen = [], set()
        for r in rows:
            if not r or r[0].strip()[:3].upper() not in MONTHS:
                continue
            month = MONTHS.index(r[0].strip()[:3].upper()) + 1
            cells = [(r[i] if i < len(r) else "").strip() for i, _ in columns]
            if not any(cells):
                continue  # a month not reached yet
            if not all(cells):
                raise BreakdownError(f"{path.name}: {product} month {month} has an empty cell")
            if month in seen:
                raise BreakdownError(f"{path.name}: {product} month {month} appears twice")
            seen.add(month)
            elements = [
                {"id": ident, "label": label, "group": group, "cents": _number(cell)}
                for cell, (_, (ident, label, group)) in zip(cells, columns)
            ]
            months.append({"month": f"{year_match.group(1)}-{month:02d}", "elements": elements})
        numbers = [int(m["month"][5:]) for m in months]
        if numbers != list(range(1, len(numbers) + 1)):
            raise BreakdownError(f"{path.name}: {product} months are not January onwards without gaps: {numbers}")
        out.append({"product": product, "months": months})
    return out


def main(argv: list[str]) -> int:
    if len(argv) != 6:
        print(__doc__)
        return 2
    petrol, diesel, document, url, released_on, checked_on = argv
    prices = {a["month"]: a for a in json.loads(PRICES.read_text(encoding="utf-8"))["adjustments"]}
    tables = parse_tables(Path(petrol)) + parse_tables(Path(diesel))
    products = [t["product"] for t in tables]
    if len(products) != len(set(products)):
        raise BreakdownError(f"a product has more than one table: {sorted(products)}")
    if set(products) != {"petrol95", "diesel500ppm", "diesel50ppm"}:
        raise BreakdownError(f"expected petrol 95 and both diesels, found {sorted(products)}")
    exclusions = {(e["month"], e["product"]): e["reason"] for e in json.loads(EXCLUSIONS.read_text(encoding="utf-8"))}
    used: set[tuple[str, str]] = set()
    problems, records = [], {}
    for t in tables:
        for m in t["months"]:
            key = (m["month"], t["product"])
            price = prices.get(m["month"], {}).get("prices", {}).get(t["product"], {}).get("inland")
            total = round(sum(e["cents"] for e in m["elements"]), 3)
            fails = price is None or abs(total - price) > TOLERANCE[t["product"]]
            if key in exclusions:
                used.add(key)
                # An exclusion must still be needed: if the month now checks out, say so.
                if not fails:
                    problems.append(f"{m['month']} {t['product']}: now adds up to the price, remove it from breakdown-exclusions.json")
                continue
            if price is None:
                problems.append(f"{m['month']} {t['product']}: no inland price in prices.json to check against")
            elif fails:
                problems.append(f"{m['month']} {t['product']}: elements add up to {total}, price is {price}")
            records.setdefault(m["month"], {})[t["product"]] = {"total": total, "elements": m["elements"]}
    problems += [f"{m} {p}: listed in breakdown-exclusions.json but not in the tables" for m, p in exclusions.keys() - used]
    if problems:
        print("Not written. Problems:\n" + "\n".join(problems))
        return 1
    out = {
        "_meta": {
            "description": "Every element of the inland (Gauteng) price per litre, as the DMPR lists it each month.",
            "publisher": "Department of Mineral and Petroleum Resources (DMPR)",
            "document": document,
            "url": url,
            "released_on": released_on,
            "checked_on": checked_on,
            "units": "South African cents per litre, exactly as printed",
            "covers": "Petrol 95, diesel 0.05% sulphur and diesel 0.005% sulphur, inland. The DMPR tables give no breakdown for petrol 93, illuminating paraffin or coastal prices.",
            "dmpr_label": "The DMPR titles these tables \"Petrol Margins are only Guidelines\" and \"Diesel Margins are only Guidelines\".",
            "rounding": "Petrol pump prices are rounded to whole cents, so the elements can differ from the price by a fraction of a cent.",
            "built_by": "scripts/fuel/build_breakdown.py",
            "excluded": [{"month": m, "product": p, "reason": r} for (m, p), r in sorted(exclusions.items())],
        },
        "months": [{"month": k, **{"products": v}} for k, v in sorted(records.items())],
    }
    OUTPUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} months to {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except BreakdownError as e:
        print("ERROR", e)
        sys.exit(1)
