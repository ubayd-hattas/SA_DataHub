"""
Backtest of the "expected next month" method (docs/fuel.md, section 4).

CEF sheets are grouped by their averaging period (period_start). Each period
runs up to one official adjustment: the first effective date after the
period's last sheet. For each period and product:

  estimate on day k   = -(average over-recovery on the k-th sheet of the period)
  final import change = contribution to BFP in the new price - contribution in the old price
                        (both read from sheets whose current price started on those dates)
  error               = estimate - final import change
  total change        = official price change (src/data/fuel/prices.json)
  policy part         = total change - final import change   (slate, levies, margins)

So the outcome lies between estimate - p90 and estimate - p10 of the error.
Errors are measured once per period per group of working days (the last sheet
in the group). Periods that cannot be matched to an adjustment are reported,
not dropped silently.

Outputs a Markdown report and a JSON of the statistics. Both must stay in
sources/releases/fuel/ (ignored by git): CEF has not agreed to reuse of its
figures, and the repository is public. Nothing is printed except where the
files went.
"""
from __future__ import annotations

import glob
import json
import os
import statistics
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cef_daily import PRODUCTS, parse_pdf  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / "sources" / "releases" / "fuel"
GROUPS = [(1, 5), (6, 10), (11, 15), (16, 99)]


def private_path(path: str) -> Path:
    """Refuse any output outside the ignored sources/releases/fuel/ folder."""
    p = Path(path).resolve()
    if PRIVATE != p and PRIVATE not in p.parents:
        raise SystemExit(f"Refusing to write {p}: CEF-derived output may only go under {PRIVATE}.")
    return p


def percentile(values: list[float], q: float) -> float:
    s = sorted(values)
    if not s:
        return float("nan")
    i = (len(s) - 1) * q
    lo, hi = int(i), min(int(i) + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (i - lo)


def group_key(position: int) -> str:
    for lo, hi in GROUPS:
        if lo <= position <= hi:
            return f"{lo}-{hi}"
    raise ValueError(position)


def load_sheets(cef_dir: str):
    sheets, rejected = {}, []
    for f in sorted(glob.glob(os.path.join(cef_dir, "cef-*.pdf"))):
        try:
            s = parse_pdf(f)
        except Exception as e:  # one bad file must not stop the run
            rejected.append((os.path.basename(f), f"{type(e).__name__}: {e}"))
            continue
        if s.problems:
            rejected.append((os.path.basename(f), "; ".join(s.problems)))
            continue
        sheets[s.day] = s
    return [sheets[d] for d in sorted(sheets)], rejected


def periods(sheets) -> dict:
    """Sheets grouped by averaging period, each list in date order."""
    out = defaultdict(list)
    for s in sheets:
        out[s.period_start].append(s)
    return {k: sorted(v, key=lambda s: s.day) for k, v in sorted(out.items())}


def outcomes(sheets, adjustments: list[dict]) -> tuple[list[dict], list[str]]:
    effective = sorted(date.fromisoformat(a["effectiveFrom"]) for a in adjustments)
    by_from = {a["effectiveFrom"]: a for a in adjustments}
    contribution = {}
    for s in sheets:
        contribution.setdefault(s.price_from, s.contribution)
    rows, unmatched = [], []
    for start, ws in periods(sheets).items():
        last = ws[-1].day
        target = next((e for e in effective if e > last), None)
        before = [e for e in effective if e <= last]
        if target is None or not before:
            unmatched.append(f"{start}: no held adjustment after {last}")
            continue
        old = before[-1]
        if target not in contribution or old not in contribution:
            unmatched.append(f"{start}: no sheet under the price of {old if old not in contribution else target}")
            continue
        a_old, a_new = by_from[old.isoformat()], by_from[target.isoformat()]
        for prod in PRODUCTS:
            final_import = round(contribution[target][prod] - contribution[old][prod], 3)
            p_old, p_new = a_old["prices"][prod]["inland"], a_new["prices"][prod]["inland"]
            total = None if p_old is None or p_new is None else round(p_new - p_old, 3)
            groups = {}
            for k, s in enumerate(ws, start=1):
                groups[group_key(k)] = {"position": k, "estimate": round(-s.average_recovery[prod], 3)}
            rows.append({"month": a_new["month"], "period_start": start.isoformat(), "product": prod, "sheets": len(ws),
                         "final_import": final_import, "total": total,
                         "policy": None if total is None else round(total - final_import, 3), "groups": groups})
    return rows, unmatched


def summarise(rows: list[dict]) -> dict:
    stats = {}
    for prod in PRODUCTS:
        mine = [r for r in rows if r["product"] == prod]
        st = {"months": len(mine), "groups": {}}
        for lo, hi in GROUPS:
            key = f"{lo}-{hi}"
            errs = [r["groups"][key]["estimate"] - r["final_import"] for r in mine if key in r["groups"]]
            st["groups"][key] = {
                "n": len(errs),
                "import_mae": round(statistics.mean(abs(x) for x in errs), 1) if errs else None,
                "import_p10": round(percentile(errs, 0.1), 1) if errs else None,
                "import_p90": round(percentile(errs, 0.9), 1) if errs else None,
                "import_min": round(min(errs), 1) if errs else None,
                "import_max": round(max(errs), 1) if errs else None,
            }
        pol = [r["policy"] for r in mine if r["policy"] is not None]
        st["policy_part"] = {"n": len(pol), "over_30c": sum(abs(x) > 30 for x in pol)}
        stats[prod] = st
    return stats


def main(cef_dir: str, prices_path: str, out_dir: str) -> None:
    out = private_path(out_dir)
    sheets, rejected = load_sheets(cef_dir)
    adjustments = json.load(open(prices_path, encoding="utf-8"))["adjustments"]
    rows, unmatched = outcomes(sheets, adjustments)
    stats = summarise(rows)
    out.mkdir(parents=True, exist_ok=True)
    json.dump({"rows": rows, "stats": stats, "rejected": rejected, "unmatched": unmatched, "sheets_used": len(sheets)},
              open(out / "backtest.json", "w", encoding="utf-8"), indent=1)
    lines = ["# Backtest of the expected-change method (private)", "",
             f"Sheets used: {len(sheets)}. Rejected: {len(rejected)}. Periods not matched to an adjustment: {len(unmatched)}.", ""]
    for prod, st in stats.items():
        lines += [f"## {prod}", "", "| Working days | Periods | Mean abs error (c) | 10th / 90th pct | min / max |", "|---|---|---|---|---|"]
        for key, g in st["groups"].items():
            lines.append(f"| {key} | {g['n']} | {g['import_mae']} | {g['import_p10']} / {g['import_p90']} | {g['import_min']} / {g['import_max']} |")
        lines += ["", f"Policy part over 30 c in {st['policy_part']['over_30c']} of {st['policy_part']['n']} months.", ""]
    lines += ["## Not used", ""] + [f"- {f}: {why}" for f, why in rejected] + [f"- {u}" for u in unmatched]
    (out / "backtest.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {out / 'backtest.md'} and backtest.json ({len(sheets)} sheets, {len(rejected)} rejected, {len(unmatched)} periods unmatched).")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(2)
    main(*sys.argv[1:4])
