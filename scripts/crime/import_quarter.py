"""Prepare SAPS quarterly crime figures for crime.json as separate statistics.

Usage:
  python -I scripts/crime/import_quarter.py newdatasets/2025-2026_-_4th_Quarter_WEB.xlsx [--write]

The SAPS quarterly workbook compares one quarter across five years (sheet
"Crime stats per component", national rows). It is not a full financial
year, so the annual figures in crime.json are left alone and the quarter is
stored as its own statistics (ids ending in -q4). Prints every value.

The site shows a statistic only with its source's release date, and this
workbook does not state one. So --write puts the statistics in
_meta.pending_statistics, where the site does not read them. Once the
release date is confirmed, pass --released YYYY-MM-DD with --write and they
move into "statistics" with that date.
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'src/data/datasets/crime.json'
SHEET = 'Crime stats per component'
CHECKED = date.today().isoformat()

# statistic id -> (row label in the sheet, title, series name, description)
WANTED = {
    'murder-q4': ('Murder', 'Murders reported to the police, January to March', 'Murder cases, January to March',
                  'Murder cases reported to SAPS in January to March {year}, the fourth quarter of the {fy} financial year, compared with the same three months in earlier years. This is one quarter, not a full year, so it cannot be compared with the annual totals.'),
    'crime-contact-q4': ('Contact crime (Crimes against the person)', 'Contact crimes reported to the police, January to March',
                         'Contact crimes, January to March',
                         'Contact crimes (crimes against the person) reported to SAPS in January to March {year}, the fourth quarter of the {fy} financial year. SAPS counts murder, sexual offences, attempted murder, assault with intent to inflict grievous bodily harm, common assault, common robbery and robbery with aggravating circumstances. One quarter, not a full year.'),
    'crime-robbery-q4': ('Robbery with aggravating circumstances', 'Robbery with aggravating circumstances, January to March',
                         'Aggravated robbery, January to March',
                         'Robbery with aggravating circumstances reported to SAPS in January to March {year}, the fourth quarter of the {fy} financial year. One quarter, not a full year.'),
}

path = Path(sys.argv[1])
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
# Cells before the table are empty; keep each row's non-empty values in order.
rows = [[v for v in r if v is not None] for r in wb[SHEET].iter_rows(values_only=True)]
header = next(r for r in rows if r and r[0] == 'CRIME CATEGORY')
periods = [h for h in header[1:] if isinstance(h, str) and re.match(r'January \d{4} to', h)]
years = [int(re.search(r'January (\d{4})', p).group(1)) for p in periods]
assert all(re.search(rf'March {y}', p) for p, y in zip(periods, years)), periods
latest = years[-1]
fy = f'{latest - 1}/{str(latest)[2:]}'

stats = []
for stat_id, (label, title, series_name, description) in WANTED.items():
    row = next(r for r in rows if r and r[0] == label)
    values = [int(v) for v in row[1:1 + len(periods)]]
    change = round((values[-1] - values[-2]) / values[-2] * 100, 1)
    print(f'{stat_id}: ' + ', '.join(f'Jan-Mar {y} {v}' for y, v in zip(years, values)) + f'; change {change}%')
    stats.append({
        'id': stat_id,
        'categoryId': 'crime',
        'title': title,
        'value': f'{values[-1]:,}',
        'rawValue': values[-1],
        'unit': 'cases',
        'change': change,
        'changeLabel': f'from January to March {years[-2]}',
        'trend': 'down' if change < 0 else 'up' if change > 0 else 'stable',
        'description': description.format(year=latest, fy=fy),
        'source': {
            'name': 'South African Police Service',
            'shortName': 'SAPS',
            'url': 'https://www.saps.gov.za/services/crimestats.php',
            'publicationName': f'Crime statistics, fourth quarter {fy} (January to March {latest}), sheet "{SHEET}"',
        },
        'lastUpdated': CHECKED,
        'series': [{'name': series_name, 'unit': 'cases',
                    'data': [{'label': f'Jan-Mar {y}', 'value': v} for y, v in zip(years, values)]}],
    })

released = sys.argv[sys.argv.index('--released') + 1] if '--released' in sys.argv else None
if released:
    for st in stats:
        st['source']['publicationDate'] = released
        st['lastUpdated'] = released

NL = '\n'

if '--write' in sys.argv:
    # Read with universal newlines; the file is written back with LF (git stores it that way).
    raw = DATA.read_text(encoding='utf8')
    doc = json.loads(raw)
    if any(s['id'].endswith('-q4') for s in doc['statistics']) or 'pending_statistics' in doc['_meta']:
        raise SystemExit('crime.json already has quarter statistics; edit them by hand or restore the file first.')
    if released:
        # Append to "statistics" as text, so the rest of the file keeps its formatting.
        end = raw.rstrip().rfind(']')
        body = (',' + NL).join(json.dumps(s, indent=2, ensure_ascii=False) for s in stats)
        block = ',' + NL + NL.join('    ' + line for line in body.split(NL))
        out = raw[:end].rstrip() + block + NL + '  ' + raw[end:]
    else:
        pending = {
            'reason': 'Checked against the SAPS workbook on ' + CHECKED + ' but not shown: the workbook does not state a release date. Run scripts/crime/import_quarter.py with --released once it is confirmed.',
            'checkedOn': CHECKED,
            'statistics': stats,
        }
        text = json.dumps(pending, indent=2, ensure_ascii=False).replace(NL, NL + '    ')
        marker = NL + '  },' + NL + '  "statistics"'
        assert marker in raw, 'unexpected layout'
        out = raw.replace(marker, ',' + NL + '    "pending_statistics": ' + text + marker, 1)
    json.loads(out)
    DATA.write_text(out, encoding='utf8', newline=NL)
    print('written', DATA, '(shown)' if released else '(pending, not shown)')
