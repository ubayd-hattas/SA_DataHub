/**
 * src/lib/search.ts
 *
 * Intent-aware search with province intelligence and ranked results.
 * Registry and province metadata are passed in by callers (mock.ts) to avoid import cycles.
 */

import {
  Statistic,
  SearchResult,
  SearchResultKind,
  Category,
  CategoryId,
  ProvinceData,
  Province,
} from '@/types'
import type { SearchRegistryEntry } from '@/lib/search-intent'
import {
  parseSearchIntent,
  SearchIntent,
  formatProvinceLabel,
  getProvinceTopicLabel,
} from '@/lib/search-intent'

// ─── Synonym dictionary (token expansion for fuzzy stat matching) ─────────────

const SYNONYMS: Record<string, string[]> = {
  jobs: ['unemployment', 'labour', 'employment'],
  work: ['unemployment', 'labour', 'employment'],
  jobless: ['unemployment'],
  'labour market': ['unemployment', 'labour force'],
  'job market': ['unemployment'],
  neet: ['youth unemployment'],
  lfpr: ['labour force participation'],
  'cost of living': ['inflation', 'cpi', 'consumer price'],
  prices: ['inflation', 'cpi'],
  'interest rate': ['repo rate', 'inflation'],
  repo: ['repo rate'],
  mpc: ['repo rate', 'monetary policy'],
  economy: ['gdp', 'growth', 'economic'],
  growth: ['gdp growth', 'economic growth'],
  recession: ['gdp', 'economic growth'],
  school: ['education', 'matric'],
  matric: ['matric pass rate', 'education'],
  murder: ['crime', 'murder rate'],
  robbery: ['crime'],
  violence: ['crime'],
  safety: ['crime'],
  housing: ['housing', 'dwellings'],
  electricity: ['electricity access', 'housing'],
  loadshedding: ['electricity'],
  water: ['piped water', 'housing'],
  census: ['census', 'population'],
  demographics: ['population', 'census'],
  people: ['population'],
  poverty: ['income', 'household', 'unemployment'],
}

/** Reserved geographic scopes for future district/municipality/census-year search. */
export type SearchGeographicScope =
  | { level: 'national' }
  | { level: 'province'; provinceId: Province }
  | { level: 'district'; districtId: string }
  | { level: 'municipality'; municipalityId: string }
  | { level: 'census'; censusYear?: number; theme?: string }

// ─── Scoring weights (intentional ranking, not text occurrence order) ─────────

const SCORE = {
  provinceExact: 400,
  provinceTopic: 130,
  datasetLabelExact: 360,
  datasetIntent: 80,
  categoryIntent: 100,
  statTitleExact: 110,
  statTitlePartial: 70,
  statCategoryIntent: 95,
  statDatasetIntent: 75,
  statDescription: 25,
  statFuzzy: 45,
  aliasMatch: 55,
} as const

// ─── Levenshtein / fuzzy (unchanged) ──────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function fuzzyMatch(query: string, text: string, threshold = 2): boolean {
  const qTokens = query.toLowerCase().split(/\s+/)
  const tText = text.toLowerCase()
  return qTokens.every((qToken) => {
    if (tText.includes(qToken)) return true
    const tTokens = tText.split(/\s+/)
    return tTokens.some((tToken) => {
      if (Math.abs(qToken.length - tToken.length) > threshold) return false
      return levenshtein(qToken, tToken) <= threshold
    })
  })
}

function expandQuery(query: string): string[] {
  const q = query.toLowerCase().trim()
  const expanded = new Set<string>([q])
  if (SYNONYMS[q]) SYNONYMS[q].forEach((s) => expanded.add(s))
  Object.entries(SYNONYMS).forEach(([key, values]) => {
    if (q.includes(key) || key.includes(q)) values.forEach((v) => expanded.add(v))
  })
  return Array.from(expanded)
}

function buildCategoryLabels(categories: Category[]): Record<string, string> {
  return Object.fromEntries(categories.map((c) => [c.id, c.label]))
}

function statInRegistryDataset(statId: string, datasetIds: string[], registry: SearchRegistryEntry[]): boolean {
  return datasetIds.some((dsId) => registry.find((e) => e.id === dsId)?.statIds.includes(statId))
}

// ─── Province result scoring ──────────────────────────────────────────────────

function scoreProvince(
  province: ProvinceData,
  intent: SearchIntent,
  rawQuery: string
): number {
  if (!intent.provinceId || intent.provinceId !== province.id) return 0

  let score = SCORE.provinceExact
  const q = rawQuery.toLowerCase()
  const topicKey = getProvinceTopicLabel(q) ?? intent.categoryIds[0]

  if (topicKey) {
    score += SCORE.provinceTopic
    if (topicKey === 'unemployment' && q.match(/unemploy|jobless|labour|jobs/)) score += 40
    if (topicKey === 'education' && q.match(/education|matric|school/)) score += 40
    if (topicKey === 'population' && q.match(/population|people|census/)) score += 40
    if (topicKey === 'housing' && q.match(/housing|electricity|water/)) score += 40
    if (topicKey === 'crime' && q.match(/crime|murder|robbery/)) score += 40
  } else if (intent.categoryIds.length > 0) {
    score += SCORE.provinceTopic / 2
  }

  return score
}

function provinceDisplayValue(province: ProvinceData, intent: SearchIntent, rawQuery: string): string {
  const q = rawQuery.toLowerCase()
  const topic = getProvinceTopicLabel(q) ?? intent.categoryIds[0]

  switch (topic) {
    case 'unemployment':
      return `${province.unemploymentRate}% unemployment`
    case 'education':
      return `${province.matricPassRate}% matric pass rate`
    case 'population':
      return `${(province.population / 1_000_000).toFixed(1)}M population`
    case 'housing':
      return `${province.stats.housing.electricityAccess}% electricity access`
    case 'gdp':
      return `${province.gdpShare}% of national GDP`
    default:
      return `${province.unemploymentRate}% unemployment`
  }
}

// ─── Dataset (registry) scoring ───────────────────────────────────────────────

function scoreDataset(entry: SearchRegistryEntry, intent: SearchIntent, rawQuery: string): number {
  const q = rawQuery.toLowerCase()
  let score = 0

  if (intent.datasetIds.includes(entry.id)) score += SCORE.datasetLabelExact
  if (entry.label.toLowerCase() === q.trim()) score += 50
  if (q.includes(entry.label.toLowerCase())) score += SCORE.datasetLabelExact - 80

  if (entry.categoryId && intent.categoryIds.includes(entry.categoryId)) {
    score += SCORE.datasetIntent + SCORE.categoryIntent
  }

  for (const term of intent.terms) {
    if (entry.label.toLowerCase().includes(term)) score += SCORE.aliasMatch
    if (entry.description.toLowerCase().includes(term)) score += 20
  }

  if (intent.provinceId && entry.id === 'provinces') score += 60

  if (q.includes('youth') && entry.id === 'youth-unemployment') score += 70
  if (q.match(/unemploy|jobless/) && !q.includes('youth') && entry.id === 'unemployment') score += 70
  if ((q.includes('repo') || q.includes('interest')) && entry.id === 'interest-rates') score += 80
  if (q.includes('lfpr') && entry.id === 'labour-force') score += 60

  return score
}

// ─── Statistic scoring ────────────────────────────────────────────────────────

function scoreStatistic(
  stat: Statistic,
  intent: SearchIntent,
  rawQuery: string,
  registry: SearchRegistryEntry[],
  expandedQueries: string[]
): number {
  let maxScore = 0
  const q = rawQuery.toLowerCase()

  for (const eq of expandedQueries) {
    let s = 0
    if (stat.title.toLowerCase().includes(eq)) s += SCORE.statTitleExact
    if (stat.categoryId.includes(eq)) s += 40
    if (fuzzyMatch(eq, stat.title)) s += SCORE.statFuzzy
    if (stat.description.toLowerCase().includes(eq)) s += SCORE.statDescription
    maxScore = Math.max(maxScore, s)
  }

  if (intent.categoryIds.includes(stat.categoryId)) maxScore += SCORE.statCategoryIntent
  if (statInRegistryDataset(stat.id, intent.datasetIds, registry)) maxScore += SCORE.statDatasetIntent

  for (const term of intent.topicTokens) {
    if (stat.title.toLowerCase().includes(term)) maxScore += SCORE.aliasMatch
    if (stat.id.includes(term)) maxScore += 30
  }

  if (q.includes('youth') && stat.id.includes('youth')) maxScore += 80
  if ((q.includes('repo') || q.includes('interest')) && stat.id.includes('repo')) maxScore += 90
  if (q.includes('lfpr') && stat.id.includes('lfpr')) maxScore += 90

  if (intent.provinceId) {
    if (intent.categoryIds.includes(stat.categoryId)) maxScore += 50
    else maxScore = Math.max(0, maxScore - 15)
  }

  if (stat.title.toLowerCase() === q.trim()) maxScore += 40

  return maxScore
}

// ─── Build ranked results ─────────────────────────────────────────────────────

export function intelligentSearch(
  query: string,
  statistics: Statistic[],
  provinces: ProvinceData[],
  categories: Category[],
  registry: SearchRegistryEntry[]
): SearchResult[] {
  if (!query.trim()) return []

  const intent = parseSearchIntent(query, registry)
  const categoryLabels = buildCategoryLabels(categories)
  const expandedQueries = expandQuery(query)
  const rawQuery = query.trim()
  const results: SearchResult[] = []

  for (const province of provinces) {
    const score = scoreProvince(province, intent, rawQuery)
    if (score <= 0) continue
    const topic = getProvinceTopicLabel(rawQuery.toLowerCase())
    results.push({
      kind: 'province',
      id: province.id,
      title: province.name,
      categoryLabel: 'Province',
      value: provinceDisplayValue(province, intent, rawQuery),
      href: `/provinces/${province.id}`,
      score,
      subtitle: topic
        ? `${formatProvinceLabel(province.id)} — ${topic} overview`
        : `${province.capital} · provincial data`,
      provinceId: province.id,
    })
  }

  for (const entry of registry) {
    if (entry.id === 'provinces' && intent.provinceId) continue
    const score = scoreDataset(entry, intent, rawQuery)
    if (score <= 0) continue
    const catId = entry.categoryId
    results.push({
      kind: 'dataset',
      id: entry.id,
      title: entry.label,
      categoryId: catId,
      categoryLabel: catId ? categoryLabels[catId] ?? catId : 'Dataset',
      value: entry.updateFrequency,
      href: catId ? `/category/${catId}` : '/downloads',
      score,
      subtitle: entry.description,
    })
  }

  const statScores = new Map<string, number>()
  for (const stat of statistics) {
    const score = scoreStatistic(stat, intent, rawQuery, registry, expandedQueries)
    if (score > 0) statScores.set(stat.id, score)
  }

  for (const [id, score] of Array.from(statScores.entries())) {
    const stat = statistics.find((s) => s.id === id)!
    results.push({
      kind: 'statistic',
      id: stat.id,
      title: stat.title,
      categoryId: stat.categoryId,
      categoryLabel: categoryLabels[stat.categoryId] ?? stat.categoryId,
      value: stat.value,
      href: `/category/${stat.categoryId}`,
      score,
      subtitle: stat.description.slice(0, 80) + (stat.description.length > 80 ? '…' : ''),
    })
  }

  return results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 24)
}

/** Backward-compatible: statistics-only slice of intelligent search. */
export function searchStatistics(
  query: string,
  statistics: Statistic[],
  options?: {
    provinces?: ProvinceData[]
    categories?: Category[]
    registry?: SearchRegistryEntry[]
  }
): SearchResult[] {
  if (!options?.registry || !options.categories) {
    return legacySearchStatistics(query, statistics)
  }
  return intelligentSearch(
    query,
    statistics,
    options.provinces ?? [],
    options.categories,
    options.registry
  ).filter((r) => r.kind === 'statistic')
}

function legacySearchStatistics(query: string, statistics: Statistic[]): SearchResult[] {
  const expandedQueries = expandQuery(query)
  const scored = new Map<string, { stat: Statistic; score: number }>()

  for (const stat of statistics) {
    let maxScore = 0
    for (const q of expandedQueries) {
      const s = scoreStatistic(
        stat,
        { rawQuery: query, categoryIds: [], datasetIds: [], topicTokens: [], terms: [] },
        query,
        [],
        [q]
      )
      if (s > maxScore) maxScore = s
    }
    if (maxScore > 0) scored.set(stat.id, { stat, score: maxScore })
  }

  return Array.from(scored.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ stat, score }) => ({
      kind: 'statistic' as SearchResultKind,
      id: stat.id,
      title: stat.title,
      categoryId: stat.categoryId,
      categoryLabel: stat.categoryId,
      value: stat.value,
      href: `/category/${stat.categoryId}`,
      score,
    }))
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'western cape unemployment',
  'gauteng crime',
  'kzn education',
  'inflation',
  'repo rate',
  'youth unemployment',
  'population western cape',
  'housing gauteng',
]

export function getSuggestions(query: string): string[] {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  return SUGGESTIONS.filter((s) => s.includes(q) || fuzzyMatch(q, s, 1)).slice(0, 5)
}
