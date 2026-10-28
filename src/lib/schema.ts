import { absoluteUrl, AUTHOR, SITE_NAME, SITE_DESCRIPTION, SITE_LOGO_PATH, SITE_URL } from '@/lib/seo'
import type { DatasetRegistryEntry } from '@/lib/registry'
import type { Story } from '@/types'
import type { MunicipalityRecord } from '@/types'

export interface BreadcrumbItem {
  name: string
  path: string
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: 'en-ZA',
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/dashboard?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl(SITE_LOGO_PATH),
      width: 512,
      height: 512,
    },
    founder: { '@id': `${SITE_URL}/#person` },
    sameAs: [AUTHOR.url, AUTHOR.github],
  }
}

export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/#person`,
    name: AUTHOR.name,
    url: AUTHOR.url,
    sameAs: [AUTHOR.url, AUTHOR.github, AUTHOR.linkedin],
    jobTitle: 'BSc Student — Computer Science, Statistics & Data Science',
    worksFor: {
      '@type': 'Organization',
      name: 'University of Cape Town',
      url: 'https://www.uct.ac.za',
    },
    description:
      'BSc student at the University of Cape Town majoring in Computer Science, Statistics and Data Science. Builder of SA Data Hub and AfriGuard, an AI safety benchmark for underserved South African languages.',
  }
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * A series label as an ISO 8601 date or year-month for temporalCoverage:
 * "Q1 2022" starts 2022-01 and ends 2022-03, "May 2025" is 2025-05,
 * "2017/18" (a financial year) starts 2017 and ends 2018, "2015" is 2015.
 */
export function isoPeriod(label: string | undefined, edge: 'start' | 'end'): string | null {
  if (!label) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  let m = /^Q([1-4]) (\d{4})$/.exec(label)
  if (m) return `${m[2]}-${pad(edge === 'start' ? (Number(m[1]) - 1) * 3 + 1 : Number(m[1]) * 3)}`
  m = /^([A-Z][a-z]{2}) (\d{4})$/.exec(label)
  if (m && MONTHS.includes(m[1])) return `${m[2]}-${pad(MONTHS.indexOf(m[1]) + 1)}`
  m = /^(\d{4})\/(\d{2})$/.exec(label)
  if (m) return edge === 'start' ? m[1] : `${m[1].slice(0, 2)}${m[2]}`
  m = /^(\d{4})$/.exec(label)
  return m ? m[1] : null
}

export function datasetSchema(entry: DatasetRegistryEntry, path: string) {
  const start = isoPeriod(entry.seriesStart, 'start')
  const end = isoPeriod(entry.seriesEnd, 'end')
  const publisher = {
    '@type': 'Organization',
    name: entry.sourceName,
    ...(entry.sourceShortName ? { alternateName: entry.sourceShortName } : {}),
    url: entry.sourceUrl,
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: entry.label,
    description: entry.description,
    url: absoluteUrl(path),
    creator: publisher,
    publisher,
    provider: { '@id': `${SITE_URL}/#organization` },
    ...(start ? { temporalCoverage: end && end !== start ? `${start}/${end}` : start } : {}),
    spatialCoverage: {
      '@type': 'Place',
      name: 'South Africa',
      geo: {
        '@type': 'GeoShape',
        box: '-34.8351 16.3449 -22.1250 32.8301',
      },
    },
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'text/csv',
        contentUrl: absoluteUrl(`/data/${entry.id}.csv`),
      },
    ],
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    keywords: [entry.categoryId, entry.geographicLevel, 'South Africa', 'statistics'].filter(Boolean),
  }
}

export function articleSchema(story: Story) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: story.title,
    description: story.summary,
    url: absoluteUrl(`/insights/${story.slug}`),
    datePublished: story.publishedDate,
    dateModified: story.lastUpdated,
    author: {
      '@type': 'Person',
      name: AUTHOR.name,
      url: AUTHOR.url,
    },
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-ZA',
    keywords: story.tags.join(', '),
    articleSection: story.categoryLabel,
  }
}

export function placeSchema(m: MunicipalityRecord, path: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AdministrativeArea',
    name: m.name,
    description: description,
    url: absoluteUrl(path),
    containedInPlace: {
      '@type': 'AdministrativeArea',
      name: m.provinceName,
    },
    identifier: m.id,
    population: m.population2022,
  }
}

export function provincePlaceSchema(name: string, path: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AdministrativeArea',
    name,
    description,
    url: absoluteUrl(path),
    containedInPlace: {
      '@type': 'Country',
      name: 'South Africa',
    },
  }
}
