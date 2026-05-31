/**
 * src/lib/search.ts
 *
 * Fuzzy search with typo tolerance and synonym expansion.
 * No external dependencies — pure TypeScript.
 *
 * Features:
 * - Levenshtein distance for typo tolerance ("unemploymnt" → "unemployment")
 * - Synonym map ("jobs" → unemployment, "cost of living" → inflation)
 * - Token-based matching (each word in query matched independently)
 * - Relevance scoring (title match > category > description)
 */

import { Statistic, SearchResult, CategoryId } from '@/types'

// ─── Synonym dictionary ───────────────────────────────────────────────────────
// Maps common search terms to the canonical terms we index against.

const SYNONYMS: Record<string, string[]> = {
  // Unemployment
  jobs: ['unemployment', 'labour', 'employment'],
  work: ['unemployment', 'labour', 'employment'],
  jobless: ['unemployment'],
  employed: ['unemployment', 'employment'],
  'labour market': ['unemployment', 'labour force'],
  'job market': ['unemployment'],
  neet: ['youth unemployment'],
  lfpr: ['labour force participation'],

  // Inflation / prices
  'cost of living': ['inflation', 'cpi', 'consumer price'],
  prices: ['inflation', 'cpi'],
  'price increase': ['inflation'],
  'price rise': ['inflation'],
  expensive: ['inflation', 'cpi'],
  'interest rate': ['repo rate', 'inflation'],
  repo: ['repo rate'],
  mpc: ['repo rate', 'monetary policy'],

  // GDP / economy
  economy: ['gdp', 'growth', 'economic'],
  growth: ['gdp growth', 'economic growth'],
  recession: ['gdp', 'economic growth'],
  output: ['gdp'],
  production: ['gdp'],

  // Education
  school: ['education', 'matric'],
  matric: ['matric pass rate', 'education'],
  university: ['education', 'higher education'],
  literacy: ['literacy rate', 'education'],

  // Crime
  murder: ['crime', 'murder rate'],
  robbery: ['crime'],
  violence: ['crime'],
  safety: ['crime'],
  security: ['crime'],

  // Housing / services
  housing: ['housing', 'dwellings'],
  electricity: ['electricity access', 'housing'],
  'load shedding': ['electricity'],
  loadshedding: ['electricity'],
  water: ['piped water', 'housing'],
  'service delivery': ['housing', 'electricity', 'water'],

  // Population
  census: ['census', 'population'],
  demographics: ['population', 'census'],
  people: ['population'],

  // Poverty / inequality (map to available datasets)
  poverty: ['income', 'household', 'unemployment'],
  inequality: ['income', 'household', 'gini'],

  // Provinces
  gauteng: ['gauteng', 'johannesburg', 'pretoria'],
  'western cape': ['western cape', 'cape town'],
  'kwazulu-natal': ['kwazulu-natal', 'durban', 'kzn'],
  'eastern cape': ['eastern cape'],
}

// ─── Levenshtein distance ─────────────────────────────────────────────────────

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

// ─── Fuzzy token match ────────────────────────────────────────────────────────

function fuzzyMatch(query: string, text: string, threshold = 2): boolean {
  const qTokens = query.toLowerCase().split(/\s+/)
  const tText = text.toLowerCase()

  return qTokens.every((qToken) => {
    if (tText.includes(qToken)) return true
    // Try each word in text for close match
    const tTokens = tText.split(/\s+/)
    return tTokens.some((tToken) => {
      if (Math.abs(qToken.length - tToken.length) > threshold) return false
      return levenshtein(qToken, tToken) <= threshold
    })
  })
}

// ─── Relevance scoring ────────────────────────────────────────────────────────

function scoreMatch(query: string, stat: Statistic): number {
  const q = query.toLowerCase()
  let score = 0

  // Exact title match — highest weight
  if (stat.title.toLowerCase().includes(q)) score += 100
  // Category match
  if (stat.categoryId.includes(q)) score += 60
  // Fuzzy title match
  if (fuzzyMatch(q, stat.title)) score += 50
  // Description keyword match
  if (stat.description.toLowerCase().includes(q)) score += 20
  // Fuzzy description match
  if (fuzzyMatch(q, stat.description, 1)) score += 10

  return score
}

// ─── Synonym expansion ────────────────────────────────────────────────────────

function expandQuery(query: string): string[] {
  const q = query.toLowerCase().trim()
  const expanded = new Set<string>([q])

  // Direct synonym lookup
  if (SYNONYMS[q]) {
    SYNONYMS[q].forEach((s) => expanded.add(s))
  }

  // Partial match in synonym keys
  Object.entries(SYNONYMS).forEach(([key, values]) => {
    if (q.includes(key) || key.includes(q)) {
      values.forEach((v) => expanded.add(v))
    }
  })

  return Array.from(expanded)
}

// ─── Main search function ─────────────────────────────────────────────────────

export function searchStatistics(
  query: string,
  statistics: Statistic[]
): SearchResult[] {
  if (!query.trim()) return []

  const expandedQueries = expandQuery(query)
  const scored = new Map<string, { stat: Statistic; score: number }>()

  for (const stat of statistics) {
    let maxScore = 0

    for (const q of expandedQueries) {
      const s = scoreMatch(q, stat)
      if (s > maxScore) maxScore = s
    }

    // Also try individual word fuzzy matching
    const words = query.toLowerCase().split(/\s+/)
    for (const word of words) {
      if (word.length < 3) continue
      const s = scoreMatch(word, stat)
      if (s > maxScore) maxScore = s
    }

    if (maxScore > 0) {
      scored.set(stat.id, { stat, score: maxScore })
    }
  }

  return Array.from(scored.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ stat, score }) => ({
      id: stat.id,
      title: stat.title,
      categoryId: stat.categoryId,
      categoryLabel: stat.categoryId,
      value: stat.value,
      href: `/category/${stat.categoryId}`,
      score,
    }))
}

// ─── Suggestion engine ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'unemployment rate',
  'GDP growth',
  'inflation',
  'matric pass rate',
  'murder rate',
  'population',
  'housing',
  'repo rate',
  'youth unemployment',
  'labour force participation',
]

export function getSuggestions(query: string): string[] {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  return SUGGESTIONS.filter((s) => s.includes(q) || fuzzyMatch(q, s, 1)).slice(0, 5)
}
