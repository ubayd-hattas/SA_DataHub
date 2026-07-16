"""Probe more QLFS file URL patterns and check what the presentation URL looks like."""
import sys
sys.path.insert(0, ".")
from automation.core.http_client import HTTPClient, AutomationHTTPError

client = HTTPClient(timeout_seconds=30)

# The existing adapter notes this pattern:
# "statssa.gov.za/publications/P0211/Presentation QLFS QN YYYY.pdf"
# Try the presentation URL with spaces and similar patterns

candidates = [
    # Presentation PDF patterns (from docs)
    "https://www.statssa.gov.za/publications/P0211/Presentation QLFS Q1 2026.pdf",
    "https://www.statssa.gov.za/publications/P0211/Presentation%20QLFS%20Q1%202026.pdf",
    "https://www.statssa.gov.za/publications/P0211/PresentationQLFSQ12026.pdf",
    # Try SuperWEB2 data API
    "https://www.statssa.gov.za/?page_id=1855",
    # Try the stats sa data portal
    "http://www.statssa.gov.za/publications/P0211/P02111stQuarter2026.pdf",
    # Try alternative formats
    "https://www.statssa.gov.za/publications/P0211/P0211%201st%20Quarter%202026.xlsx",
]

for url in candidates:
    try:
        resp = client.get(url)
        content_type = resp.headers.get("content-type", "unknown")
        print(f"OK  {resp.status}  {len(resp.body):>10} bytes  ct={content_type[:40]}  {url.split('/')[-1][:50]}")
    except AutomationHTTPError as e:
        print(f"HTTP {e.status}  {url.split('/')[-1][:50]}")
    except Exception as e:
        print(f"ERR {str(e)[:50]}  {url.split('/')[-1][:50]}")
