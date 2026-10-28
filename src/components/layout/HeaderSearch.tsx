'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { SEARCH_GROUPS, searchEntries, type SearchEntry } from '@/lib/search-match'
import { cn } from '@/lib/utils'

let indexPromise: Promise<SearchEntry[]> | null = null

/** The index is loaded once, on first focus, and shared by every search box on the page. */
function loadIndex(): Promise<SearchEntry[]> {
  indexPromise ??= fetch('/search-index.json')
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => {
      indexPromise = null
      return []
    })
  return indexPromise
}

/**
 * The header search: places, statistics, answers, explainers, stories and tools,
 * grouped, with arrow keys, Enter and Escape (the ARIA combobox pattern).
 * Without JavaScript, or with nothing chosen, Enter submits to /dashboard.
 */
export function HeaderSearch({ className, panelClassName }: { className?: string; panelClassName?: string }) {
  const id = useId()
  const listId = `${id}-list`
  const router = useRouter()
  const [index, setIndex] = useState<SearchEntry[] | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const formRef = useRef<HTMLFormElement>(null)

  const results = useMemo(() => (index && query.trim() ? searchEntries(index, query) : []), [index, query])
  useEffect(() => setActive(-1), [query])

  const go = (entry: SearchEntry) => {
    setOpen(false)
    setQuery('')
    router.push(entry.href)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault()
      setOpen(true)
      setActive((a) => (a + 1) % results.length)
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault()
      setActive((a) => (a <= 0 ? results.length - 1 : a - 1))
    } else if (e.key === 'Enter' && open && active >= 0 && results[active]) {
      e.preventDefault()
      go(results[active])
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        setOpen(false)
        setActive(-1)
      } else {
        setQuery('')
      }
    }
  }

  const showPanel = open && query.trim().length > 0
  const optionId = (i: number) => `${id}-opt-${i}`

  return (
    <form
      ref={formRef}
      action="/dashboard"
      method="get"
      role="search"
      className={cn('relative', className)}
      onBlur={(e) => {
        if (!formRef.current?.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <label htmlFor={id} className="sr-only">
        Search places, statistics and pages
      </label>
      <input
        id={id}
        name="search"
        type="search"
        placeholder="Search"
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? optionId(active) : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          setOpen(true)
          if (!index) loadIndex().then(setIndex)
        }}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded border border-rule bg-paper pl-3 pr-10 text-small text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Search size={16} aria-hidden="true" />
      </button>

      <div
        id={listId}
        role="listbox"
        aria-label="Search results"
        hidden={!showPanel}
        className={cn(
          'absolute top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded border border-rule bg-paper py-2 shadow-lg',
          panelClassName,
        )}
      >
        {index === null ? (
          <p className="px-3 py-2 text-small text-muted">Loading…</p>
        ) : results.length === 0 ? (
          <p className="px-3 py-2 text-small text-muted">No matches. Press Enter to search all statistics.</p>
        ) : (
          SEARCH_GROUPS.filter((g) => results.some((r) => r.group === g)).map((group) => (
            <div key={group} role="group" aria-labelledby={`${id}-${group}`}>
              <p id={`${id}-${group}`} className="px-3 pb-1 pt-2 text-caption font-medium text-muted">
                {group}
              </p>
              {results.map((r, i) =>
                r.group !== group ? null : (
                  <div
                    key={r.href}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(r)}
                    onMouseEnter={() => setActive(i)}
                    className={cn('cursor-pointer px-3 py-1.5', i === active && 'bg-subtle')}
                  >
                    <span className="block text-small text-ink">{r.title}</span>
                    <span className="block text-caption text-muted">{r.detail}</span>
                  </div>
                ),
              )}
            </div>
          ))
        )}
      </div>
    </form>
  )
}
