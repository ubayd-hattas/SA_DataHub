import sys, urllib.request, urllib.error
from datetime import datetime, timezone

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-ZA,en;q=0.9",
    "Accept-Encoding": "identity",
}

url = "https://www.statssa.gov.za/?page_id=1854&PPN=P0211"
print("QLFS_HUB PROBE")
print("Time:", datetime.now(timezone.utc).isoformat())
try:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = resp.read(2000)
        text = body.decode("utf-8", errors="replace")
        waf = "_Incapsula_Resource" in text or "incapsula" in text.lower()
        print("Status:", resp.status)
        print("WAF:", waf)
        print("Body size:", len(body))
        print("Body:", repr(text))
        hdrs = dict(resp.headers)
        for k, v in hdrs.items():
            print(f"  Header {k}: {v}")
except Exception as e:
    print("ERROR:", type(e).__name__, str(e))
