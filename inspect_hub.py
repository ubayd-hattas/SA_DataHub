"""Inspect the Stats SA release hub HTML to find Excel link patterns."""
import sys
import re

sys.path.insert(0, ".")
from automation.core.http_client import HTTPClient

client = HTTPClient(timeout_seconds=60)
resp = client.get("https://www.statssa.gov.za/?page_id=1854&PPN=P0211")
html = resp.body.decode("utf-8", errors="replace")

# Save HTML for offline inspection
with open("hub_debug.html", "w", encoding="utf-8") as f:
    f.write(html)
print(f"HTML saved to hub_debug.html ({len(html)} chars)")

hrefs = re.findall(r'href=["\x27](.*?)["\x27>\s]', html)
print(f"Total hrefs: {len(hrefs)}")

print("\nXLS hrefs:")
for h in hrefs:
    if "xls" in h.lower():
        print(" ", repr(h[:150]))

print("\nP0211 hrefs:")
for h in hrefs:
    if "p0211" in h.lower():
        print(" ", repr(h[:150]))

print("\nstatssa hrefs (first 20):")
count = 0
for h in hrefs:
    if "statssa" in h.lower():
        print(" ", repr(h[:150]))
        count += 1
        if count >= 20:
            break

print("\nAll unique file extensions found:")
exts = set()
for h in hrefs:
    if "." in h.split("/")[-1]:
        ext = h.split(".")[-1].split("?")[0].split("#")[0][:8]
        exts.add(ext.lower())
print(" ", exts)
