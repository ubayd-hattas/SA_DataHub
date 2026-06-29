"""Period label → sortable date. Mirrors docs/database-schema.md normalization rules."""

from __future__ import annotations

import re
from datetime import date

MONTH_MAP = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def period_label_to_date(label: str) -> date:
    """Convert a display label to period_start (first day of period)."""
    text = label.strip()

    quarter = re.match(r"^Q([1-4])\s+(\d{4})$", text, re.IGNORECASE)
    if quarter:
        q = int(quarter.group(1))
        year = int(quarter.group(2))
        month = {1: 1, 2: 4, 3: 7, 4: 10}[q]
        return date(year, month, 1)

    month_year = re.match(r"^([A-Za-z]{3})\s+(\d{4})$", text)
    if month_year:
        month = MONTH_MAP[month_year.group(1).lower()]
        return date(int(month_year.group(2)), month, 1)

    year_only = re.match(r"^(\d{4})$", text)
    if year_only:
        return date(int(year_only.group(1)), 1, 1)

    fiscal = re.match(r"^(\d{4})/\d{2}$", text)
    if fiscal:
        return date(int(fiscal.group(1)), 4, 1)

    raise ValueError(f"Unrecognised period label: {label!r}")
