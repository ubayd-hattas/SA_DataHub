"""Test direct Stats SA publication URL access."""
import sys
sys.path.insert(0, ".")
from automation.core.http_client import HTTPClient

client = HTTPClient(timeout_seconds=30)

urls = [
    "https://www.statssa.gov.za/publications/P0211/",
    "https://www.statssa.gov.za/publications/P0211/P02111stQuarter2026.pdf",
    "https://www.statssa.gov.za/publications/P0211/P0211Q1_2026.pdf",
    "http://www.statssa.gov.za/publications/P0211/",
]

for url in urls:
    try:
        resp = client.get(url)
        print(f"OK status={resp.status} size={len(resp.body)} url={url}")
    except Exception as e:
        print(f"FAIL {type(e).__name__}: {str(e)[:80]}")
        print(f"  url={url}")
