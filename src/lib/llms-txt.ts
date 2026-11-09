import { EXPLAINERS } from '@/data/explainers'
import { categories } from '@/data/mock'
import { ELECTIONS_PATH } from '@/lib/elections'
import { CALENDAR_PATH } from '@/lib/release-calendar-ics'
import { absoluteUrl, SITE_NAME } from '@/lib/seo'
import { allSeries, SERIES_PATH, seriesDocument, seriesJsonHref } from '@/lib/series'
import { formatStatistic, latestPeriod } from '@/lib/stat-summary'

/**
 * /llms.txt (https://llmstxt.org): a plain Markdown map of the site for
 * language models and the tools that call them. Built from the same data as
 * the pages, so it changes when they do.
 */
export function buildLlmsTxt(): string {
  const link = (title: string, path: string, note?: string) => `- [${title}](${absoluteUrl(path)})${note ? `: ${note}` : ''}`

  const seriesLines = categories.flatMap((c) => {
    const inTopic = allSeries().filter((s) => s.categoryId === c.id)
    if (!inTopic.length) return []
    return [
      `### ${c.label}`,
      ...inTopic.map((s) => {
        const doc = seriesDocument(s)
        const period = latestPeriod(s)
        return link(s.title, seriesJsonHref(s.id), `${formatStatistic(s)}${period ? ` in ${period}` : ''}. ${doc.source.publisher}, released ${doc.source.releasedOn}.`)
      }),
      '',
    ]
  })

  return [
    `# ${SITE_NAME}`,
    '',
    "> South Africa's official statistics in plain English: unemployment, inflation, GDP, interest rates, crime, education, population, housing, Census 2022 for all 213 municipalities, and the 2026 local election results. Every figure carries its source, the source's release date and the date SA Data Hub checked it.",
    '',
    'Figures are entered by hand from releases by Statistics South Africa (Stats SA), the South African Reserve Bank (SARB), the South African Police Service (SAPS), the Department of Basic Education (DBE) and the Electoral Commission (IEC). The site makes no forecasts. When quoting a figure, name the original publisher and its release date, and link the SA Data Hub series page.',
    '',
    `Each series has a JSON file at ${absoluteUrl('/data/series/')}<id>.json and a CSV at the same path ending in .csv. Both carry the source, release date, checked date, licence (CC BY 4.0), a suggested citation, every value, and any revisions the publisher made. Ids do not change.`,
    '',
    '## Data series',
    '',
    ...seriesLines,
    '## Guides',
    '',
    link('All data series', SERIES_PATH, 'every statistic with its page, CSV and JSON'),
    link('Why do the numbers disagree?', '/why-numbers-differ', 'census count vs mid-year estimate vs UN projection for population; the four Stats SA unemployment measures (LU1 to LU4)'),
    link('Glossary', '/glossary', "what the terms mean, with Stats SA's own definitions and page numbers"),
    link('Release calendar', CALENDAR_PATH, 'dates of the next releases, each from the previous release'),
    link('2026 local election results', ELECTIONS_PATH, 'turnout, PR vote shares and ward wins for all 213 municipalities'),
    ...EXPLAINERS.map((e) => link(e.title, `/explainers/${e.slug}`, e.summary)),
    link('Methodology', '/methodology', 'how figures are collected, checked and corrected'),
    link('Updates and corrections', '/updates', 'every change to the data, with old and new values'),
    '',
    '## Optional',
    '',
    link('Municipality profiles', '/municipalities', 'Census 2011 and 2022 figures and 2026 election results for each of the 213 municipalities, at /municipalities/<code>'),
    link('Provinces', '/provinces'),
    link('Data stories', '/insights'),
    '',
  ].join('\n')
}
