"""
Probe for real QLFS/GDP/CPI/POP Excel files using all documented patterns.
Based on confirmed PDF URL: Presentation QLFS Q1 2026.pdf -> Last-Modified: Tue, 12 May 2026
"""
import urllib.request, urllib.error, sys
from datetime import datetime, timezone

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf,*/*",
    "Accept-Language": "en-ZA,en;q=0.9",
    "Accept-Encoding": "identity",
}

def probe_file(label, url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read(4096)
            hdrs = dict(resp.headers)
            ct = hdrs.get("Content-Type", hdrs.get("content-type", ""))
            lmod = hdrs.get("Last-Modified", hdrs.get("last-modified", ""))
            etag = hdrs.get("ETag", hdrs.get("etag", ""))
            size_hdr = hdrs.get("Content-Length", hdrs.get("content-length", "?"))
            # Check if it's WAF
            text = body.decode("utf-8", errors="replace")
            waf = "_Incapsula_Resource" in text
            print(f"HIT  [{label}] {url}")
            print(f"     status={resp.status}, ct={ct}, last_mod={lmod}, etag={etag}, size_hdr={size_hdr}, waf={waf}")
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            print(f"ERR  [{label}] {url} -> HTTP {exc.code}")
    except Exception as exc:
        print(f"EXC  [{label}] {url} -> {type(exc).__name__}: {exc}")

print("=== LIVE EXCEL FILE PROBE ===")
print(f"Time: {datetime.now(timezone.utc).isoformat()}")

# ── QLFS Q1 2026 (most recent confirmed PDF: Tue, 12 May 2026) ──────────────
print("\n--- QLFS Q1 2026 EXCEL CANDIDATES ---")
qlfs_excel = [
    "P02111stQuarter2026.xlsx",
    "P0211_1stquarter2026.xlsx",
    "P02111stQuarter2026DataTables.xlsx",
    "P02111stQuarter2026Tables.xlsx",
    "P0211Q12026.xlsx",
    "P0211Q12026DataTables.xlsx",
    "P0211Q12026Tables.xlsx",
    "P02111stQtr2026.xlsx",
    "QLFS Q1 2026 Data Tables.xlsx",
    "QLFS%20Q1%202026%20Data%20Tables.xlsx",
    "P02111stQuarter2026 Data.xlsx",
    "Statistical tables QLFS Q1 2026.xlsx",
    # Try with just the publication code and a date variation
    "P02112026Q1.xlsx",
    # Old-style dates
    "P0211Q12026-Tables.xlsx",
    "P0211Q1_2026.xlsx",
]
for f in qlfs_excel:
    probe_file("QLFS_EXCEL", f"https://www.statssa.gov.za/publications/P0211/{f}")

# Also try Q4 2025 variants
print("\n--- QLFS Q4 2025 EXCEL CANDIDATES ---")
qlfs_q4 = [
    "P02114thQuarter2025.xlsx",
    "P02114thQuarter2025DataTables.xlsx",
    "P02114thQuarter2025Tables.xlsx",
    "P0211Q42025.xlsx",
    "P02112025Q4.xlsx",
]
for f in qlfs_q4:
    probe_file("QLFS_Q4_EXCEL", f"https://www.statssa.gov.za/publications/P0211/{f}")

# ── GDP (P0441) — Q1 2026 confirmed PDF: Tue, 09 Jun 2026 ───────────────────
print("\n--- GDP Q1 2026 EXCEL CANDIDATES ---")
gdp_excel = [
    "P04411stQuarter2026.xlsx",
    "P04411stQuarter2026DataTables.xlsx",
    "P04411stQuarter2026Tables.xlsx",
    "P0441Q12026.xlsx",
    "P04412026Q1.xlsx",
    "GDP Q1 2026.xlsx",
    "GDP%20Q1%202026.xlsx",
]
for f in gdp_excel:
    probe_file("GDP_EXCEL", f"https://www.statssa.gov.za/publications/P0441/{f}")

# ── CPI (P0141) — check recent months ────────────────────────────────────────
print("\n--- CPI RECENT EXCEL CANDIDATES ---")
cpi_excel = [
    "P01412June2026.xlsx",
    "P01412May2026.xlsx",
    "P01412April2026.xlsx",
    "P01412March2026.xlsx",
    "P01412February2026.xlsx",
    "P01412January2026.xlsx",
    "P0141June2026.xlsx",
    "P0141May2026.xlsx",
    "CPI June 2026.xlsx",
    "CPI%20June%202026.xlsx",
    "CPI May 2026.xlsx",
    "CPI%20May%202026.xlsx",
    "CPI-June2026.xlsx",
    "P01412Jun2026.xlsx",
]
for f in cpi_excel:
    probe_file("CPI_EXCEL", f"https://www.statssa.gov.za/publications/P0141/{f}")

# Also check a month that we know has data
print("\n--- CPI PDF CHECK FOR MONTH DISCOVERY ---")
for month in ["January2026","February2026","March2026","April2026","May2026","June2026"]:
    probe_file("CPI_PDF", f"https://www.statssa.gov.za/publications/P0141/P01412{month}.pdf")

# ── Population (P0302) — most recent known PDF: Mon, 28 Jul 2025 ─────────────
print("\n--- POPULATION EXCEL CANDIDATES ---")
pop_excel = [
    "P03022025.xlsx",
    "P03022024.xlsx",
    "P03022026.xlsx",
    "MYPE2025.xlsx",
    "MYPE 2025.xlsx",
    "MYPE%202025.xlsx",
    "P0302MidYear2025.xlsx",
    "Mid-year population estimates 2025.xlsx",
    "Mid-year%20population%20estimates%202025.xlsx",
    "P03022025DataTables.xlsx",
    "MidYearPopulation2025.xlsx",
]
for f in pop_excel:
    probe_file("POP_EXCEL", f"https://www.statssa.gov.za/publications/P0302/{f}")

print("\n=== DONE ===")
