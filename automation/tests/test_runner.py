"""
automation.tests.test_runner — Tests for runner.py's apply-path translation layer.

These tests call ``automation.runner.translate_apply_result()`` directly —
the REAL translation code that was extracted out of ``run()`` specifically
so it could be tested without duplication (see the Phase 1 completion
audit, finding #9: "None of the 9 [previous] tests import or execute a
single line of the real branch in runner.py"). Every test below fails if
the real function regresses; none of them re-implement the translation
logic inline.
"""

from datetime import datetime, timedelta, timezone

from automation.adapters.base import AdapterResult
from automation.runner import translate_apply_result

STARTED_AT = datetime(2026, 7, 23, 8, 0, 0, tzinfo=timezone.utc)


def _leaf(
    status: str = "error",
    notes: str = "",
    errors: list[str] | None = None,
    version_id: str | None = None,
    release_period: str = "",
    file_url: str = "",
) -> dict:
    """Build a GDP/CPI/Population-shaped sub-dict."""
    return {
        "status": status,
        "notes": notes,
        "errors": errors if errors is not None else [],
        "version_id": version_id,
        "release_period": release_period,
        "file_url": file_url,
    }


def _qlfs_datasets(
    unemployment: dict | None = None,
    youth: dict | None = None,
    labour: dict | None = None,
) -> dict:
    """Build a result['qlfs_datasets'] shaped dict, defaulting to 'error'."""
    default = {"status": "error", "version_id": None, "notes": "", "errors": []}
    return {
        "unemployment": unemployment or dict(default),
        "youth-unemployment": youth or dict(default),
        "labour-force": labour or dict(default),
    }


def _base_res_dict(**overrides) -> dict:
    """A minimal, well-formed fetch_and_apply() result dict."""
    res = {
        "status": "error",
        "file_url": None,
        "release_period": "",
        "version_ids": [],
        "notes": "",
        "errors": [],
        "qlfs_datasets": _qlfs_datasets(),
        "gdp": _leaf(),
        "cpi": _leaf(),
        "population": _leaf(),
    }
    res.update(overrides)
    return res


# ---------------------------------------------------------------------------
# QLFS family — independent per-dataset translation (audit finding #3)
# ---------------------------------------------------------------------------

class TestQLFSFamilyIndependence:
    def test_three_datasets_emitted(self):
        res_dict = _base_res_dict(
            status="ok",
            release_period="Q1 2026",
            file_url="https://www.statssa.gov.za/publications/P0211/QLFS.xlsx",
            qlfs_datasets=_qlfs_datasets(
                unemployment={"status": "ok", "version_id": "v-unemployment", "notes": "", "errors": []},
                youth={"status": "ok", "version_id": "v-youth", "notes": "", "errors": []},
                labour={"status": "ok", "version_id": "v-labour", "notes": "", "errors": []},
            ),
        )

        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )

        qlfs = [d for d in ar.datasets if d.dataset_id in
                ("unemployment", "youth-unemployment", "labour-force")]
        assert len(qlfs) == 3
        assert {d.dataset_id for d in qlfs} == {"unemployment", "youth-unemployment", "labour-force"}
        assert all(d.status == "ok" for d in qlfs)
        assert all("Q1 2026" in d.latest_period for d in qlfs)

    def test_datasets_are_reported_independently_not_blob_merged(self):
        """
        Regression guard for audit finding #3: if only `unemployment`
        changed and staged while the other two didn't change, the report
        must show that — not the same shared status/version_id smeared
        across all three.
        """
        res_dict = _base_res_dict(
            status="ok",
            release_period="Q1 2026",
            qlfs_datasets=_qlfs_datasets(
                unemployment={"status": "ok", "version_id": "v-unemployment-only", "notes": "", "errors": []},
                youth={"status": "no_change", "version_id": None, "notes": "youth: no change", "errors": []},
                labour={"status": "no_change", "version_id": None, "notes": "labour: no change", "errors": []},
            ),
        )

        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        by_id = {d.dataset_id: d for d in ar.datasets}

        assert by_id["unemployment"].status == "ok"
        assert "v-unemployment-only" in by_id["unemployment"].notes

        assert by_id["youth-unemployment"].status == "no_change"
        assert "v-unemployment-only" not in by_id["youth-unemployment"].notes

        assert by_id["labour-force"].status == "no_change"
        assert "v-unemployment-only" not in by_id["labour-force"].notes

    def test_per_dataset_validation_error_isolated_to_that_dataset(self):
        """
        One QLFS dataset failing validation must not mark the other two
        as errored too.
        """
        res_dict = _base_res_dict(
            status="ok",
            release_period="Q1 2026",
            errors=["Validation failed for youth-unemployment: rate out of range"],
            qlfs_datasets=_qlfs_datasets(
                unemployment={"status": "ok", "version_id": "v-unemployment", "notes": "", "errors": []},
                youth={
                    "status": "error", "version_id": None,
                    "notes": "Validation failed for youth-unemployment: rate out of range",
                    "errors": ["Validation failed for youth-unemployment: rate out of range"],
                },
                labour={"status": "ok", "version_id": "v-labour", "notes": "", "errors": []},
            ),
        )

        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        by_id = {d.dataset_id: d for d in ar.datasets}

        assert by_id["unemployment"].status == "ok"
        assert by_id["youth-unemployment"].status == "error"
        assert by_id["labour-force"].status == "ok"
        # Adapter-level status must reflect the worst dataset (error).
        assert ar.status == "error"


# ---------------------------------------------------------------------------
# GDP / CPI / Population — single-dataset flows
# ---------------------------------------------------------------------------

class TestSingleFlowDatasets:
    def test_gdp_single_dataset_emitted(self):
        res_dict = _base_res_dict(
            errors=["QLFS failed"],
            gdp=_leaf(
                status="ok", notes="GDP parsed successfully", version_id="gdp-v1",
                release_period="Q1 2026",
                file_url="https://www.statssa.gov.za/publications/P0441/GDP.xlsx",
            ),
        )
        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        gdp_ds = [d for d in ar.datasets if d.dataset_id == "gdp"]
        assert len(gdp_ds) == 1
        assert gdp_ds[0].status == "ok"
        assert "Q1 2026" in gdp_ds[0].latest_period
        assert "gdp-v1" in gdp_ds[0].notes

    def test_cpi_single_dataset_emitted(self):
        res_dict = _base_res_dict(
            errors=["QLFS failed"],
            cpi=_leaf(
                status="ok", notes="CPI parsed successfully", version_id="cpi-v1",
                release_period="May 2026",
                file_url="https://www.statssa.gov.za/publications/P0141/CPI.xlsx",
            ),
        )
        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        cpi_ds = [d for d in ar.datasets if d.dataset_id == "inflation"]
        assert len(cpi_ds) == 1
        assert cpi_ds[0].status == "ok"
        assert "May 2026" in cpi_ds[0].latest_period
        assert "cpi-v1" in cpi_ds[0].notes

    def test_population_single_dataset_emitted(self):
        res_dict = _base_res_dict(
            errors=["QLFS failed"],
            population=_leaf(
                status="ok", notes="Population parsed successfully", version_id="pop-v1",
                release_period="2024",
                file_url="https://www.statssa.gov.za/publications/P0302/Population.xlsx",
            ),
        )
        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        pop_ds = [d for d in ar.datasets if d.dataset_id == "population"]
        assert len(pop_ds) == 1
        assert pop_ds[0].status == "ok"
        assert "2024" in pop_ds[0].latest_period
        assert "pop-v1" in pop_ds[0].notes


# ---------------------------------------------------------------------------
# version_id cross-contamination (audit finding #2)
# ---------------------------------------------------------------------------

class TestVersionIdIsolation:
    def test_gdp_cpi_population_version_ids_never_leak_into_qlfs_notes(self):
        res_dict = _base_res_dict(
            status="ok",
            release_period="Q1 2026",
            qlfs_datasets=_qlfs_datasets(
                unemployment={"status": "ok", "version_id": "qlfs-unemployment-v1", "notes": "", "errors": []},
            ),
            gdp=_leaf(status="ok", version_id="gdp-v1", release_period="Q1 2026"),
            cpi=_leaf(status="ok", version_id="cpi-v1", release_period="May 2026"),
            population=_leaf(status="ok", version_id="pop-v1", release_period="2024"),
        )

        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        by_id = {d.dataset_id: d for d in ar.datasets}

        # QLFS's own version_id is present ...
        assert "qlfs-unemployment-v1" in by_id["unemployment"].notes
        # ... but none of GDP/CPI/Population's version_ids contaminate it.
        assert "gdp-v1" not in by_id["unemployment"].notes
        assert "cpi-v1" not in by_id["unemployment"].notes
        assert "pop-v1" not in by_id["unemployment"].notes

        # And each flow's own version_id shows up only in its own entry.
        assert "gdp-v1" in by_id["gdp"].notes
        assert "cpi-v1" not in by_id["gdp"].notes
        assert "cpi-v1" in by_id["inflation"].notes
        assert "gdp-v1" not in by_id["inflation"].notes
        assert "pop-v1" in by_id["population"].notes
        assert "gdp-v1" not in by_id["population"].notes


# ---------------------------------------------------------------------------
# Error routing (audit finding #1)
# ---------------------------------------------------------------------------

class TestErrorRouting:
    def test_errors_key_not_validation_errors(self):
        res_dict = _base_res_dict(
            errors=["Downloaded QLFS publication is not an Excel workbook"],
        )
        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        assert len(ar.errors) == 1
        assert "Downloaded QLFS publication is not an Excel workbook" in ar.errors[0]

    def test_gdp_cpi_population_errors_are_prefixed_and_isolated(self):
        res_dict = _base_res_dict(
            gdp=_leaf(status="error", errors=["GDP boom"]),
            cpi=_leaf(status="error", errors=["CPI boom"]),
            population=_leaf(status="error", errors=["Population boom"]),
        )
        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        assert any("[GDP] GDP boom" in e for e in ar.errors)
        assert any("[CPI] CPI boom" in e for e in ar.errors)
        assert any("[Population] Population boom" in e for e in ar.errors)


# ---------------------------------------------------------------------------
# Status preservation & worst-status roll-up (audit findings #6, #5)
# ---------------------------------------------------------------------------

class TestStatusHandling:
    def test_status_preserves_no_change_and_no_publication_found(self):
        res_dict = _base_res_dict(
            status="no_change",
            notes="No change detected",
            release_period="Q1 2026",
            file_url="https://example.com/QLFS.xlsx",
            qlfs_datasets=_qlfs_datasets(
                unemployment={"status": "no_change", "version_id": None, "notes": "", "errors": []},
                youth={"status": "no_change", "version_id": None, "notes": "", "errors": []},
                labour={"status": "no_change", "version_id": None, "notes": "", "errors": []},
            ),
            gdp=_leaf(status="no_publication_found", notes="No GDP publication found"),
            cpi=_leaf(status="ok", version_id="cpi-v1", release_period="May 2026"),
            population=_leaf(status="ok", version_id="pop-v1", release_period="2024"),
        )
        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        by_id = {d.dataset_id: d for d in ar.datasets}
        assert by_id["unemployment"].status == "no_change"
        assert by_id["gdp"].status == "no_publication_found"
        assert by_id["inflation"].status == "ok"
        assert by_id["population"].status == "ok"

    def test_adapter_status_worst_of_all_datasets(self):
        res_dict = _base_res_dict(
            status="ok",
            qlfs_datasets=_qlfs_datasets(
                unemployment={"status": "ok", "version_id": "v1", "notes": "", "errors": []},
                youth={"status": "ok", "version_id": "v2", "notes": "", "errors": []},
                labour={"status": "ok", "version_id": "v3", "notes": "", "errors": []},
            ),
            gdp=_leaf(status="error", errors=["GDP failed"]),
            cpi=_leaf(status="no_change"),
            population=_leaf(status="ok"),
        )
        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        assert ar.status == "error"  # worst status is GDP's "error"

    def test_unknown_status_never_silently_becomes_ok(self):
        """
        Regression guard for audit finding #5: a status value outside the
        known vocabulary must map to "unknown" and must never silently
        collapse the whole adapter result to "ok", even when every other
        dataset is fine.
        """
        res_dict = _base_res_dict(
            status="ok",
            qlfs_datasets=_qlfs_datasets(
                unemployment={"status": "ok", "version_id": "v1", "notes": "", "errors": []},
                youth={"status": "some_new_status_the_runner_has_never_seen", "version_id": None, "notes": "", "errors": []},
                labour={"status": "ok", "version_id": "v3", "notes": "", "errors": []},
            ),
            gdp=_leaf(status="ok"),
            cpi=_leaf(status="ok"),
            population=_leaf(status="ok"),
        )
        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        by_id = {d.dataset_id: d for d in ar.datasets}
        assert by_id["youth-unemployment"].status == "unknown"
        # The adapter-level status must reflect that something unrecognised
        # happened — it must NOT be "ok".
        assert ar.status == "unknown"

    def test_no_publication_found_single_dataset_adapter(self):
        res_dict = {
            "dataset_id": "interest-rates",
            "status": "no_publication_found",
            "errors": [],
            "notes": "No publication found this cycle",
            "file_url": "",
        }
        ar = translate_apply_result(
            source_id="sarb", display_name="South African Reserve Bank",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        assert ar.status == "no_publication_found"
        assert ar.datasets[0].status == "no_publication_found"


# ---------------------------------------------------------------------------
# Single-dataset adapters (e.g. SARB)
# ---------------------------------------------------------------------------

class TestSingleDatasetAdapter:
    def test_single_dataset_adapter_translation(self):
        res_dict = {
            "dataset_id": "interest-rates",
            "status": "ok",
            "errors": [],
            "notes": "Interest rates updated",
            "file_url": "https://example.com/rates.xlsx",
        }
        ar = translate_apply_result(
            source_id="sarb", display_name="South African Reserve Bank",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        assert len(ar.datasets) == 1
        assert ar.datasets[0].dataset_id == "interest-rates"
        assert ar.status == "ok"

    def test_single_dataset_adapter_errors_propagate(self):
        res_dict = {
            "dataset_id": "interest-rates",
            "status": "error",
            "errors": ["Download failed"],
            "notes": "",
            "file_url": "",
        }
        ar = translate_apply_result(
            source_id="sarb", display_name="South African Reserve Bank",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        assert ar.status == "error"
        assert "Download failed" in ar.errors


# ---------------------------------------------------------------------------
# started_at wiring (audit finding #4)
# ---------------------------------------------------------------------------

class TestStartedAtWiring:
    def test_started_at_flows_through_unmodified(self):
        """
        translate_apply_result() must use exactly the started_at it was
        given — it must not capture its own timestamp internally (which
        is what enabled the run()-level shadowing bug in the first place:
        a second, later `datetime.now()` overwriting the true start time).
        """
        res_dict = _base_res_dict(status="ok")
        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        assert ar.started_at == STARTED_AT

    def test_duration_ms_reflects_the_provided_started_at(self):
        res_dict = _base_res_dict(status="ok")
        ar = translate_apply_result(
            source_id="statssa", display_name="Statistics South Africa",
            res_dict=res_dict, started_at=STARTED_AT,
        )
        ar.finished_at = STARTED_AT + timedelta(milliseconds=1500)
        assert ar.duration_ms == 1500
