/**
 * Matching for the site search. No imports, so the header search can use it in
 * the browser without pulling in any data.
 */

export const SEARCH_GROUPS = ['Places', 'Statistics', 'Answers', 'Explainers', 'Stories', 'Tools'] as const
export type SearchGroup = (typeof SEARCH_GROUPS)[number]

export interface SearchEntry {
  group: SearchGroup
  title: string
  detail: string
  href: string
  /** Lower-case, accent-free text to match against: title, codes, other names. */
  terms: string
}

/** Lower case, no accents ("Khâi-Ma" matches "khai"), single spaces. */
export function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim()
}

/**
 * Entries matching every word of the query, best first: an exact name or code,
 * a title that starts with the query, a match in the title, then matches only in
 * the other terms (such as the province).
 */
export function searchEntries(index: SearchEntry[], query: string, perGroup = 5): SearchEntry[] {
  const q = normalise(query)
  if (!q) return []
  const words = q.split(' ')
  const scored = index
    .filter((e) => words.every((w) => e.terms.includes(w)))
    .map((e) => {
      const title = normalise(e.title)
      const titleWords = title.split(' ')
      let score = 0
      if (title === q || e.terms.split(' ').includes(q)) score += 100 // exact name or code
      if (title.startsWith(q)) score += 60
      if (words.every((w) => titleWords.some((t) => t.startsWith(w)))) score += 40 // in the name, not only the province
      return { e, score: score - title.length / 100 }
    })
    .sort((a, b) => b.score - a.score)
  const out: SearchEntry[] = []
  for (const group of SEARCH_GROUPS) out.push(...scored.filter((s) => s.e.group === group).slice(0, perGroup).map((s) => s.e))
  return out
}
