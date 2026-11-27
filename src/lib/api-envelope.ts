/**
 * The one response shape for /api/v1. Every response carries its source, the
 * terms the source sets, and how to credit it, so a figure is never passed on
 * without them. Responses are built at build time and served from the CDN:
 * there is no database or per-request code behind them.
 *
 * Version 1 is frozen once announced: fields may be added, never renamed or
 * removed. tests/unit/api-v1.test.ts snapshots the keys.
 */
import { absoluteUrl } from '@/lib/seo'

export const API_VERSION = 'v1'
export const API_BASE = '/api/v1'
export const API_DOCS_PATH = '/api'

/** Every endpoint, for the index and the docs page. */
export const API_ENDPOINTS = [
  { path: `${API_BASE}/fuel/latest`, about: "This month's official fuel prices, every product and zone." },
  { path: `${API_BASE}/fuel/history`, about: 'Every monthly fuel price adjustment since January 2022.' },
  { path: `${API_BASE}/fuel/breakdown`, about: 'What a litre of petrol 95 or diesel is made of, inland.' },
  { path: `${API_BASE}/series`, about: 'Every statistic the site shows.' },
  { path: `${API_BASE}/series/{id}`, about: 'One statistic: every value, its source and citation.' },
]

export const API_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
}

export interface ApiSource {
  publisher: string
  document: string
  url: string
  /** ISO date the source published it, when known. */
  releasedOn: string | null
}

export interface ApiMeta {
  version: typeof API_VERSION
  /** When this file was built. */
  generatedAt: string
  source: ApiSource
  /** ISO date SA Data Hub last checked the figures against the source. */
  checkedOn: string
  attribution: string
  terms: string
  /** True when any value is an estimate, not an official figure. */
  estimate: boolean
  docs: string
}

export interface ApiEnvelope<T> {
  data: T
  meta: ApiMeta
}

export function apiMeta(m: Omit<ApiMeta, 'version' | 'generatedAt' | 'docs'>, generatedAt = new Date().toISOString()): ApiMeta {
  return { version: API_VERSION, generatedAt, ...m, docs: absoluteUrl(API_DOCS_PATH) }
}

export function apiResponse<T>(data: T, meta: ApiMeta, status = 200): Response {
  const body: ApiEnvelope<T> = { data, meta }
  return new Response(JSON.stringify(body, null, 2), { status, headers: API_HEADERS })
}

export function apiNotFound(message: string): Response {
  return new Response(JSON.stringify({ error: message, docs: absoluteUrl(API_DOCS_PATH) }, null, 2), {
    status: 404,
    headers: API_HEADERS,
  })
}
