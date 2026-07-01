"""
scripts/update_sarb_rates.py — Apply the latest SARB interest rates.

One-shot script that:
  1. Runs the SARB adapter's full fetch_and_apply() pipeline.
  2. Prints a human-readable change summary.
  3. Writes a timestamped Markdown + JSON execution report.
  4. Exits 0 on success (including "no change"), 1 on error.

Usage
-----
    # Dry run — see what would change without touching any files
    python scripts/update_sarb_rates.py --dry-run

    # Live run — applies the update and writes the version entry
    python scripts/update_sarb_rates.py

    # JSON output for CI/CD pipelines
    python scripts/update_sarb_rates.py --json

    # Verbose logging
    python scripts/update_sarb_rates.py --log-level DEBUG

After a successful live run, the updated interest-rates.json is written and
a 'pending' version entry is recorded.  Run the ETL pipeline to load it into
PostgreSQL:

    from etl.pipelines.interest_rates import run
    result = run(load=True)

Manual approval workflow
------------------------
The version entry is recorded with status='pending'.  Before the ETL load,
a human reviewer should confirm:
  1. The new repo rate matches the official SARB MPC announcement.
  2. The prime rate equals repo + 3.5 pp.
  3. The effective date matches the published MPC decision date.
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Ensure project root is on path
_HERE = Path(__file__).resolve().parent
_PROJECT_ROOT = _HERE.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from automation.adapters import autodiscover, get_registry
from automation.core.config import load_config
from automation.core.logging import configure_logging, get_logger, set_run_id
from automation.core.report import (
    AdapterReport,
    ExecutionReport,
    write_json_report,
    write_report,
)

log = get_logger(__name__)


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="python scripts/update_sarb_rates.py",
        description="Apply the latest SARB interest rates to interest-rates.json",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Read-only — detect and report changes but do not write any files",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        dest="output_json",
        help="Output result as JSON (useful for CI/CD)",
    )
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="INFO",
        help="Logging verbosity",
    )
    args = parser.parse_args()

    configure_logging(args.log_level)
    run_id = uuid.uuid4().hex[:12]
    set_run_id(run_id)
    started_at = datetime.now(tz=timezone.utc)

    log.info(
        "SARB rate updater started — run_id=%s dry_run=%s",
        run_id,
        args.dry_run,
    )

    config = load_config(dry_run=args.dry_run)
    autodiscover()
    registry = get_registry()

    sarb_cls = registry.get("sarb")
    if sarb_cls is None:
        print("ERROR: SARB adapter not registered.", file=sys.stderr)
        return 1

    source_config = config.sources.get("sarb")
    adapter = sarb_cls(config=config, source_config=source_config)

    # Validate config
    config_errors = adapter.validate_config()
    if config_errors:
        for err in config_errors:
            print(f"Config error: {err}", file=sys.stderr)
        return 1

    # Run fetch_and_apply
    result = adapter.fetch_and_apply(dry_run=args.dry_run, run_id=run_id)

    finished_at = datetime.now(tz=timezone.utc)
    duration_s = (finished_at - started_at).total_seconds()

    # Output
    if args.output_json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print()
        print("=" * 68)
        print("  SARB INTEREST RATE UPDATER")
        print(f"  Run ID: {run_id}")
        print(f"  Mode:   {'DRY RUN' if args.dry_run else 'LIVE'}")
        print(f"  Status: {result['status'].upper()}")
        print("=" * 68)
        print()

        if result["status"] == "no_change":
            print(
                f"  [OK] No change: interest-rates.json is already current.\n"
                f"    Repo:  {result.get('new_repo', '?'):.2f}%\n"
                f"    Prime: {result.get('new_prime', '?'):.2f}%\n"
                f"    API date: {result.get('effective_date', '?')}"
            )
        elif result["status"] == "ok":
            print(f"  [OK] Update {'staged (dry run)' if args.dry_run else 'applied'}.") 
            print(
                f"    Repo:  {result.get('new_repo', '?'):.2f}%  "
                f"  Prime: {result.get('new_prime', '?'):.2f}%"
            )
            print(f"    Effective: {result.get('effective_date', '?')}")
            if result.get("archive_path"):
                print(f"    Archive:   {result['archive_path']}")
            if result.get("version_id"):
                print(f"    Version:   {result['version_id']} (status=pending)")
            print()
            if result.get("change_summary"):
                print(result["change_summary"])
        else:
            print(f"  [FAIL] Status: {result['status']}")

        if result.get("validation_errors"):
            print()
            print("  Validation errors:")
            for err in result["validation_errors"]:
                print(f"    [FAIL] {err}")

        if result.get("protected_field_violations"):
            print()
            print("  Protected field violations (BLOCKED):")
            for v in result["protected_field_violations"]:
                print(f"    [BLOCKED] {v}")

        print()
        print(f"  Duration: {duration_s:.2f} s")
        print("=" * 68)
        print()

        if result["status"] == "ok" and not args.dry_run:
            print(
                "  Next steps:\n"
                "  1. Review interest-rates.json for correctness.\n"
                "  2. Verify rates against official SARB MPC statement.\n"
                "  3. Run ETL load:\n"
                "       python -c \"from etl.pipelines.interest_rates import run; "
                "print(run(load=True))\"\n"
            )

    # Write execution report (unless dry-run or JSON mode)
    if not args.dry_run and not args.output_json:
        try:
            config.report_dir.mkdir(parents=True, exist_ok=True)
            status_map = {
                "ok": "ok",
                "no_change": "no_change",
                "error": "error",
            }
            adapter_report = AdapterReport(
                adapter_id="sarb",
                display_name="South African Reserve Bank",
                status=status_map.get(result["status"], "warning"),
                datasets_checked=["interest-rates"],
                datasets_changed=(
                    ["interest-rates"] if result["status"] == "ok" else []
                ),
                warnings=result.get("validation_errors", []),
                errors=(
                    result.get("validation_errors", [])
                    if result["status"] == "error"
                    else []
                ),
                notes=result.get("change_summary", ""),
            )
            exec_report = ExecutionReport(
                run_id=run_id,
                started_at=started_at,
                finished_at=finished_at,
                dry_run=args.dry_run,
                adapters=[adapter_report],
            )
            report_path = write_report(exec_report, config.report_dir)
            write_json_report(exec_report, config.report_dir)
            log.info("Report written → %s", report_path)
            if not args.output_json:
                print(f"  Report: {report_path}\n")
        except Exception as exc:
            log.warning("Failed to write report: %s", exc)

    # Exit code
    if result["status"] == "error":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
