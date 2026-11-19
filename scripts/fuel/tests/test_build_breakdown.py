"""Tests for scripts/fuel/build_breakdown.py, on small made-up tables (not DMPR files)."""
import io
import sys
import zipfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build_breakdown as bb  # noqa: E402

W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'


def _cell(text):
    return f"<w:tc><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:tc>"


def _docx(tmp_path, caption, header, rows, name="t.docx"):
    trs = "".join("<w:tr>" + "".join(_cell(c) for c in r) + "</w:tr>" for r in [caption, header, *rows])
    xml = f'<?xml version="1.0"?><w:document {W}><w:body><w:tbl>{trs}</w:tbl></w:body></w:document>'
    path = tmp_path / name
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("word/document.xml", xml)
    return path


HEADER = ["", "BFP", "Fuel tax", "Whole-sale margin", "Slate levy"]


def test_reads_a_table_joining_hyphenated_headings_and_skipping_empty_months(tmp_path):
    p = _docx(tmp_path, ["2026 (RSA c/litre)", "", "", "", "95 Octane"], HEADER,
              [["Jan", "900.10", "415.000", "66.500", "0.00"], ["Feb", "850.00", "415", "66.5", "1 012.5"], ["Mar", "", "", "", ""]])
    [t] = bb.parse_tables(p)
    assert t["product"] == "petrol95"
    assert [m["month"] for m in t["months"]] == ["2026-01", "2026-02"]
    ids = [e["id"] for e in t["months"][0]["elements"]]
    assert ids == ["basicFuelPrice", "fuelLevy", "wholesaleMargin", "slateLevy"]
    assert t["months"][1]["elements"][3]["cents"] == 1012.5


@pytest.mark.parametrize("cell", ["135.84 1", "12 5.5", "12.5c", "abc", "1.2.3"])
def test_rejects_cells_that_are_not_one_plain_number(cell):
    with pytest.raises(bb.BreakdownError):
        bb._number(cell)


def test_reads_a_unicode_minus_and_non_breaking_spaces():
    assert bb._number("\u22121\u00a0234.5") == -1234.5


def test_fails_on_an_unknown_column(tmp_path):
    p = _docx(tmp_path, ["2026", "95 Octane"], ["", "BFP", "Mystery levy"], [["Jan", "1", "2"]])
    with pytest.raises(bb.BreakdownError, match="unknown column"):
        bb.parse_tables(p)


def test_fails_on_a_repeated_month(tmp_path):
    p = _docx(tmp_path, ["2026", "95 Octane"], ["", "BFP"], [["Jan", "1"], ["Jan", "2"]])
    with pytest.raises(bb.BreakdownError, match="appears twice"):
        bb.parse_tables(p)


def test_fails_on_a_missing_middle_month(tmp_path):
    p = _docx(tmp_path, ["2026", "95 Octane"], ["", "BFP"], [["Jan", "1"], ["Mar", "2"]])
    with pytest.raises(bb.BreakdownError, match="without gaps"):
        bb.parse_tables(p)


def test_does_not_read_a_petrol_table_that_is_not_95(tmp_path):
    p = _docx(tmp_path, ["2026", "Petrol 93 Octane"], ["", "BFP"], [["Jan", "1"]])
    assert bb.parse_tables(p) == []
