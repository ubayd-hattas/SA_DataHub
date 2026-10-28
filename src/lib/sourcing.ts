/**
 * The build-time sourcing check for every statistic the site shows outside
 * the explainers: the homepage, the topic pages and the municipality pages.
 *
 * A figure passes when it names its source, the source's release date and
 * the date SA Data Hub checked it, and the check is not earlier than the
 * release. A release date must be stated on the record itself; the site no
 * longer counts "last updated" as a release date. assertSiteSourced() runs
 * when those pages are generated, so `next build` fails on any gap.
 * (Explainers have their own check: assertExplainerSourced.)
 */

import type { MunicipalityRecord, Statistic } from '@/types'
import { getAllMunicipalities, statistics } from '@/data/mock'
import { statDates } from '@/lib/stat-summary'
import { CENSUS_SOURCE, censusPage, type CensusTable } from '@/lib/municipality-profile'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const TABLES: CensusTable[] = ['person', 'age', 'housing1', 'housing2']

/** Problems with one statistic: missing source, release date or checked date. */
export function statisticSourcingProblems(stat: Statistic): string[] {
  const problems: string[] = []
  const { releasedOn, checkedOn } = statDates(stat)
  if (!stat.source?.name) problems.push(`${stat.id}: no source`)
  if (!stat.source?.publicationDate || !ISO_DATE.test(stat.source.publicationDate)) {
    problems.push(`${stat.id}: no release date on the record`)
  }
  if (!ISO_DATE.test(checkedOn)) problems.push(`${stat.id}: no checked date`)
  if (ISO_DATE.test(releasedOn) && ISO_DATE.test(checkedOn) && checkedOn < releasedOn) {
    problems.push(`${stat.id}: checked (${checkedOn}) before it was released (${releasedOn})`)
  }
  return problems
}

/** Problems with one municipality: every figure needs its table's page and the publication's dates. */
export function municipalitySourcingProblems(m: MunicipalityRecord): string[] {
  const problems: string[] = []
  for (const t of TABLES) if (!censusPage(m.id, t)) problems.push(`${m.id}: no page for the ${t} table`)
  return problems
}

/** Every problem on the homepage, topic pages and municipality pages. */
export function findSiteSourcingProblems(
  stats: Statistic[] = statistics,
  municipalities: MunicipalityRecord[] = getAllMunicipalities(),
): string[] {
  const problems = stats.flatMap(statisticSourcingProblems)
  if (!CENSUS_SOURCE.publisher || !ISO_DATE.test(CENSUS_SOURCE.releasedOn) || !ISO_DATE.test(CENSUS_SOURCE.checkedOn)) {
    problems.push('municipalities: the census source is missing its publisher, release date or checked date')
  }
  return problems.concat(municipalities.flatMap(municipalitySourcingProblems))
}

export function assertSiteSourced(): void {
  const problems = findSiteSourcingProblems()
  if (problems.length) throw new Error(`Statistics without a source, release date or checked date:\n${problems.join('\n')}`)
}
