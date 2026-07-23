"""
automation.adapters.base — Abstract base class for all source adapters.

Every data-source adapter must subclass :class:`BaseAdapter` and implement
the four abstract methods.  The runner calls them in order:
  1. ``validate_config()``  — fail fast on missing credentials/config
  2. ``check_for_updates()`` — detect whether a new release is available
  3. ``run()``              — execute the detection check and record results
  4. ``describe()``         — return a human-readable summary (for --list)

Adapters must NOT implement download or transformation logic in Phase A.
Those stages belong in Phase B.  Phase A adapters should:
  - Check that their configuration is valid
  - Optionally do a lightweight "is a new release available?" check
  - Report which datasets they are responsible for
  - Return a well-formed :class:`AdapterResult`

Thread safety: adapter instances are not shared across threads.  The runner
creates a fresh instance per run.
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

from automation.core.config import AutomationConfig, DatasetConfig, SourceConfig
from automation.core.logging import get_logger

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass
class DatasetCheckResult:
    """Result of checking a single dataset for new releases."""

    dataset_id: str
    status: Literal[
        # check_for_updates() (read-only, Phase A) vocabulary:
        "up_to_date", "update_available", "error", "skipped", "unknown",
        "no_publication_found",
        # fetch_and_apply() (--apply, Phase B) vocabulary — the runner's
        # apply-path translation layer constructs DatasetCheckResult with
        # these values, so they must be part of the real contract, not
        # just tolerated at runtime:
        "ok", "no_change",
    ]
    message: str = ""
    latest_period: str = ""      # e.g. "Q1 2026", "May 2026"
    current_period: str = ""     # period currently in the JSON
    source_url: str = ""
    notes: str = ""


@dataclass
class AdapterResult:
    """Result returned by :meth:`BaseAdapter.run`."""

    adapter_id: str
    source_id: str
    display_name: str
    started_at: datetime
    finished_at: datetime | None = None
    status: Literal[
        "ok", "skipped", "warning", "error", "no_change",
        # --apply path (StatsSAAdapter.fetch_and_apply()) can also
        # produce this — added per audit finding #5/#10.
        "no_publication_found",
        # Defensive fallback for a status value the runner doesn't
        # recognise; must never silently become "ok" (audit finding #5).
        "unknown",
    ] = "ok"
    datasets: list[DatasetCheckResult] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    notes: str = ""

    @property
    def duration_ms(self) -> int:
        if self.finished_at is None:
            return 0
        delta = self.finished_at - self.started_at
        return int(delta.total_seconds() * 1000)

    @property
    def datasets_with_updates(self) -> list[str]:
        return [
            d.dataset_id
            for d in self.datasets
            if d.status == "update_available"
        ]

    @property
    def datasets_checked(self) -> list[str]:
        return [d.dataset_id for d in self.datasets]

    def add_warning(self, msg: str) -> None:
        self.warnings.append(msg)
        log.warning("[%s] %s", self.adapter_id, msg)

    def add_error(self, msg: str) -> None:
        self.errors.append(msg)
        log.error("[%s] %s", self.adapter_id, msg)
        if self.status not in ("error",):
            self.status = "error"


# ---------------------------------------------------------------------------
# Base adapter
# ---------------------------------------------------------------------------


class BaseAdapter(ABC):
    """
    Abstract base class for all SA Data Hub source adapters.

    Class attributes
    ----------------
    source_id : str
        Unique identifier for this source organisation.  Must match the
        filename stem of the config file (e.g. ``"statssa"`` →
        ``config/sources/statssa.yaml``).
    display_name : str
        Human-readable name shown in reports and the --list output.
    priority : int
        Execution order (lower = earlier).  Default 50.
    version : str
        Adapter implementation version — bumped when parsing logic changes.
    """

    source_id: str = ""
    display_name: str = ""
    priority: int = 50
    version: str = "0.1.0"

    def __init__(
        self,
        config: AutomationConfig,
        source_config: SourceConfig | None = None,
    ) -> None:
        if not self.source_id:
            raise ValueError(
                f"{type(self).__name__} must define a non-empty source_id class attribute."
            )
        self.config = config
        self.source_config = source_config or SourceConfig(
            source_id=self.source_id,
            display_name=self.display_name,
        )
        self._log = get_logger(f"automation.adapters.{self.source_id}")

    # ------------------------------------------------------------------
    # Abstract interface — every adapter must implement these
    # ------------------------------------------------------------------

    @abstractmethod
    def validate_config(self) -> list[str]:
        """
        Validate that the adapter has everything it needs to run.

        Returns
        -------
        list[str]
            Empty if all config is valid.  One error string per problem
            otherwise.  A non-empty list will cause the runner to skip
            this adapter and record the errors in the report.
        """
        ...

    @abstractmethod
    def datasets(self) -> list[str]:
        """
        Return the list of dataset IDs this adapter is responsible for.

        These IDs must match keys in ``automation/config/datasets/``.
        """
        ...

    @abstractmethod
    def check_for_updates(
        self,
        dataset_id: str,
        dataset_config: DatasetConfig | None,
    ) -> DatasetCheckResult:
        """
        Perform a lightweight check for a new release of ``dataset_id``.

        This method must NOT download or parse the full data file.  It
        should only perform the minimum work needed to determine whether
        a new release is available (e.g. an ETag check, an API version
        probe, a calendar comparison).

        Parameters
        ----------
        dataset_id:
            The dataset to check.
        dataset_config:
            The loaded configuration for this dataset, or None if no
            config file exists yet.

        Returns
        -------
        DatasetCheckResult
            With ``status`` set to ``"up_to_date"``, ``"update_available"``,
            ``"error"``, ``"skipped"``, or ``"unknown"``.
        """
        ...

    @abstractmethod
    def describe(self) -> dict[str, Any]:
        """
        Return a human-readable description of this adapter.

        Used by the ``--list`` flag and developer documentation.

        Returns
        -------
        dict
            Keys: ``source_id``, ``display_name``, ``datasets``,
            ``automation_level``, ``cadence``, ``notes``.
        """
        ...

    # ------------------------------------------------------------------
    # Concrete run() — calls the abstract methods in order
    # ------------------------------------------------------------------

    def run(self, *, dry_run: bool = False) -> AdapterResult:
        """
        Execute the adapter.

        Calls ``validate_config()`` then iterates over ``datasets()``,
        calling ``check_for_updates()`` for each one.

        Parameters
        ----------
        dry_run:
            When True, no writes are performed (version entries are not
            saved, reports are not written to disk).

        Returns
        -------
        AdapterResult
        """
        started = datetime.now(tz=timezone.utc)
        result = AdapterResult(
            adapter_id=self.source_id,
            source_id=self.source_id,
            display_name=self.display_name or self.source_id,
            started_at=started,
        )

        self._log.info(
            "Starting adapter %s (dry_run=%s)",
            self.source_id,
            dry_run,
        )

        # 1. Validate configuration
        config_errors = self.validate_config()
        if config_errors:
            for err in config_errors:
                result.add_error(f"Config error: {err}")
            result.status = "error"
            result.finished_at = datetime.now(tz=timezone.utc)
            self._log.error(
                "Adapter %s skipped — config invalid (%d errors)",
                self.source_id,
                len(config_errors),
            )
            return result

        # 2. Check each dataset
        dataset_ids = self.datasets()
        if not dataset_ids:
            result.status = "skipped"
            result.notes = "No datasets registered for this adapter."
            result.finished_at = datetime.now(tz=timezone.utc)
            return result

        any_updates = False

        for dataset_id in dataset_ids:
            dataset_config = self.config.datasets.get(dataset_id)

            # Skip disabled datasets
            if dataset_config is not None and not dataset_config.enabled:
                result.datasets.append(
                    DatasetCheckResult(
                        dataset_id=dataset_id,
                        status="skipped",
                        message="Dataset disabled in config.",
                    )
                )
                continue

            try:
                check = self.check_for_updates(dataset_id, dataset_config)
                result.datasets.append(check)
                if check.status == "update_available":
                    any_updates = True
                    self._log.info(
                        "Dataset %s: update available (%s)",
                        dataset_id,
                        check.latest_period or check.message,
                    )
                elif check.status == "error":
                    result.add_warning(
                        f"Dataset {dataset_id}: check failed — {check.message}"
                    )
                else:
                    self._log.debug(
                        "Dataset %s: %s",
                        dataset_id,
                        check.status,
                    )

            except Exception as exc:
                msg = f"Unhandled error checking {dataset_id}: {exc}"
                result.add_error(msg)
                result.datasets.append(
                    DatasetCheckResult(
                        dataset_id=dataset_id,
                        status="error",
                        message=msg,
                    )
                )

        # 3. Determine overall status
        if result.errors:
            result.status = "error"
        elif result.warnings:
            result.status = "warning"
        elif any_updates:
            result.status = "ok"
        else:
            result.status = "no_change"

        result.finished_at = datetime.now(tz=timezone.utc)
        self._log.info(
            "Adapter %s finished in %d ms — status=%s, updates=%d/%d datasets",
            self.source_id,
            result.duration_ms,
            result.status,
            len(result.datasets_with_updates),
            len(dataset_ids),
        )
        return result
