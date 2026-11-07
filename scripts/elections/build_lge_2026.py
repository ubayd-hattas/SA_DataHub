"""
Build src/data/datasets/elections-2026.json from the IEC's detailed results
for the 2026 Local Government Elections.

Input: one CSV per province, downloaded by hand from the IEC results site
(https://results.elections.org.za) on 2026-11-07 and saved, unchanged, as
sources/releases/{EC,FS,GP,KN,MP,NC,NP,NW,WP}.csv. Each row is one party's
valid votes on one ballot at one voting station:

    Province, Municipality, Ward, VotingDistrict, VotingStationName,
    RegisteredVoters, BallotType, SpoiltVotes, PartyName, TotalValidVotes,
    DateGenerated

RegisteredVoters and SpoiltVotes repeat on every party row of a station and
ballot, so they are counted once per station (per station and ballot for
spoilt votes). The raw files are never modified.

What the output does not contain: council seats. PR seats come from the IEC's
seat calculation, which is not in these files. Ward seats are counted from the
ward ballot (the candidate with the most votes wins); see the notes in _meta
for tied wards and the merged INDEPENDENT label.

Run: python scripts/elections/build_lge_2026.py
Uses only the standard library.
"""

from __future__ import annotations

import csv
import glob
import json
import os
import sys
from collections import defaultdict
from datetime import datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'sources', 'releases')
MUNICIPALITIES = os.path.join(ROOT, 'src', 'data', 'datasets', 'municipalities.json')
OUTPUT = os.path.join(ROOT, 'src', 'data', 'datasets', 'elections-2026.json')

DOWNLOADED_ON = '2026-11-07'
BALLOTS = ('Ward', 'PR', 'DC 40%')
INDEPENDENT = 'INDEPENDENT'
# Parties listed by name on each municipality; the rest are summed.
TOP_PARTIES = 8
EXPECTED_COLUMNS = [
    'Province', 'Municipality', 'Ward', 'VotingDistrict', 'VotingStationName',
    'RegisteredVoters', 'BallotType', 'SpoiltVotes', 'PartyName', 'TotalValidVotes', 'DateGenerated',
]


def pct(part: int, whole: int) -> float:
    return round(100 * part / whole, 2) if whole else 0.0


def read_rows(path: str):
    with open(path, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != EXPECTED_COLUMNS:
            sys.exit(f'{path}: unexpected columns {reader.fieldnames}')
        yield from reader


def party_shares(votes: dict[str, int], valid: int) -> list[dict]:
    ranked = sorted(votes.items(), key=lambda kv: (-kv[1], kv[0]))
    shown = [{'party': p, 'votes': v, 'pct': pct(v, valid)} for p, v in ranked[:TOP_PARTIES] if v > 0]
    rest = sum(v for _, v in ranked[TOP_PARTIES:])
    if rest:
        shown.append({'party': 'Other parties', 'votes': rest, 'pct': pct(rest, valid)})
    return shown


def main() -> None:
    files = sorted(glob.glob(os.path.join(SOURCE_DIR, '??.csv')))
    if len(files) != 9:
        sys.exit(f'Expected 9 provincial files in {SOURCE_DIR}, found {len(files)}')

    with open(MUNICIPALITIES, encoding='utf-8') as f:
        site_codes = {m['id'] for m in json.load(f)['municipalities']}

    names: dict[str, str] = {}
    registered: dict[str, dict[str, int]] = defaultdict(dict)  # code -> station -> voters
    spoilt: dict[tuple[str, str], dict[str, int]] = defaultdict(dict)  # (code, ballot) -> station -> spoilt
    valid: dict[tuple[str, str], dict[str, int]] = defaultdict(lambda: defaultdict(int))  # (code, ballot) -> party -> votes
    ward_votes: dict[tuple[str, str], dict[str, int]] = defaultdict(lambda: defaultdict(int))  # (code, ward) -> party -> votes
    generated: dict[str, set[str]] = defaultdict(set)

    for path in files:
        for row in read_rows(path):
            code, _, name = row['Municipality'].partition(' - ')
            ballot = row['BallotType']
            if ballot not in BALLOTS:
                sys.exit(f'{path}: unknown ballot type {ballot!r}')
            station = row['VotingDistrict']
            names[code] = name
            generated[row['Province']].add(row['DateGenerated'])

            voters = int(row['RegisteredVoters'])
            if registered[code].setdefault(station, voters) != voters:
                sys.exit(f'{path}: station {station} has two registered-voter counts')
            spoilt_here = int(row['SpoiltVotes'])
            if spoilt[(code, ballot)].setdefault(station, spoilt_here) != spoilt_here:
                sys.exit(f'{path}: station {station} {ballot} has two spoilt counts')

            votes = int(row['TotalValidVotes'])
            valid[(code, ballot)][row['PartyName']] += votes
            if ballot == 'Ward':
                ward_votes[(code, row['Ward'])][row['PartyName']] += votes

    codes = set(names)
    if codes != site_codes:
        sys.exit(f'Codes differ from municipalities.json. Only in IEC: {sorted(codes - site_codes)}; only on site: {sorted(site_codes - codes)}')

    wards_by_code: dict[str, list[str]] = defaultdict(list)
    for code, ward in ward_votes:
        wards_by_code[code].append(ward)

    municipalities = {}
    for code in sorted(codes):
        reg = sum(registered[code].values())
        ballots = {}
        for ballot in BALLOTS:
            if (code, ballot) not in valid:
                continue
            v = sum(valid[(code, ballot)].values())
            s = sum(spoilt[(code, ballot)].values())
            ballots[ballot] = {'valid': v, 'spoilt': s, 'cast': v + s}

        wins: dict[str, int] = defaultdict(int)
        tied: list[str] = []
        independent_wins = 0
        for ward in wards_by_code[code]:
            ranked = sorted(ward_votes[(code, ward)].items(), key=lambda kv: -kv[1])
            if len(ranked) > 1 and ranked[0][1] == ranked[1][1]:
                tied.append(ward)
            elif ranked[0][0] == INDEPENDENT:
                independent_wins += 1
            else:
                wins[ranked[0][0]] += 1

        pr = ballots['PR']
        municipalities[code] = {
            'name': names[code],
            'registeredVoters': reg,
            'votingStations': len(registered[code]),
            'ballots': ballots,
            'turnoutPct': pct(pr['cast'], reg),
            'prVotes': party_shares(valid[(code, 'PR')], pr['valid']),
            'wards': len(wards_by_code[code]),
            'wardWins': [{'party': p, 'wards': n} for p, n in sorted(wins.items(), key=lambda kv: (-kv[1], kv[0]))],
            'wardsWonByIndependents': independent_wins,
            'tiedWards': sorted(tied),
        }

    national_reg = sum(m['registeredVoters'] for m in municipalities.values())
    national_ballots = {}
    for ballot in BALLOTS:
        rows = [m['ballots'][ballot] for m in municipalities.values() if ballot in m['ballots']]
        national_ballots[ballot] = {k: sum(r[k] for r in rows) for k in ('valid', 'spoilt', 'cast')}
    national_pr: dict[str, int] = defaultdict(int)
    national_wins: dict[str, int] = defaultdict(int)
    for code in codes:
        for party, votes in valid[(code, 'PR')].items():
            national_pr[party] += votes
        for w in municipalities[code]['wardWins']:
            national_wins[w['party']] += w['wards']

    def parse_generated(value: str) -> datetime:
        return datetime.strptime(value, '%m/%d/%Y %I:%M:%S %p')

    stamps = sorted(parse_generated(v) for vs in generated.values() for v in vs)
    output = {
        '_meta': {
            'source': 'Electoral Commission of South Africa (IEC)',
            'publication': '2026 Local Government Elections: detailed results by voting station, one file per province',
            'source_url': 'https://results.elections.org.za',
            'downloaded_on': DOWNLOADED_ON,
            'generated_from': stamps[0].isoformat(),
            'generated_to': stamps[-1].isoformat(),
            'last_verified': DOWNLOADED_ON,
            'build_script': 'scripts/elections/build_lge_2026.py',
            'notes': [
                'Turnout is votes cast on the PR ballot (valid plus spoilt) as a share of registered voters at the voting stations in the files. The IEC also publishes its own turnout count; the two can differ slightly.',
                'Ward wins are counted from the ward ballot: the candidate with the most valid votes in a ward. Tied wards are listed and not given to any party.',
                'The files give every independent candidate the same party name, INDEPENDENT, so votes for two independents in one ward are merged. Wards where that label comes first are counted as won by independents, not as one party.',
                'PR seats and council sizes are not in these files, so seat totals are not shown.',
                'The DC 40% ballot elects the district council and is only cast in local municipalities, not metros.',
                'Results are as the IEC generated them between generated_from and generated_to. They were not checked against final declared results.',
            ],
        },
        'national': {
            'registeredVoters': national_reg,
            'votingStations': sum(m['votingStations'] for m in municipalities.values()),
            'ballots': national_ballots,
            'turnoutPct': pct(national_ballots['PR']['cast'], national_reg),
            'prVotes': party_shares(national_pr, national_ballots['PR']['valid']),
            'wards': sum(m['wards'] for m in municipalities.values()),
            'wardWins': [{'party': p, 'wards': n} for p, n in sorted(national_wins.items(), key=lambda kv: (-kv[1], kv[0]))],
            'wardsWonByIndependents': sum(m['wardsWonByIndependents'] for m in municipalities.values()),
            'tiedWards': sum(len(m['tiedWards']) for m in municipalities.values()),
        },
        'municipalities': municipalities,
    }

    with open(OUTPUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(output, f, indent=1, ensure_ascii=False)
        f.write('\n')
    n = output['national']
    print(f'Wrote {OUTPUT}')
    print(f"{len(municipalities)} municipalities, {n['wards']} wards, {n['votingStations']} stations, {n['registeredVoters']:,} registered, turnout {n['turnoutPct']}%")


if __name__ == '__main__':
    main()
