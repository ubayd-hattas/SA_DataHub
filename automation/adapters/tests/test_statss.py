"""
Tests for automation.adapters.statss — Phase 2 (QLFS parse/transform/stage).

Covers the acceptance criteria in IMPLEMENTATION-SPEC-STATSSA-PHASE2.md §10:
  1. Successful parse of a representative QLFS workbook, verified against
     every one of the seven named values.
  2. Correct application of each transform (unemployment / youth /
     labour-force) to a realistic current-document fixture.
  3. A stat with an empty/missing series list is correctly seeded.
  4. A protected-field violation correctly aborts staging (for that
     dataset only — the other two QLFS outputs still stage normally).
  5. A quarter-over-quarter jump beyond the plausibility threshold is
     flagged, not hard-failed.
  6. Running the pipeline against unchanged source data produces
     status="no_change" with no staging / no version entries.
  7. A missing/unparseable/non-Excel source file produces status="error".

No archived QLFS .xlsx file was available in this environment to test
against (see the module docstring in automation/adapters/statss.py); the
fixture workbook below is a synthetic stand-in built to the documented
Stats SA convention (quarter-label header row + labeled indicator rows).
"""

from __future__ import annotations

import json
from io import BytesIO
from pathlib import Path

import openpyxl
import pytest

import automation.adapters.statss as statss_mod
from automation.adapters.statss import (
    QLFSExtract,
    StatsSAAdapter,
    _check_qoq_jump,
    _transform_labour_force,
    _transform_unemployment,
    _transform_youth_unemployment,
    _validate_percentage,
    _validate_quarterly_label,
    parse_qlfs_workbook,
)
from automation.core.config import AutomationConfig, SourceConfig
from automation.core.metadata import check_protected_fields
from automation.core.staging import read_staged_dataset
from automation.core.version import pending_versions

# ---------------------------------------------------------------------------
# Fixture workbook builder
# ---------------------------------------------------------------------------

_FIXTURE_LABELS = {
    "unemployment_rate": "Official unemployment rate",
    "youth_unemployment_narrow": "Unemployment rate: Youth (15-34)",
    "youth_unemployment_1524": "Unemployment rate: Youth (15-24)",
    "youth_unemployment_expanded": "Expanded unemployment rate: Youth",
    "neet_rate": "NEET rate (15-24)",
    "lfpr_overall": "Labour force participation rate",
    "lfpr_female": "Labour force participation rate: Female",
}

_DEFAULT_VALUES = {
    "unemployment_rate": (31.9, 31.4, 32.7),
    "youth_unemployment_narrow": (45.9, 44.8, 46.3),
    "youth_unemployment_1524": (61.9, 61.4, 60.9),
    "youth_unemployment_expanded": (57.9, 56.8, 58.1),
    "neet_rate": (37.9, 37.2, 37.6),
    "lfpr_overall": (60.9, 60.6, 60.5),
    "lfpr_female": (55.9, 55.2, 55.0),
}

_DEFAULT_HEADERS = ("Q3 2025", "Q4 2025", "Q1 2026")


def _build_fixture_workbook(
    values: dict[str, tuple[float, float, float]] = _DEFAULT_VALUES,
    headers: tuple[str, ...] = _DEFAULT_HEADERS,
) -> bytes:
    """Build a minimal, representative QLFS-style workbook."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "QLFS Time Series"
    ws.cell(row=1, column=1, value="Indicator")
    for i, h in enumerate(headers, start=2):
        ws.cell(row=1, column=i, value=h)

    row = 2
    for key, label in _FIXTURE_LABELS.items():
        ws.cell(row=row, column=1, value=label)
        for c, v in enumerate(values[key], start=2):
            ws.cell(row=row, column=c, value=v)
        row += 1

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _extract(**overrides) -> QLFSExtract:
    base = dict(
        release_period="Q1 2026",
        publication_date="2026-05-12",
        unemployment_rate=32.7,
        youth_unemployment_narrow=46.3,
        youth_unemployment_1524=60.9,
        youth_unemployment_expanded=58.1,
        neet_rate=37.6,
        lfpr_overall=60.5,
        lfpr_female=55.0,
    )
    base.update(overrides)
    return QLFSExtract(**base)


# ---------------------------------------------------------------------------
# 1. Parser
# ---------------------------------------------------------------------------


def test_parse_qlfs_workbook_extracts_all_named_values():
    data = _build_fixture_workbook()
    extract = parse_qlfs_workbook(data)

    assert extract.release_period == "Q1 2026"
    assert extract.unemployment_rate == 32.7
    assert extract.youth_unemployment_narrow == 46.3
    assert extract.youth_unemployment_1524 == 60.9
    assert extract.youth_unemployment_expanded == 58.1
    assert extract.neet_rate == 37.6
    assert extract.lfpr_overall == 60.5
    assert extract.lfpr_female == 55.0


def test_parse_qlfs_workbook_missing_indicator_fails_loudly():
    data = _build_fixture_workbook()
    wb = openpyxl.load_workbook(BytesIO(data))
    ws = wb.active
    for row in ws.iter_rows():
        for cell in row:
            if cell.value == "NEET rate (15-24)":
                cell.value = "Some unrelated row"
    buf = BytesIO()
    wb.save(buf)

    with pytest.raises(ValueError, match="neet_rate"):
        parse_qlfs_workbook(buf.getvalue())


def test_parse_qlfs_workbook_not_an_excel_file_fails_loudly():
    with pytest.raises(ValueError, match="Cannot open"):
        parse_qlfs_workbook(b"this is not a valid xlsx file at all")


# ---------------------------------------------------------------------------
# 2. Validation / anomaly helpers
# ---------------------------------------------------------------------------


def test_validate_percentage_in_range():
    assert _validate_percentage(32.7, "unemployment_rate") == []


def test_validate_percentage_out_of_range():
    errors = _validate_percentage(150.0, "unemployment_rate")
    assert len(errors) == 1
    assert "unemployment_rate" in errors[0]


def test_validate_quarterly_label_ok():
    assert _validate_quarterly_label("Q1 2026") == []


def test_validate_quarterly_label_bad_format():
    assert len(_validate_quarterly_label("2026-Q1")) == 1


def test_check_qoq_jump_within_threshold_no_warning():
    assert _check_qoq_jump(31.4, 32.0, "unemployment-national") is None


def test_check_qoq_jump_beyond_threshold_flags_anomaly_not_error():
    warning = _check_qoq_jump(31.4, 40.0, "unemployment-national")
    assert warning is not None
    assert "ANOMALY" in warning


def test_check_qoq_jump_no_current_value_no_warning():
    assert _check_qoq_jump(None, 32.7, "unemployment-national") is None


# ---------------------------------------------------------------------------
# 3. Transform functions
# ---------------------------------------------------------------------------


def _unemployment_doc():
    return {
        "_meta": {"source": "Stats SA", "last_verified": "2026-05-01"},
        "statistics": [
            {
                "id": "unemployment-national",
                "value": "31.4%",
                "rawValue": 31.4,
                "change": -0.5,
                "changeLabel": "from Q3 2025 (31.9%)",
                "trend": "down",
                "source": {"name": "Stats SA", "publicationDate": "2026-02-17"},
                "lastUpdated": "2026-02-17",
                "series": [
                    {
                        "name": "Unemployment rate",
                        "unit": "%",
                        "data": [
                            {"label": "Q3 2025", "value": 31.9},
                            {"label": "Q4 2025", "value": 31.4},
                        ],
                    }
                ],
            },
            {
                "id": "labour-force-participation",
                "rawValue": 42.7,
                "series": [],
            },
        ],
    }


def _youth_doc():
    return {
        "_meta": {},
        "statistics": [
            {
                "id": "youth-unemployment-narrow",
                "rawValue": 45.5,
                "series": [{"data": [{"label": "Q4 2025", "value": 45.5}]}],
            },
            {
                "id": "youth-unemployment-1524",
                "rawValue": 61.2,
                "series": [{"data": [{"label": "Q4 2025", "value": 61.2}]}],
            },
            {
                "id": "youth-unemployment-expanded",
                "rawValue": 56.8,
                "series": [{"data": [{"label": "Q4 2025", "value": 56.8}]}],
            },
            {
                "id": "youth-neet-rate",
                "rawValue": 37.2,
                "series": [
                    {
                        "data": [
                            {"label": "2024", "value": 37.9},
                            {"label": "2025", "value": 37.2},
                        ]
                    }
                ],
            },
        ],
    }


def _labour_force_doc():
    return {
        "_meta": {},
        "statistics": [
            {
                "id": "lfpr-overall",
                "rawValue": 60.6,
                "series": [{"data": [{"label": "Q4 2025", "value": 60.6}]}],
            },
            {
                "id": "female-labour-participation",
                "rawValue": 55.2,
                "series": [{"data": [{"label": "Q4 2025", "value": 55.2}]}],
            },
        ],
    }


def test_transform_unemployment_updates_only_rate_bearing_fields():
    current = _unemployment_doc()
    updated = _transform_unemployment(current, _extract(), "https://statssa.gov.za/x.xlsx")

    stat = {s["id"]: s for s in updated["statistics"]}["unemployment-national"]
    assert stat["rawValue"] == 32.7
    assert stat["value"] == "32.7%"
    assert stat["change"] == 1.3
    assert stat["trend"] == "up"
    assert stat["lastUpdated"] == "2026-05-12"
    assert stat["source"]["publicationDate"] == "2026-05-12"
    assert stat["source"]["name"] == "Stats SA"  # untouched non-rate-bearing field
    assert stat["series"][0]["data"][-1] == {"label": "Q1 2026", "value": 32.7}
    assert len(stat["series"][0]["data"]) == 3

    untouched = {s["id"]: s for s in updated["statistics"]}["labour-force-participation"]
    assert untouched["rawValue"] == 42.7  # not part of this transform's scope

    # Deep copy — original input document is not mutated.
    assert current["statistics"][0]["rawValue"] == 31.4


def test_transform_unemployment_seeds_empty_series():
    current = _unemployment_doc()
    current["statistics"][0]["series"] = []
    del current["statistics"][0]["rawValue"]  # true "first-ever update": nothing to diff against
    updated = _transform_unemployment(current, _extract(), "https://statssa.gov.za/x.xlsx")

    stat = {s["id"]: s for s in updated["statistics"]}["unemployment-national"]
    assert stat["series"][0]["data"] == [{"label": "Q1 2026", "value": 32.7}]
    assert stat["change"] == 0.0
    assert stat["trend"] == "stable"


def test_transform_youth_unemployment_maps_all_four_stats():
    current = _youth_doc()
    updated = _transform_youth_unemployment(current, _extract(), "https://statssa.gov.za/x.xlsx")
    stats = {s["id"]: s for s in updated["statistics"]}

    assert stats["youth-unemployment-narrow"]["rawValue"] == 46.3
    assert stats["youth-unemployment-1524"]["rawValue"] == 60.9
    assert stats["youth-unemployment-expanded"]["rawValue"] == 58.1
    assert stats["youth-neet-rate"]["rawValue"] == 37.6

    neet_labels = [pt["label"] for pt in stats["youth-neet-rate"]["series"][0]["data"]]
    assert neet_labels == ["2024", "2025", "Q1 2026"]


def test_transform_labour_force_maps_both_stats():
    current = _labour_force_doc()
    updated = _transform_labour_force(current, _extract(), "https://statssa.gov.za/x.xlsx")
    stats = {s["id"]: s for s in updated["statistics"]}

    assert stats["lfpr-overall"]["rawValue"] == 60.5
    assert stats["female-labour-participation"]["rawValue"] == 55.0


def test_transform_output_id_tampering_is_caught_by_check_protected_fields():
    current = _unemployment_doc()
    updated = _transform_unemployment(current, _extract(), "https://statssa.gov.za/x.xlsx")
    updated["statistics"][0]["id"] = "unemployment-national-renamed"

    violations = check_protected_fields(current, updated)
    assert violations


# ---------------------------------------------------------------------------
# 4. fetch_and_apply() integration — network layer mocked, no real I/O
# ---------------------------------------------------------------------------


def _patch_network(monkeypatch, file_bytes: bytes, file_url: str) -> None:
    monkeypatch.setattr(
        statss_mod, "_fetch_release_hub_html",
        lambda client, url: b"<html>Q1 2026 QLFS release</html>",
    )
    monkeypatch.setattr(statss_mod, "_extract_release_period", lambda html: "Q1 2026")
    monkeypatch.setattr(statss_mod, "_determine_current_qlfs_quarter", lambda: (1, 2026))
    monkeypatch.setattr(
        statss_mod, "_probe_qlfs_publication_url",
        lambda client, q, y: file_url,
    )
    monkeypatch.setattr(statss_mod, "_download_publication", lambda client, url: file_bytes)


def _make_adapter(tmp_path: Path) -> StatsSAAdapter:
    config = AutomationConfig(
        report_dir=tmp_path / "reports",
        raw_archive_dir=tmp_path / "raw_archive",
    )
    return StatsSAAdapter(
        config, SourceConfig(source_id="statssa", display_name="Statistics South Africa")
    )


def test_fetch_and_apply_stages_all_three_datasets_without_direct_write(tmp_path, monkeypatch):
    file_bytes = _build_fixture_workbook()
    file_url = "https://www.statssa.gov.za/publications/P0211/fixture.xlsx"
    _patch_network(monkeypatch, file_bytes, file_url)

    prod_dir = tmp_path / "production"
    prod_dir.mkdir()
    stale_docs = {
        "unemployment": {
            "_meta": {},
            "statistics": [
                {"id": "unemployment-national", "rawValue": 31.4,
                 "series": [{"data": [{"label": "Q4 2025", "value": 31.4}]}]}
            ],
        },
        "youth-unemployment": _youth_doc(),
        "labour-force": _labour_force_doc(),
    }
    paths = {}
    for ds_id, doc in stale_docs.items():
        p = prod_dir / f"{ds_id}.json"
        p.write_text(json.dumps(doc), encoding="utf-8")
        paths[ds_id] = p
    monkeypatch.setattr(statss_mod, "_QLFS_DATASET_JSON", paths)

    adapter = _make_adapter(tmp_path)
    result = adapter.fetch_and_apply(dry_run=False, run_id="test-run")

    assert result["status"] == "ok"
    assert not result["errors"]
    assert len(result["version_ids"]) == 3

    # No dataset JSON was written directly — production files unchanged.
    for ds_id, p in paths.items():
        assert json.loads(p.read_text(encoding="utf-8")) == stale_docs[ds_id]

    # But each dataset has exactly one staged, pending version.
    for ds_id in paths:
        pending = pending_versions(adapter.config.report_dir, ds_id)
        assert len(pending) == 1
        staged_doc = read_staged_dataset(adapter.config.report_dir, ds_id, pending[0].version_id)
        assert staged_doc["statistics"]


def test_fetch_and_apply_no_change_produces_no_change_status(tmp_path, monkeypatch):
    file_bytes = _build_fixture_workbook()
    file_url = "https://www.statssa.gov.za/publications/P0211/fixture.xlsx"
    _patch_network(monkeypatch, file_bytes, file_url)

    prod_dir = tmp_path / "production"
    prod_dir.mkdir()
    current_docs = {
        "unemployment": {
            "_meta": {},
            "statistics": [
                {"id": "unemployment-national", "rawValue": 32.7,
                 "series": [{"data": [{"label": "Q1 2026", "value": 32.7}]}]}
            ],
        },
        "youth-unemployment": {
            "_meta": {},
            "statistics": [
                {"id": "youth-unemployment-narrow", "rawValue": 46.3, "series": []},
                {"id": "youth-unemployment-1524", "rawValue": 60.9, "series": []},
                {"id": "youth-unemployment-expanded", "rawValue": 58.1, "series": []},
                {"id": "youth-neet-rate", "rawValue": 37.6, "series": []},
            ],
        },
        "labour-force": {
            "_meta": {},
            "statistics": [
                {"id": "lfpr-overall", "rawValue": 60.5, "series": []},
                {"id": "female-labour-participation", "rawValue": 55.0, "series": []},
            ],
        },
    }
    paths = {}
    for ds_id, doc in current_docs.items():
        p = prod_dir / f"{ds_id}.json"
        p.write_text(json.dumps(doc), encoding="utf-8")
        paths[ds_id] = p
    monkeypatch.setattr(statss_mod, "_QLFS_DATASET_JSON", paths)

    adapter = _make_adapter(tmp_path)
    result = adapter.fetch_and_apply(dry_run=False, run_id="test-run")

    assert result["status"] == "no_change"
    assert result["version_ids"] == []
    for ds_id in paths:
        assert pending_versions(adapter.config.report_dir, ds_id) == []


def test_fetch_and_apply_unparseable_excel_produces_error_status(tmp_path, monkeypatch):
    file_url = "https://www.statssa.gov.za/publications/P0211/fixture.xlsx"
    _patch_network(monkeypatch, b"not a real xlsx payload", file_url)

    adapter = _make_adapter(tmp_path)
    result = adapter.fetch_and_apply(dry_run=False, run_id="test-run")

    assert result["status"] == "error"
    assert result["version_ids"] == []
    assert any("parse" in e.lower() for e in result["errors"])


def test_fetch_and_apply_pdf_fallback_produces_error_status(tmp_path, monkeypatch):
    file_url = "https://www.statssa.gov.za/publications/P0211/Presentation_QLFS_Q1_2026.pdf"
    _patch_network(monkeypatch, b"%PDF-1.4 fake pdf bytes", file_url)

    adapter = _make_adapter(tmp_path)
    result = adapter.fetch_and_apply(dry_run=False, run_id="test-run")

    assert result["status"] == "error"
    assert any("PDF" in e for e in result["errors"])


def test_fetch_and_apply_protected_field_violation_aborts_only_that_dataset(tmp_path, monkeypatch):
    file_bytes = _build_fixture_workbook()
    file_url = "https://www.statssa.gov.za/publications/P0211/fixture.xlsx"
    _patch_network(monkeypatch, file_bytes, file_url)

    prod_dir = tmp_path / "production"
    prod_dir.mkdir()
    stale_unemployment = {
        "_meta": {},
        "statistics": [
            {"id": "unemployment-national", "rawValue": 31.4,
             "series": [{"data": [{"label": "Q4 2025", "value": 31.4}]}]}
        ],
    }
    paths = {
        "unemployment": prod_dir / "unemployment.json",
        "youth-unemployment": prod_dir / "youth-unemployment.json",
        "labour-force": prod_dir / "labour-force.json",
    }
    paths["unemployment"].write_text(json.dumps(stale_unemployment), encoding="utf-8")
    paths["youth-unemployment"].write_text(json.dumps(_youth_doc()), encoding="utf-8")
    paths["labour-force"].write_text(json.dumps(_labour_force_doc()), encoding="utf-8")
    monkeypatch.setattr(statss_mod, "_QLFS_DATASET_JSON", paths)

    original_transform = statss_mod._transform_unemployment

    def _sabotaged_transform(current_doc, extract, source_url):
        doc = original_transform(current_doc, extract, source_url)
        doc["statistics"][0]["id"] = "unemployment-national-TAMPERED"
        return doc

    monkeypatch.setitem(statss_mod._QLFS_TRANSFORMS, "unemployment", _sabotaged_transform)

    adapter = _make_adapter(tmp_path)
    result = adapter.fetch_and_apply(dry_run=False, run_id="test-run")

    assert any("Protected field violation" in e for e in result["errors"])
    assert pending_versions(adapter.config.report_dir, "unemployment") == []
    assert len(pending_versions(adapter.config.report_dir, "youth-unemployment")) == 1
    assert len(pending_versions(adapter.config.report_dir, "labour-force")) == 1
    # The other two datasets still staged successfully despite one failure.
    assert result["status"] == "ok"
