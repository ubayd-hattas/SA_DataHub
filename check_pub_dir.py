"""Check what's in the Stats SA P0211 publications directory."""
import sys
import re
sys.path.insert(0, ".")
from automation.core.http_client import HTTPClient

client = HTTPClient(timeout_seconds=30)
resp = client.get("https://www.statssa.gov.za/publications/P0211/")
html = resp.body.decode("utf-8", errors="replace")
with open("pub_dir.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Size:", len(html))
print("HTML:")
print(html[:800])
