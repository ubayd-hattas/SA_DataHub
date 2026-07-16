"""
automation.adapters.sarb — South African Reserve Bank adapter (Phase B).

Responsible datasets
--------------------
  - interest-rates     (MPC repo rate + prime — canonical home)

API
---
  Base: https://custom.resbank.co.za/SarbWebApi/
  Used: GET /WebIndicators/HomePageRates
        Returns JSON array; each element has:
          Name, TimeseriesCode, Date (YYYY-MM-DD), Value, UpDown

  Timeseries codes (confirmed live 2026-07-01):
    MMRD002A — "SARB Policy Rate" (repo rate)
    MMRD000A — "Prime lending rate"

Design principles
-----------------
- Uses the official SARB WebIndicators API (no scraping).
- Retry policy: API_POLICY (short backoff — API is expected to be reliable).
- Market-sensitive data — writes to interest-rates.json are INTENDED to
  require manual approval before promotion, but that gate is not yet
  enforced in code (see ``fetch_and_apply()`` docstring and Work Item 1/4
  in the implementation specification). Until the staging/approval/promote
  pipeline exists, ``fetch_and_apply()`` is a manually-invoked, ungated
  utility, not a protected production write path.
- prime = repo + 3.5 is the hard-wired business rule enforced on every run.
- interest-rates.json is the CANONICAL home for SARB rate data.
- Archives raw API response before any transformation.
- ETL integration: writes data in the existing JSON schema so
  ``etl/pipelines/interest_rates.py`` can load it into PostgreSQL unchanged.
- Does NOT modify frontend code, ETL schema, or PostgreSQL schema.

Change summary semantics
-------------------------
  up_to_date       — API rate matches JSON; no write needed.
  update_available — API rate differs from JSON; staged for review.
  error            — API unreachable or validation failed; operator alert.

MPC meeting calendar 2026 (next 12 months)
-------------------------------------------
  2026-01-29  hold (historical)
  2026-03-26  hold (historical)
  2026-05-28  hike to 7.00% (historical)
  2026-07-23  pending
  2026-09-17  pending
  2026-11-19  pending
"""

from __future__ import annotations

import json
import re
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from automation.adapters import register
from automation.adapters.base import BaseAdapter, DatasetCheckResult
from automation.core.config import AutomationConfig, DatasetConfig, SourceConfig
from automation.core.files import portable_archive_path, save_to_archive
from automation.core.http_client import AutomationHTTPError, HTTPClient
from automation.core.logging import get_logger
from automation.core.metadata import check_protected_fields
from automation.core.retry import API_POLICY, with_retry
from automation.core.version import new_version_entry, save_version_entry

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_SARB_API_ROOT = "https://custom.resbank.co.za/SarbWebApi/"
_HOME_PAGE_RATES_URL = (
    "https://custom.resbank.co.za/SarbWebApi/WebIndicators/HomePageRates"
)
_MPC_DECISIONS_URL = (
    "https://www.resbank.co.za/en/home/what-we-do/monetary-policy/decisions"
)

# Timeseries codes confirmed live on 2026-07-01
_TS_REPO = "MMRD002A"     # "SARB Policy Rate"
_TS_PRIME = "MMRD000A"    # "Prime lending rate"

# Business rule: prime = repo + 3.5 (percentage points)
_PRIME_REPO_SPREAD = 3.5

# Datasets managed by this adapter
_SARB_DATASETS: list[str] = ["interest-rates"]

# Path to the canonical dataset JSON (relative to project root, resolved at run time)
_DATASETS_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "data" / "datasets"
_INTEREST_RATES_JSON = _DATASETS_DIR / "interest-rates.json"

# MPC meetings 2026 — used for scheduling context in reports, and (per the
# Work Item 2 investigation below) as the authoritative source of the
# effective/decision date, since the API's own ``Date`` field cannot be
# trusted for that purpose.
#
# --- Work Item 2 investigation (2026-07-12 implementation spec) -----------
# Question: does HomePageRates' ``Date`` field represent the MPC decision
# date, or a data-refresh/publication timestamp?
#
# Evidence gathered 2026-07-15 by querying the live SARB Web API
# (``https://custom.resbank.co.za/SarbWebApi/WebIndicators/CurrentMarketRates``,
# which shares the same ``TimeseriesCode``/``Date`` schema as
# ``HomePageRates`` and includes the same ``MMRD002A``/``MMRD000A`` codes):
# the response showed ``MMRD002A`` (repo rate) at Value=7.0000 with
# Date="2026-07-14" — i.e. *yesterday* relative to the query date — even
# though this adapter's own MPC calendar (below) records the repo rate as
# having last changed on 2026-05-28, seven weeks earlier, with no MPC
# meeting in between. Every other indicator in the same response (FX
# rates, bond yields, T-bill tenders) is also dated one business day
# behind the query date, regardless of whether that indicator's value
# changed. This is conclusive: the ``Date`` field is a "last refreshed in
# the API" timestamp that advances on every business day, not an
# MPC-decision date. It happened to equal the run date in the one archived
# run (2026-07-01) not because of a coincidental same-day MPC meeting, but
# because that is what this field always does — see ``_infer_effective_date()``.
#
# Resolution: effective_date is no longer taken from the API's ``Date``
# field. It is derived from this reference table instead (the most recent
# non-"pending" meeting on or before the API's refresh date). Validated
# against the one known-good historical case: repo 7.00%, MPC date
# 2026-05-28 — see the docstring of ``_infer_effective_date()``.
_MPC_MEETINGS_2026: list[dict[str, str]] = [
    {"date": "2026-01-29", "decision": "hold (historical)"},
    {"date": "2026-03-26", "decision": "hold (historical)"},
    {"date": "2026-05-28", "decision": "hike to 7.00% (historical)"},
    {"date": "2026-07-23", "decision": "pending"},
    {"date": "2026-09-17", "decision": "pending"},
    {"date": "2026-11-19", "decision": "pending"},
]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _build_http_client(source_config: SourceConfig) -> HTTPClient:
    """Create an HTTPClient configured from source_config."""
    return HTTPClient(
        timeout_seconds=source_config.timeout_seconds,
        extra_headers={"Accept": "application/json"},
    )


def _fetch_home_page_rates(client: HTTPClient) -> list[dict[str, Any]]:
    """
    Fetch the HomePageRates endpoint and return the parsed JSON array.

    Raises
    ------
    AutomationHTTPError
        On non-retryable HTTP errors (4xx).
    urllib.error.URLError
        On transient network errors (retried by caller).
    ValueError
        If the response body cannot be decoded as JSON.
    """
    response = client.get(_HOME_PAGE_RATES_URL)
    try:
        data = json.loads(response.body)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"SARB HomePageRates returned non-JSON body "
            f"(status={response.status}, sha256={response.content_sha256[:8]}): {exc}"
        ) from exc
    if not isinstance(data, list):
        raise ValueError(
            f"SARB HomePageRates returned unexpected type {type(data).__name__}; "
            f"expected JSON array."
        )
    return data


def _extract_rate(
    rates: list[dict[str, Any]],
    timeseries_code: str,
    name_hint: str,
) -> tuple[float, str]:
    """
    Extract (value, date_str) for a given timeseries code from the rates list.

    Raises
    ------
    KeyError
        If the timeseries code is not present in the response.
    """
    for item in rates:
        if item.get("TimeseriesCode") == timeseries_code:
            return float(item["Value"]), str(item["Date"])
    raise KeyError(
        f"Timeseries code {timeseries_code!r} ({name_hint}) "
        f"not found in SARB HomePageRates response "
        f"(got {len(rates)} items)."
    )


def _infer_effective_date(
    rate_value: float,
    api_date_str: str,
    meetings: list[dict[str, str]] = _MPC_MEETINGS_2026,
) -> tuple[str, list[str]]:
    """
    Infer the true MPC decision effective date for a fetched repo rate.

    Background
    ----------
    ``HomePageRates``' (and the wider SARB Web API's) ``Date`` field is a
    data-refresh timestamp, not the MPC decision date — confirmed by live
    investigation on 2026-07-15 (see the comment above ``_MPC_MEETINGS_2026``
    for the full evidence trail). This function replaces the old
    ``effective_date = repo_date`` assumption with a lookup against the
    known MPC meeting calendar instead.

    Algorithm
    ---------
    1. Treat ``api_date_str`` as an upper bound (the decision cannot be
       later than the API's last refresh).
    2. Among ``meetings`` with a non-"pending" decision on or before that
       bound, take the most recent one — that is the effective date.
    3. Cross-check: if the meeting's ``decision`` text encodes a rate
       (e.g. "hike to 7.00%"), it must roughly match ``rate_value``. A
       mismatch means the reference table is stale (a newer MPC decision
       happened that hasn't been added to ``_MPC_MEETINGS_2026`` yet) —
       this is reported as a warning rather than silently trusted, and the
       API's raw date is returned as a best-effort fallback so the run
       still produces *a* date rather than failing outright.

    Validated against the one known-good historical case referenced in the
    2026-07-12 implementation spec: ``rate_value=7.00``,
    ``api_date_str="2026-07-01"`` (the archived run's API date) resolves to
    ``"2026-05-28"``, matching the documented MPC decision date exactly.

    Returns
    -------
    (effective_date, warnings)
        ``effective_date`` is ``YYYY-MM-DD``. ``warnings`` is a list of
        human-readable strings describing any fallback taken (empty if the
        reference table cleanly resolved the date).
    """
    warnings: list[str] = []
    api_date_short = api_date_str[:10]
    try:
        api_date = datetime.strptime(api_date_short, "%Y-%m-%d").date()
    except ValueError:
        warnings.append(
            f"Could not parse API Date {api_date_str!r} as YYYY-MM-DD; "
            "using it verbatim as a fallback effective_date."
        )
        return api_date_short, warnings

    known_decisions = [
        m
        for m in meetings
        if "pending" not in m["decision"].lower()
        and datetime.strptime(m["date"], "%Y-%m-%d").date() <= api_date
    ]
    if not known_decisions:
        warnings.append(
            f"No non-pending MPC meeting on or before {api_date_short} found "
            "in _MPC_MEETINGS_2026 — the reference table needs a new entry. "
            f"Falling back to the API's refresh date ({api_date_short}), "
            "which is NOT the true decision date."
        )
        return api_date_short, warnings

    latest = max(known_decisions, key=lambda m: m["date"])
    rate_match = re.search(r"(\d+(?:\.\d+)?)\s*%", latest["decision"])
    if rate_match and abs(float(rate_match.group(1)) - rate_value) > 0.01:
        warnings.append(
            f"_MPC_MEETINGS_2026's most recent decision "
            f"({latest['date']}: {latest['decision']!r}) does not match the "
            f"fetched repo rate ({rate_value:.2f}%) — the reference table is "
            "likely stale and needs a new entry for a more recent MPC "
            f"decision. Falling back to the API's refresh date "
            f"({api_date_short}), which is NOT the true decision date."
        )
        return api_date_short, warnings

    return latest["date"], warnings


def _validate_prime_spread(
    repo_rate: float,
    prime_rate: float,
    spread: float = _PRIME_REPO_SPREAD,
) -> list[str]:
    """
    Validate the business rule: prime = repo + spread.

    Returns a list of validation error strings (empty if all OK).
    Tolerance: ±0.001 percentage points to handle floating-point rounding.
    """
    errors: list[str] = []
    expected_prime = repo_rate + spread
    delta = abs(prime_rate - expected_prime)
    if delta > 0.001:
        errors.append(
            f"Business rule VIOLATED: prime ({prime_rate:.4f}%) ≠ "
            f"repo ({repo_rate:.4f}%) + {spread}% "
            f"(expected {expected_prime:.4f}%, delta={delta:.4f}%)"
        )
    return errors


def _read_current_json() -> dict[str, Any]:
    """
    Read the existing interest-rates.json dataset.

    Returns an empty dict if the file is absent or unreadable.
    """
    if not _INTEREST_RATES_JSON.exists():
        log.warning(
            "interest-rates.json not found at %s — treating as empty.",
            _INTEREST_RATES_JSON,
        )
        return {}
    try:
        return json.loads(_INTEREST_RATES_JSON.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        log.error("Cannot read interest-rates.json: %s", exc)
        return {}


def _get_current_rate(current_doc: dict[str, Any], stat_id: str) -> float | None:
    """Return the rawValue for a given stat_id from the current JSON doc."""
    for stat in current_doc.get("statistics", []):
        if stat.get("id") == stat_id:
            try:
                return float(stat["rawValue"])
            except (KeyError, TypeError, ValueError):
                return None
    return None


# ---------------------------------------------------------------------------
# Human-readable change summary
# ---------------------------------------------------------------------------


def _build_change_summary(
    current_repo: float | None,
    current_prime: float | None,
    new_repo: float,
    new_prime: float,
    effective_date: str,
    publication_date: str,
) -> str:
    """Build a human-readable Markdown change summary."""
    lines: list[str] = [
        "## SARB Interest Rate Change Summary",
        "",
        f"**Effective date:** {effective_date}  ",
        f"**Publication date (API date):** {publication_date}  ",
        f"**Generated:** {datetime.now(tz=timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "| Rate | Previous | New | Change |",
        "|------|----------|-----|--------|",
    ]

    def _fmt(val: float | None) -> str:
        return f"{val:.2f}%" if val is not None else "—"

    def _delta(prev: float | None, new: float) -> str:
        if prev is None:
            return "new"
        d = new - prev
        if abs(d) < 0.001:
            return "no change"
        sign = "+" if d > 0 else ""
        return f"{sign}{d:.2f}pp"

    lines.append(
        f"| Repo rate | {_fmt(current_repo)} | {_fmt(new_repo)} "
        f"| {_delta(current_repo, new_repo)} |"
    )
    lines.append(
        f"| Prime lending rate | {_fmt(current_prime)} | {_fmt(new_prime)} "
        f"| {_delta(current_prime, new_prime)} |"
    )
    lines += [
        "",
        f"> **Business rule check:** prime ({new_prime:.2f}%) = "
        f"repo ({new_repo:.2f}%) + {_PRIME_REPO_SPREAD}% [OK]",
        "",
        "### Source",
        f"- API endpoint: `{_HOME_PAGE_RATES_URL}`",
        f"- Timeseries codes: `{_TS_REPO}` (repo), `{_TS_PRIME}` (prime)",
        f"- MPC decisions page: {_MPC_DECISIONS_URL}",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Transform: apply new rates to existing JSON schema
# ---------------------------------------------------------------------------


def _apply_mpc_label(rate: float, effective_date_str: str) -> str:
    """
    Build a human-readable changeLabel for the MPC decision.

    Example: "hike to 7.00% (May 2026 MPC)"
    """
    try:
        d = datetime.strptime(effective_date_str[:10], "%Y-%m-%d")
        month_year = d.strftime("%B %Y")
    except ValueError:
        month_year = effective_date_str[:10]

    return f"rate at {rate:.2f}% ({month_year} MPC)"


def _build_series_label(date_str: str) -> str:
    """
    Convert SARB API date string (YYYY-MM-DD) to chart-series label (Mon YYYY).

    Example: "2026-05-28" → "May 2026"
    """
    try:
        d = datetime.strptime(date_str[:10], "%Y-%m-%d")
        return d.strftime("%b %Y")
    except ValueError:
        return date_str[:7]  # fallback: "2026-05"


def _determine_trend(
    current_rate: float | None,
    new_rate: float,
) -> str:
    """Determine trend direction from previous to new rate."""
    if current_rate is None:
        return "stable"
    if new_rate > current_rate:
        return "up"
    if new_rate < current_rate:
        return "down"
    return "stable"


def _build_mpc_statement_url(effective_date_str: str) -> str:
    """
    Construct the SARB MPC statement URL for the given decision date.

    Pattern: https://www.resbank.co.za/en/home/publications/
             publication-detail-pages/statements/
             monetary-policy-statements/{year}/{month_name}
    """
    try:
        d = datetime.strptime(effective_date_str[:10], "%Y-%m-%d")
        year = d.year
        month = d.strftime("%B").lower()
        return (
            "https://www.resbank.co.za/en/home/publications/"
            "publication-detail-pages/statements/"
            f"monetary-policy-statements/{year}/{month}"
        )
    except ValueError:
        return _MPC_DECISIONS_URL


def _transform_interest_rates(
    current_doc: dict[str, Any],
    new_repo: float,
    new_prime: float,
    effective_date_str: str,
    current_repo: float | None,
    current_prime: float | None,
) -> dict[str, Any]:
    """
    Apply new SARB rates to the existing JSON document structure.

    Preserves all existing fields (ids, categories, descriptions, series
    history).  Only mutates the rate-sensitive fields.  Does NOT change
    schema shape.

    Parameters
    ----------
    current_doc:
        The existing parsed interest-rates.json document.
    new_repo:
        New repo rate from the API (e.g. 7.0).
    new_prime:
        New prime rate from the API (e.g. 10.5).
    effective_date_str:
        SARB API date string for the rate (YYYY-MM-DD).
    current_repo, current_prime:
        Previous rawValues from the existing JSON (may be None).

    Returns
    -------
    dict
        Updated document, ready to be serialised and written to disk.
    """
    import copy
    doc = copy.deepcopy(current_doc)

    effective_date = effective_date_str[:10]
    series_label = _build_series_label(effective_date)
    mpc_url = _build_mpc_statement_url(effective_date)

    # Determine publication label from the SARB statement URL path
    try:
        d = datetime.strptime(effective_date, "%Y-%m-%d")
        pub_name = f"MPC Statement {d.strftime('%B %Y')}"
    except ValueError:
        pub_name = "MPC Statement"

    today_str = date.today().isoformat()

    # Update _meta block
    if "_meta" not in doc:
        doc["_meta"] = {}
    doc["_meta"]["last_verified"] = today_str
    doc["_meta"]["lastUpdated"] = today_str
    doc["_meta"]["publicationDate"] = effective_date
    doc["_meta"]["source_url"] = mpc_url
    doc["_meta"]["automation"] = {
        "updatedBy": "sarb-adapter/1.0.0",
        "updatedAt": datetime.now(tz=timezone.utc).isoformat(),
        "apiEndpoint": _HOME_PAGE_RATES_URL,
        "timeseriesCodes": {
            "repo": _TS_REPO,
            "prime": _TS_PRIME,
        },
    }

    # Map stat_id → new rate values
    rate_map = {
        "repo-rate-sarb": {
            "value": new_repo,
            "previous": current_repo,
        },
        "prime-lending-rate": {
            "value": new_prime,
            "previous": current_prime,
        },
    }

    for stat in doc.get("statistics", []):
        stat_id = stat.get("id")
        if stat_id not in rate_map:
            continue

        entry = rate_map[stat_id]
        new_rate = entry["value"]
        prev_rate = entry["previous"]

        # Compute change
        change = 0.0
        if prev_rate is not None:
            change = round(new_rate - prev_rate, 4)

        stat["value"] = f"{new_rate:.2f}%"
        stat["rawValue"] = new_rate
        stat["change"] = change
        stat["changeLabel"] = _apply_mpc_label(new_rate, effective_date)
        stat["trend"] = _determine_trend(prev_rate, new_rate)
        stat["lastUpdated"] = effective_date
        stat["source"] = {
            "name": "South African Reserve Bank",
            "shortName": "SARB",
            "url": mpc_url,
            "publicationName": pub_name,
            "publicationDate": effective_date,
        }

        # Append new series data point (avoid duplicates)
        if not stat.get("series"):
            # First-ever update for this stat — there is no existing series
            # to append to, so seed one. Previously this case fell through
            # the loop below with zero iterations and silently dropped the
            # first data point (see automation/adapters/tests/test_sarb.py::
            # test_transform_interest_rates_first_ever_update).
            stat["series"] = [
                {
                    "name": stat.get("title", stat_id),
                    "unit": stat.get("unit", "%"),
                    "data": [{"label": series_label, "value": new_rate}],
                }
            ]
            log.debug(
                "Seeded first series point %r -> %.2f for %s",
                series_label,
                new_rate,
                stat_id,
            )
            continue

        for series in stat.get("series", []):
            existing_labels = {pt["label"] for pt in series.get("data", [])}
            if series_label not in existing_labels:
                series.setdefault("data", []).append(
                    {"label": series_label, "value": new_rate}
                )
                log.debug(
                    "Appended series point %r -> %.2f for %s",
                    series_label,
                    new_rate,
                    stat_id,
                )
            else:
                # Label already present — update in-place (revision)
                for pt in series["data"]:
                    if pt["label"] == series_label:
                        if abs(pt["value"] - new_rate) > 0.001:
                            log.info(
                                "Updating existing series point %r: %.2f -> %.2f for %s",
                                series_label,
                                pt["value"],
                                new_rate,
                                stat_id,
                            )
                            pt["value"] = new_rate
                        break

    return doc


# ---------------------------------------------------------------------------
# Adapter class
# ---------------------------------------------------------------------------


class SARBAdapter(BaseAdapter):
    """
    Production adapter for the South African Reserve Bank (resbank.co.za).

    Implements full Phase B behaviour:
      - Live API poll on every invocation
      - Validation (prime = repo + 3.5, date integrity)
      - Diff against existing JSON
      - Archive raw API response
      - Transform + write updated JSON
      - Version entry (pending manual approval)
      - Human-readable change summary
    """

    source_id = "sarb"
    display_name = "South African Reserve Bank"
    priority = 20   # Second priority — easiest automation candidate
    version = "1.0.0"

    def validate_config(self) -> list[str]:
        """
        Validate SARB adapter configuration.

        SARB requires no API key — the API is public.  We validate:
        - Base URL is correctly set (or use the default)
        - Archive directory is writable
        - Dataset JSON is accessible
        """
        errors: list[str] = []

        # Validate base URL
        configured_url = self.source_config.base_url
        if configured_url and not configured_url.startswith("https://"):
            errors.append(
                f"source_config.base_url should start with 'https://', "
                f"got: {configured_url!r}"
            )

        # Check archive directory
        archive_root = self.config.raw_archive_dir
        try:
            archive_root.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            errors.append(f"Cannot create raw archive directory: {exc}")

        # Check dataset JSON directory (read-only)
        if not _DATASETS_DIR.exists():
            errors.append(
                f"Datasets directory not found: {_DATASETS_DIR}. "
                "Cannot read or write interest-rates.json."
            )

        return errors

    def datasets(self) -> list[str]:
        return _SARB_DATASETS

    def check_for_updates(
        self,
        dataset_id: str,
        dataset_config: DatasetConfig | None,
    ) -> DatasetCheckResult:
        """
        Poll the SARB HomePageRates API and determine if the JSON is stale.

        For interest-rates:
          1. Fetch current rates from the SARB API.
          2. Compare repo + prime against existing JSON rawValues.
          3. Validate business rule (prime = repo + 3.5).
          4. Return DatasetCheckResult with appropriate status.

        This method is intentionally read-only — it detects and reports
        changes but does NOT write to disk.  Call ``fetch_and_apply()``
        to persist the update after manual review.
        """
        if dataset_id != "interest-rates":
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="unknown",
                message=f"No check implemented for {dataset_id} under SARB adapter.",
            )

        client = _build_http_client(self.source_config)

        # --- Fetch ---
        try:
            rates_raw = with_retry(
                lambda: _fetch_home_page_rates(client),
                policy=API_POLICY,
                label="SARB HomePageRates fetch",
            )
        except AutomationHTTPError as exc:
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="error",
                message=f"SARB API returned HTTP {exc.status}: {exc.reason}",
                source_url=_HOME_PAGE_RATES_URL,
            )
        except Exception as exc:
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="error",
                message=f"Failed to fetch SARB API: {exc}",
                source_url=_HOME_PAGE_RATES_URL,
            )

        # --- Extract repo and prime ---
        try:
            new_repo, repo_date = _extract_rate(rates_raw, _TS_REPO, "SARB Policy Rate")
            new_prime, prime_date = _extract_rate(rates_raw, _TS_PRIME, "Prime lending rate")
        except KeyError as exc:
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="error",
                message=str(exc),
                source_url=_HOME_PAGE_RATES_URL,
            )

        # Repo and prime share the same MPC decision date. The API's own
        # ``Date`` field is a refresh timestamp, not the decision date (see
        # the evidence trail above ``_MPC_MEETINGS_2026`` and Work Item 2
        # in the 2026-07-12 implementation spec) — derive it from the MPC
        # calendar instead.
        effective_date, date_warnings = _infer_effective_date(new_repo, repo_date)
        for warning in date_warnings:
            self._log.warning("Effective-date inference: %s", warning)

        # --- Validate business rule ---
        biz_errors = _validate_prime_spread(new_repo, new_prime)
        if biz_errors:
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="error",
                message="; ".join(biz_errors),
                latest_period=f"repo {new_repo:.2f}% / prime {new_prime:.2f}% (date {effective_date})",
                source_url=_HOME_PAGE_RATES_URL,
                notes=(
                    "The prime-repo spread business rule FAILED. "
                    "This is a data integrity alert — do not update JSON until resolved."
                ),
            )

        # --- Compare against existing JSON ---
        current_doc = _read_current_json()
        current_repo = _get_current_rate(current_doc, "repo-rate-sarb")
        current_prime = _get_current_rate(current_doc, "prime-lending-rate")

        repo_changed = (current_repo is None) or (abs(new_repo - current_repo) > 0.001)
        prime_changed = (current_prime is None) or (abs(new_prime - current_prime) > 0.001)

        if not repo_changed and not prime_changed:
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="up_to_date",
                message=(
                    f"interest-rates.json is current: "
                    f"repo {new_repo:.2f}% / prime {new_prime:.2f}% "
                    f"(API date {effective_date})"
                ),
                current_period=f"repo {current_repo:.2f}% / prime {current_prime:.2f}%",
                latest_period=f"repo {new_repo:.2f}% / prime {new_prime:.2f}% ({effective_date})",
                source_url=_HOME_PAGE_RATES_URL,
            )

        # Update is available
        current_label = (
            f"repo {current_repo:.2f}% / prime {current_prime:.2f}%"
            if current_repo is not None
            else "unknown (JSON unreadable)"
        )
        return DatasetCheckResult(
            dataset_id=dataset_id,
            status="update_available",
            message=(
                f"SARB API shows newer rates: "
                f"repo {new_repo:.2f}% / prime {new_prime:.2f}% "
                f"(effective {effective_date}). "
                f"JSON currently has {current_label}."
            ),
            current_period=current_label,
            latest_period=f"repo {new_repo:.2f}% / prime {new_prime:.2f}% ({effective_date})",
            source_url=_HOME_PAGE_RATES_URL,
            notes=(
                "Run fetch_and_apply() on this adapter to stage the update. "
                "Data flagged for manual approval before promotion."
            ),
        )

    def fetch_and_apply(
        self,
        *,
        dry_run: bool = False,
        run_id: str = "",
    ) -> dict[str, Any]:
        """
        Reachable via ``runner.py --apply`` (see the CLI sequence documented
        in ``automation/docs/developer-guide.md``).

        This method does NOT write to ``src/data/datasets/interest-rates.json``
        directly. It writes the candidate document to the file-based staging
        area (``automation.core.staging.write_staged_dataset``) and records a
        ``status="pending"`` version entry. The version entry is a control,
        not just a record of intent: ``automation.core.promote.promote_version``
        refuses to write to the production dataset unless the corresponding
        version entry's status is ``"approved"``. Reaching production requires
        the separate, explicit sequence:
        ``runner.py --approve <dataset> <version_id>`` then
        ``runner.py --promote <dataset> <version_id>``
        (see Work Item 4 in the implementation specification).

        Steps
        -----
        1. Fetch latest rates from SARB HomePageRates API (with retry).
        2. Archive raw API response bytes.
        3. Validate: repo rate, prime lending rate, spread rule, date fields.
        4. Check protected fields (no schema IDs must change).
        5. Compute diff against existing JSON.
        6. Produce human-readable change summary.
        7. Transform raw API data into existing JSON schema.
        8. Write updated JSON atomically (unless dry_run).
        9. Record version entry with status='pending'.
        10. Return execution result dict for caller / report.

        Parameters
        ----------
        dry_run:
            When True, does not write to disk.  All other steps run normally.
        run_id:
            Correlation ID from the runner (injected into the version entry).

        Returns
        -------
        dict
            Keys: status, dataset_id, new_repo, new_prime, effective_date,
                  archive_path, sha256, change_summary, validation_errors,
                  protected_field_violations, version_id, dry_run.
        """
        result: dict[str, Any] = {
            "dataset_id": "interest-rates",
            "source_id": self.source_id,
            "dry_run": dry_run,
            "status": "error",
            "new_repo": None,
            "new_prime": None,
            "effective_date": None,
            "archive_path": None,
            "sha256": None,
            "change_summary": "",
            "validation_errors": [],
            "protected_field_violations": [],
            "version_id": None,
        }

        client = _build_http_client(self.source_config)

        # 1. Fetch
        self._log.info("Fetching SARB HomePageRates …")
        try:
            rates_raw = with_retry(
                lambda: _fetch_home_page_rates(client),
                policy=API_POLICY,
                label="SARB HomePageRates fetch",
            )
        except Exception as exc:
            result["validation_errors"].append(f"API fetch failed: {exc}")
            self._log.error("SARB API fetch failed: %s", exc)
            return result

        raw_bytes = json.dumps(rates_raw, indent=2).encode("utf-8")

        # 2. Archive raw response
        if not dry_run:
            try:
                archive_dest, sha256 = save_to_archive(
                    self.config.raw_archive_dir,
                    raw_bytes,
                    dataset_id="interest-rates",
                    source_id=self.source_id,
                    suffix=".json",
                )
                result["archive_path"] = portable_archive_path(
                    self.config.raw_archive_dir, archive_dest
                )
                result["sha256"] = sha256
                self._log.info(
                    "Raw response archived → %s (sha256=%s…)",
                    archive_dest,
                    sha256[:8],
                )
            except Exception as exc:
                self._log.warning("Archive write failed (continuing): %s", exc)
                result["validation_errors"].append(f"Archive write warning: {exc}")
                sha256 = ""
        else:
            from automation.core.files import sha256_of_bytes
            sha256 = sha256_of_bytes(raw_bytes)
            result["sha256"] = sha256
            self._log.info(
                "[DRY RUN] Would archive %d bytes (sha256=%s…)",
                len(raw_bytes),
                sha256[:8],
            )

        # 3. Extract and validate
        try:
            new_repo, repo_date = _extract_rate(rates_raw, _TS_REPO, "SARB Policy Rate")
            new_prime, prime_date = _extract_rate(rates_raw, _TS_PRIME, "Prime lending rate")
        except KeyError as exc:
            result["validation_errors"].append(str(exc))
            self._log.error("Rate extraction failed: %s", exc)
            return result

        # The API's ``Date`` field is a refresh timestamp, not the MPC
        # decision date (see the evidence trail above ``_MPC_MEETINGS_2026``
        # and Work Item 2 in the 2026-07-12 implementation spec) — derive
        # the effective date from the MPC calendar instead.
        effective_date, date_warnings = _infer_effective_date(new_repo, repo_date)
        for warning in date_warnings:
            self._log.warning("Effective-date inference: %s", warning)
            result["validation_errors"].append(f"Effective-date inference warning: {warning}")
        result["new_repo"] = new_repo
        result["new_prime"] = new_prime
        result["effective_date"] = effective_date

        # Validate business rule
        biz_errors = _validate_prime_spread(new_repo, new_prime)
        result["validation_errors"].extend(biz_errors)
        if biz_errors:
            self._log.error("Business rule validation failed: %s", biz_errors)
            return result

        # Validate date is not in the future
        try:
            effective_dt = datetime.strptime(effective_date, "%Y-%m-%d").date()
            if effective_dt > date.today():
                result["validation_errors"].append(
                    f"Effective date {effective_date} is in the future — "
                    "possible data error."
                )
                self._log.error(
                    "Effective date %s is in the future.", effective_date
                )
                return result
        except ValueError as exc:
            result["validation_errors"].append(
                f"Cannot parse effective date {effective_date!r}: {exc}"
            )
            return result

        self._log.info(
            "Rates validated: repo %.2f%% / prime %.2f%% (effective %s)",
            new_repo,
            new_prime,
            effective_date,
        )

        # 4. Read existing JSON + protected field check
        current_doc = _read_current_json()
        current_repo = _get_current_rate(current_doc, "repo-rate-sarb")
        current_prime = _get_current_rate(current_doc, "prime-lending-rate")

        # 5. Compute diff
        repo_changed = (current_repo is None) or abs(new_repo - current_repo) > 0.001
        prime_changed = (current_prime is None) or abs(new_prime - current_prime) > 0.001

        if not repo_changed and not prime_changed:
            result["status"] = "no_change"
            result["change_summary"] = (
                f"No change: repo {new_repo:.2f}% / prime {new_prime:.2f}% "
                f"already in JSON."
            )
            self._log.info("No change detected — JSON is already current.")
            return result

        # 6. Change summary
        change_summary = _build_change_summary(
            current_repo=current_repo,
            current_prime=current_prime,
            new_repo=new_repo,
            new_prime=new_prime,
            effective_date=effective_date,
            publication_date=repo_date,
        )
        result["change_summary"] = change_summary
        self._log.info(
            "Change detected: repo %s -> %.2f%%, prime %s -> %.2f%%",
            f"{current_repo:.2f}%" if current_repo is not None else "?",
            new_repo,
            f"{current_prime:.2f}%" if current_prime is not None else "?",
            new_prime,
        )

        # 7. Transform
        updated_doc = _transform_interest_rates(
            current_doc=current_doc,
            new_repo=new_repo,
            new_prime=new_prime,
            effective_date_str=effective_date,
            current_repo=current_repo,
            current_prime=current_prime,
        )

        # Check protected fields — IDs, slugs, etc. must not change
        if current_doc:
            protected_violations = check_protected_fields(current_doc, updated_doc)
            result["protected_field_violations"] = protected_violations
            if protected_violations:
                self._log.error(
                    "Protected field violations detected: %s",
                    protected_violations,
                )
                result["validation_errors"].extend(
                    [f"Protected field: {v}" for v in protected_violations]
                )
                return result

        # 8. Create Version entry (pending)
        version_entry = new_version_entry(
            dataset_id="interest-rates",
            source_id=self.source_id,
            source_url=_HOME_PAGE_RATES_URL,
            sha256=sha256,
            archive_path=result.get("archive_path", ""),
            adapter_version=self.version,
            notes=(
                f"repo {new_repo:.2f}% / prime {new_prime:.2f}% "
                f"(effective {effective_date}). "
                f"Manual approval required before promotion."
            ),
            run_id=run_id,
        )
        result["version_id"] = version_entry.version_id

        # 9. Stage updated JSON
        if not dry_run:
            from automation.core.staging import write_staged_dataset
            try:
                write_staged_dataset(
                    self.config.report_dir,
                    dataset_id="interest-rates",
                    version_id=version_entry.version_id,
                    document=updated_doc,
                )
                self._log.info(
                    "Staged dataset for version %s", version_entry.version_id
                )
            except Exception as exc:
                result["validation_errors"].append(
                    f"Failed to write to staging: {exc}"
                )
                self._log.error("Staging write failed: %s", exc)
                return result
        else:
            self._log.info(
                "[DRY RUN] Would write updated doc to staging area for version %s",
                version_entry.version_id,
            )

        if not dry_run:
            try:
                save_version_entry(self.config.report_dir, version_entry)
                self._log.info(
                    "Version entry saved: %s (status=pending)",
                    version_entry.version_id,
                )
            except Exception as exc:
                self._log.warning("Version entry save failed: %s", exc)

        result["status"] = "ok"
        return result

    def describe(self) -> dict[str, Any]:
        return {
            "source_id": self.source_id,
            "display_name": self.display_name,
            "version": self.version,
            "base_url": _SARB_API_ROOT,
            "api_endpoint": _HOME_PAGE_RATES_URL,
            "api_available": True,
            "api_notes": (
                "Confirmed public SARB WebIndicators API. No API key required. "
                "Timeseries codes MMRD002A (repo) and MMRD000A (prime) used. "
                "Data is served as a JSON array of rate objects."
            ),
            "datasets": _SARB_DATASETS,
            "mpc_meetings_2026": _MPC_MEETINGS_2026,
            "business_rules": [
                f"prime_rate = repo_rate + {_PRIME_REPO_SPREAD}",
                "spread validated to ±0.001% tolerance",
                "effective_date must not be in the future",
            ],
            "automation_levels": {
                "interest-rates": "auto (Phase B fully implemented)",
            },
            "retry_policy": "API_POLICY (short backoff — API expected reliable)",
            "phase_b_status": (
                "fetch_and_apply() is implemented (live API fetch, validate, diff, "
                "transform) and is reachable via `runner.py --apply`. It writes "
                "the candidate document to the file-based staging area, not "
                "directly to interest-rates.json. See Work Item 4 in the "
                "implementation specification."
            ),
            "manual_approval_required": (
                "Updates are staged as 'pending' version entries. A version "
                "entry only reaches interest-rates.json after an explicit "
                "`runner.py --approve <dataset> <version_id>` followed by "
                "`runner.py --promote <dataset> <version_id>` "
                "(automation.core.version.approve_version / "
                "automation.core.promote.promote_version). promote_version() "
                "raises ValueError if the version's status is not 'approved', "
                "so this is an enforced gate, not just a convention."
            ),
            "etl_integration": (
                "etl/pipelines/interest_rates.py reads the written JSON and "
                "loads it into PostgreSQL via the shared ETL pipeline framework."
            ),
        }


# ---------------------------------------------------------------------------
# Register the adapter
# ---------------------------------------------------------------------------

register(SARBAdapter)
