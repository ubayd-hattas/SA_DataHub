#!/usr/bin/env python3
"""
update_all.py — SA Data Hub master update script

Usage:
    python update_all.py              # update everything
    python update_all.py --only cpi  # update only inflation
    python update_all.py --dry-run   # check sources, don't write files

What this does:
    1. Fetches/validates fresh data from each official source.
    2. For automated sources: writes updated JSON directly.
    3. For manual sources: prints what changed and what to copy.
    4. Produces a summary report of what was updated.

Requirements:
    pip install requests beautifulsoup4 lxml python-dateutil

Run from your project root (the folder containing package.json):
    python scripts/update_all.py
"""

import argparse
import importlib
import sys
import time
from datetime import datetime
from pathlib import Path


# ─── Updater registry ────────────────────────────────────────────────────────
# Each entry: (module_name, dataset_id, automation_level)
# automation_level: "auto" = fully automated, "manual" = prints instructions only
#
# SAFETY NOTE (2026-10-19):
#   update_inflation, update_unemployment, update_gdp, update_population have been
#   moved to "manual" because they pull ANNUAL MODELLED World Bank figures and
#   overwrite headline value/rawValue/source/series on records that are maintained
#   from official quarterly/monthly Stats SA/SARB releases.  Running them would
#   silently corrupt verified data.  Each script now requires --allow-overwrite to
#   actually write files.  See scripts/update_<name>.py for details.

UPDATERS = [
    ("update_inflation",       "inflation",       "manual"),  # WB annual; verified monthly CPI in place — see SAFETY NOTE
    ("update_unemployment",    "unemployment",    "manual"),  # WB annual; verified quarterly QLFS in place — see SAFETY NOTE
    ("update_gdp",             "gdp",             "manual"),  # WB annual; verified quarterly Stats SA in place — see SAFETY NOTE
    ("update_interest_rates",  "interest-rates",  "manual"),  # update LATEST_REPO_RATE after MPC (LATEST_REPO_RATE must be 7.25%)
    ("update_population",      "population",      "manual"),  # WB model; verified MYPE 2026 in place — see SAFETY NOTE
    ("update_crime",           "crime",           "manual"),    # SAPS has no API
    ("update_education",       "education",       "manual"),    # DBE releases annually
    ("update_housing",         "housing",         "manual"),    # Census / GHS
    ("update_census",          "census",          "manual"),    # Static until 2032
]


# Updaters that pull World Bank annual modelled figures — must not write
# without an explicit override because they can corrupt verified Stats SA data.
_PROTECTED_UPDATERS = {"update_inflation", "update_unemployment", "update_gdp", "update_population"}


def run_updater(module_name: str, dry_run: bool, allow_overwrite: bool = False) -> dict:
    """Import and run a single updater module, return a result dict."""
    scripts_dir = Path(__file__).parent
    sys.path.insert(0, str(scripts_dir))

    result = {
        "module": module_name,
        "status": "unknown",
        "message": "",
        "updated_at": datetime.now().isoformat(),
    }

    # Safety guard: protected WB updaters require explicit --allow-overwrite.
    effective_dry_run = dry_run
    if module_name in _PROTECTED_UPDATERS and not allow_overwrite:
        effective_dry_run = True  # force dry-run regardless of caller flag
        result["message"] = (
            "PROTECTED — running report-only (no files written). "
            "Pass --allow-overwrite to enable writes (WARNING: this may corrupt verified data)."
        )

    try:
        mod = importlib.import_module(module_name)
        if hasattr(mod, "run"):
            # Pass allow_overwrite through if the module accepts it
            import inspect
            sig = inspect.signature(mod.run)
            kwargs: dict = {"dry_run": effective_dry_run}
            if "allow_overwrite" in sig.parameters:
                kwargs["allow_overwrite"] = allow_overwrite and not dry_run
            mod.run(**kwargs)
            if result["message"] == "":
                result["status"] = "ok"
                result["message"] = "Completed successfully"
            else:
                result["status"] = "ok"  # protected-mode run still succeeded
        else:
            result["status"] = "skip"
            result["message"] = "No run() function found"
    except Exception as e:
        result["status"] = "error"
        result["message"] = str(e)

    return result


def print_summary(results: list[dict]) -> None:
    print("\n" + "═" * 60)
    print("  SA Data Hub — Update Summary")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("═" * 60)
    for r in results:
        icon = {"ok": "✓", "error": "✗", "skip": "–", "unknown": "?"}.get(r["status"], "?")
        print(f"  {icon}  {r['module']:<25}  {r['message']}")
    print("═" * 60)
    errors = [r for r in results if r["status"] == "error"]
    if errors:
        print(f"\n  ⚠  {len(errors)} updater(s) failed. Check output above.")
    else:
        print("\n  All updaters completed.")
    print()


def main():
    parser = argparse.ArgumentParser(description="SA Data Hub — update all datasets")
    parser.add_argument("--only", metavar="DATASET", help="Run only this updater (e.g. inflation)")
    parser.add_argument("--dry-run", action="store_true", help="Fetch data but don't write files")
    parser.add_argument(
        "--allow-overwrite",
        action="store_true",
        dest="allow_overwrite",
        help=(
            "DANGER: allow the four World Bank updaters (inflation, unemployment, gdp, "
            "population) to write files. This WILL overwrite verified Stats SA values with "
            "annual modelled World Bank figures. Only use if you know what you are doing."
        ),
    )
    args = parser.parse_args()

    targets = UPDATERS
    if args.only:
        targets = [(m, d, a) for m, d, a in UPDATERS if d == args.only]
        if not targets:
            print(f"No updater found for '{args.only}'. Available: {[d for _,d,_ in UPDATERS]}")
            sys.exit(1)

    if args.dry_run:
        print("\n[DRY RUN] — data will be fetched but files will not be written.\n")

    if args.allow_overwrite and not args.dry_run:
        protected_targets = [d for m, d, _ in targets if m in _PROTECTED_UPDATERS]
        if protected_targets:
            print("\n" + "!" * 60)
            print("  WARNING: --allow-overwrite is set.")
            print("  The following updaters will WRITE files using World Bank")
            print("  annual modelled data, overwriting verified Stats SA values:")
            for t in protected_targets:
                print(f"    • {t}")
            print("!" * 60)
            confirm = input("  Type 'yes' to continue: ").strip().lower()
            if confirm != "yes":
                print("  Aborted.")
                sys.exit(1)

    results = []
    for module_name, dataset_id, automation in targets:
        print(f"\n{'─'*60}")
        print(f"  Updating: {dataset_id} [{automation}]")
        print(f"{'─'*60}")
        result = run_updater(
            module_name,
            dry_run=args.dry_run,
            allow_overwrite=getattr(args, "allow_overwrite", False),
        )
        results.append(result)
        time.sleep(1)   # polite delay between requests

    print_summary(results)


if __name__ == "__main__":
    main()
