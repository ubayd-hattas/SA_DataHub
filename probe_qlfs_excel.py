"""Probe QLFS data table Excel URLs using presentation naming pattern."""
import sys
sys.path.insert(0, ".")
from automation.core.http_client import HTTPClient, AutomationHTTPError

client = HTTPClient(timeout_seconds=30)

# Based on confirmed PDF pattern: "Presentation%20QLFS%20Q1%202026.pdf"
# Try variants for Excel/data tables
candidates = [
    # Excel variants of presentation
    "https://www.statssa.gov.za/publications/P0211/Presentation%20QLFS%20Q1%202026.xlsx",
    "https://www.statssa.gov.za/publications/P0211/Presentation%20QLFS%20Q1%202026.xls",
    # Data tables Excel
    "https://www.statssa.gov.za/publications/P0211/Data%20tables%20QLFS%20Q1%202026.xlsx",
    "https://www.statssa.gov.za/publications/P0211/Data%20tables%20QLFS%20Q1%202026.xls",
    "https://www.statssa.gov.za/publications/P0211/Tables%20QLFS%20Q1%202026.xlsx",
    "https://www.statssa.gov.za/publications/P0211/Tables%20QLFS%20Q1%202026.xls",
    # Check older release for pattern
    "https://www.statssa.gov.za/publications/P0211/Presentation%20QLFS%20Q4%202025.pdf",
    "https://www.statssa.gov.za/publications/P0211/Presentation%20QLFS%20Q4%202025.xlsx",
    "https://www.statssa.gov.za/publications/P0211/Data%20tables%20QLFS%20Q4%202025.xlsx",
    # QLFS series Excel from time-series page
    "https://www.statssa.gov.za/timeseriesdata/Excel/P0211/P0211.xlsx",
    "https://www.statssa.gov.za/timeseriesdata/Excel/P0211.xlsx",
    # Release press statement
    "https://www.statssa.gov.za/publications/P0211/Press%20Statement%20QLFS%20Q1%202026.pdf",
    # Statistical tables Excel
    "https://www.statssa.gov.za/publications/P0211/Statistical%20tables%20Q1%202026.xlsx",
    "https://www.statssa.gov.za/publications/P0211/QLFS%20Q1%202026%20Statistical%20tables.xlsx",
]

for url in candidates:
    try:
        resp = client.get(url)
        content_type = resp.headers.get("content-type", "unknown")
        fname = url.split("/")[-1][:55]
        print(f"OK   {resp.status}  {len(resp.body):>10} bytes  ct={content_type[:35]}  {fname}")
    except AutomationHTTPError as e:
        fname = url.split("/")[-1][:55]
        print(f"HTTP {e.status}                            {fname}")
    except Exception as e:
        fname = url.split("/")[-1][:55]
        print(f"ERR  {str(e)[:35]}  {fname}")
