import type { MunicipalityRecord, ProvinceData } from '@/types'
import { getMunicipalitiesByProvince } from '@/data/mock'
import { getProvinceCodeFromSlug } from '@/lib/utils'

const MAX_DESCRIPTION = 160

function trimToSentence(text: string, max = MAX_DESCRIPTION): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const lastBreak = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '), cut.lastIndexOf(', '))
  return `${(lastBreak > 60 ? cut.slice(0, lastBreak) : cut.slice(0, cut.lastIndexOf(' '))).trimEnd()}.`
}

/**
 * Municipality title. The province is included because municipality names are
 * not unique (e.g. two "Emalahleni" municipalities: EC136 and MP312).
 */
export function municipalityTitle(m: Pick<MunicipalityRecord, 'name' | 'provinceName'>): string {
  return `${m.name} Municipality, ${m.provinceName} — Census 2022 Profile`
}

/**
 * Data-led municipality meta description built only from fields on the record.
 * Always ends on a complete sentence and stays within 160 characters.
 */
export function municipalityDescription(m: MunicipalityRecord): string {
  const facts: string[] = []
  if (m.population2022 > 0) facts.push(`population ${m.population2022.toLocaleString('en-ZA')}`)
  if (m.populationGrowthRate != null && isFinite(m.populationGrowthRate)) {
    facts.push(`${m.populationGrowthRate >= 0 ? '+' : ''}${m.populationGrowthRate.toFixed(1)}% since 2011`)
  }
  if (m.pctFormalDwelling2022 != null && isFinite(m.pctFormalDwelling2022)) {
    facts.push(`${m.pctFormalDwelling2022.toFixed(1)}% formal housing`)
  }
  if (m.pctFlushToilet2022 != null && isFinite(m.pctFlushToilet2022)) {
    facts.push(`${m.pctFlushToilet2022.toFixed(1)}% flush toilet access`)
  }
  const lead = `${m.name} (${m.id}), ${m.provinceName}: Census 2022`
  return trimToSentence(facts.length ? `${lead} ${facts.join(', ')}.` : `${lead} municipal profile.`)
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
