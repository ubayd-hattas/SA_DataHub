"""Cross-dataset consistency checks (SARB rates, LFPR, provincial periods)."""

from __future__ import annotations

from validation.loaders import all_statistics, load_json_datasets
from validation.models import CheckResult, Severity


def _latest_series_value(stat: dict) -> tuple[str, float] | None:
    series = stat.get("series")
    if not series or not series[0].get("data"):
        return None
    last = series[0]["data"][-1]
    return last["label"], float(last["value"])


def run() -> CheckResult:
    result = CheckResult(name="check_dataset_consistency")
    datasets = load_json_datasets()
    stats = {s["id"]: s for _, s in all_statistics(datasets)}

    # SARB repo rate: inflation repo-rate vs interest-rates repo-rate-sarb
    repo_inf = stats.get("repo-rate")
    repo_ir = stats.get("repo-rate-sarb")
    if repo_inf and repo_ir:
        if abs(repo_inf["rawValue"] - repo_ir["rawValue"]) > 0.01:
            result.add(
                Severity.WARN,
                f"SARB repo headline mismatch: repo-rate={repo_inf['rawValue']}% "
                f"vs repo-rate-sarb={repo_ir['rawValue']}%",
                "Sync interest-rates.json with inflation.json or consolidate to one canonical stat.",
            )
        else:
            result.add(Severity.PASS, "SARB repo headline values match across inflation and interest-rates.")

        inf_last = _latest_series_value(repo_inf)
        ir_last = _latest_series_value(repo_ir)
        if inf_last and ir_last and inf_last[0].endswith("2026"):
            # Compare Mar 2026 if both have it
            inf_mar = next(
                (p for p in repo_inf["series"][0]["data"] if p["label"] == "Mar 2026"),
                None,
            )
            ir_mar = next(
                (p for p in repo_ir["series"][0]["data"] if p["label"] == "Mar 2026"),
                None,
            )
            if inf_mar and ir_mar and abs(inf_mar["value"] - ir_mar["value"]) > 0.01:
                result.add(
                    Severity.WARN,
                    f"Mar 2026 repo series mismatch: {inf_mar['value']}% vs {ir_mar['value']}%",
                    "Align MPC decision series in interest-rates.json with inflation.json.",
                )

    # LFPR: labour-force-participation vs lfpr-overall
    lfpr_old = stats.get("labour-force-participation")
    lfpr_new = stats.get("lfpr-overall")
    if lfpr_old and lfpr_new:
        if abs(lfpr_old["rawValue"] - lfpr_new["rawValue"]) > 1.0:
            result.add(
                Severity.WARN,
                f"LFPR headline mismatch: labour-force-participation={lfpr_old['rawValue']}% "
                f"vs lfpr-overall={lfpr_new['rawValue']}%",
                "Manual review required — may be different age definitions. "
                "Resolve before migration to avoid duplicate/conflicting observations.",
                stat_a="labour-force-participation",
                stat_b="lfpr-overall",
            )

    # Provincial unemployment period vs national
    nat = stats.get("unemployment-national")
    provinces = datasets.get("provinces", {}).get("provinces", [])
    if nat and provinces:
        nat_series = nat.get("series", [{}])[0].get("data", [])
        nat_period = nat_series[-1]["label"] if nat_series else None
        prov_periods = {p["stats"]["unemployment"]["period"] for p in provinces}
        if nat_period and len(prov_periods) == 1:
            prov_period = next(iter(prov_periods))
            if prov_period != nat_period:
                result.add(
                    Severity.WARN,
                    f"Provincial unemployment period ({prov_period}) lags national ({nat_period}).",
                    "Update provinces.json unemployment block on next QLFS release.",
                )
        elif len(prov_periods) > 1:
            result.add(
                Severity.WARN,
                f"Inconsistent provincial unemployment periods: {sorted(prov_periods)}",
            )

    # Prime = repo + 3.5
    prime = stats.get("prime-lending-rate")
    if repo_ir and prime:
        expected = round(repo_ir["rawValue"] + 3.5, 2)
        if abs(prime["rawValue"] - expected) > 0.11:
            result.add(
                Severity.WARN,
                f"Prime rate {prime['rawValue']}% != repo {repo_ir['rawValue']}% + 3.5 "
                f"(expected {expected}%)",
                "Verify prime lending rate against SARB convention.",
            )
        else:
            result.add(Severity.PASS, "Prime lending rate follows repo + 3.5% convention.")

    if not result.findings:
        result.add(Severity.PASS, "No cross-dataset consistency issues detected.")

    return result
