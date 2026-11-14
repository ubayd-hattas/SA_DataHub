import { describeChange, formatRandsPerLitre, FUEL_PRODUCTS, FUEL_ZONES } from '@/lib/fuel'
import { longMonthLabel, productName } from '@/lib/fuel-page'
import { fuelHistoryRows, type FuelHistoryCell } from '@/lib/fuel-history'
import { formatLongDate } from '@/lib/explainers'

function Cell({ cell }: { cell: FuelHistoryCell }) {
  if (cell.cents === null) {
    return <td className="px-3 py-2 text-right text-muted">Not available</td>
  }
  return (
    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink">
      {formatRandsPerLitre(cell.cents)}
      <span className="block text-caption text-muted">
        {cell.changeCents === null ? 'change not available' : describeChange(cell.changeCents)}
      </span>
    </td>
  )
}

/** Every monthly adjustment, newest first, both zones as column groups. Scrolls sideways inside its own container. */
export function FuelHistoryTable() {
  return (
    <div className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" tabIndex={0} role="region" aria-label="Fuel price history table, scrolls sideways">
      <table className="w-full text-left text-small">
        <caption className="sr-only">
          Official fuel prices in rands per litre for every monthly adjustment, newest first, with the change in cents
          from the month before. Diesel and paraffin are wholesale prices.
        </caption>
        <thead>
          <tr className="text-caption text-muted">
            <th scope="col" rowSpan={2} className="py-2 pr-3 align-bottom font-medium">Month</th>
            <th scope="col" rowSpan={2} className="px-3 py-2 align-bottom font-medium">Took effect</th>
            {FUEL_ZONES.map((z) => (
              <th key={z.id} scope="colgroup" colSpan={FUEL_PRODUCTS.length} className="border-l border-rule px-3 py-2 font-medium text-ink">
                {z.label}
              </th>
            ))}
            <th scope="col" rowSpan={2} className="border-l border-rule px-3 py-2 align-bottom font-medium">Source</th>
          </tr>
          <tr className="border-b border-ink text-caption text-muted">
            {FUEL_ZONES.flatMap((z) =>
              FUEL_PRODUCTS.map((p, i) => (
                <th
                  key={`${z.id}-${p.id}`}
                  scope="col"
                  className={`px-3 py-2 text-right font-medium${i === 0 ? ' border-l border-rule' : ''}`}
                >
                  {productName(p.id)}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {fuelHistoryRows().map((row) => (
            <tr key={row.month} className="border-t border-rule align-top">
              <th scope="row" className="whitespace-nowrap py-2 pr-3 font-normal text-ink">{longMonthLabel(row.month)}</th>
              <td className="whitespace-nowrap px-3 py-2 text-ink">
                <time dateTime={row.effectiveFrom}>{formatLongDate(row.effectiveFrom)}</time>
              </td>
              {FUEL_ZONES.flatMap((z) =>
                FUEL_PRODUCTS.map((p) => <Cell key={`${z.id}-${p.id}`} cell={row.cells[p.id][z.id]} />)
              )}
              <td className="whitespace-nowrap border-l border-rule px-3 py-2 text-ink">
                {/* Short visible text keeps rows one line high; the full document name is in the link's accessible name. */}
                <a
                  href={row.source.url}
                  title={row.source.document}
                  className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  DMPR file<span className="sr-only">: {row.source.document}</span>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
