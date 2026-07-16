"""
automation.runner — SA Data Hub automation framework runner.

This is the top-level executable for the automation framework.

Usage
-----
    python -m automation.runner              # run all adapters
    python -m automation.runner --list       # list registered adapters
    python -m automation.runner --adapter sarb  # run one adapter
    python -m automation.runner --dry-run    # read-only run (no writes)
    python -m automation.runner --json       # JSON output

What it does
------------
1. Parses CLI arguments.
2. Configures logging.
3. Loads configuration (automation/config/).
4. Auto-discovers and registers all adapters.
5. Validates configuration for each adapter.
6. Runs each adapter in priority order.
7. Prints a formatted execution summary.
8. Writes a Markdown report to automation/reports/archive/.
9. Exits with code 0 (all OK), 1 (errors), or 2 (warnings only).

Constraints
-----------
- Does NOT download any data.
- Does NOT modify ETL, PostgreSQL, or frontend code.
- Does NOT run if the project cannot import its own modules.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Ensure the project root is on the Python path when run directly
# ---------------------------------------------------------------------------

_HERE = Path(__file__).resolve()
_AUTOMATION_DIR = _HERE.parent
_PROJECT_ROOT = _AUTOMATION_DIR.parent

if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# ---------------------------------------------------------------------------
# Framework imports
# ---------------------------------------------------------------------------

from automation.adapters import autodiscover, get_registry
from automation.adapters.base import AdapterResult, BaseAdapter
from automation.core.config import AutomationConfig, load_config
from automation.core.logging import configure_logging, get_logger, set_run_id
from automation.core.report import (
    AdapterReport,
    ExecutionReport,
    write_json_report,
    write_report,
)
from automation.core.version import save_version_entry  # noqa: F401 (Phase B)


# ---------------------------------------------------------------------------
# Logger (set up after configure_logging is called in main)
# ---------------------------------------------------------------------------

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

_STATUS_ICONS = {
    "ok": "✔",
    "skipped": "–",
    "warning": "!",
    "error": "✖",
    "no_change": "○",
    "OK": "✔",
    "WARNING": "!",
    "ERROR": "✖",
    "NO_CHANGE": "○",
}


def _fmt_adapter_result(result: AdapterResult) -> list[str]:
    icon = _STATUS_ICONS.get(result.status, "?")
    lines = [
        f"  [{icon}] {result.display_name} ({result.source_id})"
        f"  —  {result.status.upper()}  [{result.duration_ms} ms]",
    ]
    checked = result.datasets_checked
    if checked:
        lines.append(f"      Datasets checked:  {', '.join(checked)}")
    updates = result.datasets_with_updates
    if updates:
        lines.append(f"      Updates detected:  {', '.join(updates)}")
    for w in result.warnings:
        lines.append(f"      WARN  {w}")
    for e in result.errors:
        lines.append(f"      FAIL  {e}")
    if result.notes:
        lines.append(f"      Note: {result.notes}")
    return lines


def _print_summary(
    report: ExecutionReport,
    adapter_results: list[AdapterResult],
    *,
    verbose: bool = False,
) -> None:
    """Print a formatted execution summary to stdout."""
    width = 70
    print("=" * width)
    print("  SA DATA HUB — AUTOMATION FRAMEWORK")
    print(f"  Run ID: {report.run_id}")
    print(f"  Mode:   {'DRY RUN' if report.dry_run else 'LIVE'}")
    print(f"  Status: {report.overall_status}")
    print("=" * width)
    print()

    if not adapter_results:
        print("  No adapters were executed.")
        print()
    else:
        print("  Adapter Results")
        print("  " + "-" * (width - 2))
        for result in sorted(adapter_results, key=lambda r: r.started_at):
            for line in _fmt_adapter_result(result):
                print(line)
        print()

    # Dataset-level summary table
    print("  Dataset Status")
    print("  " + "-" * (width - 2))
    has_any = False
    for result in sorted(adapter_results, key=lambda r: r.started_at):
        for ds in result.datasets:
            icon = "!" if ds.status == "update_available" else (
                "✖" if ds.status == "error" else (
                    "–" if ds.status == "skipped" else "○"
                )
            )
            line = f"  {icon}  {ds.dataset_id:<30} {ds.status}"
            if ds.latest_period and verbose:
                line += f"  ({ds.latest_period})"
            print(line)
            has_any = True
    if not has_any:
        print("  (none)")
    print()

    # Global issues
    if report.global_warnings or report.global_errors:
        print("  Global Issues")
        print("  " + "-" * (width - 2))
        for w in report.global_warnings:
            print(f"  ! {w}")
        for e in report.global_errors:
            print(f"  ✖ {e}")
        print()

    # Timing
    print(
        f"  Duration: {report.duration_seconds:.2f} s"
    )
    print("=" * width)


# ---------------------------------------------------------------------------
# List adapters
# ---------------------------------------------------------------------------


def _list_adapters(config: AutomationConfig) -> int:
    """Print a table of registered adapters and their datasets."""
    registry = get_registry()
    if not registry:
        print("No adapters registered.")
        return 0

    print(f"\n{'Source ID':<16} {'Display Name':<32} {'Priority':>8}  Datasets")
    print("-" * 80)
    for sid, cls in sorted(registry.items(), key=lambda kv: kv[1].priority):
        instance = cls(
            config=config,
            source_config=config.sources.get(sid),
        )
        ds_list = ", ".join(instance.datasets()) or "(none)"
        print(
            f"{sid:<16} {cls.display_name:<32} {cls.priority:>8}  {ds_list}"
        )

    print()
    return 0


# ---------------------------------------------------------------------------
# Describe adapter
# ---------------------------------------------------------------------------


def _describe_adapter(config: AutomationConfig, source_id: str) -> int:
    """Print a full description of a single adapter."""
    registry = get_registry()
    cls = registry.get(source_id)
    if cls is None:
        print(f"Adapter not found: {source_id!r}", file=sys.stderr)
        print(f"Available: {', '.join(sorted(registry))}", file=sys.stderr)
        return 1

    instance = cls(config=config, source_config=config.sources.get(source_id))
    description = instance.describe()
    print(json.dumps(description, indent=2, default=str))
    return 0


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------


def run(
    *,
    adapter_filter: str | None = None,
    dry_run: bool = False,
    log_level: str = "INFO",
    output_json: bool = False,
    verbose: bool = False,
    no_report: bool = False,
    apply: bool = False,
) -> int:
    """
    Execute the automation framework.

    Parameters
    ----------
    adapter_filter:
        If set, only run the adapter with this source_id.
    dry_run:
        When True, version entries and reports are not written to disk.
    log_level:
        Logging verbosity.
    output_json:
        When True, print the execution report as JSON to stdout.
    verbose:
        Show additional detail in the console summary.
    no_report:
        Skip writing the Markdown/JSON report files.
    apply:
        Run fetch_and_apply instead of check_for_updates.

    Returns
    -------
    int
        Exit code: 0=OK, 1=errors, 2=warnings.
    """
    # 1. Configure logging
    configure_logging(log_level)

    # 2. Generate run ID
    run_id = uuid.uuid4().hex[:12]
    set_run_id(run_id)

    started_at = datetime.now(tz=timezone.utc)
    log.info("Automation runner started — run_id=%s dry_run=%s apply=%s", run_id, dry_run, apply)

    # 3. Load configuration
    try:
        config = load_config(dry_run=dry_run, log_level=log_level)
    except Exception as exc:
        log.error("Failed to load configuration: %s", exc)
        print(f"ERROR: Failed to load configuration: {exc}", file=sys.stderr)
        return 1

    log.info(
        "Config loaded — %d sources, %d datasets configured",
        len(config.sources),
        len(config.datasets),
    )

    # 4. Ensure output directories exist
    try:
        config.report_dir.mkdir(parents=True, exist_ok=True)
        config.raw_archive_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        log.error("Cannot create output directories: %s", exc)
        return 1

    # 5. Auto-discover and register adapters
    imported_modules = autodiscover()
    registry = get_registry()
    log.info(
        "Adapter discovery complete — %d modules imported, %d adapters registered: %s",
        len(imported_modules),
        len(registry),
        ", ".join(sorted(registry)),
    )

    if not registry:
        log.warning("No adapters registered — nothing to run.")
        return 0

    # 6. Filter adapters
    adapters_to_run: list[type[BaseAdapter]] = []
    if adapter_filter:
        cls = registry.get(adapter_filter)
        if cls is None:
            log.error(
                "Adapter not found: %r  Available: %s",
                adapter_filter,
                ", ".join(sorted(registry)),
            )
            return 1
        adapters_to_run = [cls]
        log.info("Running single adapter: %s", adapter_filter)
    else:
        adapters_to_run = sorted(registry.values(), key=lambda c: c.priority)
        log.info(
            "Running %d adapters in priority order: %s",
            len(adapters_to_run),
            ", ".join(c.source_id for c in adapters_to_run),
        )

    # 7. Execute adapters
    adapter_results: list[AdapterResult] = []
    global_warnings: list[str] = []
    global_errors: list[str] = []

    from automation.adapters.base import DatasetCheckResult

    for adapter_cls in adapters_to_run:
        source_id = adapter_cls.source_id
        source_config = config.sources.get(source_id)

        if source_config is not None and not source_config.enabled:
            log.info("Adapter %s is disabled in config — skipping.", source_id)
            continue

        try:
            instance = adapter_cls(config=config, source_config=source_config)
        except Exception as exc:
            msg = f"Failed to instantiate adapter {source_id}: {exc}"
            log.error(msg)
            global_errors.append(msg)
            continue

        try:
            if apply and hasattr(instance, "fetch_and_apply"):
                log.info("Running fetch_and_apply for %s", source_id)
                res_dict = instance.fetch_and_apply(dry_run=dry_run, run_id=run_id)
                dataset_id = res_dict.get("dataset_id", "unknown")
                status = res_dict.get("status", "error")
                
                # Convert fetch_and_apply dict to standard AdapterResult
                ar = AdapterResult(
                    adapter_id=instance.source_id,
                    source_id=instance.source_id,
                    display_name=instance.display_name,
                    started_at=datetime.now(tz=timezone.utc),
                    status="ok" if status != "error" else "error"
                )
                
                ds_res = DatasetCheckResult(
                    dataset_id=dataset_id,
                    status=status if status in ("up_to_date", "update_available", "error", "skipped", "unknown") else "unknown",
                    message=res_dict.get("change_summary", ""),
                    notes=f"Version ID: {res_dict.get('version_id')}"
                )
                ar.datasets.append(ds_res)
                if res_dict.get("validation_errors"):
                    for e in res_dict["validation_errors"]:
                        ar.add_error(e)
                ar.finished_at = datetime.now(tz=timezone.utc)
                adapter_results.append(ar)
            else:
                result = instance.run(dry_run=dry_run)
                adapter_results.append(result)
        except Exception as exc:
            msg = f"Adapter {source_id} raised an unhandled exception: {exc}"
            log.exception(msg)
            global_errors.append(msg)


    # 8. Build execution report
    finished_at = datetime.now(tz=timezone.utc)

    report = ExecutionReport(
        run_id=run_id,
        started_at=started_at,
        finished_at=finished_at,
        dry_run=dry_run,
        global_warnings=global_warnings,
        global_errors=global_errors,
        config_summary={
            "sources_configured": len(config.sources),
            "datasets_configured": len(config.datasets),
            "adapters_registered": len(registry),
            "adapters_run": len(adapter_results),
            "log_level": log_level,
        },
    )

    for result in adapter_results:
        report.adapters.append(
            AdapterReport(
                adapter_id=result.adapter_id,
                display_name=result.display_name,
                status=result.status,
                datasets_checked=result.datasets_checked,
                datasets_changed=result.datasets_with_updates,
                warnings=result.warnings,
                errors=result.errors,
                duration_ms=result.duration_ms,
                notes=result.notes,
            )
        )

    # 9. Output
    if output_json:
        import dataclasses
        print(json.dumps(dataclasses.asdict(report), indent=2, default=str))
    else:
        _print_summary(report, adapter_results, verbose=verbose)

    # 10. Write report files
    if not dry_run and not no_report:
        try:
            report_path = write_report(report, config.report_dir)
            write_json_report(report, config.report_dir)
            log.info("Report written → %s", report_path)
            if not output_json:
                print(f"\n  Report: {report_path}")
        except Exception as exc:
            log.warning("Failed to write report: %s", exc)
            global_warnings.append(f"Report write failed: {exc}")
    elif dry_run and not output_json:
        print(
            "\n  [DRY RUN] Report not written. "
            "Re-run without --dry-run to persist reports."
        )

    # 11. Exit code
    if global_errors or any(r.status == "error" for r in adapter_results):
        return 1
    if global_warnings or any(r.status == "warning" for r in adapter_results):
        return 2
    return 0


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="python -m automation.runner",
        description="SA Data Hub automation framework runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m automation.runner                  Run all adapters
  python -m automation.runner --list           List registered adapters
  python -m automation.runner --adapter sarb   Run SARB adapter only
  python -m automation.runner --dry-run        Read-only run (no writes)
  python -m automation.runner --json           Output JSON
  python -m automation.runner --describe sarb  Show SARB adapter details
  python -m automation.runner -v               Verbose output
        """,
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all registered adapters and exit",
    )
    parser.add_argument(
        "--describe",
        metavar="SOURCE_ID",
        help="Print full description of a single adapter and exit",
    )
    parser.add_argument(
        "--adapter",
        metavar="SOURCE_ID",
        help="Run only the specified adapter",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Read-only run — no version entries or reports written to disk",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        dest="output_json",
        help="Output execution report as JSON",
    )
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default=os.environ.get("AUTOMATION_LOG_LEVEL", "INFO"),
        help="Logging verbosity (default: INFO)",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Show additional detail in console summary",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Run fetch_and_apply on adapters that support it instead of read-only run",
    )
    parser.add_argument(
        "--approve",
        nargs=2,
        metavar=("DATASET_ID", "VERSION_ID"),
        help="Approve a pending dataset version",
    )
    parser.add_argument(
        "--reject",
        nargs=2,
        metavar=("DATASET_ID", "VERSION_ID"),
        help="Reject a pending dataset version",
    )
    parser.add_argument(
        "--promote",
        nargs=2,
        metavar=("DATASET_ID", "VERSION_ID"),
        help="Promote an approved dataset version to production",
    )
    parser.add_argument(
        "--no-report",
        action="store_true",
        help="Skip writing Markdown/JSON report files",
    )

    args = parser.parse_args()

    # Need config + discovery for list/describe
    configure_logging(args.log_level)
    config = load_config(dry_run=args.dry_run, log_level=args.log_level)
    autodiscover()

    if args.list:
        return _list_adapters(config)

    if args.describe:
        return _describe_adapter(config, args.describe)

    if args.approve:
        from automation.core.version import approve_version
        approver = os.environ.get("USER", os.environ.get("USERNAME", "cli-user"))
        approve_version(config.report_dir, args.approve[0], args.approve[1], approver)
        return 0

    if args.reject:
        from automation.core.version import reject_version
        reject_version(config.report_dir, args.reject[0], args.reject[1])
        return 0

    if args.promote:
        from automation.core.promote import promote_version
        promote_version(config.report_dir, args.promote[0], args.promote[1])
        return 0

    return run(
        adapter_filter=args.adapter,
        dry_run=args.dry_run,
        log_level=args.log_level,
        output_json=args.output_json,
        verbose=args.verbose,
        no_report=args.no_report,
        apply=args.apply,
    )


if __name__ == "__main__":
    raise SystemExit(main())
