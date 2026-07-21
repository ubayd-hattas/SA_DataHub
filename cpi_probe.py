"""
Targeted CPI and additional discovery probe.
"""
import urllib.request, urllib.error
from datetime import datetime, timezone

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-ZA,en;q=0.9",
    "Accept-Encoding": "identity",
}

def probe(label, url, silent_404=True):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=25) as resp:
            body = resp.read(4096)
            hdrs = {k.lower(): v for k,v in dict(resp.headers).items()}
            ct = hdrs.get("content-type", "")
            lmod = hdrs.get("last-modified", "")
            text = body.decode("utf-8", errors="replace")
            waf = "_Incapsula_Resource" in text or "incapsula" in text.lower()
            size_hdr = hdrs.get("content-length", "?")
            print(f"  HIT  [{label}] status={resp.status} size={size_hdr} ct={ct[:55]} waf={waf}")
            if lmod:
                print(f"       last_modified={lmod}")
            return resp.status, len(body), ct, waf
    except urllib.error.HTTPError as exc:
        if exc.code != 404 or not silent_404:
            print(f"  HTTP [{label}] {exc.code}")
        return exc.code, 0, "", False
    except Exception as exc:
        print(f"  ERR  [{label}] {type(exc).__name__}: {exc}")
        return None, 0, "", False

print(f"=== CPI + ADDITIONAL PROBE === {datetime.now(timezone.utc).isoformat()}")
print()

# CPI - The P01412 prefix + MonthYear pattern is specific to CPI
# prev session says P01412{month}{year}.pdf
print("--- CPI: All PDF month patterns (full year coverage) ---")
for month in ["January","February","March","April","May","June","July","August","September","October","November","December"]:
    for year in [2026, 2025]:
        url = f"https://www.statssa.gov.za/publications/P0141/P01412{month}{year}.pdf"
        status, sz, ct, waf = probe(f"CPI_{month[:3]}{year}.pdf", url)
        if status == 200:
            print(f"       *** CPI PDF confirmed: P01412{month}{year}.pdf ***")

print()
print("--- CPI: Excel variants with same base name pattern ---")
# Once we have confirmed CPI PDF month names, try exact same base + .xlsx
for month in ["January","February","March","April","May","June","July","August","September","October","November","December"]:
    for year in [2026, 2025]:
        for suffix in ["", "Tables", "%20Tables", "DataTables", "%20DataTables"]:
            url = f"https://www.statssa.gov.za/publications/P0141/P01412{month}{year}{suffix}.xlsx"
            status, _, _, _ = probe(f"CPI_{month[:3]}_{year}_{suffix}.xlsx", url)
            if status == 200:
                print(f"       *** CPI EXCEL FOUND: P01412{month}{year}{suffix}.xlsx ***")

print()
print("--- QLFS: Try broader set of Q4 2025 / Q1 2026 patterns ---")
# Q1 2026 confirmed PDF: P02111stQuarter2026.pdf
# Try same base + .xlsx and also alternate names
for base_name in [
    "P02111stQuarter2026",
    "P02114thQuarter2025",  # Q4 2025 fallback
]:
    for ext in [".pdf", ".xlsx", ".xls"]:
        url = f"https://www.statssa.gov.za/publications/P0211/{base_name}{ext}"
        status, sz, ct, waf = probe(f"QLFS_{base_name}{ext}", url)
        if status == 200:
            print(f"       *** FOUND: {url} ({sz} bytes) ***")

print()
print("--- QLFS: Additional data table variants from P0211 ---")
# Try patterns that might be separate data-only files
for base_name in [
    "P02111stQuarter2026%20Statistical%20Tables",
    "P02111stQuarter2026%20Tables",
    "P02111stQuarter2026%20Data%20Tables",
    "P0211%201stQuarter2026",
    "QLFS%20Q1%202026%20Statistical%20Tables",
    "QLFS%20Q1%202026%20Tables",
    "QLFSQuarter12026",
    "P0211Q12026",
]:
    for ext in [".xlsx", ".xls", ".pdf"]:
        url = f"https://www.statssa.gov.za/publications/P0211/{base_name}{ext}"
        status, _, _, _ = probe(f"QLFS_extra{ext}", url)
        if status == 200:
            print(f"       *** FOUND: {url} ***")

print()
print("=== DONE ===")
