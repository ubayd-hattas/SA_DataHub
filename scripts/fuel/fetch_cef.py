"""
Downloads Central Energy Fund (CEF) daily basic fuel price sheets into
sources/releases/fuel/cef/ (ignored by git).

CEF publishes no reuse terms, so nothing this fetches is committed or put on
the site until CEF agrees (docs/fuel.md, decision D3). It reads robots.txt
first, uses an honest User-Agent and waits between requests. It never
requests a file it already holds.

Usage:
  python scripts/fuel/fetch_cef.py [--latest]     --latest fetches only the newest sheet
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "sources" / "releases" / "fuel" / "cef"
UA = "SADataHubBot/1.0 (+https://sadatahub.tech/methodology)"
INDEX_PAGES = ["https://cefgroup.co.za/2026-4/", "https://cefgroup.co.za/2025-4/"]
SHEET = re.compile(r"(https://cefgroup\.co\.za/wp-content/uploads/\d{4}/\d{2}/Daily-(\d{2})-(\d{2})-(\d{4})(?:-\d)?\.pdf)")
PAUSE_SECONDS = 5


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()


def allowed_by_robots(robots: str, path: str) -> bool:
    rules = [l.split(":", 1)[1].strip() for l in robots.splitlines() if l.lower().startswith("disallow:")]
    return not any(rule and path.startswith(rule) for rule in rules)


def sheet_links(html: str) -> dict[str, str]:
    """Sheet date (ISO, from the file name) to URL. The first link for a date is the newest upload."""
    out: dict[str, str] = {}
    for url, d, m, y in SHEET.findall(html):
        out.setdefault(f"{y}-{m}-{d}", url)
    return out


def main(argv: list[str]) -> int:
    latest_only = "--latest" in argv
    OUT.mkdir(parents=True, exist_ok=True)
    robots = get("https://cefgroup.co.za/robots.txt").decode("utf-8", "replace")
    if not allowed_by_robots(robots, "/wp-content/uploads/") or not allowed_by_robots(robots, "/2026-4/"):
        print("robots.txt disallows the sheets or the index; not fetching.")
        return 1
    links: dict[str, str] = {}
    for page in INDEX_PAGES[:1] if latest_only else INDEX_PAGES:
        time.sleep(PAUSE_SECONDS)
        for k, v in sheet_links(get(page).decode("utf-8", "replace")).items():
            links.setdefault(k, v)
    wanted = sorted(links)[-1:] if latest_only else sorted(links)
    fetched = 0
    for day in wanted:
        target = OUT / f"cef-{day}.pdf"
        if target.exists():
            continue
        time.sleep(PAUSE_SECONDS)
        body = get(links[day])
        if body[:4] != b"%PDF":
            print(f"{day}: not a PDF, skipped")
            continue
        target.write_bytes(body)
        fetched += 1
    log = OUT / "cef-fetch-log.json"
    known = json.loads(log.read_text(encoding="utf-8")) if log.exists() else {}
    known.update({d: links[d] for d in wanted})
    log.write_text(json.dumps(dict(sorted(known.items())), indent=1), encoding="utf-8")
    print(f"{fetched} new sheet(s); newest listed {wanted[-1] if wanted else 'none'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
