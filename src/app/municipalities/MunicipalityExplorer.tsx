'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { ProvinceCode } from '@/types'
import { formatCount, formatSigned } from '@/lib/format'

/** The fields the table needs, so the page sends no more than that to the browser. */
export interface ExplorerRow {
  id: string
  name: string
  category: string
  province: ProvinceCode
  provinceName: string
  population2011: number
  population2022: number
  households2022: number
}

const PROVINCE_OPTIONS: { code: ProvinceCode | 'ALL'; label: string }[] = [
  { code: 'ALL', label: 'All provinces' },
  { code: 'EC', label: 'Eastern Cape' },
  { code: 'FS', label: 'Free State' },
  { code: 'GP', label: 'Gauteng' },
  { code: 'KZN', label: 'KwaZulu-Natal' },
  { code: 'LP', label: 'Limpopo' },
  { code: 'MP', label: 'Mpumalanga' },
  { code: 'NC', label: 'Northern Cape' },
  { code: 'NW', label: 'North West' },
  { code: 'WC', label: 'Western Cape' },
]

const control =
  'rounded-md border border-rule bg-paper px-3 py-2 text-small text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

type SortKey = 'name' | 'population2022' | 'change' | 'households2022'

const change = (m: ExplorerRow) => ((m.population2022 - m.population2011) / m.population2011) * 100

export default function MunicipalityExplorer({ municipalities }: { municipalities: ExplorerRow[] }) {
  const [query, setQuery] = useState('')
  const [province, setProvince] = useState<ProvinceCode | 'ALL'>('ALL')
  const [category, setCategory] = useState<'ALL' | 'A' | 'B'>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('name')

  // ?search= from the homepage place search (also used when JavaScript is off there).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('search')
    if (q) setQuery(q)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return municipalities
      .filter((m) => {
        if (province !== 'ALL' && m.province !== province) return false
        if (category !== 'ALL' && m.category !== category) return false
        if (q) return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.provinceName.toLowerCase().includes(q)
        return true
      })
      .sort((a, b) => {
        if (sortKey === 'name') return a.name.localeCompare(b.name)
        if (sortKey === 'change') return change(b) - change(a)
        return b[sortKey] - a[sortKey]
      })
  }, [municipalities, query, province, category, sortKey])

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-caption text-muted">
          Search
          <span className="relative">
            <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="Name or code"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${control} w-full pl-8`}
            />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted">
          Province
          <select value={province} onChange={(e) => setProvince(e.target.value as ProvinceCode | 'ALL')} className={control}>
            {PROVINCE_OPTIONS.map((p) => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted">
          Type
          <select value={category} onChange={(e) => setCategory(e.target.value as 'ALL' | 'A' | 'B')} className={control}>
            <option value="ALL">All types</option>
            <option value="A">Metros</option>
            <option value="B">Local municipalities</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted">
          Sort by
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={control}>
            <option value="name">Name</option>
            <option value="population2022">Population, largest first</option>
            <option value="change">Change since 2011, largest first</option>
            <option value="households2022">Households, most first</option>
          </select>
        </label>
      </div>

      <p className="mt-4 text-caption text-muted" aria-live="polite">
        {filtered.length === municipalities.length
          ? `Showing all ${municipalities.length} municipalities`
          : `Showing ${filtered.length} of ${municipalities.length} municipalities`}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 text-body text-ink">No municipality matches that search. Try part of the name or the code, such as WC024.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[22rem] text-left text-small">
            <caption className="sr-only">South African municipalities, Census 2022, with the change in population since Census 2011</caption>
            <thead>
              <tr className="border-b border-ink text-caption text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Municipality</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">People, 2022</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Change since 2011</th>
                <th scope="col" className="hidden py-2 pl-2 text-right font-medium sm:table-cell">Households, 2022</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-rule">
                  <th scope="row" className="py-2 pr-3 font-normal">
                    <Link
                      href={`/municipalities/${m.id}`}
                      className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {m.name}
                    </Link>
                    <span className="block text-caption text-muted">
                      {m.provinceName}, {m.id}
                      {m.category === 'A' ? ', metro' : ''}
                    </span>
                  </th>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-ink">{formatCount(m.population2022)}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-ink">{formatSigned(change(m))}%</td>
                  <td className="hidden whitespace-nowrap py-2 pl-2 text-right tabular-nums text-ink sm:table-cell">
                    {formatCount(m.households2022)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
