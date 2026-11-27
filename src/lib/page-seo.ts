import type { MunicipalityRecord, ProvinceData } from '@/types'
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

/** Province title. */
export function provinceTitle(p: Pick<ProvinceData, 'name'>): string {
  return `${p.name} Province Statistics`
}

/** Data-led province meta description (live figures, complete sentence, ≤160 chars). */
export function provinceDescription(p: ProvinceData): string {
  const code = getProvinceCodeFromSlug(p.id)
  const count = code ? getMunicipalitiesByProvince(code).length : 0
  const unem = p.stats.unemployment
  const parts = [
    `${p.name}: ${unem.rate}% unemployment (${unem.period})`,
    `${(p.population / 1_000_000).toFixed(1)}M people (2026 est.)`,
    `${formatPercent(p.matricPassRate, 2)} matric pass rate (${p.stats.education.year})`,
  ]
  if (count > 0) parts.push(`${count} municipalities profiled`)
  return trimToSentence(`${parts.join(', ')}.`)
}
