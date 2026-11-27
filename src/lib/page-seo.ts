import type { MunicipalityRecord, ProvinceData, Statistic } from '@/types'
import { describeChange, formatStatistic, latestPeriod } from '@/lib/stat-summary'
import { getMunicipalitiesByProvince } from '@/data/mock'
import { getProvinceCodeFromSlug } from '@/lib/utils'
import { percentChange } from '@/lib/municipality-profile'
import { formatCount, formatDecimal, formatPercent } from '@/lib/format'

const MAX_DESCRIPTION = 160

function trimToSentence(text: string, max = MAX_DESCRIPTION): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const lastBreak = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '), cut.lastIndexOf(', '))
  return `${(lastBreak > 60 ? cut.slice(0, lastBreak) : cut.slice(0, cut.lastIndexOf(' '))).trimEnd()}.`
}

/**
 * Municipality title. It leads with what people search for, the population,
 * and says which census the figure is from, so it is not read as a current
 * estimate. It says "Municipality" unless the name already does, because the
 * count covers the whole municipal area, not only the town it is named after.
 * The province is included because municipality names are not
 * unique (e.g. two "Emalahleni" municipalities: EC136 and MP312).
 */
export function municipalityTitle(m: Pick<MunicipalityRecord, 'name' | 'provinceName' | 'population2022'>): string {
  const place = /(City|Municipality)/.test(m.name) ? m.name : `${m.name} Municipality`
  return `${place} population: ${formatCount(m.population2022)} (Census 2022), ${m.provinceName}`
}

/**
 * Data-led municipality meta description built only from fields on the record.
 * Always ends on a complete sentence and stays within 160 characters.
 */
export function municipalityDescription(m: MunicipalityRecord): string {
  const lead = `${m.name} (${m.id}), ${m.provinceName}: Census 2022 counted ${formatCount(m.population2022)} people`
  const services = `${formatPercent(m.pctFormalDwelling2022)} of households in formal dwellings.`
  const change = percentChange(m.population2011, m.population2022)
  const vs2011 = `${change >= 0 ? 'up' : 'down'} ${formatDecimal(Math.abs(change))}% from ${formatCount(m.population2011)} in Census 2011`
  return trimToSentence(`${lead}, ${vs2011}. ${services}`)
}

/** A province's mid-year estimate in millions, to two decimals, as its page prints it. */
function provinceMillions(p: Pick<ProvinceData, 'population'>): string {
  return `${formatDecimal(p.population / 1_000_000, 2)} million`
}

/** Province title. These are mid-year estimates, not census counts, and the title says so. */
export function provinceTitle(p: Pick<ProvinceData, 'name' | 'population'>): string {
  return `${p.name} population 2026: ${provinceMillions(p)} (estimate)`
}

/**
 * Title and description for the unemployment topic page, leading with the rate
 * and its quarter. Built from the statistic, so they move with each release.
 */
export function unemploymentTopicMetadata(stat: Statistic): { title: string; description: string } {
  const period = latestPeriod(stat)
  const change = describeChange(stat)
  return {
    title: `South Africa unemployment rate: ${formatStatistic(stat)}${period ? ` (${period})` : ''}`,
    description: trimToSentence(
      `The official unemployment rate was ${formatStatistic(stat)}${period ? ` in ${period}` : ''}. ${change ? `${change.text} ` : ''}Charts, history and CSV downloads from ${stat.source.shortName} releases.`,
    ),
  }
}

/** Data-led province meta description (live figures, complete sentence, ≤160 chars). */
export function provinceDescription(p: ProvinceData): string {
  const code = getProvinceCodeFromSlug(p.id)
  const count = code ? getMunicipalitiesByProvince(code).length : 0
  const unem = p.stats.unemployment
  const parts = [
    `${p.name}: ${provinceMillions(p)} people (2026 est.)`,
    `${formatPercent(unem.rate)} unemployment (${unem.period})`,
    `${formatPercent(p.matricPassRate, 2)} matric pass rate (${p.stats.education.year})`,
  ]
  if (count > 0) parts.push(`${count} municipalities profiled`)
  return trimToSentence(`${parts.join(', ')}.`)
}
