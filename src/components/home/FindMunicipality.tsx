'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useMemo, useState } from 'react'
import { Search } from 'lucide-react'

export interface MunicipalityOption {
  id: string
  name: string
  province: string
}

const MAX_RESULTS = 8

function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Code matches first, then names that start with the query, then names that contain it. */
export function matchMunicipalities(options: MunicipalityOption[], query: string): MunicipalityOption[] {
  const q = normalise(query)
  if (!q) return []
  const scored = options.flatMap((m) => {
    const name = normalise(m.name).replace(/^city of /, '')
    if (normalise(m.id) === q) return [{ m, score: 0 }]
    if (name.startsWith(q)) return [{ m, score: 1 }]
    if (name.includes(q) || normalise(m.name).includes(q)) return [{ m, score: 2 }]
    return []
  })
  return scored.sort((a, b) => a.score - b.score || a.m.name.localeCompare(b.m.name)).map((s) => s.m)
}

/**
 * The homepage place search. Without JavaScript the form submits to
 * /municipalities?search=, which filters the full list.
 */
export function FindMunicipality({ options, shortcuts }: { options: MunicipalityOption[]; shortcuts: MunicipalityOption[] }) {
  const inputId = useId()
  const resultsId = useId()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const matches = useMemo(() => matchMunicipalities(options, query), [options, query])

  return (
    <div>
      <form
        action="/municipalities"
        method="get"
        role="search"
        onSubmit={(e) => {
          if (matches[0]) {
            e.preventDefault()
            router.push(`/municipalities/${matches[0].id}`)
          }
        }}
      >
        <label htmlFor={inputId} className="block font-display text-h3 font-semibold text-ink">
          Find your municipality
        </label>
        <p className="mt-1 text-small text-muted">
          Each of the {options.length} local and metropolitan municipalities has a Census 2022 profile. Type a name or a code.
        </p>
        <div className="relative mt-3">
          <input
            id={inputId}
            name="search"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="For example Stellenbosch or BUF"
            aria-controls={resultsId}
            className="h-12 w-full rounded border border-ink/40 bg-paper pl-4 pr-12 text-body text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            aria-label="Find municipality"
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Search size={18} aria-hidden="true" />
          </button>
        </div>
      </form>

      <div id={resultsId} aria-live="polite">
        {query.trim() &&
          (matches.length ? (
            <ul className="mt-2 border-y border-rule">
              {matches.slice(0, MAX_RESULTS).map((m) => (
                <li key={m.id} className="border-b border-rule last:border-b-0">
                  <Link
                    href={`/municipalities/${m.id}`}
                    className="flex items-baseline justify-between gap-4 px-1 py-2.5 text-body text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span>{m.name}</span>
                    <span className="shrink-0 text-small text-muted">
                      {m.province}, {m.id}
                    </span>
                  </Link>
                </li>
              ))}
              {matches.length > MAX_RESULTS && (
                <li className="px-1 py-2.5 text-small text-muted">
                  {matches.length - MAX_RESULTS} more. Keep typing, or{' '}
                  <Link href={`/municipalities?search=${encodeURIComponent(query)}`} className="text-accent underline underline-offset-4">
                    see them all
                  </Link>
                  .
                </li>
              )}
            </ul>
          ) : (
            <p className="mt-3 text-small text-ink">
              No municipality matches &ldquo;{query}&rdquo;. Try part of the name, or{' '}
              <Link href="/municipalities" className="text-accent underline underline-offset-4">
                browse the full list
              </Link>
              .
            </p>
          ))}
      </div>

      <p className="mt-4 text-small text-muted">
        Metros:{' '}
        {shortcuts.map((m, i) => (
          <span key={m.id}>
            {i > 0 && ', '}
            <Link href={`/municipalities/${m.id}`} className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
              {m.name}
            </Link>
          </span>
        ))}
        .
      </p>
    </div>
  )
}
