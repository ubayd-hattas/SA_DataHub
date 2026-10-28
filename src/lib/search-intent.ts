/**
 * src/lib/search-intent.ts
 *
 * Query understanding for intent-aware search.
 * Province aliases, category/dataset detection, and topic tokens.
 */

import { CategoryId, Province } from '@/types'
import type { DatasetRegistryEntry } from '@/lib/registry'

/** The registry fields search reads. Pages pass only these to the browser. */
export type SearchRegistryEntry = Pick<DatasetRegistryEntry, 'id' | 'label' | 'description' | 'categoryId' | 'statIds' | 'updateFrequency'>

/** Trim registry entries to what search needs. */
export function toSearchRegistry(entries: SearchRegistryEntry[]): SearchRegistryEntry[] {
  return entries.map(({ id, label, description, categoryId, statIds, updateFrequency }) => ({ id, label, description, categoryId, statIds, updateFrequency }))
}
import { provinceLabels } from '@/lib/utils'

export interface SearchIntent {
  /** Original normalised query */
  rawQuery: string
  /** Detected province (if any) */
  provinceId?: Province
  /** Category IDs implied by query */
  categoryIds: CategoryId[]
  /** Registry dataset IDs implied by query */
  datasetIds: string[]
  /** Remaining topic tokens after province/dataset extraction */
  topicTokens: string[]
  /** Free-text terms used for general matching */
  terms: string[]
}

/** Province slug → aliases (lowercase). Centralised — not scattered in UI. */
export const PROVINCE_ALIASES: Record<Exclude<Province, 'all'>, string[]> = {
  gauteng: ['gauteng', 'gp', 'johannesburg', 'jhb', 'joburg', 'pretoria', 'pta', 'egoli'],
  'western-cape': ['western cape', 'wc', 'cape town', 'ct', 'cape'],
  'kwazulu-natal': ['kwazulu-natal', 'kwazulu natal', 'kzn', 'durban', 'pietermaritzburg', 'pmb'],
  'eastern-cape': ['eastern cape', 'ec', 'east london', 'gqeberha', 'port elizabeth'],
  limpopo: ['limpopo', 'lp', 'polokwane', 'pietersburg'],
  mpumalanga: ['mpumalanga', 'mp', 'nelspruit', 'mbombela'],
  'north-west': ['north west', 'north-west', 'nw', 'rustenburg', 'mafikeng'],
  'free-state': ['free state', 'free-state', 'fs', 'bloemfontein', 'mangaung'],
  'northern-cape': ['northern cape', 'northern-cape', 'nc', 'kimberley', 'upington'],
}

/** Topic keywords → category (built from categories + registry at runtime). */
const TOPIC_CATEGORY_KEYWORDS: Array<{ keywords: string[]; categoryId: CategoryId }> = [
  { keywords: ['unemployment', 'unemployed', 'jobless', 'labour', 'labor', 'employment', 'jobs', 'work', 'neet', 'lfpr'], categoryId: 'unemployment' },
  { keywords: ['gdp', 'economy', 'economic', 'growth', 'recession', 'output'], categoryId: 'gdp' },
  { keywords: ['inflation', 'cpi', 'prices', 'cost of living', 'repo', 'repo rate', 'interest', 'mpc'], categoryId: 'inflation' },
  { keywords: ['crime', 'murder', 'robbery', 'violence', 'safety', 'security', 'saps'], categoryId: 'crime' },
  { keywords: ['education', 'school', 'matric', 'literacy', 'university', 'dbe'], categoryId: 'education' },
  { keywords: ['population', 'demographics', 'people', 'census'], categoryId: 'population' },
  { keywords: ['housing', 'electricity', 'water', 'dwellings', 'loadshedding', 'load shedding'], categoryId: 'housing' },
  { keywords: ['census', 'household', 'internet'], categoryId: 'census' },
]

const PROVINCE_TOPIC_KEYWORDS: Record<string, string[]> = {
  unemployment: ['unemployment', 'unemployed', 'jobless', 'labour', 'employment', 'jobs'],
  education: ['education', 'matric', 'literacy', 'school'],
  population: ['population', 'people', 'demographics'],
  housing: ['housing', 'electricity', 'water', 'dwellings'],
  crime: ['crime', 'murder', 'robbery', 'violence', 'safety'],
  gdp: ['gdp', 'economy', 'growth'],
  inflation: ['inflation', 'cpi', 'prices', 'repo'],
}

function normalise(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

function tokenise(text: string): string[] {
  return normalise(text)
    .split(/[\s,]+/)
    .map((t) => t.replace(/[^a-z0-9%/\-]/g, ''))
    .filter((t) => t.length > 0)
}

function aliasInQuery(alias: string, q: string): boolean {
  if (alias.includes(' ')) return q.includes(alias)
  const tokens = tokenise(q)
  if (tokens.includes(alias)) return true
  if (alias.length >= 4) return new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q)
  return false
}

/** Longest-alias-first province detection. */
export function detectProvince(query: string): Province | undefined {
  const q = normalise(query)
  const matches: Array<{ province: Province; alias: string }> = []

  for (const [province, aliases] of Object.entries(PROVINCE_ALIASES)) {
    for (const alias of aliases) {
      if (aliasInQuery(alias, q)) {
        matches.push({ province: province as Province, alias })
      }
    }
  }

  if (matches.length === 0) return undefined
  matches.sort((a, b) => b.alias.length - a.alias.length)
  return matches[0].province
}

export function detectCategories(query: string, registry: SearchRegistryEntry[]): CategoryId[] {
  const q = normalise(query)
  const found = new Set<CategoryId>()

  for (const { keywords, categoryId } of TOPIC_CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => q.includes(kw))) found.add(categoryId)
  }

  for (const entry of registry) {
    const label = entry.label.toLowerCase()
    if (q.includes(label) || label.split(/\s+/).some((w) => w.length > 3 && q.includes(w))) {
      if (entry.categoryId) found.add(entry.categoryId)
    }
    if (q.includes(entry.id.replace(/-/g, ' ')) || q.includes(entry.id)) {
      if (entry.categoryId) found.add(entry.categoryId)
    }
  }

  return Array.from(found)
}

export function detectDatasets(
  query: string,
  registry: SearchRegistryEntry[]
): string[] {
  const q = normalise(query)
  const ids = new Set<string>()

  for (const entry of registry) {
    const label = entry.label.toLowerCase()
    if (q.includes(label)) ids.add(entry.id)
    if (q.includes(entry.id.replace(/-/g, ' '))) ids.add(entry.id)
    for (const statId of entry.statIds) {
      if (q.includes(statId.replace(/-/g, ' '))) ids.add(entry.id)
    }
  }

  return Array.from(ids)
}

export function parseSearchIntent(
  query: string,
  registry: SearchRegistryEntry[]
): SearchIntent {
  const rawQuery = query.trim()
  const normalised = normalise(rawQuery)
  const provinceId = detectProvince(normalised)
  const categoryIds = detectCategories(normalised, registry)
  const datasetIds = detectDatasets(normalised, registry)

  let remainder = normalised
  if (provinceId) {
    for (const alias of PROVINCE_ALIASES[provinceId as Exclude<Province, 'all'>]) {
      remainder = remainder.replace(new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), ' ')
    }
  }

  for (const id of datasetIds) {
    remainder = remainder.replace(new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ')
  }

  const terms = tokenise(remainder).filter((t) => t.length >= 2)
  const topicTokens = terms.filter((t) => !['south', 'africa', 'sa', 'african'].includes(t))

  return {
    rawQuery,
    provinceId: provinceId && provinceId !== 'all' ? provinceId : undefined,
    categoryIds,
    datasetIds,
    topicTokens,
    terms,
  }
}

export function getProvinceTopicLabel(topic: string): string | undefined {
  for (const [key, keywords] of Object.entries(PROVINCE_TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => topic.includes(kw) || kw.includes(topic))) return key
  }
  return undefined
}

export function formatProvinceLabel(provinceId: Province): string {
  return provinceLabels[provinceId] ?? provinceId
}
