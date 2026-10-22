"""Regression check: World Bank updater scripts must be safe (not auto, dry-run by default).

Checks:
  1. update_all.py UPDATERS registry: update_inflation/unemployment/gdp/population
     must NOT be listed with automation_level='auto'.
  2. Each of the four scripts must define allow_overwrite in their run() signature,
     confirming the dry-run-by-default guard is present.

These checks prevent the protected updaters from being accidentally re-enabled
in the 'auto' list or having their safety guard removed.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

from validation.models import CheckResult, Severity

SCRIPTS_DIR = Path(__file__).resolve().parents[2] / "scripts"

PROTECTED = ["update_inflation", "update_unemployment", "update_gdp", "update_population"]


def _parse_updaters_registry() -> dict[str, str]:
    """Return {module_name: automation_level} from update_all.py UPDATERS list."""
    update_all = SCRIPTS_DIR / "update_all.py"
    if not update_all.exists():
        return {}
    src = update_all.read_text(encoding="utf-8")
    # Find all tuples: ("module", "dataset", "level")
    pattern = re.compile(r'\(\s*"([^"]+)"\s*,\s*"[^"]+"\s*,\s*"([^"]+)"\s*\)')
    return {m.group(1): m.group(2) for m in pattern.finditer(src)}


def _has_allow_overwrite_param(script_name: str) -> bool:
    """Return True if the script's run() function has an allow_overwrite parameter."""
    path = SCRIPTS_DIR / f"{script_name}.py"
    if not path.exists():
        return False
    src = path.read_text(encoding="utf-8")
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return False
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == "run":
            args = [a.arg for a in node.args.args + node.args.kwonlyargs]
            return "allow_overwrite" in args
    return False


def run() -> CheckResult:
    result = CheckResult(name="check_updater_safety")

    registry = _parse_updaters_registry()

    for module in PROTECTED:
        level = registry.get(module)
        if level is None:
            result.add(
                Severity.WARN,
                f"'{module}' not found in update_all.py UPDATERS registry — check manually.",
            )
        elif level == "auto":
            result.add(
                Severity.FAIL,
                f"'{module}' is listed as automation_level='auto' in update_all.py UPDATERS. "
                "This World Bank updater must be 'manual' to prevent overwriting verified Stats SA data.",
            )
        else:
            result.add(Severity.PASS, f"'{module}' is '{level}' (not auto) — OK.")

        if not _has_allow_overwrite_param(module):
            result.add(
                Severity.FAIL,
                f"'{module}.py' run() does not define allow_overwrite parameter — "
                "dry-run-by-default safety guard may be missing.",
            )
        else:
            result.add(Severity.PASS, f"'{module}.py' run() has allow_overwrite guard — OK.")

    return result
