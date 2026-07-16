"""
End-to-end test of the staging -> approval -> promote pipeline (Work Item 4).

This does not exercise any adapter or live network call. It exercises the
generic core pipeline directly:

    write_staged_dataset()  -> new_version_entry() / save_version_entry()
    -> approve_version()    -> promote_version()

covering both the "happy path" (approved version promotes successfully) and
the safety property the whole pipeline exists for (an un-approved / pending
or rejected version must never reach the production file).
"""

import json

import pytest

from automation.core.promote import promote_version
from automation.core.staging import read_staged_dataset, write_staged_dataset
from automation.core.version import (
    approve_version,
    new_version_entry,
    pending_versions,
    reject_version,
    save_version_entry,
)


@pytest.fixture
def production_path(tmp_path, monkeypatch):
    """Redirect promote_version()'s production target into a temp directory
    so this test never touches the real src/data/datasets/ tree."""
    target = tmp_path / "production" / "interest-rates.json"

    def _fake_get_production_dataset_path(dataset_id):
        return tmp_path / "production" / f"{dataset_id}.json"

    monkeypatch.setattr(
        "automation.core.promote.get_production_dataset_path",
        _fake_get_production_dataset_path,
    )
    return target


def test_full_stage_approve_promote_cycle(tmp_path, production_path):
    report_dir = tmp_path / "reports"
    candidate_doc = {"statistics": [{"id": "repo-rate-sarb", "rawValue": 7.25}]}

    # 1. Stage the candidate (what fetch_and_apply() does)
    write_staged_dataset(
        report_dir,
        dataset_id="interest-rates",
        version_id="v1",
        document=candidate_doc,
    )

    version = new_version_entry(dataset_id="interest-rates", source_id="sarb")
    version.version_id = "v1"  # align with the staged artifact for this test
    save_version_entry(report_dir, version)

    assert len(pending_versions(report_dir, "interest-rates")) == 1

    # 2. Promotion must be refused before approval
    with pytest.raises(ValueError, match="requires 'approved'"):
        promote_version(report_dir, "interest-rates", "v1")
    assert not production_path.exists()

    # 3. Approve
    approve_version(report_dir, "interest-rates", "v1", approver="test-reviewer")
    assert len(pending_versions(report_dir, "interest-rates")) == 0

    # 4. Promote — now allowed
    result_path = promote_version(report_dir, "interest-rates", "v1")
    assert result_path == production_path
    assert production_path.exists()
    written = json.loads(production_path.read_text(encoding="utf-8"))
    assert written == candidate_doc

    # Staged copy is unchanged / still readable (promote does not delete staging)
    assert read_staged_dataset(report_dir, "interest-rates", "v1") == candidate_doc


def test_rejected_version_never_reaches_production(tmp_path, production_path):
    report_dir = tmp_path / "reports"
    write_staged_dataset(
        report_dir,
        dataset_id="interest-rates",
        version_id="v2",
        document={"statistics": []},
    )
    version = new_version_entry(dataset_id="interest-rates", source_id="sarb")
    version.version_id = "v2"
    save_version_entry(report_dir, version)

    reject_version(report_dir, "interest-rates", "v2")

    with pytest.raises(ValueError, match="requires 'approved'"):
        promote_version(report_dir, "interest-rates", "v2")
    assert not production_path.exists()


def test_promote_unknown_version_raises(tmp_path, production_path):
    report_dir = tmp_path / "reports"
    with pytest.raises(ValueError, match="not found"):
        promote_version(report_dir, "interest-rates", "does-not-exist")
