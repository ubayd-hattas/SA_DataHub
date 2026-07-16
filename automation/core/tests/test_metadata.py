import pytest

from automation.core.metadata import check_protected_fields

def test_check_protected_fields_no_violation():
    previous = {"id": "stat-1", "value": 10}
    proposed = {"id": "stat-1", "value": 20}
    violations = check_protected_fields(previous, proposed)
    assert not violations

def test_check_protected_fields_top_level_changed():
    previous = {"id": "stat-1", "value": 10}
    proposed = {"id": "stat-2", "value": 10}
    violations = check_protected_fields(previous, proposed)
    assert len(violations) == 1
    assert "Protected field changed: root.id 'stat-1' \u2192 'stat-2'" in violations[0]

def test_check_protected_fields_nested_dict_changed():
    previous = {"meta": {"registryId": "reg-A"}, "value": 10}
    proposed = {"meta": {"registryId": "reg-B"}, "value": 10}
    violations = check_protected_fields(previous, proposed)
    assert len(violations) == 1
    assert "Protected field changed: root.meta.registryId 'reg-A' \u2192 'reg-B'" in violations[0]

def test_check_protected_fields_list_of_dicts_changed():
    previous = {"stats": [{"id": "stat-1", "val": 1}, {"id": "stat-2", "val": 2}]}
    proposed = {"stats": [{"id": "stat-1", "val": 1}, {"id": "stat-3", "val": 2}]}
    violations = check_protected_fields(previous, proposed)
    assert len(violations) == 1
    assert "Protected field changed: root.stats[1].id 'stat-2' \u2192 'stat-3'" in violations[0]

def test_check_protected_fields_absent_in_proposed():
    previous = {"id": "stat-1", "value": 10}
    proposed = {"value": 10}
    violations = check_protected_fields(previous, proposed)
    assert len(violations) == 1
    assert "Protected field changed: root.id 'stat-1' \u2192 None" in violations[0]
