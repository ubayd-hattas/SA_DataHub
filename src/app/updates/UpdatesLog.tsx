'use client'

import { useEffect, useMemo, useState } from 'react'
import type { UpdateHistoryEntry, UpdateHistoryType } from '@/data/update-history'

const TYPE_LABELS: Record<UpdateHistoryType, string> = {
  correction: 'Correction',
  'data-update': 'Data update',
  'methodology-change': 'Method change',
  'new-dataset': 'New dataset',
}

const control =
  'rounded-md border border-rule bg-paper px-3 py-2 text-small text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/**
 * The public log of corrections and updates, newest first, filterable by
 * dataset and by kind. ?dataset=census opens it filtered, so a filtered view
 * can be linked.
 */
export default function UpdatesLog({
  entries,
  datasets,
}: {
  entries: UpdateHistoryEntry[]
  datasets: { id: string; label: string }[]
}) {
  const [dataset, setDataset] = useState('all')
  const [type, setType] = useState<'all' | UpdateHistoryType>('all')

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('dataset')
    if (q && datasets.some((d) => d.id === q)) setDataset(q)
  }, [datasets])

  const shown = useMemo(
    () => entries.filter((e) => (dataset === 'all' || e.datasetId === dataset) && (type === 'all' || e.type === type)),
    [entries, dataset, type],
  )

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-caption text-muted">
          Dataset
          <select value={dataset} onChange={(e) => setDataset(e.target.value)} className={control}>
            <option value="all">All datasets</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted">
          Kind of change
          <select value={type} onChange={(e) => setType(e.target.value as 'all' | UpdateHistoryType)} className={control}>
            <option value="all">All kinds</option>
            {(Object.keys(TYPE_LABELS) as UpdateHistoryType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-4 text-caption text-muted" aria-live="polite">
        {shown.length === entries.length ? `All ${entries.length} entries` : `${shown.length} of ${entries.length} entries`}
      </p>

      {shown.length === 0 ? (
        <p className="mt-6 text-body text-ink">No entries match. Choose another dataset or kind of change.</p>
      ) : (
        <ol className="mt-2">
          {shown.map((e) => (
            <li key={`${e.datasetId}-${e.date}-${e.type}-${e.summary.slice(0, 24)}`} className="border-t border-rule py-5">
              <p className="text-caption text-muted">
                <time dateTime={e.date}>{longDate(e.date)}</time>. {TYPE_LABELS[e.type]}. {e.datasetLabel}.
              </p>
              <p className="mt-1 text-body text-ink">{e.summary}</p>
              {e.changes && (
                <details className="mt-2 text-small">
                  <summary className="cursor-pointer text-accent">{e.changes.length} values changed</summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-caption">
                      <thead>
                        <tr className="border-b border-ink text-muted">
                          <th scope="col" className="py-1 pr-3 font-medium">Figure</th>
                          <th scope="col" className="py-1 pr-3 text-right font-medium">Was</th>
                          <th scope="col" className="py-1 text-right font-medium">Now</th>
                        </tr>
                      </thead>
                      <tbody>
                        {e.changes.map((c) => (
                          <tr key={c.item} className="border-t border-rule">
                            <td className="py-1 pr-3 text-ink">{c.item}</td>
                            <td className="whitespace-nowrap py-1 pr-3 text-right tabular-nums text-muted">{c.from}</td>
                            <td className="whitespace-nowrap py-1 text-right tabular-nums text-ink">{c.to}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
              {e.source && (
                <p className="mt-2 text-caption">
                  <a
                    href={e.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Publisher&apos;s page
                  </a>
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
