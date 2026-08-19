'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { StoryCard } from '@/components/ui/StoryCard'
import { STORIES, getFeaturedStories } from '@/data/stories'
import { Story, StoryCategory } from '@/types'
import { cn } from '@/lib/utils'

const CATEGORIES: { id: StoryCategory | 'all'; label: string }[] = [
  { id: 'all',          label: 'All' },
  { id: 'unemployment', label: 'Unemployment' },
  { id: 'economy',      label: 'Economy' },
  { id: 'inflation',    label: 'Inflation' },
  { id: 'crime',        label: 'Crime' },
  { id: 'education',    label: 'Education' },
  { id: 'population',   label: 'Population' },
  { id: 'housing',      label: 'Housing' },
  { id: 'policy',       label: 'Policy' },
]

export default function InsightsHub() {
  const [selectedCategory, setSelectedCategory] = useState<StoryCategory | 'all'>('all')
  const [search, setSearch] = useState('')

  const featured = getFeaturedStories()

  const filtered = useMemo<Story[]>(() => {
    return STORIES.filter((s) => {
      const matchCat = selectedCategory === 'all' || s.category === selectedCategory
      const q = search.toLowerCase()
      const matchSearch = !q || [s.title, s.subtitle, s.summary, ...s.tags].some((t) =>
        t.toLowerCase().includes(q)
      )
      return matchCat && matchSearch
    })
  }, [selectedCategory, search])

  const isFiltered = selectedCategory !== 'all' || !!search
  const nonFeatured = isFiltered ? filtered : filtered.filter((s) => !s.featured)

  return (
    <div className="animate-fade-in">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 py-12">
        <div className="container-page">
          <p className="section-label mb-3">Data Stories</p>
          <h1 className="heading-display text-4xl font-semibold sm:text-5xl">Insights</h1>
          <p className="mt-3 max-w-xl text-slate-500 dark:text-slate-400">
            Data stories that explain what South Africa's numbers actually mean —
            written for everyone, not just economists.
          </p>
        </div>
      </div>

      <div className="container-page py-10">
        {/* ── Search + Filter ─────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stories…"
              aria-label="Search data stories"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/30"
            />
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {CATEGORIES.map(({ id, label }) => {
              const isActive = selectedCategory === id
              return (
                <button
                  key={id}
                  onClick={() => setSelectedCategory(id)}
                  aria-pressed={isActive}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    isActive
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Featured Stories ─────────────────────────────────────────────── */}
        {!isFiltered && featured.length > 0 && (
          <section className="mb-12" aria-label="Featured stories">
            <p className="section-label mb-5">Featured</p>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {featured.map((story) => (
                <StoryCard key={story.slug} story={story} featured />
              ))}
            </div>
          </section>
        )}

        {/* ── All / Filtered Stories ───────────────────────────────────────── */}
        {nonFeatured.length > 0 && (
          <section aria-label={isFiltered ? 'Filtered stories' : 'More stories'}>
            <p className="section-label mb-5">
              {isFiltered
                ? `${filtered.length} stor${filtered.length === 1 ? 'y' : 'ies'} found`
                : 'More stories'}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {nonFeatured.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          </section>
        )}

        {/* ── Empty State ─────────────────────────────────────────────────── */}
        {filtered.length === 0 && (
          <div className="card flex flex-col items-center justify-center py-20 text-center">
            <p className="text-3xl" aria-hidden="true">📭</p>
            <p className="mt-4 font-semibold text-slate-700 dark:text-slate-300">No stories found</p>
            <p className="mt-1 text-sm text-slate-400">Try a different search term or category.</p>
            <button
              onClick={() => { setSearch(''); setSelectedCategory('all') }}
              className="mt-5 rounded-lg px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
