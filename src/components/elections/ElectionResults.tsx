import Link from 'next/link'
import { BarList } from '@/components/editorial/BarList'
import { ChartFigure } from '@/components/editorial/ChartFigure'
import { Prose, Section, linkClass } from '@/components/editorial/Section'
import { SourceLine } from '@/components/editorial/SourceLine'
import { formatCount, formatPercent } from '@/lib/format'
import {
  ELECTION_SOURCE,
  ELECTIONS_PATH,
  partyLabel,
  prLeader,
  type PartyVotes,
  type WardWins,
} from '@/lib/elections'

export function ElectionSource({ location, className }: { location?: string; className?: string }) {
  return (
    <SourceLine
      publisher={ELECTION_SOURCE.publisher}
      title={ELECTION_SOURCE.title}
      location={location}
      releasedOn={ELECTION_SOURCE.releasedOn}
      downloadedOn={ELECTION_SOURCE.downloadedOn}
      checkedOn={ELECTION_SOURCE.checkedOn}
      className={className}
    />
  )
}

/** PR ballot vote shares as bars, largest first, with "Other parties" last. */
export function PrVotesFigure({
  title,
  prVotes,
  sourceLocation,
  className,
}: {
  title: string
  prVotes: PartyVotes[]
  sourceLocation?: string
  className?: string
}) {
  return (
    <ChartFigure className={className} title={title} source={<ElectionSource location={sourceLocation} />}>
      <BarList
        max={Math.max(...prVotes.map((p) => p.pct))}
        bars={prVotes.map((p) => ({
          label: partyLabel(p.party),
          value: p.pct,
          display: formatPercent(p.pct),
          note: `${formatCount(p.votes)} votes`,
        }))}
      />
    </ChartFigure>
  )
}

/** Wards won per party, with independents and ties on their own rows. */
export function WardWinsList({
  wardWins,
  independents,
  tied,
}: {
  wardWins: WardWins[]
  independents: number
  tied: number
}) {
  const rows = [
    ...wardWins.map((w) => ({ label: partyLabel(w.party), wards: w.wards })),
    ...(independents ? [{ label: 'Independent candidates', wards: independents }] : []),
    ...(tied ? [{ label: 'Tied on the count', wards: tied }] : []),
  ]
  return (
    <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-3 border-t border-rule py-2 text-small">
          <dt className="text-muted">{r.label}</dt>
          <dd className="tabular-nums text-ink">
            {formatCount(r.wards)} {r.wards === 1 ? 'ward' : 'wards'}
          </dd>
        </div>
      ))}
    </dl>
  )
}

interface MunicipalElectionSectionProps {
  name: string
  election: {
    registeredVoters: number
    turnoutPct: number
    prVotes: PartyVotes[]
    wards: number
    wardWins: WardWins[]
    wardsWonByIndependents: number
    tiedWards: string[]
    ballots: { PR?: { cast: number } }
  }
}

/** The 2026 local election on a municipality page: PR vote shares, turnout and ward wins. */
export function MunicipalElectionSection({ name, election: e }: MunicipalElectionSectionProps) {
  const leader = prLeader(e)
  const tied = e.tiedWards.length
  return (
    <Section id="election-2026" title="2026 local election">
      <Prose>
        <p>
          {leader
            ? `${partyLabel(leader.party)} won the most votes on the PR ballot in ${name}, with ${formatPercent(leader.pct)}.`
            : `The two largest parties on the PR ballot in ${name} were level.`}{' '}
          {formatCount(e.ballots.PR?.cast ?? 0)} of the {formatCount(e.registeredVoters)} registered voters cast a PR
          ballot, a turnout of {formatPercent(e.turnoutPct)}.
        </p>
        <p className="text-small text-muted">
          These are vote shares, not seats. Council seats are shared out by the IEC&apos;s seat calculation, which
          combines ward and PR results and is not in the files SA Data Hub has, so seat totals are not shown yet.
        </p>
      </Prose>

      <PrVotesFigure className="mt-8" title={`Share of PR ballot votes in ${name}`} prVotes={e.prVotes} />

      <h3 className="mt-10 font-display text-h3 font-semibold text-ink">
        Who won the {formatCount(e.wards)} {e.wards === 1 ? 'ward' : 'wards'}
      </h3>
      <p className="mb-3 mt-1 text-small text-muted">
        Counted from the ward ballot: the candidate with the most votes in each ward wins it.
        {tied ? ` Tied wards: ${e.tiedWards.join(', ')}.` : ''}
      </p>
      <WardWinsList wardWins={e.wardWins} independents={e.wardsWonByIndependents} tied={tied} />
      <ElectionSource className="mt-3" />

      <p className="mt-6 text-small">
        <Link href={ELECTIONS_PATH} className={linkClass}>
          See the national results and how they were counted
        </Link>
      </p>
    </Section>
  )
}
