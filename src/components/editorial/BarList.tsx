/**
 * Horizontal bars for a few shares or counts, drawn with HTML so they need no
 * script. One series, the accent colour, each bar labelled with its value in
 * text, so the numbers are readable without the bars. Pair it with
 * ChartFigure for the title and source.
 */
export interface Bar {
  label: string
  value: number
  /** The value as printed, e.g. "36.2%". */
  display: string
  /** Optional second line, e.g. the 2011 value. */
  note?: string
}

export function BarList({ bars, max }: { bars: Bar[]; max?: number }) {
  const top = max ?? Math.max(...bars.map((b) => b.value), 0)
  return (
    <ul className="space-y-3">
      {bars.map((b) => (
        <li key={b.label}>
          <div className="flex items-baseline justify-between gap-3 text-small">
            <span className="text-ink">{b.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-ink">{b.display}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-subtle" aria-hidden="true">
            <div
              className="h-2 rounded-full bg-accent"
              style={{ width: `${top > 0 ? Math.max(0, Math.min(100, (b.value / top) * 100)) : 0}%` }}
            />
          </div>
          {b.note && <p className="mt-1 text-caption text-muted">{b.note}</p>}
        </li>
      ))}
    </ul>
  )
}
