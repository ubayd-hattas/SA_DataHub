import type { Metadata } from 'next'

/** Canonical apex domain — all URLs, sitemaps, and redirects use this host. */
export const SITE_URL = 'https://sadatahub.tech'
export const SITE_NAME = 'SA Data Hub'
export const SITE_TAGLINE = "South Africa's public data, made clear"
export const SITE_DESCRIPTION =
  'Explore South African public data — unemployment, GDP, inflation, crime, education, population, housing, and census statistics from official government sources.'
export const SITE_LOGO_PATH = '/brand/logo-wordmark.svg'
export const SITE_LOGO_MARK_PATH = '/brand/logo-mark.svg'

export const AUTHOR = {
  name: 'Ubayd Hattas',
  url: 'https://ubayd.me',
  github: 'https://github.com/ubayd-hattas',
} as const

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}

export interface PageMetadataOptions {
  title: string
  description: string
  path: string
  /** Set true for dashboard with query params — canonical always points to clean path */
  noIndex?: boolean
  ogType?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
  tags?: string[]
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
}: PageMetadataOptions): Metadata {
  const canonical = absoluteUrl(path)

  return {
    title,
    description,
    alternates: { canonical },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: ogType,
      locale: 'en_ZA',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_TAGLINE}` }],
      ...(ogType === 'article' && publishedTime
        ? { publishedTime, modifiedTime, authors, tags }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/opengraph-image'],
    },
  }
}
