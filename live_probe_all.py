"""
Live probe: Verify which exact URL patterns work for Stats SA publications.
Focus on:
1. What PDF patterns succeed (known from prev session)
2. Whether any xlsx/xls versions exist with the same base names
3. Test broader naming variants for Excel
"""
import urllib.request, urllib.error
from datetime import datetime, timezone
import urllib.parse

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf,*/*",
    "Accept-Language": "en-ZA,en;q=0.9",
    "Accept-Encoding": "identity",
}

def probe(label, url):
    """Return (status, size, content_type, last_modified, is_waf)"""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=25) as resp:
            body = resp.read(8192)
            hdrs = {k.lower(): v for k,v in dict(resp.headers).items()}
            ct = hdrs.get("content-type", "")
            lmod = hdrs.get("last-modified", "")
            text = body.decode("utf-8", errors="replace")
            waf = "_Incapsula_Resource" in text or "incapsula" in text.lower()
            size_hdr = hdrs.get("content-length", "?")
            print(f"  OK   [{label}] status={resp.status} bytes_read={len(body)} size_hdr={size_hdr} ct={ct[:50]} waf={waf}")
            if lmod:
                print(f"       last_modified={lmod}")
            if waf:
                print(f"       ** WAF challenge - not a real file **")
            return resp.status, len(body), ct, waf
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            print(f"  HTTP [{label}] {exc.code} - {url}")
        return exc.code, 0, "", False
    except Exception as exc:
        print(f"  ERR  [{label}] {type(exc).__name__}: {exc}")
        return None, 0, "", False

print(f"=== DIRECT URL PROBE === {datetime.now(timezone.utc).isoformat()}")
print()

# ── QLFS Q1 2026 — confirmed PDF from prev session ──────────────────────────
print("--- QLFS Q1 2026: Confirmed PDF base name ---")
base_pdf = "https://www.statssa.gov.za/publications/P0211/Presentation%20QLFS%20Q1%202026"
for ext in [".pdf", ".xlsx", ".xls"]:
    probe(f"QLFS_PRES{ext}", base_pdf + ext)

print()
print("--- QLFS Q1 2026: Publication main release document ---")
# Known working: P02111stQuarter2026.pdf from prev session
for name_pattern in [
    "P02111stQuarter2026",
    "P0211%201st%20Quarter%202026",
    "P0211_1stQuarter2026",
]:
    for ext in [".pdf", ".xlsx", ".xls"]:
        base = "https://www.statssa.gov.za/publications/P0211/" + name_pattern
        probe(f"QLFS_{name_pattern[:20]}{ext}", base + ext)

print()
print("--- QLFS Q1 2026: Data tables patterns ---")
for name_pattern in [
    "P02111stQuarter2026%20Tables",
    "P02111stQuarter2026%20Data",
    "P02111stQuarter2026%20Statistical%20Tables",
    "Statistical%20release%20P0211%201st%20Quarter%202026",
    "QLFS%20Q1%202026%20Data%20Tables",
    "Data%20Tables%20QLFS%20Q1%202026",
    "Tables%20QLFS%20Q1%202026",
]:
    for ext in [".xlsx", ".xls", ".pdf"]:
        base = "https://www.statssa.gov.za/publications/P0211/" + name_pattern
        status, _, _, _ = probe(f"QLFS_tables{ext}", base + ext)
        if status == 200:
            print(f"       *** HIT: {base + ext} ***")

print()
# ── GDP Q1 2026 ──────────────────────────────────────────────────────────────
print("--- GDP Q1 2026: Confirmed PDF base name ---")
for name_pattern in [
    "P04411stQuarter2026",
    "P0441%201st%20Quarter%202026",
    "P04411stQuarter2026%20Tables",
    "Statistical%20release%20P0441%201st%20Quarter%202026",
    "GDP%20Q1%202026%20Data%20Tables",
]:
    for ext in [".pdf", ".xlsx", ".xls"]:
        base = "https://www.statssa.gov.za/publications/P0441/" + name_pattern
        status, _, _, _ = probe(f"GDP_{name_pattern[:20]}{ext}", base + ext)
        if status == 200:
            print(f"       *** HIT: {base + ext} ***")

print()
# ── CPI (P0141) — check PDF and xlsx ─────────────────────────────────────────
print("--- CPI: Recent month patterns ---")
for month_num, month_name in [("6","June"), ("5","May"), ("4","April"), ("3","March")]:
    for name_pattern in [
        f"P01412{month_name}2026",
        f"Statistical%20release%20P0141%20{month_name}%202026",
        f"CPI%20{month_name}%202026",
    ]:
        for ext in [".pdf", ".xlsx", ".xls"]:
            base = "https://www.statssa.gov.za/publications/P0141/" + name_pattern
            status, _, _, _ = probe(f"CPI_{month_name[:3]}{ext}", base + ext)
            if status == 200:
                print(f"       *** HIT: {base + ext} ***")

print()
# ── Population (P0302) — annual ───────────────────────────────────────────────
print("--- Population MYPE: Check 2025 and 2024 ---")
for year in [2025, 2024]:
    for name_pattern in [
        f"P0302{year}",
        f"Statistical%20release%20P0302%20{year}",
        f"MYPE%20{year}",
        f"Mid-year%20population%20estimates%20{year}",
    ]:
        for ext in [".pdf", ".xlsx", ".xls"]:
            base = "https://www.statssa.gov.za/publications/P0302/" + name_pattern
            status, _, _, _ = probe(f"POP_{year}_{name_pattern[:15]}{ext}", base + ext)
            if status == 200:
                print(f"       *** HIT: {base + ext} ***")

print()
print("=== DONE ===")
