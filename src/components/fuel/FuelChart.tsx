import type { ReactNode } from 'react'
import { ChartFigure } from '@/components/editorial/ChartFigure'
import { NARROW, WIDE, seriesSvg } from '@/lib/embed-chart'
import { formatSeriesValue } from '@/lib/format'
import { seriesDocument } from '@/lib/series'
import { chartTakeaway } from '@/lib/stat-summary'
import type { Statistic } from '@/types'

/**
 * Colours for the classes seriesSvg writes, taken from the site tokens so the
 * chart follows the light and dark themes. The SVG is a string built from
 * numbers and escaped labels in src/lib/embed-chart.ts, so it needs no script
 * and no chart library.
 */
const SVG_STYLE = [
  '[&_svg]:block [&_svg]:h-auto [&_svg]:w-full [&_svg]:overflow-visible',
  '[&_.grid]:stroke-[var(--rule)]',
  '[&_.axis]:fill-[var(--muted)] [&_.axis]:text-[11px]',
  '[&_.line]:fill-none [&_.line]:stroke-[var(--accent)] [&_.line]:stroke-2',
  '[&_.dot]:fill-[var(--accent)] [&_.dot]:stroke-[var(--paper)] [&_.dot]:stroke-2',
  '[&_.hit]:fill-transparent',
  '[&_.label]:fill-[var(--ink)] [&_.label]:text-[12px] [&_.label]:font-semibold',
].join(' ')

/**
 * One fuel series as a server-rendered SVG line chart, with its numbers in a
 * table under a toggle. A wide drawing for tablets and up and a narrow one for
 * phones, so the text stays readable at 375 px. Months with no price are not
 * in the series, so the line joins the months either side of them.
 */
export function FuelChart({ stat, source }: { stat: Statistic; source: ReactNode }) {
  const doc = seriesDocument(stat)
  const title = chartTakeaway(stat) ?? stat.title
  return (
    <ChartFigure
      title={title}
      notes={<p>{stat.description}</p>}
      source={
        <>
          {source}
          <details className="mt-3 text-small">
            <summary className="cursor-pointer text-accent underline decoration-accent/40 underline-offset-4">
              Show the numbers as a table
            </summary>
            <table className="mt-2 w-full max-w-sm text-left text-caption">
              <caption className="sr-only">{stat.title}, every month on SA Data Hub, rands per litre</caption>
              <thead>
                <tr className="border-b border-ink">
                  <th scope="col" className="py-1.5 pr-3 font-semibold">Month</th>
                  <th scope="col" className="py-1.5 text-right font-semibold">Price per litre</th>
                </tr>
              </thead>
              <tbody>
                {[...doc.points].reverse().map((p) => (
                  <tr key={p.period} className="border-b border-rule">
                    <th scope="row" className="py-1.5 pr-3 font-normal">{p.period}</th>
                    <td className="py-1.5 text-right tabular-nums">{formatSeriesValue(p.value, doc.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      }
    >
      <div className={SVG_STYLE}>
        <div className="hidden sm:block" dangerouslySetInnerHTML={{ __html: seriesSvg(doc, WIDE) }} />
        <div className="sm:hidden" dangerouslySetInnerHTML={{ __html: seriesSvg(doc, NARROW) }} />
      </div>
    </ChartFigure>
  )
}
