"""
automation.core.report — Execution report generation.

After every runner invocation, a Markdown report is written to
``automation/reports/archive/<YYYY-MM-DD>/run_<run_id>.md``.

The report contains:
  - Run metadata (timestamp, dry_run flag, run_id)
  - Per-adapter execution summary (status, checks performed, timing)
  - Validation results
  - Version entries created
  - Recommended next actions

This module is a generic template renderer — it knows nothing about
specific sources or datasets.  Callers populate an ``ExecutionReport``
dataclass and call ``write_report()``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from automation.core.files import atomic_write_text
from automation.core.logging import get_logger

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Report data model
# ---------------------------------------------------------------------------


@dataclass
class AdapterReport:
    """Summary of one adapter's execution during a run."""

    adapter_id: str           # e.g. "statssa", "sarb"
    display_name: str
    status: Literal["ok", "skipped", "warning", "error", "no_change", "no_publication_found", "unknown"]
    datasets_checked: list[str] = field(default_factory=list)
    datasets_changed: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    duration_ms: int = 0
    notes: str = ""


@dataclass
class ExecutionReport:
    """Complete report for a single runner invocation."""

    run_id: str
    started_at: datetime
    finished_at: datetime | None = None
    dry_run: bool = False
    adapters: list[AdapterReport] = field(default_factory=list)
    global_warnings: list[str] = field(default_factory=list)
    global_errors: list[str] = field(default_factory=list)
    config_summary: dict[str, Any] = field(default_factory=dict)

    @property
    def duration_seconds(self) -> float:
        if self.finished_at is None:
            return 0.0
        return (self.finished_at - self.started_at).total_seconds()

    @property
    def overall_status(self) -> str:
        if any(a.status == "error" for a in self.adapters) or self.global_errors:
            return "ERROR"
        if any(
            a.status in ("warning", "no_publication_found", "unknown")
            for a in self.adapters
        ) or self.global_warnings:
            return "WARNING"
        if any(a.status == "ok" for a in self.adapters):
            return "OK"
        return "NO_CHANGE"


# ---------------------------------------------------------------------------
# Markdown rendering
# ---------------------------------------------------------------------------

_STATUS_ICONS = {
    "ok": "✅",
    "skipped": "⏭️",
    "warning": "⚠️",
    "error": "❌",
    "no_change": "➖",
    "no_publication_found": "❓",
    "unknown": "❓",
    "OK": "✅",
    "WARNING": "⚠️",
    "ERROR": "❌",
    "NO_CHANGE": "➖",
    "NO_PUBLICATION_FOUND": "❓",
    "UNKNOWN": "❓",
}


def render_report_markdown(report: ExecutionReport) -> str:
    """Render an :class:`ExecutionReport` as a Markdown document."""
    lines: list[str] = []
    icon = _STATUS_ICONS.get(report.overall_status, "❓")
    finished = report.finished_at or datetime.now(tz=timezone.utc)

    lines += [
        f"# SA Data Hub — Automation Run Report",
        "",
        f"**Run ID:** `{report.run_id}`  ",
        f"**Started:** {report.started_at.strftime('%Y-%m-%d %H:%M:%S UTC')}  ",
        f"**Finished:** {finished.strftime('%Y-%m-%d %H:%M:%S UTC')}  ",
        f"**Duration:** {report.duration_seconds:.1f} s  ",
        f"**Mode:** {'🔵 DRY RUN (no writes)' if report.dry_run else '🟢 LIVE'}  ",
        f"**Overall status:** {icon} {report.overall_status}",
        "",
        "---",
        "",
    ]

    # Configuration summary
    if report.config_summary:
        lines += [
            "## Configuration",
            "",
            "```",
            json.dumps(report.config_summary, indent=2, default=str),
            "```",
            "",
        ]

    # Adapter summaries
    lines += [
        "## Adapter Summaries",
        "",
    ]

    if not report.adapters:
        lines.append("_No adapters were executed._")
        lines.append("")
    else:
        for adapter in report.adapters:
            a_icon = _STATUS_ICONS.get(adapter.status, "❓")
            lines += [
                f"### {a_icon} {adapter.display_name} (`{adapter.adapter_id}`)",
                "",
                f"- **Status:** {adapter.status}  ",
                f"- **Duration:** {adapter.duration_ms} ms  ",
                f"- **Datasets checked:** {', '.join(adapter.datasets_checked) or '—'}  ",
                f"- **Datasets changed:** {', '.join(adapter.datasets_changed) or '—'}  ",
            ]
            if adapter.notes:
                lines.append(f"- **Notes:** {adapter.notes}  ")
            if adapter.warnings:
                lines.append("")
                lines.append("**Warnings:**")
                for w in adapter.warnings:
                    lines.append(f"- ⚠️ {w}")
            if adapter.errors:
                lines.append("")
                lines.append("**Errors:**")
                for e in adapter.errors:
                    lines.append(f"- ❌ {e}")
            lines.append("")

    # Global warnings / errors
    if report.global_warnings or report.global_errors:
        lines += [
            "## Global Issues",
            "",
        ]
        for w in report.global_warnings:
            lines.append(f"- ⚠️ {w}")
        for e in report.global_errors:
            lines.append(f"- ❌ {e}")
        lines.append("")

    # Recommended next actions
    actions = _derive_actions(report)
    if actions:
        lines += [
            "## Recommended Next Actions",
            "",
        ]
        for action in actions:
            lines.append(f"- {action}")
        lines.append("")

    lines += [
        "---",
        "",
        "_Generated by SA Data Hub automation framework v0.1.0_",
        "",
    ]

    return "\n".join(lines)


def _derive_actions(report: ExecutionReport) -> list[str]:
    """Derive a list of recommended actions from the report."""
    actions: list[str] = []
    for adapter in report.adapters:
        if adapter.status == "error":
            actions.append(
                f"Investigate errors in **{adapter.display_name}** adapter: "
                + "; ".join(adapter.errors[:2])
            )
        if adapter.datasets_changed:
            for ds in adapter.datasets_changed:
                actions.append(
                    f"Review pending version for **{ds}** and approve/reject."
                )
    if report.dry_run:
        actions.append(
            "Re-run without `--dry-run` when ready to write version entries."
        )
    return actions


# ---------------------------------------------------------------------------
# Write to disk
# ---------------------------------------------------------------------------


def write_report(
    report: ExecutionReport,
    report_dir: Path,
) -> Path:
    """
    Write the execution report to ``<report_dir>/<YYYY-MM-DD>/run_<run_id>.md``.

    Returns the path of the written file.
    """
    date_str = report.started_at.strftime("%Y-%m-%d")
    dest = report_dir / date_str / f"run_{report.run_id}.md"
    content = render_report_markdown(report)
    atomic_write_text(dest, content)
    log.info("Report written → %s", dest)
    return dest


def write_json_report(
    report: ExecutionReport,
    report_dir: Path,
) -> Path:
    """Write a machine-readable JSON version of the report alongside the Markdown."""
    date_str = report.started_at.strftime("%Y-%m-%d")
    dest = report_dir / date_str / f"run_{report.run_id}.json"

    def _serialise(obj: Any) -> Any:
        if isinstance(obj, datetime):
            return obj.isoformat()
        if hasattr(obj, "__dict__"):
            return obj.__dict__
        return str(obj)

    import dataclasses
    atomic_write_text(
        dest,
        json.dumps(dataclasses.asdict(report), indent=2, default=_serialise),
    )
    return dest
