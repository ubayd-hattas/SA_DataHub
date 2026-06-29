"""Validate ISO dates, period labels, and freshness metadata."""

from __future__ import annotations

import re
from datetime import date, datetime

from validation.config import VALID_TRENDS
from validation.loaders import all_statistics, load_json_datasets
from validation.models import CheckResult, Severity

ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
QUARTER = re.compile(r"^Q[1-4] \d{4}$")
MONTH = re.compile(r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$")
FY = re.compile(r"^\d{4}/\d{2}$")
YEAR = re.compile(r"^\d{4}$")


def _valid_period_label(label: str) -> bool:
    return bool(
        QUARTER.match(label)
        or MONTH.match(label)
        or FY.match(label)
        or YEAR.match(label)
    )


def run() -> CheckResult:
    result = CheckResult(name="check_dates")
    datasets = load_json_datasets()
    today = date.today()

    for slug, data in datasets.items():
        meta = data.get("_meta", {})
        lv = meta.get("last_verified")
        if lv and not ISO_DATE.match(lv):
            result.add(Severity.FAIL, f"{slug}.json _meta.last_verified invalid: {lv}")
        elif lv:
            try:
                datetime.strptime(lv, "%Y-%m-%d")
            except ValueError:
                result.add(Severity.FAIL, f"{slug}.json _meta.last_verified not a real date: {lv}")

    for file_slug, stat in all_statistics(datasets):
        sid = stat["id"]
        lu = stat.get("lastUpdated", "")
        if not ISO_DATE.match(lu):
            result.add(
                Severity.FAIL,
                f"Statistic '{sid}' has invalid lastUpdated: {lu!r}",
                "Use ISO format YYYY-MM-DD.",
            )
            continue
        try:
            lu_date = datetime.strptime(lu, "%Y-%m-%d").date()
            if lu_date > today:
                result.add(
                    Severity.WARN,
                    f"Statistic '{sid}' lastUpdated is in the future: {lu}",
                )
        except ValueError:
            result.add(Severity.FAIL, f"Statistic '{sid}' lastUpdated not parseable: {lu}")

        trend = stat.get("trend")
        if trend not in VALID_TRENDS:
            result.add(Severity.FAIL, f"Statistic '{sid}' invalid trend: {trend!r}")

        for series in stat.get("series", []):
            for pt in series.get("data", []):
                label = pt.get("label", "")
                if not _valid_period_label(label):
                    result.add(
                        Severity.WARN,
                        f"Statistic '{sid}' has non-standard period label: {label!r}",
                        "Normalize to QN YYYY, Mon YYYY, YYYY, or YYYY/YY before ETL.",
                    )

    if not any(f.severity == Severity.FAIL for f in result.findings):
        result.add(Severity.PASS, "All lastUpdated fields use valid ISO dates.")

    return result
