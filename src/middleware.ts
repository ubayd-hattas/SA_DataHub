import { NextResponse, type NextRequest } from 'next/server'
import { canonicalEntityPath } from '@/lib/entity-path'

/**
 * Permanently redirects case variants of municipality, province, topic,
 * explainer, story and tool URLs (e.g. /municipalities/kzn213,
 * /explainers/CPI-2026-09) to the canonical spelling so that only one URL
 * form is ever indexed. Valid canonical URLs pass straight through.
 */
export function middleware(request: NextRequest) {
  const target = canonicalEntityPath(request.nextUrl.pathname)
  if (!target) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = target
  return NextResponse.redirect(url, 308)
}

export const config = {
  matcher: ['/municipalities/:path*', '/provinces/:path*', '/category/:path*', '/explainers/:path*', '/insights/:path*', '/tools/:path*'],
}
