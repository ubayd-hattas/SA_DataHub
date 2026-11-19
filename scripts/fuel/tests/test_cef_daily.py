"""Tests for the CEF sheet parser and the estimate, on made-up sheets in the CEF layout (no CEF data)."""
import sys
from datetime import date
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import cef_daily as cd  # noqa: E402
import estimate as est  # noqa: E402


def sheet_text(day="10/12/2030", start="27/11/2030", price_from="04/12/2030", avg=("10.000", "8.000", "(20.000)", "(22.000)", "5.000"),
               prod=("6.000", "5.000", "(15.000)", "(16.000)", "3.000"), fx=("4.000", "3.000", "(5.000)", "(6.000)", "2.000"), rate="R/$17.1234", twice=True):
    lines = [
        "South African Cents per Litre (SA c/l) PETROL 95 ULP PETROL 93 ULP & LRP DIESEL 0.05% DIESEL 0.005% ILL. PAR.",
        f"GAUTENG PUMP PRICE AS FROM {price_from} 2,000.000 1,990.000 - - -",
        f"BASIC FUEL PRICE - {day} 900.000 890.000 950.000 960.000 970.000",
        f"PRESS RELEASE CONTRIBUTION TO BFP {price_from} - {day} 910.000 898.000 930.000 938.000 975.000",
        f"UNIT OVER/(UNDER) RECOVERY - {day} 10.000 8.000 (20.000) (22.000) 5.000",
        f"AVERAGE UNIT OVER/(UNDER) RECOVERY {start} - {day} " + " ".join(avg),
        "ANALYSIS MOVEMENT OF AVERAGE OVER/(UNDER) RECOVERY",
        " - MOVEMENT IN INTERNATIONAL PRODUCT PRICES " + " ".join(prod),
        " - MOVEMENT IN EXCHANGE RATE " + " ".join(fx),
    ]
    if twice:
        lines.append(f" AVERAGE UNIT OVER/(UNDER) RECOVERY {start} - {day} " + " ".join(avg))
    lines.append(f"R/$ EXCHANGE RATE - ({rate} - {day})")
    return "\n".join(lines)


def test_reads_a_sheet_with_brackets_as_under_recoveries():
    s = cd.parse_text(sheet_text())
    assert s.day == date(2030, 12, 10)
    assert s.period_start == date(2030, 11, 27)
    assert s.price_from == date(2030, 12, 4)
    assert s.average_recovery["petrol95"] == 10.0
    assert s.average_recovery["diesel500ppm"] == -20.0
    assert s.rand_per_dollar == 17.1234
    assert s.problems == []


def test_flags_a_split_that_does_not_add_up():
    s = cd.parse_text(sheet_text(prod=("1.000", "5.000", "(15.000)", "(16.000)", "3.000")))
    assert any("is not the average" in p for p in s.problems)


def test_flags_values_outside_the_plausible_range():
    s = cd.parse_text(sheet_text(avg=("9999.000", "8.000", "(20.000)", "(22.000)", "5.000"), prod=("9995.000", "5.000", "(15.000)", "(16.000)", "3.000")))
    assert any("outside" in p for p in s.problems)


def test_fails_when_the_two_average_lines_disagree():
    text = sheet_text().replace(" AVERAGE UNIT OVER/(UNDER) RECOVERY 27/11/2030 - 10/12/2030 10.000", " AVERAGE UNIT OVER/(UNDER) RECOVERY 27/11/2030 - 10/12/2030 11.000")
    with pytest.raises(cd.SheetError, match="disagree"):
        cd.parse_text(text)


def test_fails_without_a_rand_rate():
    with pytest.raises(cd.SheetError, match="rand/dollar"):
        cd.parse_text(sheet_text(rate="n/a"))


def test_fails_when_a_row_is_missing():
    text = "\n".join(l for l in sheet_text().splitlines() if "MOVEMENT IN EXCHANGE RATE" not in l)
    with pytest.raises(cd.SheetError):
        cd.parse_text(text)


ERRORS = {p: {"groups": {g: {"n": 20, "import_p10": -10.0, "import_p90": 15.0} for g in ["1-5", "6-10", "11-15", "16-99"]}} for p in cd.PRODUCTS}


def test_estimate_waits_for_enough_working_days():
    sheets = [cd.parse_text(sheet_text(day=f"{d:02d}/12/2030")) for d in (2, 3, 4)]
    assert est.compute(sheets, {}, ERRORS, "2031-01")["status"] == "too-early"


def test_estimate_turns_an_over_recovery_into_a_cut_and_adds_announced_changes():
    sheets = [cd.parse_text(sheet_text(day=f"{d:02d}/12/2030")) for d in range(2, 10)]
    known = {"2031-01": [{"cents": {"petrol95": 50}}]}
    r = est.compute(sheets, known, ERRORS, "2031-01")
    assert r["status"] == "ok" and r["group"] == "6-10"
    p = r["products"]["petrol95"]
    # over-recovery of 10 c means a 10 c cut; plus 50 c announced; error band -10..15 gives 25..50
    assert (p["low"], p["mid"], p["high"]) == (25, 40, 50)
    assert r["products"]["diesel500ppm"]["mid"] == 20


def test_estimate_leaves_out_a_product_with_too_few_past_months():
    thin = {**ERRORS, "paraffin": {"groups": {g: {"n": 5, "import_p10": -1.0, "import_p90": 1.0} for g in ["1-5", "6-10", "11-15", "16-99"]}}}
    sheets = [cd.parse_text(sheet_text(day=f"{d:02d}/12/2030")) for d in range(2, 10)]
    assert "paraffin" not in est.compute(sheets, {}, thin, "2031-01")["products"]


def test_robots_rules_are_respected():
    import fetch_cef
    assert fetch_cef.allowed_by_robots("User-agent: *\nDisallow: /wp-admin/\n", "/wp-content/uploads/")
    assert not fetch_cef.allowed_by_robots("User-agent: *\nDisallow: /wp-content/\n", "/wp-content/uploads/")
