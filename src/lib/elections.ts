import elections from '@/data/datasets/elections-2026.json'

/**
 * 2026 local government election results, built from the IEC's voting-station
 * files by scripts/elections/build_lge_2026.py. Council seats are not in those
 * files, so nothing here claims a seat total or a majority.
 */

export type Ballot = 'Ward' | 'PR' | 'DC 40%'

export interface BallotTotals {
  valid: number
  spoilt: number
  cast: number
}

export interface PartyVotes {
  party: string
  votes: number
  pct: number
}

export interface WardWins {
  party: string
  wards: number
}

export interface MunicipalElection {
  name: string
  registeredVoters: number
  votingStations: number
  ballots: Partial<Record<Ballot, BallotTotals>>
  turnoutPct: number
  prVotes: PartyVotes[]
  wards: number
  wardWins: WardWins[]
  wardsWonByIndependents: number
  tiedWards: string[]
}

export interface NationalElection extends Omit<MunicipalElection, 'name' | 'tiedWards' | 'ballots'> {
  ballots: Record<Ballot, BallotTotals>
  tiedWards: number
}

export const ELECTIONS_PATH = '/elections-2026'

export const ELECTION_SOURCE = {
  publisher: elections._meta.source,
  title: elections._meta.publication,
  url: elections._meta.source_url,
  /** The IEC generated the files on 6 and 7 November 2026. */
  releasedOn: elections._meta.generated_to.slice(0, 10),
  downloadedOn: elections._meta.downloaded_on,
  checkedOn: elections._meta.last_verified,
  notes: elections._meta.notes,
} as const

export const NATIONAL_ELECTION = elections.national as NationalElection

const BY_CODE = elections.municipalities as Record<string, MunicipalElection>

export function getMunicipalElection(code: string): MunicipalElection | undefined {
  return BY_CODE[code]
}

export function allMunicipalElections(): (MunicipalElection & { code: string })[] {
  return Object.entries(BY_CODE).map(([code, e]) => ({ code, ...e }))
}

/** The names people use for the larger parties; the IEC files use full names in capitals. */
const SHORT_NAMES: Record<string, string> = {
  'AFRICAN NATIONAL CONGRESS': 'ANC',
  'DEMOCRATIC ALLIANCE': 'DA',
  'UMKHONTO WESIZWE PARTY': 'MK Party',
  'ECONOMIC FREEDOM FIGHTERS': 'EFF',
  ACTIONSA: 'ActionSA',
  'INKATHA FREEDOM PARTY': 'IFP',
  'PATRIOTIC ALLIANCE': 'Patriotic Alliance',
  'UNITED DEMOCRATIC MOVEMENT': 'UDM',
  'VRYHEIDSFRONT PLUS | FREEDOM FRONT PLUS': 'FF Plus',
  'SOUTH AFRICAN COMMUNIST PARTY': 'SACP',
  'AFRICAN CHRISTIAN DEMOCRATIC PARTY': 'ACDP',
  'AFRICAN TRANSFORMATION MOVEMENT': 'ATM',
  'GOOD': 'GOOD',
  'PAN AFRICANIST CONGRESS OF AZANIA': 'PAC',
  'CONGRESS OF THE PEOPLE': 'COPE',
  'AL JAMA-AH': 'Al Jama-ah',
  'RISE MZANSI': 'Rise Mzansi',
  'NATIONAL FREEDOM PARTY': 'NFP',
  'UNITED AFRICANS TRANSFORMATION': 'UAT',
  'ABANTU BATHO CONGRESS': 'ABC',
}

const SMALL_WORDS = new Set(['of', 'the', 'and', 'for', 'in', 'with', 'to'])

/** "AFRICAN NATIONAL CONGRESS" → "ANC"; parties without a short name are put in title case. */
export function partyLabel(party: string): string {
  if (SHORT_NAMES[party]) return SHORT_NAMES[party]
  if (party === 'Other parties') return party
  return party
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

/** The party with the most PR votes, unless the top two are level. */
export function prLeader(e: Pick<MunicipalElection, 'prVotes'>): PartyVotes | undefined {
  const [first, second] = e.prVotes.filter((p) => p.party !== 'Other parties')
  if (!first || (second && second.votes === first.votes)) return undefined
  return first
}
