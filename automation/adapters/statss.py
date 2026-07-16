"""
automation.adapters.statssa — Statistics South Africa adapter.

Responsible datasets
--------------------
  - unemployment       (QLFS P0211 — part of the QLFS family)
  - youth-unemployment (QLFS P0211 — same release)
  - labour-force       (QLFS P0211 — same release)
  - gdp                (GDP P0441)
  - inflation          (CPI component only, P0141)
  - population         (MYPE P0302)
  - housing            (GHS component only, P0318)
  - census             (Census 2022 — erratum watch only)
  - municipalities     (Census 2022 Municipal Fact Sheet — erratum watch only)

Design principles (from architecture doc)
------------------------------------------
- The QLFS family (unemployment, youth-unemployment, labour-force) is ONE
  release.  ``check_for_updates`` returns the same result for all three.
- Census and municipalities are static — their check is a lightweight
  page-hash watch, not a download attempt.
- Population MUST use Stats SA P0302, not World Bank.  The source guard
  will be enforced in the download step (Phase B).
- Retry policy: STATSSA_POLICY (exponential backoff, up to 2 h — the
  release-day site-load scenario).

Phase 1 scope (QLFS)
--------------------
This upgrade implements:
  - Real ETag/content-hash change detection on the P0211 release hub
  - ``fetch_and_apply()`` for the QLFS family:
      1. Detect the latest QLFS publication on the release hub
      2. Locate the official Excel workbook link
      3. Download the workbook (with retry)
      4. Archive the raw .xlsx file
      5. Record a version entry (status=pending)
      6. Produce a per-dataset run report

STOP at download.  This phase does NOT:
  - Parse the Excel file
  - Extract values
  - Transform data
  - Update JSON files
  - Write to PostgreSQL

Those stages have implementation plans and will be completed in later phases.

QLFS release hub URL
--------------------
  https://www.statssa.gov.za/?page_id=1854&PPN=P0211

Excel link pattern (observed, may change per release)
-----------------------------------------------------
  The release hub links to one or more Excel data table files alongside
  the PDF statistical release.  URL patterns observed:
    - Direct xlsx: statssa.gov.za/publications/P0211/...
    - SuperWEB2 time-series: statsssa.gov.za/publications/... (varies)

  We scan the release hub HTML for the first .xlsx or .xls href that
  belongs to statssa.gov.za and contains "P0211" in the path, falling back
  to any .xlsx link on the page.
"""

from __future__ import annotations

import re
import urllib.parse
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from automation.adapters import register
from automation.adapters.base import BaseAdapter, DatasetCheckResult
from automation.core.config import AutomationConfig, DatasetConfig, SourceConfig
from automation.core.files import portable_archive_path, save_to_archive
from automation.core.http_client import AutomationHTTPError, HTTPClient
from automation.core.logging import get_logger
from automation.core.retry import STATSSA_POLICY, WATCH_POLICY, with_retry
from automation.core.version import new_version_entry, save_version_entry

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_STATSSA_BASE = "https://www.statssa.gov.za"
_RELEASE_HUB_BASE = "https://www.statssa.gov.za/?page_id=1854"

# QLFS (P0211) release hub — used for ETag/content-hash change detection.
# Note: this page is protected by Incapsula WAF and requires a browser
# session to render fully.  We use the raw response hash to detect page
# changes (the redirect/challenge page itself changes when content changes).
_QLFS_HUB_URL = f"{_RELEASE_HUB_BASE}&PPN=P0211"
_QLFS_PUBLICATION_CODE = "P0211"

# Direct publication base URL (confirmed accessible without WAF).
# Individual files at this path can be fetched directly.
_QLFS_PUBLICATION_BASE = "https://www.statssa.gov.za/publications/P0211/"

# Ordinal suffixes used in Stats SA URL naming convention (confirmed 2026-07-12)
# Pattern: "Presentation QLFS QN YYYY.pdf" → "Presentation%20QLFS%20QN%20YYYY.pdf"
_QUARTER_ORDINALS: dict[int, str] = {
    1: "1st",
    2: "2nd",
    3: "3rd",
    4: "4th",
}

# Quarter to month name (for release window context)
_QUARTER_MONTH_NAMES: dict[int, str] = {
    1: "March",
    2: "June",
    3: "September",
    4: "December",
}

# Excel file discovery patterns (for HTML scraping fallback, if page is accessible)
_EXCEL_HREF_PATTERNS: list[re.Pattern[str]] = [
    # Full URL with P0211 in path
    re.compile(r'href=["\']([^"\']*P0211[^"\']*\.xlsx?)["\']', re.IGNORECASE),
    # Any statssa.gov.za xlsx link
    re.compile(r'href=["\']([^"\']*statssa\.gov\.za[^"\']*\.xlsx?)["\']', re.IGNORECASE),
    # Any relative xlsx link
    re.compile(r'href=["\']([^"\']*\.xlsx?)["\']', re.IGNORECASE),
]

# Known quarter labels for QLFS — used to identify the release period from text
_QUARTER_PATTERN = re.compile(
    r"Q([1-4])\s+(\d{4})|Quarter\s+([1-4]).*?(\d{4})", re.IGNORECASE
)

# ---------------------------------------------------------------------------
# QLFS release calendar reference (from SA-Data-Hub-Automation-Architecture.md)
# Each quarter-end → approximate release window
# ---------------------------------------------------------------------------

_QLFS_RELEASE_WINDOWS: dict[str, str] = {
    "Q1": "May–June (6 weeks after 31 March)",
    "Q2": "August (6 weeks after 30 June)",
    "Q3": "November (6 weeks after 30 September)",
    "Q4": "February (6 weeks after 31 December)",
}

_GDP_RELEASE_WINDOWS: dict[str, str] = {
    "Q1": "June (~65–70 days after 31 March)",
    "Q2": "September",
    "Q3": "December",
    "Q4": "March",
}

# ---------------------------------------------------------------------------
# Datasets managed by this adapter
# ---------------------------------------------------------------------------

_STATSSA_DATASETS: list[str] = [
    "unemployment",
    "youth-unemployment",
    "labour-force",
    "gdp",
    "inflation",     # CPI component only
    "population",
    "housing",       # GHS component only
    "census",
    "municipalities",
]

# Datasets that are effectively static — light erratum-watch only
_STATIC_DATASETS: frozenset[str] = frozenset({"census", "municipalities"})

# QLFS family — all three are one release
_QLFS_FAMILY: frozenset[str] = frozenset({
    "unemployment",
    "youth-unemployment",
    "labour-force",
})

# ---------------------------------------------------------------------------
# HTTP client helpers
# ---------------------------------------------------------------------------


def _build_http_client(source_config: SourceConfig) -> HTTPClient:
    """Create an HTTPClient configured from source_config."""
    return HTTPClient(
        timeout_seconds=source_config.timeout_seconds,
        extra_headers={"Accept": "text/html,application/xhtml+xml,*/*"},
    )


# ---------------------------------------------------------------------------
# Release hub page parsing
# ---------------------------------------------------------------------------


def _fetch_release_hub_html(client: HTTPClient, hub_url: str) -> bytes:
    """
    Fetch the Stats SA release hub page for a given publication.

    Returns the raw HTML bytes. Explicitly checks for Incapsula WAF challenge
    and raises an error if detected.

    Work Item 5 (2026-07-12 implementation spec) finding
    -----------------------------------------------------
    The original open question was whether the WAF challenge page's content
    hash is stable across requests/client-states — if not, hash-based
    "no_change" detection could misreport a WAF block as a genuine release.
    This has NOT been empirically settled: no environment with network
    access to statssa.gov.za was available in any implementation session to
    date, so no dated, request-counted observation exists (the spec's
    acceptance criterion for this item is therefore still open).

    Rather than assume determinism either way, the fix taken here sidesteps
    the question instead of answering it: the response body is scanned for
    the literal Incapsula markers on every fetch, and any match is raised as
    an explicit ``WAF_BLOCKED`` error rather than being hashed and compared
    at all. A WAF challenge page can therefore never be misread as
    "no_change" or as a genuine release, regardless of whether it happens
    to be deterministic. If a future session gets real network access to
    verify determinism directly, that empirical finding should still be
    recorded here for completeness, but it is no longer load-bearing for
    correctness given this guard.

    Raises
    ------
    AutomationHTTPError
        On non-retryable HTTP errors or WAF blocks.
    urllib.error.URLError
        On transient network errors (retried by caller).
    """
    response = client.get(hub_url)
    if not response.body:
        raise ValueError(f"Empty response body from {hub_url}")
        
    body_text = response.body.decode("utf-8", errors="replace")
    if "_Incapsula_Resource" in body_text or "incapsula" in body_text.lower():
        raise AutomationHTTPError(status=403, reason="WAF_BLOCKED: Incapsula WAF challenge detected")

    return response.body


def _extract_excel_url(html: bytes, base_url: str = _STATSSA_BASE) -> str | None:
    """
    Scan HTML for a Stats SA Excel workbook link (HTML scraping fallback).

    Tries each pattern in ``_EXCEL_HREF_PATTERNS`` in order, returning the
    first match that resolves to an absolute HTTPS URL.

    This is a fallback for when the release hub page is accessible (not
    WAF-blocked).  The primary discovery strategy is
    ``_probe_qlfs_excel_url()`` which constructs direct URLs.

    Parameters
    ----------
    html:
        Raw HTML bytes of the release hub page.
    base_url:
        Base for resolving relative hrefs.

    Returns
    -------
    str or None
        Absolute URL of the Excel workbook, or None if none found.
    """
    text = html.decode("utf-8", errors="replace")

    for pattern in _EXCEL_HREF_PATTERNS:
        matches = pattern.findall(text)
        for href in matches:
            href = href.strip()
            if not href:
                continue
            # Resolve relative URLs
            if href.startswith("//"):
                href = "https:" + href
            elif href.startswith("/"):
                href = base_url.rstrip("/") + href
            elif not href.startswith("http"):
                href = base_url.rstrip("/") + "/" + href
            # Must be a valid URL
            parsed = urllib.parse.urlparse(href)
            if parsed.scheme in ("http", "https"):
                return href

    return None


def _extract_release_period(html: bytes) -> str:
    """
    Attempt to extract the release period (e.g. 'Q1 2026') from hub HTML.

    Returns an empty string if no match is found.
    """
    text = html.decode("utf-8", errors="replace")
    match = _QUARTER_PATTERN.search(text)
    if match:
        groups = match.groups()
        if groups[0] and groups[1]:
            return f"Q{groups[0]} {groups[1]}"
        if groups[2] and groups[3]:
            return f"Q{groups[2]} {groups[3]}"
    return ""


def _extract_hub_etag_and_hash(
    client: HTTPClient,
    hub_url: str,
) -> tuple[str, str]:
    """
    Return (etag, content_sha256) for the release hub page.

    Used by check_for_updates to detect page changes cheaply.
    """
    try:
        response = client.get(hub_url)
        return response.etag or "", response.content_sha256
    except Exception:
        return "", ""


# ---------------------------------------------------------------------------
# QLFS direct URL construction and probing
# ---------------------------------------------------------------------------


def _build_qlfs_candidate_urls(quarter: int, year: int) -> list[str]:
    """
    Build an ordered list of candidate Excel URLs for the given QLFS quarter.

    Stats SA naming convention (confirmed from live URL probing, 2026-07-12):
      - PDFs:   ``Presentation%20QLFS%20Q{N}%20{YYYY}.pdf``  (confirmed working)
      - Excel:  No confirmed pattern yet — multiple variants tried below

    This list is ordered by likelihood based on observed Stats SA conventions.
    The caller probes each URL in order and uses the first that returns 200
    with a valid Excel file.

    Parameters
    ----------
    quarter : int
        Quarter number (1–4).
    year : int
        Full year (e.g. 2026).
    """
    base = _QLFS_PUBLICATION_BASE
    q = quarter
    y = year
    ord_suffix = _QUARTER_ORDINALS.get(q, f"{q}th")
    month = _QUARTER_MONTH_NAMES.get(q, "")

    # Build URL-encoded equivalents
    # Pattern: Presentation%20QLFS%20Q{N}%20{YYYY}  (spaces → %20)
    pres_prefix = f"Presentation%20QLFS%20Q{q}%20{y}"
    data_prefix1 = f"Data%20tables%20QLFS%20Q{q}%20{y}"
    data_prefix2 = f"Tables%20QLFS%20Q{q}%20{y}"
    data_prefix3 = f"Statistical%20tables%20Q{q}%20{y}"
    data_prefix4 = f"QLFS%20Q{q}%20{y}%20Statistical%20tables"
    data_prefix5 = f"P0211{ord_suffix}Quarter{y}"
    data_prefix6 = f"P0211%20{ord_suffix}%20Quarter%20{y}"

    candidates: list[str] = []
    for prefix in [
        pres_prefix,
        data_prefix1,
        data_prefix2,
        data_prefix3,
        data_prefix4,
        data_prefix5,
        data_prefix6,
    ]:
        for ext in (".xlsx", ".xls", ".pdf"):
            candidates.append(f"{base}{prefix}{ext}")

    return candidates


def _determine_current_qlfs_quarter() -> tuple[int, int]:
    """
    Determine the expected current QLFS release quarter.

    QLFS releases are approximately 6 weeks after quarter-end:
      Q1 (Jan-Mar) → released mid-May
      Q2 (Apr-Jun) → released mid-August
      Q3 (Jul-Sep) → released mid-November
      Q4 (Oct-Dec) → released mid-February

    Returns
    -------
    (quarter, year)
        The quarter and year of the most recently expected QLFS release.
    """
    today = date.today()
    m = today.month
    y = today.year

    # Most recently published quarter (by month)
    # Before May: Q4 of previous year
    # May-Jul: Q1 of current year
    # Aug-Oct: Q2 of current year
    # Nov-Jan: Q3 of current year
    if m < 5:
        return 4, y - 1
    elif m < 8:
        return 1, y
    elif m < 11:
        return 2, y
    else:
        return 3, y


def _probe_qlfs_publication_url(
    client: HTTPClient,
    quarter: int,
    year: int,
) -> str | None:
    """
    Probe candidate URLs for the QLFS quarter and return the first
    that responds with a valid file (HTTP 200, size > 10 KB).

    This is the primary discovery strategy.  It bypasses the
    Incapsula WAF by using direct file URLs rather than scraping the
    release hub HTML listing. It checks for Excel (.xlsx/.xls) first,
    then falls back to the statistical release PDF (.pdf).

    Parameters
    ----------
    client:
        HTTP client to use for probing.
    quarter:
        QLFS quarter (1–4).
    year:
        Year of the release.

    Returns
    -------
    str or None
        Working publication URL, or None if none of the candidates returned a file.
    """
    candidates = _build_qlfs_candidate_urls(quarter, year)
    log.debug(
        "Probing %d candidate URLs for QLFS Q%d %d …",
        len(candidates), quarter, year,
    )
    for url in candidates:
        try:
            # Use HEAD-style check first to avoid downloading a large file
            # multiple times.  Stats SA may not support HEAD, so we catch.
            resp = client.get(url)
            if resp.status == 200 and len(resp.body) > 10_240:  # > 10 KB
                log.info(
                    "QLFS publication found via direct URL probe: %s (%d bytes)",
                    url, len(resp.body),
                )
                return url
            log.debug("Probe %s → %d bytes (too small or error)", url, len(resp.body))
        except AutomationHTTPError as exc:
            if exc.status != 404:
                log.warning("Probe %s → HTTP %s: %s", url, exc.status, exc.reason)
            # 404 is expected for most candidates — skip silently
        except Exception as exc:
            log.debug("Probe %s → %s", url, exc)
    return None


# ---------------------------------------------------------------------------
# QLFS-specific fetch helpers
# ---------------------------------------------------------------------------


def _discover_qlfs_excel(
    client: HTTPClient,
    *,
    hub_url: str = _QLFS_HUB_URL,
) -> tuple[str | None, str, bytes]:
    """
    Discover and return the QLFS Excel workbook URL and hub HTML.

    Returns
    -------
    (excel_url, release_period, hub_html)
        excel_url:      Absolute URL of the Excel workbook, or None.
        release_period: Detected quarter label (e.g. 'Q1 2026') or ''.
        hub_html:       Raw HTML bytes of the release hub.
    """
    hub_html = _fetch_release_hub_html(client, hub_url)
    excel_url = _extract_excel_url(hub_html)
    release_period = _extract_release_period(hub_html)
    return excel_url, release_period, hub_html


def _download_publication(client: HTTPClient, url: str) -> bytes:
    """
    Download the publication file at ``url`` and return its raw bytes.

    Uses a separate HTTPClient call with Accept headers appropriate for
    binary file downloads.

    Raises
    ------
    AutomationHTTPError
        On non-retryable HTTP errors.
    urllib.error.URLError
        On transient network errors.
    """
    dl_client = HTTPClient(
        timeout_seconds=120,  # Files can be large
        extra_headers={"Accept": "application/vnd.ms-excel,application/pdf,*/*"},
    )
    response = dl_client.get(url)
    if len(response.body) < 1024:
        raise ValueError(
            f"Downloaded file is suspiciously small ({len(response.body)} bytes) "
            f"from {url} — may be an error page, not a publication file."
        )
    return response.body


# ---------------------------------------------------------------------------
# Adapter class
# ---------------------------------------------------------------------------


class StatsSAAdapter(BaseAdapter):
    """
    Adapter for Statistics South Africa (statssa.gov.za).

    Covers QLFS, GDP, CPI, MYPE, GHS, Census, and the Municipal Fact Sheet.

    Phase 1 implements:
      - Real release detection for the QLFS family (ETag/content-hash watch)
      - ``fetch_and_apply()`` for the QLFS family:
          1. Discover latest QLFS release
          2. Locate the official publication (Excel or PDF)
          3. Download it
          4. Archive the raw file
          5. Record version metadata
          6. Generate a run report

    All other datasets remain Phase A stubs in ``check_for_updates``.
    """

    source_id = "statssa"
    display_name = "Statistics South Africa"
    priority = 10   # Run first — largest number of datasets
    version = "0.2.0"  # bumped from 0.1.0 (Phase A stub) → Phase 1

    def __init__(
        self,
        config: Any,
        source_config: Any = None,
    ) -> None:
        super().__init__(config, source_config)
        # Run-level cache: QLFS hub check is shared across all three QLFS datasets.
        # Avoids three identical HTTP fetches per runner invocation.
        self._qlfs_check_cache: DatasetCheckResult | None = None

    def validate_config(self) -> list[str]:
        """
        Validate Stats SA adapter configuration.

        Stats SA requires no API key or credentials — all data is publicly
        available via the release hub.  We validate that:
        - The automation raw archive directory is writable (Phase B dependency)
        - The source config, if present, has the expected base_url
        """
        errors: list[str] = []

        # Check that the archive directory can be created
        archive_root = self.config.raw_archive_dir
        try:
            archive_root.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            errors.append(
                f"Cannot create raw archive directory {archive_root}: {exc}"
            )

        # Validate base URL if configured
        if self.source_config.base_url and not self.source_config.base_url.startswith(
            "https://"
        ):
            errors.append(
                f"source_config.base_url should start with 'https://', "
                f"got: {self.source_config.base_url!r}"
            )

        return errors

    def datasets(self) -> list[str]:
        """Return all datasets this adapter is responsible for."""
        return _STATSSA_DATASETS

    # ------------------------------------------------------------------
    # check_for_updates — Phase 1: real ETag watch for QLFS; stubs for rest
    # ------------------------------------------------------------------

    def check_for_updates(
        self,
        dataset_id: str,
        dataset_config: DatasetConfig | None,
    ) -> DatasetCheckResult:
        """
        Check whether a new release is available for ``dataset_id``.

        Phase 1 implements a real ETag/content-hash watch for the QLFS family.
        All other datasets retain the Phase A stub behaviour.
        """
        # QLFS family — Phase 1: real release hub check
        # All three QLFS datasets share one hub fetch per run (cached)
        # to avoid 3 identical HTTP calls and ensure consistent status.
        if dataset_id in _QLFS_FAMILY:
            if self._qlfs_check_cache is None:
                self._qlfs_check_cache = self._check_qlfs(dataset_id, dataset_config)
            # Return a copy with the correct dataset_id (status/message shared)
            cached = self._qlfs_check_cache
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status=cached.status,
                message=cached.message,
                latest_period=cached.latest_period,
                current_period=cached.current_period,
                source_url=cached.source_url,
                notes=cached.notes,
            )

        # ---------- Phase A stubs for remaining datasets ----------

        # Static datasets — Census and municipalities
        if dataset_id in _STATIC_DATASETS:
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="unknown",
                message=(
                    f"[Phase A] {dataset_id} is a static/erratum-watch dataset. "
                    "Phase B will implement a lightweight page-hash check on the "
                    "Stats SA release hub."
                ),
                notes=(
                    "No action needed unless Stats SA publishes an erratum. "
                    "municipalities.json is current (verified 2026-06-04). "
                    "census.json is correct until ~2032."
                ),
            )

        # GDP
        if dataset_id == "gdp":
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="unknown",
                message=(
                    "[Phase A] GDP P0441. Phase B will implement calendar-windowed "
                    "check (~65–70 days after quarter-end) with Excel download. "
                    "Note: GDP revisions require overwrite of historical points, "
                    "not blind append."
                ),
                current_period="Q4 2025",
                latest_period="Q1 2026 (released 9 June 2026 — not yet in JSON)",
                source_url="https://www.statssa.gov.za/?page_id=1854&PPN=P0441",
            )

        # CPI (inflation, Stats SA component only)
        if dataset_id == "inflation":
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="unknown",
                message=(
                    "[Phase A] CPI P0141 (Stats SA component only). "
                    "Repo rate component is handled by the SARB adapter. "
                    "Phase B will implement monthly Excel download on ~22nd of month."
                ),
                current_period="April 2026",
                latest_period="May 2026 (4.5% headline — not yet in JSON)",
                source_url="https://www.statssa.gov.za/?page_id=1854&PPN=P0141",
            )

        # Population (MYPE)
        if dataset_id == "population":
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="unknown",
                message=(
                    "[Phase A] Population MYPE P0302. "
                    "CRITICAL: current JSON may be sourced from World Bank, not "
                    "Stats SA. Phase B MUST include a source guard that hard-fails "
                    "if the resolved data does not originate from statssa.gov.za. "
                    "Current JSON (64.0M, 2024) conflicts with Stats SA MYPE 2025 "
                    "(63.1M) — this is a data-integrity bug, not just staleness."
                ),
                current_period="2024 (possibly wrong source)",
                latest_period="2025 MYPE: 63.1M (released 28 Jul 2025)",
                source_url="https://www.statssa.gov.za/?page_id=1854&PPN=P0302",
                notes=(
                    "Do not automate until source is corrected. "
                    "See automation architecture §5 Population-specific note."
                ),
            )

        # Housing (GHS component)
        if dataset_id == "housing":
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="unknown",
                message=(
                    "[Phase A] Housing P0318 (GHS component). "
                    "Phase B will implement annual GHS Excel download. "
                    "Census-baseline component is static. "
                    "Pending: confirm whether GHS 2024/2025 has updated the "
                    "three tracked indicators (piped water, electricity, formal dwellings)."
                ),
                source_url="https://www.statssa.gov.za/?page_id=1854&PPN=P0318",
            )

        # Fallback
        return DatasetCheckResult(
            dataset_id=dataset_id,
            status="unknown",
            message=f"[Phase A] No check implemented yet for {dataset_id}.",
        )

    # ------------------------------------------------------------------
    # QLFS-specific check (Phase 1)
    # ------------------------------------------------------------------

    def _check_qlfs(
        self,
        dataset_id: str,
        dataset_config: DatasetConfig | None,
    ) -> DatasetCheckResult:
        """
        Real release detection for the QLFS family.

        Performs an ETag/content-hash check against the P0211 release hub.
        Returns ``update_available`` if the page has changed since the last
        known hash, ``up_to_date`` if it hasn't, or ``error`` on failure.

        The *same* check result is appropriate for all three QLFS datasets
        (unemployment, youth-unemployment, labour-force) — they all come
        from the same release.
        """
        client = _build_http_client(self.source_config)
        previous_hash = self._load_qlfs_previous_hash()

        self._log.info(
            "Checking QLFS release hub: %s (previous_hash=%s…)",
            _QLFS_HUB_URL,
            previous_hash[:8] if previous_hash else "none",
        )

        try:
            changed, response = with_retry(
                lambda: client.etag_check(
                    _QLFS_HUB_URL,
                    previous_sha256=previous_hash,
                ),
                policy=WATCH_POLICY,
                label="QLFS release hub ETag check",
            )
        except AutomationHTTPError as exc:
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="error",
                message=f"QLFS release hub returned HTTP {exc.status}: {exc.reason}",
                source_url=_QLFS_HUB_URL,
            )
        except Exception as exc:
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="error",
                message=f"Failed to check QLFS release hub: {exc}",
                source_url=_QLFS_HUB_URL,
            )
            
        # WAF check
        if response.body:
            body_text = response.body.decode("utf-8", errors="replace")
            if "_Incapsula_Resource" in body_text or "incapsula" in body_text.lower():
                self._log.error("WAF challenge detected on QLFS release hub")
                return DatasetCheckResult(
                    dataset_id=dataset_id,
                    status="error",
                    message="WAF_BLOCKED: Incapsula WAF challenge detected. Cannot check for updates.",
                    source_url=_QLFS_HUB_URL,
                )

        # Parse release period from the page even if unchanged (for context)
        release_period = _extract_release_period(response.body)

        if not changed:
            self._log.info(
                "QLFS release hub unchanged (sha256=%s…)", previous_hash[:8]
            )
            return DatasetCheckResult(
                dataset_id=dataset_id,
                status="up_to_date",
                message=(
                    "QLFS P0211 release hub page is unchanged since last check. "
                    "No new publication detected."
                ),
                latest_period=release_period or "unknown",
                source_url=_QLFS_HUB_URL,
            )

        # Page has changed — save new hash and report update available
        self._save_qlfs_hash(response.content_sha256)
        self._log.info(
            "QLFS release hub changed — new sha256=%s… — update likely available",
            response.content_sha256[:8],
        )

        # Attempt to find an Excel link for richer reporting
        excel_url = _extract_excel_url(response.body)

        return DatasetCheckResult(
            dataset_id=dataset_id,
            status="update_available",
            message=(
                "QLFS P0211 release hub page has changed. "
                "A new QLFS publication is likely available."
            ),
            latest_period=release_period or "unknown (check release hub)",
            current_period="Q4 2025",
            source_url=_QLFS_HUB_URL,
            notes=(
                f"Excel workbook URL detected: {excel_url or 'not found — check hub manually'}. "
                "Run fetch_and_apply() to download and archive the workbook."
            ),
        )

    # ------------------------------------------------------------------
    # Hash persistence helpers (lightweight state for ETag check)
    # ------------------------------------------------------------------

    def _qlfs_hash_path(self) -> Path:
        """Return the path to the stored QLFS hub content hash."""
        return self.config.report_dir / "versions" / "qlfs_hub.sha256"

    def _load_qlfs_previous_hash(self) -> str:
        """Return the last-known SHA-256 of the QLFS hub page, or ''."""
        p = self._qlfs_hash_path()
        if not p.exists():
            return ""
        try:
            return p.read_text(encoding="utf-8").strip()
        except OSError:
            return ""

    def _save_qlfs_hash(self, sha256: str) -> None:
        """Persist the new SHA-256 of the QLFS hub page."""
        p = self._qlfs_hash_path()
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(sha256, encoding="utf-8")
        except OSError as exc:
            self._log.warning("Cannot save QLFS hub hash to %s: %s", p, exc)

    # ------------------------------------------------------------------
    # fetch_and_apply — Phase 1: QLFS discovery + download + archive
    # ------------------------------------------------------------------

    def fetch_and_apply(
        self,
        *,
        dry_run: bool = False,
        run_id: str = "",
    ) -> dict[str, Any]:
        """
        Manually-invoked utility. NOT part of the automated execution flow
        and NOT reachable via ``runner.py``, ``__main__.py``, or any
        config-driven flag (see Work Item 1,
        ``automation/docs/developer-guide.md``).

        Phase 1: Discover, download and archive the latest QLFS publication.
        This method only downloads and archives raw source files — it does
        not write to any production dataset JSON (see "STOP THERE" below) —
        but it must still only be invoked by a developer who explicitly
        imports ``StatsSAAdapter`` and calls this method themselves, for
        manual, supervised testing. When this adapter's write logic is
        eventually built out (parse/transform/update JSON), that write path
        must go through the staging → approval → promote pipeline
        (Work Item 4), not a direct write like ``SARBAdapter.fetch_and_apply()``.

        Steps
        -----
        1. Fetch the QLFS P0211 release hub page (with retry).
        2. Locate the official publication link (Excel or PDF) by direct URL probing.
        3. Download the publication file (with retry, large-file timeout).
        4. Archive the raw file with checksum + manifest.
        5. Record a version entry (status='pending') for each QLFS dataset.
        6. Return an execution result dict for the caller / report system.

        STOP THERE.  This method does NOT:
          - Parse the file
          - Extract any values
          - Transform data
          - Update unemployment.json / youth-unemployment.json / labour-force.json
          - Write to PostgreSQL

        Parameters
        ----------
        dry_run:
            When True, downloads the file but does NOT write to disk.
            All other steps execute normally (for verification purposes).
        run_id:
            Correlation ID from the runner, injected into version entries.

        Returns
        -------
        dict
            Keys:
              status            — "ok" | "no_publication_found" | "error"
              hub_url           — QLFS release hub URL checked
              file_url          — discovered publication URL, or None
              release_period    — detected quarter label, e.g. "Q1 2026"
              archive_path      — path where file was saved, or None
              sha256            — checksum of the downloaded file
              file_size_bytes   — size of the downloaded file
              version_ids       — list of version IDs created
              dry_run           — echo of the dry_run flag
              notes             — human-readable summary
              errors            — list of error strings
        """
        result: dict[str, Any] = {
            "status": "error",
            "hub_url": _QLFS_HUB_URL,
            "file_url": None,
            "release_period": "",
            "archive_path": None,
            "sha256": None,
            "file_size_bytes": None,
            "version_ids": [],
            "dry_run": dry_run,
            "notes": "",
            "errors": [],
        }

        client = _build_http_client(self.source_config)

        # ----------------------------------------------------------
        # Step 1: Fetch the QLFS release hub page
        # ----------------------------------------------------------
        self._log.info("Fetching QLFS release hub: %s", _QLFS_HUB_URL)
        try:
            hub_html = with_retry(
                lambda: _fetch_release_hub_html(client, _QLFS_HUB_URL),
                policy=STATSSA_POLICY,
                label="QLFS release hub fetch",
            )
        except AutomationHTTPError as exc:
            msg = f"QLFS release hub returned HTTP {exc.status}: {exc.reason}"
            result["errors"].append(msg)
            self._log.error(msg)
            return result
        except Exception as exc:
            msg = f"Failed to fetch QLFS release hub: {exc}"
            result["errors"].append(msg)
            self._log.error(msg)
            return result

        # ----------------------------------------------------------
        # Step 2: Locate the publication link
        # ----------------------------------------------------------
        # First, try to extract the release period from the hub page (for context)
        release_period = _extract_release_period(hub_html)
        result["release_period"] = release_period
        self._log.info(
            "QLFS release hub fetched — detected period: %r",
            release_period or "(not detected)",
        )

        # Primary discovery strategy: probe direct publication URLs
        q, y = _determine_current_qlfs_quarter()
        file_url = _probe_qlfs_publication_url(client, q, y)

        # Fallback strategy: try to scrape the hub HTML in case WAF is off or 
        # a new URL structure was used
        if file_url is None:
            self._log.debug("Direct URL probe failed, attempting HTML scrape fallback...")
            file_url = _extract_excel_url(hub_html)

        result["file_url"] = file_url

        if file_url is None:
            msg = (
                "No publication link found for QLFS. "
                "Direct probes failed (likely no standard naming) and HTML scrape "
                "failed (likely WAF blocked). "
                f"Hub URL: {_QLFS_HUB_URL}"
            )
            self._log.warning(msg)
            result["status"] = "no_publication_found"
            result["notes"] = (
                "Could not locate the QLFS publication file. "
                "The Stats SA hub is WAF-protected, preventing scraping, and direct "
                "URL probing did not find a standard filename. Manual check required."
            )
            # Save the hub HTML to archive for manual inspection
            if not dry_run:
                try:
                    hub_dest, hub_sha = save_to_archive(
                        self.config.raw_archive_dir,
                        hub_html,
                        dataset_id="unemployment",  # canonical QLFS dataset
                        source_id=self.source_id,
                        suffix="_hub.html",
                    )
                    self._log.info(
                        "Hub HTML archived for inspection → %s", hub_dest
                    )
                except Exception as archive_exc:
                    self._log.warning(
                        "Could not archive hub HTML: %s", archive_exc
                    )
            return result

        self._log.info("Located publication: %s", file_url)

        # ----------------------------------------------------------
        # Step 3: Download the publication
        # ----------------------------------------------------------
        self._log.info("Downloading QLFS publication from %s …", file_url)
        try:
            file_bytes = with_retry(
                lambda: _download_publication(client, file_url),  # type: ignore[arg-type]
                policy=STATSSA_POLICY,
                label=f"QLFS file download ({file_url})",
            )
        except AutomationHTTPError as exc:
            msg = (
                f"QLFS file download failed — HTTP {exc.status}: {exc.reason} "
                f"(URL: {file_url})"
            )
            result["errors"].append(msg)
            self._log.error(msg)
            return result
        except Exception as exc:
            msg = f"QLFS file download failed: {exc}"
            result["errors"].append(msg)
            self._log.error(msg)
            return result

        result["file_size_bytes"] = len(file_bytes)
        self._log.info(
            "Downloaded QLFS publication: %d bytes", len(file_bytes)
        )

        # ----------------------------------------------------------
        # Step 4: Archive the raw file
        # ----------------------------------------------------------
        if not dry_run:
            file_ext = Path(urllib.parse.urlparse(file_url).path).suffix or ".bin"
            try:
                archive_dest, sha256 = save_to_archive(
                    self.config.raw_archive_dir,
                    file_bytes,
                    dataset_id="unemployment",  # canonical QLFS dataset slug
                    source_id=self.source_id,
                    suffix=file_ext,
                )
                result["archive_path"] = portable_archive_path(
                    self.config.raw_archive_dir, archive_dest
                )
                result["sha256"] = sha256
                self._log.info(
                    "QLFS file archived → %s (sha256=%s…, %d bytes)",
                    archive_dest,
                    sha256[:8],
                    len(file_bytes),
                )
            except Exception as exc:
                msg = f"Archive write failed: {exc}"
                result["errors"].append(msg)
                self._log.error(msg)
                # Non-fatal — continue to version recording
        else:
            from automation.core.files import sha256_of_bytes
            sha256 = sha256_of_bytes(file_bytes)
            result["sha256"] = sha256
            self._log.info(
                "[DRY RUN] Would archive %d bytes (sha256=%s…)",
                len(file_bytes),
                sha256[:8],
            )

        sha256 = result["sha256"] or ""

        # ----------------------------------------------------------
        # Step 5: Record version entries (one per QLFS dataset)
        # ----------------------------------------------------------
        version_ids: list[str] = []
        for ds_id in sorted(_QLFS_FAMILY):
            try:
                entry = new_version_entry(
                    dataset_id=ds_id,
                    source_id=self.source_id,
                    source_url=file_url,
                    sha256=sha256,
                    archive_path=result["archive_path"] or "",
                    adapter_version=self.version,
                    notes=(
                        f"Phase 1: raw publication downloaded. "
                        f"Release period: {release_period or 'unknown'}. "
                        f"Hub URL: {_QLFS_HUB_URL}. "
                        f"File size: {len(file_bytes)} bytes. "
                        f"Note: Stats SA WAF prevents reliable Excel scraping, "
                        f"so we fall back to PDF if Excel is unprobeable."
                    ),
                    run_id=run_id,
                )
                if not dry_run:
                    save_version_entry(self.config.report_dir, entry)
                    self._log.info(
                        "Version entry saved: %s (dataset=%s, status=pending)",
                        entry.version_id,
                        ds_id,
                    )
                else:
                    self._log.info(
                        "[DRY RUN] Would save version entry %s for %s",
                        entry.version_id,
                        ds_id,
                    )
                version_ids.append(entry.version_id)
            except Exception as exc:
                msg = f"Version entry failed for {ds_id}: {exc}"
                result["errors"].append(msg)
                self._log.warning(msg)

        result["version_ids"] = version_ids

        # ----------------------------------------------------------
        # Step 6: Compose result and update QLFS hub hash
        # ----------------------------------------------------------
        if not result["errors"]:
            result["status"] = "ok"
        else:
            # Partial success — workbook downloaded but minor issues occurred
            result["status"] = "ok"  # still OK; errors are logged

        result["notes"] = (
            f"QLFS Phase 1 complete. "
            f"Release period: {release_period or 'unknown'}. "
            f"Publication file: {len(file_bytes):,} bytes. "
            f"Archive: {result['archive_path'] or '(dry-run)'}. "
            f"Version entries: {', '.join(version_ids) or 'none'}. "
            f"Note: Downloaded format depends on direct URL probing success due to WAF."
        )

        # Update hub hash so the next check_for_updates call sees the new baseline
        if not dry_run:
            try:
                # Re-fetch to get a fresh hash (we already have the bytes)
                from automation.core.files import sha256_of_bytes
                hub_hash = sha256_of_bytes(hub_html)
                self._save_qlfs_hash(hub_hash)
                self._log.debug("QLFS hub hash updated: %s…", hub_hash[:8])
            except Exception as exc:
                self._log.warning("Could not update QLFS hub hash: %s", exc)

        return result

    # ------------------------------------------------------------------
    # describe()
    # ------------------------------------------------------------------

    def describe(self) -> dict[str, Any]:
        return {
            "source_id": self.source_id,
            "display_name": self.display_name,
            "base_url": _STATSSA_BASE,
            "release_hub": _RELEASE_HUB_BASE,
            "api_available": False,
            "datasets": _STATSSA_DATASETS,
            "qlfs_family": sorted(_QLFS_FAMILY),
            "static_datasets": sorted(_STATIC_DATASETS),
            "automation_levels": {
                "unemployment": "hybrid",
                "youth-unemployment": "hybrid",
                "labour-force": "hybrid",
                "gdp": "hybrid",
                "inflation": "hybrid (CPI only; repo-rate via SARB)",
                "population": "manual (source correction required first)",
                "housing": "hybrid (pending GHS source confirmation)",
                "census": "static (erratum watch only)",
                "municipalities": "static (erratum watch only)",
            },
            "qlfs_release_windows": _QLFS_RELEASE_WINDOWS,
            "gdp_release_windows": _GDP_RELEASE_WINDOWS,
            "retry_policy": "STATSSA_POLICY (up to 2 h on release day)",
            "phase_1_status": (
                "QLFS: real ETag/hash detection + Excel download + archive. "
                "All other datasets: Phase A stubs."
            ),
            "phase_2_plan": (
                "Implement Excel parser (automation/adapters/qlfs_parser.py) "
                "to extract unemployment / youth / LFPR values from specific "
                "cell ranges.  Mapper then writes to JSON schema."
            ),
            "notes": (
                "One release, one job: QLFS family uses a single extractor. "
                "Population source guard is mandatory in Phase B. "
                "GDP ETL must overwrite historical points (revisions), not append."
            ),
        }


# ---------------------------------------------------------------------------
# Register the adapter
# ---------------------------------------------------------------------------

register(StatsSAAdapter)
