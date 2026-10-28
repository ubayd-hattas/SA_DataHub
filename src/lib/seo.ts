import type { Metadata } from 'next'

/** Canonical apex domain — all URLs, sitemaps, and redirects use this host. */
export const SITE_URL = 'https://sadatahub.tech'

/** The RSS feed, linked from every page's head. */
export const FEED_ALTERNATE = { 'application/rss+xml': [{ url: '/feed.xml', title: 'SA Data Hub: explainers, stories and updates' }] }
export const SITE_NAME = 'SA Data Hub'
export const SITE_TAGLINE = "South Africa's public data, made clear"
export const SITE_DESCRIPTION =
  'Explore South African public data: unemployment, GDP, inflation, crime, education, population, housing, and census statistics from official government sources.'
export const SITE_LOGO_PATH = '/brand/logo-wordmark.svg'
export const SITE_LOGO_MARK_PATH = '/brand/logo-mark.svg'

export const AUTHOR = {
  name: 'Ubayd Hattas',
  url: 'https://ubayd.me',
  github: 'https://github.com/ubayd-hattas',
  linkedin: 'https://www.linkedin.com/in/ubayd-hattas/',
} as const

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}

export interface PageMetadataOptions {
  title: string
  description: string
  path: string
  /** Set true for pages that must not be indexed (e.g. 404); no canonical is emitted */
  noIndex?: boolean
  ogType?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
  tags?: string[]
  /** A page-specific share image (1200 by 630). Defaults to the site image. */
  image?: { url: string; alt: string }
}

/**
 * Builds consistent Metadata for any indexable route:
 * title, description, canonical, Open Graph, and Twitter cards.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  noIndex = false,
  ogType = 'website',
  publishedTime,
  modifiedTime,
  authors,
  tags,
  image = { url: '/opengraph-image', alt: `${SITE_NAME}: ${SITE_TAGLINE}` },
}: PageMetadataOptions): Metadata {
  const canonical = absoluteUrl(path)

  return {
    title,
    description,
    // A noindex page (e.g. the 404) has no canonical URL to declare.
    // Page alternates replace the layout's, so indexed pages repeat the feed link. Noindex pages keep the layout's.
    ...(noIndex ? { robots: { index: false, follow: true } } : { alternates: { canonical, types: FEED_ALTERNATE } }),
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: ogType,
      locale: 'en_ZA',
      images: [{ url: image.url, width: 1200, height: 630, alt: image.alt }],
      ...(ogType === 'article' && publishedTime
        ? { publishedTime, modifiedTime, authors, tags }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  }
}
