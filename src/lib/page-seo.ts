import type { MunicipalityRecord, ProvinceData } from '@/types'
import { getMunicipalitiesByProvince } from '@/data/mock'
import { getProvinceCodeFromSlug } from '@/lib/utils'
import { has2011Comparison } from '@/data/municipal-boundaries'
import { percentChange } from '@/lib/municipality-profile'

const MAX_DESCRIPTION = 160

function trimToSentence(text: string, max = MAX_DESCRIPTION): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const lastBreak = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '), cut.lastIndexOf(', '))
  return `${(lastBreak > 60 ? cut.slice(0, lastBreak) : cut.slice(0, cut.lastIndexOf(' '))).trimEnd()}.`
}

/**
 * Municipality title. The province is included because municipality names are
 * not unique (e.g. two "Emalahleni" municipalities: EC136 and MP312). Both
 * censuses are named where the profile compares them.
 */
export function municipalityTitle(m: Pick<MunicipalityRecord, 'id' | 'name' | 'provinceName'>): string {
  return has2011Comparison(m.id)
    ? `${m.name} Municipality, ${m.provinceName}: Census 2011 and 2022`
    : `${m.name} Municipality, ${m.provinceName}: Census 2022 Profile`
}

/**
 * Data-led municipality meta description built only from fields on the record.
 * Always ends on a complete sentence and stays within 160 characters.
 */
export function municipalityDescription(m: MunicipalityRecord): string {
  const pop2022 = m.population2022.toLocaleString('en-ZA')
  const lead = `${m.name} (${m.id}), ${m.provinceName}: Census 2022 counted ${pop2022} people`
  const services = `${m.pctFormalDwelling2022.toFixed(1)}% of households in formal dwellings.`
  if (has2011Comparison(m.id) && m.population2011 > 0) {
    const change = percentChange(m.population2011, m.population2022)
    const vs2011 = `${change >= 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% from ${m.population2011.toLocaleString('en-ZA')} in Census 2011`
    return trimToSentence(`${lead}, ${vs2011}. ${services}`)
  }
  return trimToSentence(`${lead} in ${m.households2022.toLocaleString('en-ZA')} households. ${services}`)
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
    `${p.matricPassRate}% matric pass rate`,
  ]
  if (count > 0) parts.push(`${count} municipalities profiled`)
  return trimToSentence(`${parts.join(', ')}.`)
}
