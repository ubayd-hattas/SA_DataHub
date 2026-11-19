"""
Reads the Central Energy Fund (CEF) daily basic fuel price sheet (one-page PDF).

Each sheet gives, per product, for the price period so far:
  - the basic fuel price (BFP) in the current official price ("contribution to BFP")
  - the day's BFP and the day's unit over/(under) recovery
  - the average over/(under) recovery since the period began, split into the
    part from international product prices and the part from the exchange rate
  - the rand/dollar rate used

An over-recovery means the import cost has run below what the current price
assumes, so if it lasts the price would fall by about that much. Brackets mean
an under-recovery (a negative number).

No network requests: pass a local file. CEF publishes no reuse terms, so the
parsed data is not committed or published (see docs/fuel.md, decision D3).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

PRODUCTS = ("petrol95", "petrol93", "diesel500ppm", "diesel50ppm", "paraffin")
DATE = r"(\d{2}/\d{2}/\d{4})"
NUM = r"(\(?-?[\d,]+\.\d+\)?|-)"
FIVE = r"\s+" + r"\s+".join([NUM] * 5)

# Plausible ranges, cents per litre (and rand per dollar). A value outside them
# means the layout changed or the wrong line was read.
BFP_RANGE = (300.0, 4000.0)
RECOVERY_RANGE = (-1500.0, 1500.0)
RAND_RANGE = (10.0, 35.0)


class SheetError(ValueError):
    pass


@dataclass
class Sheet:
    day: date
    period_start: date
    price_from: date
    contribution: dict[str, float]
    bfp: dict[str, float]
    average_recovery: dict[str, float]
    from_product_prices: dict[str, float]
    from_exchange_rate: dict[str, float]
    rand_per_dollar: float
    problems: list[str] = field(default_factory=list)


def _d(text: str) -> date:
    return datetime.strptime(text, "%d/%m/%Y").date()


def _n(text: str) -> float:
    if text == "-":
        raise SheetError("a product value is missing")
    neg = text.startswith("(") and text.endswith(")")
    v = float(text.strip("()").replace(",", ""))
    return -v if neg else v


def _five(line: str) -> dict[str, float]:
    m = re.search(FIVE + r"\s*$", line)
    if not m:
        raise SheetError(f"expected five numbers in: {line[:90]}")
    return dict(zip(PRODUCTS, (_n(x) for x in m.groups())))


def _line(lines: list[str], pattern: str) -> str:
    found = [l for l in lines if re.search(pattern, l)]
    if len(found) != 1:
        raise SheetError(f"expected one line matching {pattern!r}, found {len(found)}")
    return found[0]


def parse_text(text: str) -> Sheet:
    lines = [re.sub(r"\s+", " ", l).strip() for l in text.splitlines() if l.strip()]
    bfp_line = _line(lines, r"^BASIC FUEL PRICE - " + DATE)
    day = _d(re.search(DATE, bfp_line).group(1))
    contrib_line = _line(lines, r"^PRESS RELEASE CONTRIBUTION TO BFP")
    price_from = _d(re.search(DATE, contrib_line).group(1))
    # The average appears twice: in the table and at the foot of the analysis. Both must agree.
    averages = [l for l in lines if re.search(r"AVERAGE UNIT OVER/\(UNDER\) RECOVERY " + DATE, l)]
    if len(averages) not in (1, 2):
        raise SheetError(f"expected the average recovery once or twice, found {len(averages)}")
    if len(averages) == 2 and _five(averages[0]) != _five(averages[1]):
        raise SheetError("the two average recovery lines disagree")
    avg_line = averages[0]
    period_start = _d(re.search(DATE, avg_line).group(1))
    prod_line = _line(lines, r"MOVEMENT IN INTERNATIONAL PRODUCT PRICES")
    fx_line = _line(lines, r"MOVEMENT IN EXCHANGE RATE")
    rate = re.search(r"R/\$\s*([\d.]+)\s*-\s*" + DATE, text.replace("\n", " "))
    if not rate:
        raise SheetError("no rand/dollar rate")
    sheet = Sheet(
        day=day,
        period_start=period_start,
        price_from=price_from,
        contribution=_five(contrib_line),
        bfp=_five(bfp_line),
        average_recovery=_five(averages[0]),
        from_product_prices=_five(prod_line),
        from_exchange_rate=_five(fx_line),
        rand_per_dollar=float(rate.group(1)),
    )
    sheet.problems = check(sheet)
    return sheet


def check(s: Sheet) -> list[str]:
    """Problems with a parsed sheet. Any problem means the sheet is not used."""
    p = []
    for prod in PRODUCTS:
        for name, values, (lo, hi) in [("BFP", s.bfp, BFP_RANGE), ("contribution", s.contribution, BFP_RANGE), ("average recovery", s.average_recovery, RECOVERY_RANGE)]:
            if not lo <= values[prod] <= hi:
                p.append(f"{s.day} {prod} {name} {values[prod]} outside {lo} to {hi}")
        split = s.from_product_prices[prod] + s.from_exchange_rate[prod]
        if abs(split - s.average_recovery[prod]) > 0.011:
            p.append(f"{s.day} {prod}: product part plus exchange-rate part {split:.3f} is not the average {s.average_recovery[prod]}")
    if not RAND_RANGE[0] <= s.rand_per_dollar <= RAND_RANGE[1]:
        p.append(f"{s.day} rand/dollar {s.rand_per_dollar} outside {RAND_RANGE}")
    if not s.period_start <= s.day:
        p.append(f"{s.day} period starts after the sheet date")
    return p


def parse_pdf(path: Path | str) -> Sheet:
    path = Path(path)
    from pypdf import PdfReader

    text = "\n".join((page.extract_text() or "") for page in PdfReader(path).pages)
    sheet = parse_text(text)
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", path.name)
    if m and date(*map(int, m.groups())) != sheet.day:
        sheet.problems.append(f"file name date {m.group(0)} is not the sheet date {sheet.day}")
    return sheet
