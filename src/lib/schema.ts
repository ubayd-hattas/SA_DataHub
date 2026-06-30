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
    sameAs: [AUTHOR.url, AUTHOR.github],
    jobTitle: 'Software Engineer',
    worksFor: { '@id': `${SITE_URL}/#organization` },
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

export function datasetSchema(entry: DatasetRegistryEntry, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: entry.label,
    description: entry.description,
    url: absoluteUrl(path),
    creator: {
      '@type': 'Organization',
      name: entry.sourceName,
      url: entry.sourceUrl,
    },
    provider: { '@id': `${SITE_URL}/#organization` },
    temporalCoverage: entry.seriesEnd
      ? `${entry.seriesStart}/${entry.seriesEnd}`
      : entry.seriesStart,
    spatialCoverage: {
      '@type': 'Place',
      name: 'South Africa',
      geo: {
        '@type': 'GeoShape',
        box: '-34.8351 16.3449 -22.1250 32.8301',
      },
    },
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

export function placeSchema(m: MunicipalityRecord, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AdministrativeArea',
    name: m.name,
    description: `Municipality in ${m.provinceName}, South Africa. Census 2022 demographic and housing profile.`,
    url: absoluteUrl(path),
    containedInPlace: {
      '@type': 'AdministrativeArea',
      name: m.provinceName,
    },
    identifier: m.id,
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
