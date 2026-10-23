"""Regression tests for the narrow negative-value exception in check_schema."""

from validation.checks.check_schema import NEGATIVE_ALLOWED_STAT_IDS, min_allowed_percent


def test_gdp_growth_ids_may_be_negative():
    assert min_allowed_percent("gdp-growth") == -100
    assert min_allowed_percent("gdp-annual-growth") == -100


def test_other_growth_named_ids_are_not_relaxed():
    assert min_allowed_percent("population-growth") == 0
    assert min_allowed_percent("some-growth-rate") == 0


def test_non_growth_ids_floor_at_zero():
    assert min_allowed_percent("unemployment-national") == 0


def test_exception_set_is_exactly_the_gdp_ids():
    assert NEGATIVE_ALLOWED_STAT_IDS == {"gdp-growth", "gdp-annual-growth"}
