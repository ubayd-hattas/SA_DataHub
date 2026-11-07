import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllMunicipalities } from '@/data/mock'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { Column, PageHeader, Prose, Section, linkClass } from '@/components/editorial/Section'
import { NumberBlock } from '@/components/editorial/NumberBlock'
import { ElectionSource, PrVotesFigure, WardWinsList } from '@/components/elections/ElectionResults'
import {
  allMunicipalElections,
  ELECTION_SOURCE,
  ELECTIONS_PATH,
  NATIONAL_ELECTION as N,
  partyLabel,
  prLeader,
} from '@/lib/elections'
import { formatCount, formatPercent } from '@/lib/format'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

const TITLE = '2026 local election results by municipality'
const leader = prLeader(N)
const DESCRIPTION = `Turnout, PR vote shares and ward wins for all 213 South African municipalities in the 2026 local government elections, from the IEC's voting-station results.${
  leader ? ` Nationally, the ${partyLabel(leader.party)} won ${formatPercent(leader.pct)} of PR votes.` : ''
}`

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: ELECTIONS_PATH,
})

const linkCell =
  'text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

export default function Elections2026Page() {
  const places = new Map(getAllMunicipalities().map((m) => [m.id, m]))
  const results = allMunicipalElections().map((e) => ({ ...e, place: places.get(e.code)! }))
  const metros = results.filter((r) => r.place.category === 'A').sort((a, b) => b.registeredVoters - a.registeredVoters)
  const noHalf = results
    .filter((r) => (prLeader(r)?.pct ?? 0) < 50)
    .sort((a, b) => a.place.provinceName.localeCompare(b.place.provinceName) || a.name.localeCompare(b.name))

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: '2026 local election', path: ELECTIONS_PATH },
  ]

  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        kicker="Local government elections 2026"
        title={TITLE}
        lede={`${formatCount(N.ballots.PR.cast)} people cast a PR ballot in South Africa's 2026 local government elections, ${formatPercent(N.turnoutPct)} of the ${formatCount(N.registeredVoters)} registered voters. Every municipality's results are on its own page.`}
      />

      <NumberBlock
        className="border-t border-rule py-10"
        label="Turnout on the PR ballot"
        value={formatPercent(N.turnoutPct)}
        meaning={`Votes cast on the PR ballot, valid and spoilt, as a share of registered voters at ${formatCount(N.votingStations)} voting stations.`}
        source={<ElectionSource />}
      />

      <Section id="pr-votes" title="PR ballot votes across the country">
        <Prose>
          <p>
            Every voter gets a PR (proportional representation) ballot that lists parties, not candidates. Councils
            share out their seats using each party&apos;s ward and PR votes together, so PR votes are a close guide to
            seats but not an exact one. Adding them up across all 213 councils gives a national picture, though no
            national body was elected.
          </p>
        </Prose>
        <PrVotesFigure
          className="mt-8"
          title={leader ? `The ${partyLabel(leader.party)} won ${formatPercent(leader.pct)} of PR ballot votes nationally.` : 'PR ballot votes nationally'}
          prVotes={N.prVotes}
        />
      </Section>

      <Section id="wards" title={`Who won the ${formatCount(N.wards)} wards`}>
        <p className="mb-3 text-small text-muted">
          Counted from the ward ballot: the candidate with the most votes in each ward wins it.
        </p>
        <WardWinsList wardWins={N.wardWins.slice(0, 12)} independents={N.wardsWonByIndependents} tied={N.tiedWards} />
        {N.wardWins.length > 12 && (
          <p className="mt-2 text-caption text-muted">
            {formatCount(N.wardWins.slice(12).reduce((a, w) => a + w.wards, 0))} more wards were won by{' '}
            {N.wardWins.length - 12} other parties.
          </p>
        )}
        <ElectionSource className="mt-3" />
      </Section>

      <Section id="metros" title="The eight metros">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-small">
            <caption className="sr-only">PR ballot leader, its share and turnout in each metro, 2026</caption>
            <thead>
              <tr className="border-b border-ink text-caption text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Metro</th>
                <th scope="col" className="px-2 py-2 font-medium">Most PR votes</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Share</th>
                <th scope="col" className="py-2 pl-2 text-right font-medium">Turnout</th>
              </tr>
            </thead>
            <tbody>
              {metros.map((r) => {
                const top = prLeader(r)
                return (
                  <tr key={r.code} className="border-t border-rule">
                    <th scope="row" className="py-2 pr-3 font-normal">
                      <Link href={`/municipalities/${r.code}`} className={linkCell}>
                        {r.name}
                      </Link>
                    </th>
                    <td className="px-2 py-2 text-ink">{top ? partyLabel(top.party) : 'Tied'}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-ink">{top ? formatPercent(top.pct) : ''}</td>
                    <td className="whitespace-nowrap py-2 pl-2 text-right tabular-nums text-ink">{formatPercent(r.turnoutPct)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <ElectionSource className="mt-3" />
      </Section>

      <Section id="no-half" title={`${noHalf.length} councils where no party won half the PR votes`}>
        <Prose>
          <p>
            Seats follow ward and PR votes together, so a party under half the PR votes can still end up with half the
            seats, or the other way round. Read this list as a guide to where coalitions may be needed, not as a list of
            hung councils.
          </p>
        </Prose>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-small">
            <caption className="sr-only">Councils where no party won half the PR ballot votes, 2026</caption>
            <thead>
              <tr className="border-b border-ink text-caption text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Municipality</th>
                <th scope="col" className="px-2 py-2 font-medium">Most PR votes</th>
                <th scope="col" className="py-2 pl-2 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {noHalf.map((r) => {
                const top = prLeader(r)
                return (
                  <tr key={r.code} className="border-t border-rule">
                    <th scope="row" className="py-2 pr-3 font-normal">
                      <Link href={`/municipalities/${r.code}`} className={linkCell}>
                        {r.name}
                      </Link>
                      <span className="block text-caption text-muted">{r.place.provinceName}</span>
                    </th>
                    <td className="px-2 py-2 text-ink">{top ? partyLabel(top.party) : 'Tied'}</td>
                    <td className="whitespace-nowrap py-2 pl-2 text-right tabular-nums text-ink">{top ? formatPercent(top.pct) : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <ElectionSource className="mt-3" />
      </Section>

      <Section id="method" title="How these numbers were counted">
        <Prose className="text-small">
          <p>
            SA Data Hub downloaded the {ELECTION_SOURCE.publisher}&apos;s detailed results for each province from{' '}
            <a href={ELECTION_SOURCE.url} className={linkClass}>
              results.elections.org.za
            </a>{' '}
            and added them up per municipality with a script that is published with the site&apos;s code. The files
            give each party&apos;s valid votes at every voting station, with the registered voters and spoilt ballots
            for that station.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            {ELECTION_SOURCE.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p>
            Spot a figure that does not match the IEC? Corrections are listed on the{' '}
            <Link href="/updates" className={linkClass}>
              updates page
            </Link>
            .
          </p>
        </Prose>
      </Section>
    </Column>
  )
}
