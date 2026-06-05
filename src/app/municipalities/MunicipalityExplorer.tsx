'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Filter, Building2, Users, Home, MapPin, ChevronDown, ArrowRight } from 'lucide-react'
import { MunicipalityRecord, ProvinceCode } from '@/types'
import { cn } from '@/lib/utils'

// ─── Province meta ────────────────────────────────────────────────────────────

const PROVINCE_OPTIONS: { code: ProvinceCode | 'ALL'; label: string }[] = [
  { code: 'ALL', label: 'All Provinces' },
  { code: 'EC',  label: 'Eastern Cape' },
  { code: 'FS',  label: 'Free State' },
  { code: 'GP',  label: 'Gauteng' },
  { code: 'KZN', label: 'KwaZulu-Natal' },
  { code: 'LP',  label: 'Limpopo' },
  { code: 'MP',  label: 'Mpumalanga' },
  { code: 'NC',  label: 'Northern Cape' },
  { code: 'NW',  label: 'North West' },
  { code: 'WC',  label: 'Western Cape' },
]

const PROVINCE_COLORS: Record<ProvinceCode, string> = {
  EC:  '#ef4444',
  FS:  '#ec4899',
  GP:  '#3b82f6',
  KZN: '#f59e0b',
  LP:  '#8b5cf6',
  MP:  '#06b6d4',
  NC:  '#14b8a6',
  NW:  '#f97316',
  WC:  '#22c55e',
}

const CATEGORY_LABELS: Record<string, string> = {
  A: 'Metro',
  B: 'Local',
  C: 'District',
}

const CATEGORY_BADGE: Record<string, string> = {
  A: 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300',
  B: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  C: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return n.toLocaleString('en-ZA')
  return n.toString()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-mono text-2xl font-semibold text-slate-900 dark:text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function MunicipalityRow({ m }: { m: MunicipalityRecord }) {
  const dot = PROVINCE_COLORS[m.province] ?? '#64748b'
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 hover:shadow-sm transition-shadow">
      {/* Name + category */}
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <span
          className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: dot }}
        />
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-white truncate">{m.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{m.provinceName}</p>
        </div>
      </div>

      {/* Code */}
      <div className="sm:w-20 shrink-0">
        <p className="text-xs text-slate-400 sm:hidden">Code</p>
        <p className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">{m.id}</p>
      </div>

      {/* Category badge */}
      <div className="sm:w-20 shrink-0">
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', CATEGORY_BADGE[m.category])}>
          {CATEGORY_LABELS[m.category]}
        </span>
      </div>

      {/* Population */}
      <div className="sm:w-28 shrink-0">
        <p className="text-xs text-slate-400 sm:hidden">Population (2022)</p>
        <div className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
          <Users size={12} className="text-slate-400 shrink-0" />
          <span className="font-mono">{fmt(m.population2022)}</span>
        </div>
      </div>

      {/* Households */}
      <div className="sm:w-28 shrink-0">
        <p className="text-xs text-slate-400 sm:hidden">Households (2022)</p>
        <div className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
          <Home size={12} className="text-slate-400 shrink-0" />
          <span className="font-mono">{fmt(m.households2022)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  municipalities: MunicipalityRecord[]
}

export default function MunicipalityExplorer({ municipalities }: Props) {
  const [query, setQuery] = useState('')
  const [province, setProvince] = useState<ProvinceCode | 'ALL'>('ALL')
  const [category, setCategory] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL')
  const [sortKey, setSortKey] = useState<'name' | 'population2022' | 'households2022'>('name')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 30

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return municipalities
      .filter((m) => {
        if (province !== 'ALL' && m.province !== province) return false
        if (category !== 'ALL' && m.category !== category) return false
        if (q) {
          return (
            m.name.toLowerCase().includes(q) ||
            m.id.toLowerCase().includes(q) ||
            m.provinceName.toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => {
        if (sortKey === 'name') return a.name.localeCompare(b.name)
        return b[sortKey] - a[sortKey]
      })
  }, [municipalities, query, province, category, sortKey])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Summary stats (full dataset, not filtered)
  const totalPop = municipalities.reduce((s, m) => s + m.population2022, 0)
  const totalHH  = municipalities.reduce((s, m) => s + m.households2022, 0)
  const metros   = municipalities.filter((m) => m.category === 'A').length

  function handleFilterChange<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1) }
  }

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Total Municipalities" value={municipalities.length.toString()} sub="All categories" />
        <SummaryCard label="Total Population"     value={fmt(totalPop)}  sub="Census 2022" />
        <SummaryCard label="Total Households"     value={fmt(totalHH)}   sub="Census 2022" />
        <SummaryCard label="Metropolitan Areas"   value={metros.toString()} sub="Category A" />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search municipality name or code…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:placeholder-slate-500"
            />
          </div>

          {/* Province filter */}
          <div className="relative">
            <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={province}
              onChange={(e) => handleFilterChange(setProvince)(e.target.value as ProvinceCode | 'ALL')}
              className="appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {PROVINCE_OPTIONS.map((p) => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Category filter */}
          <div className="relative">
            <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={category}
              onChange={(e) => handleFilterChange(setCategory)(e.target.value as 'ALL' | 'A' | 'B' | 'C')}
              className="appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="ALL">All Categories</option>
              <option value="A">Metro (A)</option>
              <option value="B">Local (B)</option>
              <option value="C">District (C)</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={sortKey}
              onChange={(e) => handleFilterChange(setSortKey)(e.target.value as typeof sortKey)}
              className="appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="name">Sort: Name A–Z</option>
              <option value="population2022">Sort: Population ↓</option>
              <option value="households2022">Sort: Households ↓</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Result count */}
        <p className="mt-3 text-xs text-slate-400">
          {filtered.length === municipalities.length
            ? `Showing all ${municipalities.length} municipalities`
            : `${filtered.length} of ${municipalities.length} municipalities`}
          {totalPages > 1 && ` · page ${page} of ${totalPages}`}
        </p>
      </div>

      {/* Table header — hidden on mobile */}
      <div className="hidden sm:flex items-center gap-4 px-4 text-xs font-medium text-slate-400 uppercase tracking-wide">
        <div className="flex-1">Municipality</div>
        <div className="w-20 shrink-0">Code</div>
        <div className="w-20 shrink-0">Type</div>
        <div className="w-28 shrink-0">Population</div>
        <div className="w-28 shrink-0">Households</div>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {paged.length === 0 ? (
          <div className="card py-16 text-center text-slate-400">
            <Search size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No municipalities match your search.</p>
          </div>
        ) : (
          paged.map((m) => (
            <Link
              key={m.id}
              href={`/municipalities/${m.id}`}
              className="block"
            >
              <MunicipalityRow m={m} />
           </Link>
            ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
