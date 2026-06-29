#!/usr/bin/env python3
"""
SA Data Hub — validation report runner.

Usage (from project root):
    python validation/report.py
    python validation/report.py --json
    python validation/report.py --strict   # exit 1 on warnings too

Run after every dataset update and before migration work.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

# Windows console UTF-8
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Allow running as script without package install
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from validation.checks import ALL_CHECKS  # noqa: E402
from validation.models import Severity, ValidationReport  # noqa: E402


def run_all() -> ValidationReport:
    report = ValidationReport()
    for check_module in ALL_CHECKS:
        report.results.append(check_module.run())
    return report


def format_report(report: ValidationReport) -> str:
    lines: list[str] = []
    sep = "=" * 64
    lines.append(sep)
    lines.append("  SA Data Hub — Data Validation Report")
    lines.append(f"  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(sep)
    lines.append("")

    for check_result in report.results:
        lines.append(f"-- {check_result.name} " + "-" * max(0, 44 - len(check_result.name)))
        if not check_result.findings:
            lines.append("  (no findings)")
        for f in check_result.findings:
            lines.append(f"  {f.icon()}  {f.message}")
            if f.recommendation:
                lines.append(f"      -> {f.recommendation}")
        lines.append("")

    lines.append(sep)
    lines.append("  Summary")
    lines.append(sep)
    lines.append(f"  [OK] Passed:   {len(report.passes)}")
    lines.append(f"  [WARN] Warnings: {len(report.warnings)}")
    lines.append(f"  [FAIL] Failures: {len(report.failures)}")
    lines.append("")

    if report.failures:
        lines.append("  Status: FAILED — fix failures before migration.")
    elif report.warnings:
        lines.append("  Status: PASSED WITH WARNINGS — review before migration.")
    else:
        lines.append("  Status: ALL CHECKS PASSED.")
    lines.append(sep)

    if report.warnings or report.failures:
        lines.append("")
        lines.append("  Recommendations (priority order):")
        n = 1
        for f in report.failures + report.warnings:
            if f.recommendation:
                lines.append(f"  {n}. [{f.check}] {f.recommendation}")
                n += 1

    return "\n".join(lines)


def to_json(report: ValidationReport) -> str:
    payload = {
        "timestamp": datetime.now().isoformat(),
        "ok": report.ok,
        "summary": {
            "pass": len(report.passes),
            "warn": len(report.warnings),
            "fail": len(report.failures),
        },
        "checks": [
            {
                "name": r.name,
                "findings": [
                    {
                        "severity": f.severity.value,
                        "message": f.message,
                        "recommendation": f.recommendation,
                        "context": f.context,
                    }
                    for f in r.findings
                ],
            }
            for r in report.results
        ],
    }
    return json.dumps(payload, indent=2)


def main() -> int:
    parser = argparse.ArgumentParser(description="SA Data Hub data validation")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit 1 if any warnings or failures",
    )
    args = parser.parse_args()

    report = run_all()

    if args.json:
        print(to_json(report))
    else:
        print(format_report(report))

    if report.failures:
        return 1
    if args.strict and report.warnings:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
