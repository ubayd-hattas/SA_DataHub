"""
Live network probe for Stats SA production validation audit.
Run: python net_probe.py
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

def probe(label, url, headers=HEADERS, max_bytes=8192, timeout=20):
    print(f"\n--- {label} ---")
    print(f"  URL: {url}")
    try:
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read(max_bytes)
            resp_headers = dict(resp.headers)
            text = body.decode("utf-8", errors="replace")
            waf = "_Incapsula_Resource" in text or "incapsula" in text.lower()
            imperva = "imperva" in text.lower() or any(
                "imperva" in str(v).lower() for v in resp_headers.values()
            )
            cloudflare = "cloudflare" in text.lower() or any(
                "cloudflare" in str(v).lower() for v in resp_headers.values()
            )
            server = resp_headers.get("Server", resp_headers.get("server", "unknown"))
            xpow = resp_headers.get("X-Powered-By", resp_headers.get("x-powered-by", ""))
            ct = resp_headers.get("Content-Type", resp_headers.get("content-type", ""))
            etag = resp_headers.get("ETag", resp_headers.get("etag", ""))
            lmod = resp_headers.get("Last-Modified", resp_headers.get("last-modified", ""))
            print(f"  Status: {resp.status}")
            print(f"  Server: {server}")
            print(f"  Content-Type: {ct}")
            print(f"  ETag: {etag}")
            print(f"  Last-Modified: {lmod}")
            print(f"  X-Powered-By: {xpow}")
            print(f"  Body bytes read: {len(body)}")
            print(f"  WAF marker (Incapsula): {waf}")
            print(f"  Imperva in response: {imperva}")
            print(f"  Cloudflare in response: {cloudflare}")
            print(f"  Body preview: {repr(text[:400])}")
            return {"status": resp.status, "waf": waf, "body": text, "headers": resp_headers}
    except urllib.error.HTTPError as exc:
        body_text = ""
        try:
            body_text = exc.read(2000).decode("utf-8", errors="replace")
        except Exception:
            pass
        print(f"  Status: {exc.code} ERROR — {exc.reason}")
        print(f"  Error body preview: {repr(body_text[:300])}")
        return {"status": exc.code, "waf": False, "body": body_text}
    except urllib.error.URLError as exc:
        print(f"  Status: None — URLError: {exc.reason}")
        return {"status": None, "error": str(exc.reason)}
    except Exception as exc:
        print(f"  Status: None — {type(exc).__name__}: {exc}")
        return {"status": None, "error": str(exc)}


def main():
    ts = datetime.now(timezone.utc).isoformat()
    print("=" * 60)
    print("STATS SA LIVE NETWORK PROBE")
    print(f"Timestamp: {ts}")
    print("=" * 60)

    # ── 1. Release Hub URLs (with Tier 1 browser headers) ──────────────
    print("\n\n### RELEASE HUBS (browser headers — Tier 1 Hardened) ###")
    r_qlfs_hub = probe("QLFS_HUB P0211", "https://www.statssa.gov.za/?page_id=1854&PPN=P0211")
    r_gdp_hub  = probe("GDP_HUB P0441",  "https://www.statssa.gov.za/?page_id=1854&PPN=P0441")
    r_cpi_hub  = probe("CPI_HUB P0141",  "https://www.statssa.gov.za/?page_id=1854&PPN=P0141")
    r_pop_hub  = probe("POP_HUB P0302",  "https://www.statssa.gov.za/?page_id=1854&PPN=P0302")

    # ── 2. Release Hub URLs (old bot headers — pre-Tier-1 baseline) ────
    print("\n\n### RELEASE HUBS (old bot UA — pre-Tier-1 baseline) ###")
    r_qlfs_hub_bot = probe("QLFS_HUB_BOT P0211 (old UA)", "https://www.statssa.gov.za/?page_id=1854&PPN=P0211", headers=BARE_HEADERS)

    # ── 3. Direct publication base URLs ────────────────────────────────
    print("\n\n### PUBLICATION BASE DIRECTORIES ###")
    r_qlfs_pub = probe("QLFS_PUB_BASE", "https://www.statssa.gov.za/publications/P0211/")
    r_gdp_pub  = probe("GDP_PUB_BASE",  "https://www.statssa.gov.za/publications/P0441/")
    r_cpi_pub  = probe("CPI_PUB_BASE",  "https://www.statssa.gov.za/publications/P0141/")
    r_pop_pub  = probe("POP_PUB_BASE",  "https://www.statssa.gov.za/publications/P0302/")

    # ── 4. Known candidate file URLs (Q1 2026) ─────────────────────────
    print("\n\n### CANDIDATE FILE PROBES (Q1 2026) ###")
    qlfs_candidates = [
        "https://www.statssa.gov.za/publications/P0211/Presentation%20QLFS%20Q1%202026.xlsx",
        "https://www.statssa.gov.za/publications/P0211/Data%20tables%20QLFS%20Q1%202026.xlsx",
        "https://www.statssa.gov.za/publications/P0211/Tables%20QLFS%20Q1%202026.xlsx",
        "https://www.statssa.gov.za/publications/P0211/P0211_Q1_2026.xlsx",
        "https://www.statssa.gov.za/publications/P0211/P02111stQuarter2026.xlsx",
        "https://www.statssa.gov.za/publications/P0211/P02112025Q4Tables.xlsx",
        "https://www.statssa.gov.za/publications/P0211/Presentation%20QLFS%20Q1%202026.pdf",
    ]
    for url in qlfs_candidates:
        probe(f"QLFS_CANDIDATE", url)

    # ── 5. GDP candidate file URLs (Q4 2025 / Q1 2026) ─────────────────
    print("\n\n### GDP CANDIDATE FILE PROBES ###")
    gdp_candidates = [
        "https://www.statssa.gov.za/publications/P0441/P04411stQuarter2026.xlsx",
        "https://www.statssa.gov.za/publications/P0441/P04414thQuarter2025.xlsx",
        "https://www.statssa.gov.za/publications/P0441/GDP%20Q1%202026.xlsx",
    ]
    for url in gdp_candidates:
        probe(f"GDP_CANDIDATE", url)

    # ── 6. CPI candidate file URLs (current month) ──────────────────────
    print("\n\n### CPI CANDIDATE FILE PROBES ###")
    cpi_candidates = [
        "https://www.statssa.gov.za/publications/P0141/P01412June2026.xlsx",
        "https://www.statssa.gov.za/publications/P0141/P01412May2026.xlsx",
        "https://www.statssa.gov.za/publications/P0141/CPI%20June%202026.xlsx",
    ]
    for url in cpi_candidates:
        probe(f"CPI_CANDIDATE", url)

    # ── 7. Population candidate file URLs ───────────────────────────────
    print("\n\n### POPULATION CANDIDATE FILE PROBES ###")
    pop_candidates = [
        "https://www.statssa.gov.za/publications/P0302/P03022026.xlsx",
        "https://www.statssa.gov.za/publications/P0302/P03022025.xlsx",
        "https://www.statssa.gov.za/publications/P0302/MYPE%202025.xlsx",
    ]
    for url in pop_candidates:
        probe(f"POP_CANDIDATE", url)

    print("\n\n" + "=" * 60)
    print("PROBE COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
