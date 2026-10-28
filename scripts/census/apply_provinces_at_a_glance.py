"""Correct municipalities.json to Census 2022 Provinces at a glance.

Usage:
  python -I scripts/census/apply_provinces_at_a_glance.py [--write]

Reads sources/derived/provinces-at-a-glance-municipal-tables.json (made by
parse_provinces_at_a_glance.py), compares every count, share and rate in
src/data/datasets/municipalities.json with it, and prints each difference
as "code field old -> new". With --write it also:
  - edits only the differing values in municipalities.json (the file keeps
    its own formatting),
  - sets erratumApplied on the two municipalities Stats SA revised
    (erratum, page ii: Thaba Chweu MP321 and City of Mbombela MP326),
  - writes src/data/census-pages.json, the printed page of each table for
    each municipality, for the source lines on the site,
  - writes src/data/census-provinces.json, the nine province rows (their sum
    is the national figure; the publication has no national row).

Shares follow scripts/transform_municipalities.js: a category divided by the
sum of the categories (for cooking, "none" is excluded by Stats SA).
Land area is not in the publication and is left alone.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TABLES = ROOT / 'sources/derived/provinces-at-a-glance-municipal-tables.json'
DATA = ROOT / 'src/data/datasets/municipalities.json'
PAGES = ROOT / 'src/data/census-pages.json'
PROVINCES = ROOT / 'src/data/census-provinces.json'
PROVINCE_NAMES = ['Western Cape', 'Eastern Cape', 'Northern Cape', 'Free State', 'KwaZulu-Natal',
                  'North West', 'Gauteng', 'Mpumalanga', 'Limpopo']
ERRATUM = {'MP321', 'MP326'}

tables = json.loads(TABLES.read_text(encoding='utf8'))['tables']
text = DATA.read_text(encoding='utf8')
data = json.loads(text)


def nkey(name):
    return re.sub(r'[^a-z]', '', name.lower())


def row(kind, m):
    t = tables[kind]
    return t.get(m['id']) or t.get(nkey(m['name']))


def pct(a, b):
    return round(100 * a / b + 1e-9, 1)


def expected(m):
    p, a, h1, h2 = (row(k, m) for k in ('person', 'age', 'housing1', 'housing2'))
    pv, av, v1, v2 = p['values'], a['values'], h1['values'], h2['values']
    e = {
        'population2011': pv[2], 'population2022': pv[7],
        'sexRatio2011': pv[4], 'sexRatio2022': pv[9], 'populationGrowthRate': pv[10],
        'households2011': v1[0], 'households2022': v1[2],
        'avgHouseholdSize2011': v1[1], 'avgHouseholdSize2022': v1[3],
        'governmentTransfersPct': p['transfersPct'],
        'malePop2011': pv[0], 'femalePop2011': pv[1], 'malePop2022': pv[5], 'femalePop2022': pv[6],
        'schoolAttendance2011': pv[3], 'schoolAttendance2022': pv[8],
    }
    for start, y, total in ((0, '2011', pv[2]), (5, '2022', pv[7])):
        b = av[start:start + 5]
        e[f'pctAge0to4_{y}'] = pct(b[0], total)
        e[f'pctAge5to14_{y}'] = pct(b[1], total)
        e[f'pctAge0to14_{y}'] = pct(b[0] + b[1], total)
        e[f'pctAge15to34_{y}'] = pct(b[2], total)
        e[f'pctAge35to59_{y}'] = pct(b[3], total)
        e[f'pctAge60plus_{y}'] = pct(b[4], total)
    for start, y in ((4, '2011'), (8, '2022')):
        f, t, i, o = v1[start:start + 4]
        e.update({f'formalDwellings{y}': f, f'traditionalDwellings{y}': t,
                  f'informalDwellings{y}': i, f'otherDwellings{y}': o})
        dw = f + t + i + o
        e[f'pctFormalDwelling{y}'] = pct(f, dw)
        e[f'pctInformalDwelling{y}'] = pct(i, dw)
        e[f'pctTraditionalDwelling{y}'] = pct(t, dw)
    for y, w, tl, c in (('2011', v2[0:2], v2[4:7], v2[10:13]), ('2022', v2[2:4], v2[7:10], v2[13:16])):
        e.update({f'waterScheme{y}': w[0], f'otherWater{y}': w[1],
                  f'flushToilet{y}': tl[0], f'otherToilet{y}': tl[1], f'noToilet{y}': tl[2],
                  f'electricityCooking{y}': c[0], f'gasCooking{y}': c[1], f'otherCooking{y}': c[2]})
        e[f'pctWaterScheme{y}'] = pct(w[0], sum(w))
        e[f'pctNoWater{y}'] = pct(w[1], sum(w))
        e[f'pctFlushToilet{y}'] = pct(tl[0], sum(tl))
        e[f'pctNoToilet{y}'] = pct(tl[2], sum(tl))
        e[f'pctElectricityCooking{y}'] = pct(c[0], sum(c))
        e[f'pctGasCooking{y}'] = pct(c[1], sum(c))
    if m.get('areaKm2'):
        e['populationDensity2022'] = round(pv[7] / m['areaKm2'] + 1e-9, 1)
    pages = {k: r['printedPage'] for k, r in (('person', p), ('age', a), ('housing1', h1), ('housing2', h2))}
    return e, pages


def flat(m):
    """Every numeric field in a record, nested ones under their own name (names are unique)."""
    out = {}
    for k, v in m.items():
        if isinstance(v, dict):
            out.update(v)
        else:
            out[k] = v
    return out


changes, pages_by_code = [], {}
for m in data['municipalities']:
    e, pages = expected(m)
    pages_by_code[m['id']] = pages
    have = flat(m)
    for k, v in e.items():
        if k == 'populationDensity2022' and k not in have:
            continue
        old = have.get(k)
        if old is None or abs(float(old) - float(v)) > 1e-9:
            changes.append((m['id'], m['name'], k, old, v))
    want = m['id'] in ERRATUM
    if m['erratumApplied'] != want:
        changes.append((m['id'], m['name'], 'erratumApplied', m['erratumApplied'], want))

for c in changes:
    print(f'{c[0]} {c[1]}: {c[2]} {c[3]} -> {c[4]}')
print(f'{len(changes)} differences')

if '--write' in sys.argv:
    starts = [(mt.start(), mt.group(1)) for mt in re.finditer(r'"id": "([A-Z]{2,3}\d{0,3})"', text)]
    spans = {code: (s, starts[i + 1][0] if i + 1 < len(starts) else len(text)) for i, (s, code) in enumerate(starts)}
    pieces, cursor = [], 0
    by_code = {}
    for code, _, field, old, new in changes:
        by_code.setdefault(code, []).append((field, new))
    for code in sorted(by_code, key=lambda c: spans[c][0]):
        s, end = spans[code]
        block = text[s:end]
        for field, new in by_code[code]:
            value = json.dumps(new)
            block, n = re.subn(rf'("{field}": )[^,\r\n}}]+', lambda mt: mt.group(1) + value, block, count=1)
            if n != 1:
                raise SystemExit(f'{code} {field}: not found in file')
        pieces.append(text[cursor:s])
        pieces.append(block)
        cursor = end
    pieces.append(text[cursor:])
    if changes:
        DATA.write_text(''.join(pieces), encoding='utf8', newline='')
    lines = ['{'] + [f'  {json.dumps(c)}: {json.dumps(p)},' for c, p in sorted(pages_by_code.items())]
    lines[-1] = lines[-1].rstrip(',')
    PAGES.write_text('\n'.join(lines + ['}']) + '\n', encoding='utf8', newline='\n')
    rows = []
    for name in PROVINCE_NAMES:
        rec = {'name': name}
        for kind in ('person', 'age', 'housing1', 'housing2'):
            r = tables[kind][nkey(name)]
            rec[kind] = {'printedPage': r['printedPage'], 'values': r['values']}
        rows.append('  ' + json.dumps(rec))
    PROVINCES.write_text('[\n' + ',\n'.join(rows) + '\n]\n', encoding='utf8', newline='\n')
    print('written')
