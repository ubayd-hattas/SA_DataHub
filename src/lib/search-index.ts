/**
 * The site search index, built on the server and served as /search-index.json.
 * Each entry is small (title, one line of detail, link, search terms), so the
 * browser downloads a few tens of kilobytes instead of the datasets.
 */
import { categories, getAllMunicipalities, provinces, statistics } from '@/data/mock'
import { EXPLAINERS } from '@/data/explainers'
import { ANSWERS, ANSWERS_PATH } from '@/data/answers'
import { STORIES } from '@/data/stories'
import { HUB_PATH, HUB_TITLE } from '@/lib/census-hub'
import { MONEY_VALUE_PATH } from '@/lib/money-value'
import { COMPARE_PATH } from '@/lib/compare'
import { normalise, type SearchEntry } from '@/lib/search-match'

export type { SearchEntry } from '@/lib/search-match'

/** Extra entries registered by other sections. */
const extra: (() => SearchEntry[])[] = []
export function registerSearchEntries(build: () => SearchEntry[]): void {
  extra.push(build)
}

export function buildSearchIndex(): SearchEntry[] {
  const categoryLabel = new Map(categories.map((c) => [c.id, c.label]))
  const entries: SearchEntry[] = [
    ...getAllMunicipalities().map((m) => ({
      group: 'Places' as const,
      title: m.name,
      detail: `${m.category === 'A' ? 'Metro' : 'Municipality'}, ${m.provinceName}, ${m.id}`,
      href: `/municipalities/${m.id}`,
      terms: normalise(`${m.name} ${m.id} ${m.provinceName} municipality`),
    })),
    ...provinces.map((p) => ({
      group: 'Places' as const,
      title: p.name,
      detail: 'Province',
      href: `/provinces/${p.id}`,
      terms: normalise(`${p.name} province ${p.capital ?? ''}`),
    })),
    ...statistics.map((s) => ({
      group: 'Statistics' as const,
      title: s.title,
      detail: `${s.value}. ${categoryLabel.get(s.categoryId) ?? ''}`,
      href: `/category/${s.categoryId}#${s.id}`,
      terms: normalise(`${s.title} ${categoryLabel.get(s.categoryId) ?? ''} ${s.id.replace(/-/g, ' ')}`),
    })),
    ...ANSWERS.map((a) => ({
      group: 'Answers' as const,
      title: a.question,
      detail: 'Answer',
      href: `${ANSWERS_PATH}/${a.slug}`,
      terms: normalise(`${a.question} ${a.keywords}`),
    })),
    ...EXPLAINERS.map((e) => ({
      group: 'Explainers' as const,
      title: e.title,
      detail: e.period,
      href: `/explainers/${e.slug}`,
      terms: normalise(`${e.title} ${e.period} ${e.kind === 'cpi' ? 'inflation cpi prices' : 'unemployment qlfs jobs labour'}`),
    })),
    {
      group: 'Stories',
      title: HUB_TITLE,
      detail: 'Census story',
      href: HUB_PATH,
      terms: normalise(`${HUB_TITLE} census 2011 2022 municipalities change`),
    },
    ...STORIES.map((s) => ({
      group: 'Stories' as const,
      title: s.title,
      detail: s.categoryLabel,
      href: `/insights/${s.slug}`,
      terms: normalise(`${s.title} ${s.tags.join(' ')}`),
    })),
    {
      group: 'Tools',
      title: 'What was money worth?',
      detail: 'Money value calculator',
      href: MONEY_VALUE_PATH,
      terms: normalise('money value calculator inflation rand worth then now'),
    },
    {
      group: 'Tools',
      title: 'Compare places',
      detail: 'Two or three municipalities, Census 2011 and 2022',
      href: COMPARE_PATH,
      terms: normalise('compare places municipalities side by side census 2011 2022 versus vs'),
    },
  ]
  for (const build of extra) entries.push(...build())
  return entries
}
