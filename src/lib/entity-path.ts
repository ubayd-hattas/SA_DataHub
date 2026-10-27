// Kept free of data imports so the edge middleware bundle stays small.

/** Sections whose page slugs are always lower-case. */
const LOWER_CASE_SECTIONS = ['provinces', 'category', 'explainers', 'insights', 'tools']

/**
 * Returns the canonical path when `pathname` is a case variant of a
 * municipality (`/municipalities/KZN213`, codes upper-case) or a lower-case
 * slug page (`/provinces/western-cape`, `/category/inflation`,
 * `/explainers/cpi-2026-09`, `/insights/...`, `/tools/money-value`),
 * otherwise null. Used by middleware so variants get a real 308 instead of
 * a duplicate 200 or a 404.
 */
export function canonicalEntityPath(pathname: string): string | null {
  const m = /^\/([a-z]+)\/([^/]+)$/.exec(pathname)
  if (!m) return null
  const [, section, segment] = m
  let normalized: string
  if (section === 'municipalities') normalized = segment.toUpperCase()
  else if (LOWER_CASE_SECTIONS.includes(section)) normalized = segment.toLowerCase()
  else return null
  return normalized === segment ? null : `/${section}/${normalized}`
}
