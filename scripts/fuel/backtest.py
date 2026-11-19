"""
Backtest of the "expected next month" method (docs/fuel.md, section 4).

For every pricing window in the CEF daily sheets held locally:
  estimate on day k   = -(average over-recovery on day k)        import part only
  final import change = contribution to BFP in the next price  -  contribution now
  total change        = official price change (src/data/fuel/prices.json)
  policy part         = total change - final import change     (slate, levies, margins)

Errors are measured once per month per group of working days (the last sheet in
the group), so each month counts once. Output: a Markdown report and a JSON of
the error statistics. Neither is committed while CEF's reuse terms are unknown.
"""
from __future__ import annotations

import glob
import json
import os
import statistics
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cef_daily import PRODUCTS, SheetError, parse_pdf  # noqa: E402

GROUPS = [(1, 5), (6, 10), (11, 15), (16, 99)]
# prices.json keys and the zone that matches the CEF columns (Gauteng pump and wholesale prices).
PRICE_KEY = {"petrol95": "petrol95", "petrol93": "petrol93", "diesel500ppm": "diesel500ppm", "diesel50ppm": "diesel50ppm", "paraffin": "paraffin"}


def percentile(values: list[float], q: float) -> float:
    s = sorted(values)
    if not s:
        return float("nan")
    i = (len(s) - 1) * q
    lo, hi = int(i), min(int(i) + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (i - lo)


def main(cef_dir: str, prices_path: str, out_dir: str) -> None:
    sheets, rejected = [], []
    for f in sorted(glob.glob(os.path.join(cef_dir, "cef-*.pdf"))):
        try:
            s = parse_pdf(f)
        except SheetError as e:
            rejected.append((os.path.basename(f), str(e)))
            continue
        if s.problems:
            rejected.append((os.path.basename(f), "; ".join(s.problems)))
            continue
        sheets.append(s)
    by_day = {s.day: s for s in sheets}
    sheets = sorted(by_day.values(), key=lambda s: s.day)

    prices = json.load(open(prices_path, encoding="utf-8"))["adjustments"]
    adj_by_from = {a["effectiveFrom"]: a for a in prices}
    order = [a["effectiveFrom"] for a in prices]

    # Group sheets by the price they sit under (price_from); the window is the run-up to the next one.
    windows = defaultdict(list)
    for s in sheets:
        windows[s.price_from.isoformat()].append(s)
    contribution = {k: v[0].contribution for k, v in windows.items()}

    rows = []  # one per window and product
    for price_from, ws in sorted(windows.items()):
        if price_from not in order:
            continue
        i = order.index(price_from)
        if i + 1 >= len(order):
            continue  # the window still running: no outcome yet
        next_from = order[i + 1]
        if next_from not in contribution:
            continue  # no sheet under the next price to read its contribution
        ws = sorted(ws, key=lambda s: s.day)
        current, nxt = adj_by_from[price_from], adj_by_from[next_from]
        for prod in PRODUCTS:
            final_import = round(contribution[next_from][prod] - contribution[price_from][prod], 3)
            p_now = current["prices"][PRICE_KEY[prod]]["inland"]
            p_next = nxt["prices"][PRICE_KEY[prod]]["inland"]
            total = None if p_now is None or p_next is None else round(p_next - p_now, 3)
            by_group = {}
            for lo, hi in GROUPS:
                in_group = [s for k, s in enumerate(ws, start=1) if lo <= k <= hi]
                if in_group:
                    est = -in_group[-1].average_recovery[prod]
                    by_group[f"{lo}-{hi}"] = {"day": in_group[-1].day.isoformat(), "estimate": round(est, 3)}
            last_est = -ws[-1].average_recovery[prod]
            rows.append({
                "month": nxt["month"], "product": prod, "sheets": len(ws),
                "final_import": final_import, "total": total,
                "policy": None if total is None else round(total - final_import, 3),
                "last_sheet_estimate": round(last_est, 3), "groups": by_group,
            })

    stats = {}
    for prod in PRODUCTS:
        mine = [r for r in rows if r["product"] == prod]
        stats[prod] = {"months": len(mine), "groups": {}}
        for lo, hi in GROUPS:
            key = f"{lo}-{hi}"
            pairs = [(r["groups"][key]["estimate"], r["final_import"], r["total"]) for r in mine if key in r["groups"]]
            err_imp = [e - f for e, f, _ in pairs]
            err_tot = [e - t for e, _, t in pairs if t is not None]
            direction = [ (e > 0) == (t > 0) for e, _, t in pairs if t not in (None, 0) and e != 0]
            stats[prod]["groups"][key] = {
                "n": len(err_imp),
                "import_mae": round(statistics.mean(abs(x) for x in err_imp), 1) if err_imp else None,
                "import_p10": round(percentile(err_imp, 0.1), 1) if err_imp else None,
                "import_p90": round(percentile(err_imp, 0.9), 1) if err_imp else None,
                "import_min": round(min(err_imp), 1) if err_imp else None,
                "import_max": round(max(err_imp), 1) if err_imp else None,
                "total_mae": round(statistics.mean(abs(x) for x in err_tot), 1) if err_tot else None,
                "total_min": round(min(err_tot), 1) if err_tot else None,
                "total_max": round(max(err_tot), 1) if err_tot else None,
                "direction_right": f"{sum(direction)}/{len(direction)}" if direction else None,
            }
        pol = [r["policy"] for r in mine if r["policy"] is not None]
        stats[prod]["policy_part"] = {"n": len(pol), "mean_abs": round(statistics.mean(abs(x) for x in pol), 1) if pol else None,
                                      "min": round(min(pol), 1) if pol else None, "max": round(max(pol), 1) if pol else None}
        last = [r["last_sheet_estimate"] - r["final_import"] for r in mine]
        stats[prod]["last_sheet_vs_final_import_max_abs"] = round(max(abs(x) for x in last), 2) if last else None

    os.makedirs(out_dir, exist_ok=True)
    json.dump({"rows": rows, "stats": stats, "rejected": rejected, "sheets_used": len(sheets)},
              open(os.path.join(out_dir, "backtest.json"), "w", encoding="utf-8"), indent=1)
    lines = [f"# Backtest of the expected-change method", "",
             f"Sheets used: {len(sheets)} (rejected {len(rejected)}). Months with an outcome: {stats['petrol95']['months']}.", ""]
    for prod in PRODUCTS:
        st = stats[prod]
        lines += [f"## {prod}", "", "| Working days of data | Months | Import error, mean abs (c) | Import error 10th / 90th pct | Import error min / max | Total error, mean abs | Total error min / max | Direction right |",
                  "|---|---|---|---|---|---|---|---|"]
        for key, g in st["groups"].items():
            lines.append(f"| {key} | {g['n']} | {g['import_mae']} | {g['import_p10']} / {g['import_p90']} | {g['import_min']} / {g['import_max']} | {g['total_mae']} | {g['total_min']} / {g['total_max']} | {g['direction_right']} |")
        pp = st["policy_part"]
        lines += ["", f"Policy part (slate, levies, margins; not in the CEF figure): {pp['n']} months, mean size {pp['mean_abs']} c, from {pp['min']} to {pp['max']} c.",
                  f"Last sheet of the window against the final import change: largest gap {st['last_sheet_vs_final_import_max_abs']} c.", ""]
    if rejected:
        lines += ["## Sheets not used", ""] + [f"- {f}: {why}" for f, why in rejected]
    open(os.path.join(out_dir, "backtest.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("\n".join(lines[:40]))


if __name__ == "__main__":
    main(*sys.argv[1:4])
