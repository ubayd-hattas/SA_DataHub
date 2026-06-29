"""Unit tests for period label normalization."""

from __future__ import annotations

from datetime import date

import pytest

from etl.lib.periods import period_label_to_date


@pytest.mark.parametrize(
    ("label", "expected"),
    [
        ("Q1 2024", date(2024, 1, 1)),
        ("Q2 2024", date(2024, 4, 1)),
        ("Q3 2024", date(2024, 7, 1)),
        ("Q4 2025", date(2025, 10, 1)),
        ("Jan 2025", date(2025, 1, 1)),
        ("2024", date(2024, 1, 1)),
        ("2017/18", date(2017, 4, 1)),
    ],
)
def test_period_label_to_date(label: str, expected: date) -> None:
    assert period_label_to_date(label) == expected


def test_invalid_label_raises() -> None:
    with pytest.raises(ValueError):
        period_label_to_date("not a period")
