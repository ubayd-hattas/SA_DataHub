import Link from 'next/link'
import type { Metadata } from 'next'
import { Column, PageHeader, linkClass } from '@/components/editorial/Section'
import { buildPageMetadata } from '@/lib/seo'
import { buildSearchIndex } from '@/lib/search-index'
import { SEARCH_GROUPS, searchEntries } from '@/lib/search-match'
import { SERIES_PATH } from '@/lib/series'

const MAX_QUERY = 100
/** More than the header's five per group: this page has the room. */
const PER_GROUP = 20

// The data only changes with a deployment, so the index is built once per server instance.
let index: ReturnType<typeof buildSearchIndex> | undefined

// A results page is not something to find through a search engine.
export const metadata: Metadata = buildPageMetadata({
  title: 'Search',
  description: 'Search SA Data Hub: municipalities, provinces, statistics, answers, explainers, stories and tools.',
  path: '/search',
  noIndex: true,
})

/**
 * Where the header search lands when no suggestion is chosen, including without
 * JavaScript. It matches the same index with the same rules as the suggestions.
 */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams
  const query = (Array.isArray(q) ? q[0] : (q ?? '')).trim().slice(0, MAX_QUERY)
  const results = query ? searchEntries((index ??= buildSearchIndex()), query, PER_GROUP) : []

  return (
    <Column className="pb-16">
      <PageHeader title="Search" />
      <form action="/search" method="get" role="search" aria-label="Search this site" className="flex gap-2">
        <label htmlFor="search-page-q" className="sr-only">
          Words to search for
        </label>
        <input
          id="search-page-q"
          name="q"
          type="search"
          maxLength={MAX_QUERY}
          defaultValue={query}
          // Remounts the box when the address changes, so it shows the new words.
          key={query}
          placeholder="A place, statistic or question"
          className="h-11 w-full min-w-0 rounded border border-muted bg-paper px-3 text-body text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          className="h-11 shrink-0 rounded border border-accent px-4 text-small font-medium text-accent hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Search
        </button>
      </form>

      <div className="mt-8">
        {!query ? (
          <p className="text-body text-ink">Type a place, a statistic or a question.</p>
        ) : results.length === 0 ? (
          <p className="text-body text-ink">Nothing matches &ldquo;{query}&rdquo;. Every word has to match, so try fewer words.</p>
        ) : (
          <>
            <p className="text-small text-muted">Results for &ldquo;{query}&rdquo;</p>
            {SEARCH_GROUPS.filter((group) => results.some((r) => r.group === group)).map((group) => (
              <section key={group} aria-labelledby={`group-${group}`} className="mt-6">
                <h2 id={`group-${group}`} className="font-display text-h3 font-semibold text-ink">
                  {group}
                </h2>
                <ul className="mt-2 border-t border-rule">
                  {results
                    .filter((r) => r.group === group)
                    .map((r) => (
                      <li key={r.href} className="border-b border-rule py-3">
                        <Link href={r.href} className={`${linkClass} text-body`}>
                          {r.title}
                        </Link>
                        <span className="block text-small text-muted">{r.detail}</span>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>

      <p className="mt-10 border-t border-rule pt-6 text-small">
        <Link href={SERIES_PATH} className={linkClass}>
          All statistics
        </Link>
        {' · '}
        <Link href="/municipalities" className={linkClass}>
          All municipalities
        </Link>
      </p>
    </Column>
  )
}
