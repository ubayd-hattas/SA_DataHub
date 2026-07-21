"""
Second pass: get the full beginning of the output (hub results)
"""
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-ZA,en;q=0.9",
    "Accept-Encoding": "identity",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

BARE_HEADERS = {
    "User-Agent": "SA-Data-Hub-Automation/0.1 (https://sadatahub.tech; data-automation-bot)",
    "Accept": "text/html,application/xhtml+xml,*/*",
}

def probe(label, url, headers=HEADERS, max_bytes=4096, timeout=20):
    try:
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read(max_bytes)
            resp_headers = dict(resp.headers)
            text = body.decode("utf-8", errors="replace")
            waf = "_Incapsula_Resource" in text or "incapsula" in text.lower()
            imperva = "imperva" in text.lower() or any("imperva" in str(v).lower() for v in resp_headers.values())
            server = resp_headers.get("Server", resp_headers.get("server", "n/a"))
            ct = resp_headers.get("Content-Type", resp_headers.get("content-type", "n/a"))
            etag = resp_headers.get("ETag", resp_headers.get("etag", ""))
            lmod = resp_headers.get("Last-Modified", resp_headers.get("last-modified", ""))
            print(f"RESULT {label}: status={resp.status}, WAF={waf}, imperva={imperva}, server={repr(server)}, ct={repr(ct)}, etag={repr(etag)}, last_mod={repr(lmod)}, body_size={len(body)}")
            print(f"  BODY: {repr(text[:600])}")
    except urllib.error.HTTPError as exc:
        print(f"RESULT {label}: HTTP_ERROR={exc.code}, reason={exc.reason}")
    except urllib.error.URLError as exc:
        print(f"RESULT {label}: URL_ERROR={exc.reason}")
    except Exception as exc:
        print(f"RESULT {label}: EXCEPTION={type(exc).__name__}: {exc}")

ts = datetime.now(timezone.utc).isoformat()
print(f"TIMESTAMP: {ts}")
print(f"Python: {sys.version}")

print("\n=== HUB PROBES (Tier 1 browser headers) ===")
probe("QLFS_HUB", "https://www.statssa.gov.za/?page_id=1854&PPN=P0211")
probe("GDP_HUB",  "https://www.statssa.gov.za/?page_id=1854&PPN=P0441")
probe("CPI_HUB",  "https://www.statssa.gov.za/?page_id=1854&PPN=P0141")
probe("POP_HUB",  "https://www.statssa.gov.za/?page_id=1854&PPN=P0302")

print("\n=== HUB PROBES (old bot UA) ===")
probe("QLFS_HUB_BOT", "https://www.statssa.gov.za/?page_id=1854&PPN=P0211", headers=BARE_HEADERS)

print("\n=== PUBLICATION BASE DIRS ===")
probe("QLFS_PUB", "https://www.statssa.gov.za/publications/P0211/")
probe("GDP_PUB",  "https://www.statssa.gov.za/publications/P0441/")
probe("CPI_PUB",  "https://www.statssa.gov.za/publications/P0141/")
probe("POP_PUB",  "https://www.statssa.gov.za/publications/P0302/")

print("\n=== QLFS PDF (confirmed 200) ===")
probe("QLFS_PDF", "https://www.statssa.gov.za/publications/P0211/Presentation%20QLFS%20Q1%202026.pdf")

print("\n=== QLFS EXCEL VARIANTS (try more names) ===")
more_qlfs = [
    "https://www.statssa.gov.za/publications/P0211/P02111stQuarter2026Tables.xlsx",
    "https://www.statssa.gov.za/publications/P0211/P02111stQuarter2026Data.xlsx",
    "https://www.statssa.gov.za/publications/P0211/Statistical%20tables%20QLFS%20Q1%202026.xlsx",
    "https://www.statssa.gov.za/publications/P0211/QLFS%20Q1%202026%20Statistical%20tables.xlsx",
    "https://www.statssa.gov.za/publications/P0211/P02111stQuarter2026.xls",
    "https://www.statssa.gov.za/publications/P0211/P0211Q12026DataTables.xlsx",
]
for u in more_qlfs:
    probe("QLFS_MORE", u)

print("\n=== GDP PDF CHECK ===")
probe("GDP_PDF", "https://www.statssa.gov.za/publications/P0441/P04411stQuarter2026.pdf")
probe("GDP_PDF2", "https://www.statssa.gov.za/publications/P0441/Presentation%20GDP%20Q1%202026.pdf")
probe("GDP_PDF3", "https://www.statssa.gov.za/publications/P0441/P04414thQuarter2025.pdf")

print("\n=== CPI PDF CHECK ===")
probe("CPI_PDF", "https://www.statssa.gov.za/publications/P0141/P01412May2026.pdf")
probe("CPI_PDF2", "https://www.statssa.gov.za/publications/P0141/P01412June2026.pdf")

print("\n=== POP PDF CHECK ===")
probe("POP_PDF", "https://www.statssa.gov.za/publications/P0302/P03022025.pdf")
probe("POP_PDF2", "https://www.statssa.gov.za/publications/P0302/P03022024.pdf")
probe("POP_PDF3", "https://www.statssa.gov.za/publications/P0302/P0302.pdf")
