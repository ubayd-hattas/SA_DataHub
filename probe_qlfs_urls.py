"""Probe QLFS direct file URLs using observed naming patterns."""
import sys
sys.path.insert(0, ".")
from automation.core.http_client import HTTPClient, AutomationHTTPError

client = HTTPClient(timeout_seconds=30)

# Known naming patterns for QLFS (P0211) publications:
# PDF: P02111stQuarter2026.pdf, P02112ndQuarter2025.pdf, etc.
# Excel variants to probe:
candidates = [
    # Excel variants with quarter ordinals
    "https://www.statssa.gov.za/publications/P0211/P02111stQuarter2026.xlsx",
    "https://www.statssa.gov.za/publications/P0211/P02111stQuarter2026.xls",
    # Data tables (often a separate file)
    "https://www.statssa.gov.za/publications/P0211/DataTables1stQuarter2026.xlsx",
    "https://www.statssa.gov.za/publications/P0211/DataTables1stQuarter2026.xls",
    "https://www.statssa.gov.za/publications/P0211/Tables1stQuarter2026.xlsx",
    "https://www.statssa.gov.za/publications/P0211/Tables1stQuarter2026.xls",
    # Presentation-style
    "https://www.statssa.gov.za/publications/P0211/Presentation1stQuarter2026.xlsx",
    "https://www.statssa.gov.za/publications/P0211/PresentationQLFSQ12026.xlsx",
    # QLFS-specific naming
    "https://www.statssa.gov.za/publications/P0211/QLFSQ12026.xlsx",
    "https://www.statssa.gov.za/publications/P0211/QLFSQ12026tables.xlsx",
    # Historical patterns (try Q4 2025 to confirm pattern)
    "https://www.statssa.gov.za/publications/P0211/P02114thQuarter2025.xlsx",
    "https://www.statssa.gov.za/publications/P0211/P02114thQuarter2025.xls",
    "https://www.statssa.gov.za/publications/P0211/DataTables4thQuarter2025.xlsx",
    "https://www.statssa.gov.za/publications/P0211/Tables4thQuarter2025.xlsx",
]

for url in candidates:
    try:
        resp = client.get(url)
        print(f"OK  {resp.status}  {len(resp.body):>10} bytes  {url.split('/')[-1]}")
    except AutomationHTTPError as e:
        print(f"HTTP {e.status}                          {url.split('/')[-1]}")
    except Exception as e:
        print(f"ERR {str(e)[:40]}   {url.split('/')[-1]}")
