'use client'

import { useState } from 'react'
import { formatCount, formatPercent, formatSigned } from '@/lib/format'

/** Only the fields the comparison shows, so the page sends no more than this to the browser. */
export interface CompareRow {
  id: string
  name: string
  rate: number
  change: number
  lu3: number | null
  population: number
}

const control =
  'w-full rounded-md border border-rule bg-paper px-3 py-2 text-small text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

export default function ProvinceCompare({ provinces }: { provinces: CompareRow[] }) {
  const [a, setA] = useState('gauteng')
  const [b, setB] = useState('western-cape')
  const pA = provinces.find((p) => p.id === a)
  const pB = provinces.find((p) => p.id === b)
  if (!pA || !pB) return null

  const measures = [
    { label: 'Official unemployment rate, Q2 2026', a: formatPercent(pA.rate), b: formatPercent(pB.rate) },
    { label: 'Change from Q1 2026', a: `${formatSigned(pA.change)} pts`, b: `${formatSigned(pB.change)} pts` },
    {
      label: 'LU3, Q2 2026',
      a: pA.lu3 != null ? formatPercent(pA.lu3) : 'Not published',
      b: pB.lu3 != null ? formatPercent(pB.lu3) : 'Not published',
    },
    { label: 'People, 2026 estimate', a: formatCount(pA.population), b: formatCount(pB.population) },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-caption text-muted">
          First province
          <select value={a} onChange={(e) => setA(e.target.value)} className={control}>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted">
          Second province
          <select value={b} onChange={(e) => setB(e.target.value)} className={control}>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-small">
          <caption className="sr-only">{pA.name} compared with {pB.name}</caption>
          <thead>
            <tr className="border-b border-ink text-caption text-muted">
              <th scope="col" className="py-2 pr-3 font-medium">Measure</th>
              <th scope="col" className="px-2 py-2 text-right font-medium text-ink">{pA.name}</th>
              <th scope="col" className="py-2 pl-2 text-right font-medium text-ink">{pB.name}</th>
            </tr>
          </thead>
          <tbody>
            {measures.map((m) => (
              <tr key={m.label} className="border-t border-rule">
                <th scope="row" className="py-2 pr-3 font-normal text-ink">{m.label}</th>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-ink">{m.a}</td>
                <td className="whitespace-nowrap py-2 pl-2 text-right tabular-nums text-ink">{m.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
