"""Result types for validation checks."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Severity(str, Enum):
    PASS = "pass"
    WARN = "warn"
    FAIL = "fail"


@dataclass
class Finding:
    severity: Severity
    check: str
    message: str
    recommendation: str = ""
    context: dict[str, Any] = field(default_factory=dict)

    def icon(self) -> str:
        return {"pass": "[OK]", "warn": "[WARN]", "fail": "[FAIL]"}[self.severity.value]


@dataclass
class CheckResult:
    name: str
    findings: list[Finding] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return not any(f.severity == Severity.FAIL for f in self.findings)

    def add(
        self,
        severity: Severity,
        message: str,
        recommendation: str = "",
        **context: Any,
    ) -> None:
        self.findings.append(
            Finding(
                severity=severity,
                check=self.name,
                message=message,
                recommendation=recommendation,
                context=context,
            )
        )


@dataclass
class ValidationReport:
    results: list[CheckResult] = field(default_factory=list)

    def all_findings(self) -> list[Finding]:
        out: list[Finding] = []
        for r in self.results:
            out.extend(r.findings)
        return out

    @property
    def failures(self) -> list[Finding]:
        return [f for f in self.all_findings() if f.severity == Severity.FAIL]

    @property
    def warnings(self) -> list[Finding]:
        return [f for f in self.all_findings() if f.severity == Severity.WARN]

    @property
    def passes(self) -> list[Finding]:
        return [f for f in self.all_findings() if f.severity == Severity.PASS]

    @property
    def ok(self) -> bool:
        return len(self.failures) == 0
