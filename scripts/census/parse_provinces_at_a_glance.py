"""Parse the municipal tables in Census 2022 Provinces at a glance into JSON.

Usage:
  python -I scripts/census/parse_provinces_at_a_glance.py     sources/releases/Provinces_at_a_Glance.pdf     sources/derived/provinces-at-a-glance-municipal-tables.json

Source: Stats SA, Census 2022 Provinces at a glance, Report no. 03-01-43
(revised; the erratum on page ii covers pages 40 to 43). Needs pypdf and
pdftotext (for the overlaid erratum rows).

Numbers use spaces as thousands separators and the PDF splits some numbers
into separate text pieces, so each join between pieces is ambiguous. Every
combination of joins is tried, and the one that satisfies the table's own
arithmetic is kept (male + female = total; dwelling types, water sources and
toilet types each sum to households; age bands sum to the population).
Rows that do not resolve to exactly one answer are reported, not guessed.
"""
import itertools
import json
import re
import sys
from pypdf import PdfReader

pdf, out = sys.argv[1], sys.argv[2]
reader = PdfReader(pdf)

KINDS = [
    ('Person indicators per municipality', 'person'),
    ('Distribution of population by broad age groups', 'age'),
    ('General housing information per municipality (1)', 'housing1'),
    ('General housing information per municipality (2)', 'housing2'),
]
COUNTS = {'person': 11, 'age': 10, 'housing1': 12, 'housing2': 16}
PCT = re.compile(r'^-?\d+,\d+%$')
DEC = re.compile(r'^-?\d+,\d+$')
INT = re.compile(r'^\d{1,3}( \d{3})*$')
THREE = re.compile(r'^\d{3}( \d{3})*$')


def raw_rows():
    last = None
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ''
        kind = next((k for t, k in KINDS if t in text), None)
        if kind is None and last and i < 60 and 'Province, district and' in text:
            kind = last  # continuation page: same table, no title
        if not kind:
            continue
        last = kind
        m = re.search(r'STATISTICS SOUTH AFRICA\s+(\d+)', text)
        printed = int(m.group(1)) if m else None
        items = []

        def visit(t, cm, tm, fd, fs):
            if t.strip():
                items.append((tm[5] + cm[5], tm[4] * cm[0] + cm[4], t))

        page.extract_text(visitor_text=visit)
        items.sort(key=lambda it: -it[0])
        clusters = []
        for y, x, t in items:
            if clusters and abs(clusters[-1][0] - y) <= 2.5:
                clusters[-1][1].append((x, t))
            else:
                clusters.append([y, [(x, t)]])
        # Attach number-only clusters to a name-only cluster just above or below.
        pending_name = None
        for y, cells in clusters:
            cells.sort()
            # The name is every cell before the first purely numeric one (or a lone minus sign).
            def numeric(k):
                t = cells[k][1].strip()
                if t == '-':  # a minus sign, unless it joins two words of a name
                    return k + 1 < len(cells) and re.match(r'[\d]', cells[k + 1][1].strip()) is not None
                return re.fullmatch(r'-?[\d ,]+%?', t) is not None
            first = next((k for k in range(len(cells)) if cells[k][0] > 120 and numeric(k)), len(cells))
            names = [t for x, t in cells[:first]]
            rest = [(x, t) for x, t in cells[first:]]
            if names and not rest:
                pending_name = (y, ' '.join(n.strip() for n in names))
                continue
            name = ' '.join(n.strip() for n in names)
            if not name and pending_name and abs(pending_name[0] - y) < 12:
                name = pending_name[1]
            pending_name = None
            if name and rest:
                yield kind, i + 1, printed, name, [t for x, t in rest]


def near(a, b):
    """Weighted census counts can differ from the sum of their parts by a little."""
    return abs(a - b) <= max(3, 0.001 * max(abs(a), abs(b)))


def candidates(pieces, n):
    """All ways to read the pieces as n values, joining 3-digit pieces onto the integer before them."""
    joined = []
    for p in (p.strip() for p in pieces):
        if joined and joined[-1] == '-':
            joined[-1] = '-' + p
        else:
            joined.append(p)
    pieces = joined
    joinable = [k for k in range(1, len(pieces))
                if THREE.match(pieces[k]) and INT.match(pieces[k - 1])]
    for mask in itertools.product([False, True], repeat=len(joinable)):
        joins = {k for k, j in zip(joinable, mask) if j}
        vals, buf = [], None
        for k, p in enumerate(pieces):
            if k in joins:
                buf += ' ' + p
            else:
                if buf is not None:
                    vals.append(buf)
                buf = p
        vals.append(buf)
        if len(vals) == n and all(INT.match(v) or DEC.match(v) for v in vals):
            yield [float(v.replace(',', '.')) if ',' in v else int(v.replace(' ', '')) for v in vals]


def key(code, name):
    return code or re.sub(r'[^a-z]', '', name.lower())


parsed = {k: {} for k in COUNTS}
unresolved = []
raw = list(raw_rows())


def split_name(name):
    m = re.match(r'^([A-Z]{2,3}\d{2,3})\s*:\s*(.+)$', name)
    return (m.group(1), m.group(2).strip()) if m else (None, name.strip())


def raw_line_values(pdf_page, code, kind, check):
    import subprocess
    text = subprocess.run(['pdftotext', '-raw', '-f', str(pdf_page), '-l', str(pdf_page), pdf, '-'],
                          capture_output=True, text=True).stdout
    line = next((l for l in text.splitlines() if l.startswith(code)), None)
    if not line:
        return []
    toks = line.split()
    # drop code, colon, name words, category and percentage: keep the trailing numeric tokens
    k = len(toks)
    while k > 0 and re.fullmatch(r'-?\d+(,\d+)?', toks[k - 1]):
        k -= 1
    ok = [v for v in candidates(toks[k:], COUNTS[kind]) if check(code, v)]
    return [list(x) for x in {tuple(v) for v in ok}]


def resolve(kind, check):
    for k, pdf_page, printed, name, pieces in raw:
        if k != kind:
            continue
        code, nm = split_name(name)
        miif = pct = None
        pieces = list(pieces)
        tail = re.match(r'^(.*?)\s+(METRO|[ABC]\d?)(?:\s+(-?\d+,\d+%))?$', nm)
        if tail:
            nm, miif = tail.group(1).strip(), tail.group(2)
            if tail.group(3):
                pct = float(tail.group(3).rstrip('%').replace(',', '.'))
        if pieces and re.fullmatch(r'METRO|[ABC]\d?', pieces[0].strip()):
            miif = pieces.pop(0).strip()
        if pieces and PCT.match(pieces[0].strip()):
            pct = float(pieces.pop(0).strip().rstrip('%').replace(',', '.'))
        ok = [v for v in candidates(pieces, COUNTS[kind]) if check(key(code, nm), v)]
        uniq = [list(x) for x in {tuple(v) for v in ok}]
        rec = {'pdfPage': pdf_page, 'printedPage': printed, 'code': code, 'name': nm, 'miif': miif,
               'transfersPct': pct}
        if not any(re.search(r'\d', p) for p in pieces) or nm.startswith('STATISTICS'):
            continue
        if len(uniq) == 0 and code:
            uniq = raw_line_values(pdf_page, code, kind, check)
            rec['fromRawText'] = True
        if len(uniq) == 1:
            rec['values'] = uniq[0]
            parsed[kind][key(code, nm)] = rec
        else:
            unresolved.append({'kind': kind, 'name': name, 'page': pdf_page, 'pieces': pieces, 'options': len(uniq)})


def person_ok(_, v):
    return near(v[0] + v[1], v[2]) and near(v[5] + v[6], v[7]) and all(isinstance(v[j], float) for j in (4, 9, 10))


def housing1_ok(_, v):
    return (near(sum(v[4:8]), v[0]) and near(sum(v[8:12]), v[2])
            and isinstance(v[1], float) and isinstance(v[3], float))


def age_ok(k, v):
    p = parsed['person'].get(k)
    return p is not None and near(sum(v[0:5]), p['values'][2]) and near(sum(v[5:10]), p['values'][7])


def housing2_ok(k, v):
    h = parsed['housing1'].get(k)
    if h is None:
        return False
    hh11, hh22 = h['values'][0], h['values'][2]
    return (near(v[0] + v[1], hh11) and near(v[2] + v[3], hh22) and near(sum(v[4:7]), hh11)
            and near(sum(v[7:10]), hh22) and sum(v[10:13]) <= hh11 + 3 and sum(v[13:16]) <= hh22 + 3
            and sum(v[10:13]) > 0.9 * hh11 and sum(v[13:16]) > 0.9 * hh22)


resolve('person', person_ok)
resolve('housing1', housing1_ok)
resolve('age', age_ok)
resolve('housing2', housing2_ok)

# Header and page-furniture rows are expected to fail; keep only data rows.
unresolved = [u for u in unresolved if any(re.search(r'\d \d{3}', p) for p in u['pieces'])]
COLUMNS = {
    'person': ['male2011', 'female2011', 'total2011', 'schoolAttendance2011', 'sexRatio2011',
               'male2022', 'female2022', 'total2022', 'schoolAttendance2022', 'sexRatio2022', 'growthRate'],
    'age': ['0-4 2011', '5-14 2011', '15-34 2011', '35-59 2011', '60+ 2011',
            '0-4 2022', '5-14 2022', '15-34 2022', '35-59 2022', '60+ 2022'],
    'housing1': ['households2011', 'householdSize2011', 'households2022', 'householdSize2022',
                 'formal2011', 'traditional2011', 'informal2011', 'other2011',
                 'formal2022', 'traditional2022', 'informal2022', 'other2022'],
    'housing2': ['waterScheme2011', 'otherWater2011', 'waterScheme2022', 'otherWater2022',
                 'flush2011', 'otherToilet2011', 'noToilet2011', 'flush2022', 'otherToilet2022', 'noToilet2022',
                 'electricity2011', 'gas2011', 'otherCooking2011', 'electricity2022', 'gas2022', 'otherCooking2022'],
}
# One row per line keeps the file diffable.
lines = ['{',
         '"source": "Stats SA, Census 2022 Provinces at a glance, Report no. 03-01-43 (revised)",',
         '"columns": ' + json.dumps(COLUMNS) + ',',
         '"unresolved": ' + json.dumps(unresolved) + ',',
         '"tables": {']
for ki, kind in enumerate(parsed):
    lines.append(json.dumps(kind) + ': {')
    items = list(parsed[kind].items())
    for ri, (k, rec) in enumerate(items):
        lines.append(json.dumps(k) + ': ' + json.dumps(rec) + (',' if ri < len(items) - 1 else ''))
    lines.append('}' + (',' if ki < len(parsed) - 1 else ''))
lines += ['}', '}']
with open(out, 'w', encoding='utf8', newline='\n') as f:
    f.write('\n'.join(lines) + '\n')
for k in COUNTS:
    print(k, len(parsed[k]), 'rows')
print('data rows that did not resolve:', len(unresolved))
for u in unresolved:
    print('  ', u['kind'], 'page', u['page'], u['name'])
