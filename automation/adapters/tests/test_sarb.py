from datetime import date
from unittest import mock

import pytest

from automation.adapters.sarb import _validate_prime_spread, _transform_interest_rates

def test_validate_prime_spread_exact_match():
    errors = _validate_prime_spread(7.00, 10.50)
    assert not errors

def test_validate_prime_spread_match_within_tolerance():
    # 7.00 + 3.5 = 10.5. Tolerance is 0.001
    errors = _validate_prime_spread(7.00, 10.5009)
    assert not errors

    errors = _validate_prime_spread(7.00, 10.4991)
    assert not errors

def test_validate_prime_spread_genuine_violation():
    errors = _validate_prime_spread(7.00, 10.51)
    assert len(errors) == 1
    assert "Business rule VIOLATED" in errors[0]

def _mock_doc():
    return {
        "statistics": [
            {
                "id": "repo-rate-sarb",
                "value": "7.00%",
                "rawValue": 7.00,
                "change": 0.0,
                "changeLabel": "rate at 7.00% (May 2026 MPC)",
                "trend": "stable",
                "lastUpdated": "2026-05-28",
                "series": [{"data": [{"label": "May 2026", "value": 7.00}]}]
            },
            {
                "id": "prime-lending-rate",
                "value": "10.50%",
                "rawValue": 10.50,
                "change": 0.0,
                "changeLabel": "rate at 10.50% (May 2026 MPC)",
                "trend": "stable",
                "lastUpdated": "2026-05-28",
                "series": [{"data": [{"label": "May 2026", "value": 10.50}]}]
            }
        ]
    }

@mock.patch("automation.adapters.sarb.date")
def test_transform_interest_rates_first_ever_update(mock_date):
    mock_date.today.return_value = date(2026, 7, 1)
    
    current_doc = {
        "statistics": [
            {
                "id": "repo-rate-sarb",
                "series": []
            },
            {
                "id": "prime-lending-rate",
                "series": []
            }
        ]
    }
    
    updated = _transform_interest_rates(
        current_doc,
        new_repo=7.00,
        new_prime=10.50,
        effective_date_str="2026-05-28",
        current_repo=None,
        current_prime=None
    )
    
    stats = {s["id"]: s for s in updated["statistics"]}
    
    assert stats["repo-rate-sarb"]["rawValue"] == 7.00
    assert stats["repo-rate-sarb"]["change"] == 0.0
    assert stats["repo-rate-sarb"]["trend"] == "stable"
    assert stats["repo-rate-sarb"]["series"][0]["data"] == [{"label": "May 2026", "value": 7.00}]
    
    assert stats["prime-lending-rate"]["rawValue"] == 10.50
    assert stats["prime-lending-rate"]["change"] == 0.0
    assert stats["prime-lending-rate"]["series"][0]["data"] == [{"label": "May 2026", "value": 10.50}]

@mock.patch("automation.adapters.sarb.date")
def test_transform_interest_rates_in_place_revision(mock_date):
    mock_date.today.return_value = date(2026, 7, 1)
    
    current_doc = _mock_doc()
    # In-place revision: same label ("May 2026"), new rates
    updated = _transform_interest_rates(
        current_doc,
        new_repo=7.25,
        new_prime=10.75,
        effective_date_str="2026-05-28",
        current_repo=7.00,
        current_prime=10.50
    )
    
    stats = {s["id"]: s for s in updated["statistics"]}
    repo = stats["repo-rate-sarb"]
    
    assert repo["rawValue"] == 7.25
    assert repo["change"] == 0.25
    assert repo["trend"] == "up"
    assert len(repo["series"][0]["data"]) == 1
    assert repo["series"][0]["data"][0]["value"] == 7.25

@mock.patch("automation.adapters.sarb.date")
def test_transform_interest_rates_append_new_series_point(mock_date):
    mock_date.today.return_value = date(2026, 7, 23)
    
    current_doc = _mock_doc()
    # Appending a new point: new date (July 2026)
    updated = _transform_interest_rates(
        current_doc,
        new_repo=6.75,
        new_prime=10.25,
        effective_date_str="2026-07-23",
        current_repo=7.00,
        current_prime=10.50
    )
    
    stats = {s["id"]: s for s in updated["statistics"]}
    repo = stats["repo-rate-sarb"]
    
    assert repo["rawValue"] == 6.75
    assert repo["change"] == -0.25
    assert repo["trend"] == "down"
    
    series_data = repo["series"][0]["data"]
    assert len(series_data) == 2
    assert series_data[0] == {"label": "May 2026", "value": 7.00}
    assert series_data[1] == {"label": "Jul 2026", "value": 6.75}
