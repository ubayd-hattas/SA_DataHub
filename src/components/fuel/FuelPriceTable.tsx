import { formatRandsPerLitre } from '@/lib/fuel'
import { latestPriceRows, productName } from '@/lib/fuel-page'

/** Every product in both zones for the latest month. Diesel and paraffin say "wholesale" in the row name. */
export function FuelPriceTable({ month }: { month: string }) {
  const cell = (cents: number | null) => (cents === null ? 'Not available' : formatRandsPerLitre(cents))
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-small">
        <caption className="sr-only">Official fuel prices in rands per litre, {month}, inland and coastal</caption>
        <thead>
          <tr className="border-b border-ink text-caption text-muted">
            <th scope="col" className="py-2 pr-3 font-medium">Product</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">Inland</th>
            <th scope="col" className="py-2 pl-2 text-right font-medium">Coastal</th>
          </tr>
        </thead>
        <tbody>
          {latestPriceRows().map((row) => (
            <tr key={row.product.id} className="border-t border-rule">
              <th scope="row" className="py-2 pr-3 font-normal text-ink">{productName(row.product.id)}</th>
              <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-ink">{cell(row.inland)}</td>
              <td className="whitespace-nowrap py-2 pl-2 text-right tabular-nums text-ink">{cell(row.coastal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
