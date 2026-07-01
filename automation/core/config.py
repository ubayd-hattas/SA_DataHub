"""
automation.core.config — Configuration loading.

Loads automation configuration from YAML files and environment variables.
Supports adding new datasets and new sources without touching the runner.

Configuration hierarchy (highest priority first):
  1. Environment variables  (AUTOMATION_*)
  2. automation/config/local.yaml  (gitignored, developer overrides)
  3. automation/config/datasets/<dataset>.yaml  (per-dataset config)
  4. automation/config/sources/<source>.yaml    (per-source config)
  5. automation/config/automation.yaml          (global defaults)
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

AUTOMATION_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = AUTOMATION_DIR / "config"
DATASETS_CONFIG_DIR = CONFIG_DIR / "datasets"
SOURCES_CONFIG_DIR = CONFIG_DIR / "sources"
GLOBAL_CONFIG_FILE = CONFIG_DIR / "automation.yaml"
LOCAL_CONFIG_FILE = CONFIG_DIR / "local.yaml"

PROJECT_ROOT = AUTOMATION_DIR.parent


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class SourceConfig:
    """Configuration for a single data-source organisation."""

    source_id: str  # e.g. "statssa", "sarb", "saps", "worldbank"
    display_name: str
    base_url: str = ""
    enabled: bool = True
    request_delay_seconds: float = 1.0
    max_retries: int = 5
    timeout_seconds: int = 30
    extra: dict[str, Any] = field(default_factory=dict)

    def get(self, key: str, default: Any = None) -> Any:
        return self.extra.get(key, default)


@dataclass
class DatasetConfig:
    """Configuration for a single dataset pipeline."""

    dataset_id: str           # e.g. "unemployment", "interest-rates"
    source_id: str            # must match a registered SourceConfig.source_id
    display_name: str
    enabled: bool = True
    cadence: str = "manual"   # "daily", "weekly", "monthly", "quarterly", "annual", "manual"
    automation_level: str = "manual"  # "auto", "hybrid", "manual", "static"
    priority: int = 50        # 1 (highest) → 100 (lowest)
    extra: dict[str, Any] = field(default_factory=dict)

    def get(self, key: str, default: Any = None) -> Any:
        return self.extra.get(key, default)


@dataclass
class AutomationConfig:
    """Top-level automation framework configuration."""

    dry_run: bool = False
    log_level: str = "INFO"
    report_dir: Path = AUTOMATION_DIR / "reports" / "archive"
    raw_archive_dir: Path = PROJECT_ROOT / "raw_data" / "archive"
    sources: dict[str, SourceConfig] = field(default_factory=dict)
    datasets: dict[str, DatasetConfig] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# YAML loading (optional dependency — falls back to JSON or built-in defaults)
# ---------------------------------------------------------------------------


def _load_yaml(path: Path) -> dict[str, Any]:
    """Load a YAML file.  Falls back to empty dict if file absent or yaml unavailable."""
    if not path.exists():
        return {}
    try:
        import yaml  # type: ignore[import]

        with path.open(encoding="utf-8") as fh:
            return yaml.safe_load(fh) or {}
    except ImportError:
        # yaml not installed — try JSON fallback (same path with .json extension)
        json_path = path.with_suffix(".json")
        if json_path.exists():
            with json_path.open(encoding="utf-8") as fh:
                return json.load(fh)
        return {}
    except Exception:
        return {}


# ---------------------------------------------------------------------------
# Source config loader
# ---------------------------------------------------------------------------


def _load_source_config(source_id: str, raw: dict[str, Any]) -> SourceConfig:
    return SourceConfig(
        source_id=source_id,
        display_name=raw.get("display_name", source_id),
        base_url=raw.get("base_url", ""),
        enabled=bool(raw.get("enabled", True)),
        request_delay_seconds=float(raw.get("request_delay_seconds", 1.0)),
        max_retries=int(raw.get("max_retries", 5)),
        timeout_seconds=int(raw.get("timeout_seconds", 30)),
        extra={k: v for k, v in raw.items() if k not in {
            "display_name", "base_url", "enabled",
            "request_delay_seconds", "max_retries", "timeout_seconds",
        }},
    )


def _load_dataset_config(dataset_id: str, raw: dict[str, Any]) -> DatasetConfig:
    return DatasetConfig(
        dataset_id=dataset_id,
        source_id=raw.get("source_id", "unknown"),
        display_name=raw.get("display_name", dataset_id),
        enabled=bool(raw.get("enabled", True)),
        cadence=raw.get("cadence", "manual"),
        automation_level=raw.get("automation_level", "manual"),
        priority=int(raw.get("priority", 50)),
        extra={k: v for k, v in raw.items() if k not in {
            "source_id", "display_name", "enabled",
            "cadence", "automation_level", "priority",
        }},
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def load_config(
    *,
    dry_run: bool = False,
    log_level: str | None = None,
) -> AutomationConfig:
    """
    Load the merged automation configuration.

    Sources are loaded from ``automation/config/sources/`` and datasets from
    ``automation/config/datasets/``.  Both directories support one YAML (or
    JSON) file per entry, keyed by the source/dataset ID used as the filename
    stem.

    This function never raises for missing config — the framework boots with
    built-in defaults and whatever adapters have registered themselves.

    Parameters
    ----------
    dry_run:
        Override the ``dry_run`` flag regardless of config files.
    log_level:
        Override the ``log_level`` from environment/config.
    """
    global_raw = _load_yaml(GLOBAL_CONFIG_FILE)
    local_raw = _load_yaml(LOCAL_CONFIG_FILE)

    # Merge: local overrides global
    merged_global: dict[str, Any] = {**global_raw, **local_raw}

    # Environment variable overrides
    env_dry_run = os.environ.get("AUTOMATION_DRY_RUN", "").lower() in ("1", "true", "yes")
    env_log_level = os.environ.get("AUTOMATION_LOG_LEVEL", "")

    config = AutomationConfig(
        dry_run=dry_run or env_dry_run or bool(merged_global.get("dry_run", False)),
        log_level=(
            log_level
            or env_log_level
            or str(merged_global.get("log_level", "INFO"))
        ).upper(),
        report_dir=Path(
            os.environ.get("AUTOMATION_REPORT_DIR", "")
            or merged_global.get("report_dir", str(AUTOMATION_DIR / "reports" / "archive"))
        ),
        raw_archive_dir=Path(
            os.environ.get("AUTOMATION_RAW_ARCHIVE_DIR", "")
            or merged_global.get("raw_archive_dir", str(PROJECT_ROOT / "raw_data" / "archive"))
        ),
    )

    # Load per-source configs
    if SOURCES_CONFIG_DIR.exists():
        for path in sorted(SOURCES_CONFIG_DIR.glob("*.yaml")) + sorted(
            SOURCES_CONFIG_DIR.glob("*.json")
        ):
            source_id = path.stem
            raw = _load_yaml(path)
            config.sources[source_id] = _load_source_config(source_id, raw)

    # Load per-dataset configs
    if DATASETS_CONFIG_DIR.exists():
        for path in sorted(DATASETS_CONFIG_DIR.glob("*.yaml")) + sorted(
            DATASETS_CONFIG_DIR.glob("*.json")
        ):
            dataset_id = path.stem
            raw = _load_yaml(path)
            config.datasets[dataset_id] = _load_dataset_config(dataset_id, raw)

    return config
