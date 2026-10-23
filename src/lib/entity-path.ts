// Kept free of data imports so the edge middleware bundle stays small.

/**
 * Returns the canonical path when `pathname` is a case variant of a
 * municipality (`/municipalities/KZN213`, codes upper-case) or province
 * (`/provinces/western-cape`, slugs lower-case) URL, otherwise null.
 * Used by middleware so variants get a real 308 rather than a 404.
 */
export function canonicalEntityPath(pathname: string): string | null {
  const m = /^\/(municipalities|provinces)\/([^/]+)$/.exec(pathname)
  if (!m) return null
  const [, section, segment] = m
  const normalized = section === 'municipalities' ? segment.toUpperCase() : segment.toLowerCase()
  return normalized === segment ? null : `/${section}/${normalized}`
}
