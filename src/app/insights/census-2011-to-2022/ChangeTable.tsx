'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

/** One municipality's 2011 and 2022 value for each measure, pre-formatted on the server. */
export interface ChangeTableRow {
  id: string
  name: string
  provinceName: string
  /** measure id -> [2011 text, 2022 text, change text, change number] */
  values: Record<string, [string, string, string, number]>
}

export interface ChangeTableMeasure {
  id: string
  title: string
}

const control =
  'rounded-md border border-rule bg-paper px-3 py-2 text-small text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

type Sort = 'name' | 'change-desc' | 'change-asc'

export default function ChangeTable({
  rows,
  measures,
  provinces,
}: {
  rows: ChangeTableRow[]
  measures: ChangeTableMeasure[]
  provinces: string[]
}) {
  const [measure, setMeasure] = useState(measures[0].id)
  const [province, setProvince] = useState('all')
  const [sort, setSort] = useState<Sort>('change-desc')

  const shown = useMemo(() => {
    const list = rows.filter((r) => province === 'all' || r.provinceName === province)
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      const d = a.values[measure][3] - b.values[measure][3]
      return sort === 'change-desc' ? -d : d
    })
  }, [rows, province, sort, measure])

  const title = measures.find((m) => m.id === measure)?.title ?? ''

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-caption text-muted">
          Measure
          <select value={measure} onChange={(e) => setMeasure(e.target.value)} className={control}>
            {measures.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted">
          Province
          <select value={province} onChange={(e) => setProvince(e.target.value)} className={control}>
            <option value="all">All provinces</option>
            {provinces.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted">
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={control}>
            <option value="change-desc">Change, largest rise first</option>
            <option value="change-asc">Change, largest fall first</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      <p className="mt-4 text-caption text-muted" aria-live="polite">
        {title}: {shown.length} municipalities
        <span className="sm:hidden">. On a wider screen the table also shows 2011.</span>
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-small">
          <caption className="sr-only">{title}, Census 2011 and Census 2022, by municipality</caption>
          <thead>
            <tr className="border-b border-ink text-caption text-muted">
              <th scope="col" className="py-2 pr-3 font-medium">Municipality</th>
              <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">2011</th>
              <th scope="col" className="px-2 py-2 text-right font-medium text-ink">2022</th>
              <th scope="col" className="py-2 pl-2 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const [v11, v22, change] = r.values[measure]
              return (
                <tr key={r.id} className="border-t border-rule">
                  <th scope="row" className="py-2 pr-3 font-normal">
                    <Link
                      href={`/municipalities/${r.id}`}
                      className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {r.name}
                    </Link>
                    <span className="block text-caption text-muted">{r.provinceName}</span>
                  </th>
                  <td className="hidden whitespace-nowrap px-2 py-2 text-right tabular-nums text-muted sm:table-cell">{v11}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-ink">{v22}</td>
                  <td className="whitespace-nowrap py-2 pl-2 text-right tabular-nums text-ink">{change}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
