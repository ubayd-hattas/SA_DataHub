import Link from 'next/link'
import { linkClass } from '@/components/editorial/Section'
import { SourceLine } from '@/components/editorial/SourceLine'
import type { FuelProduct, FuelZone } from '@/lib/fuel'
import {
  BREAKDOWN_META,
  BREAKDOWN_NOTES,
  breakdownExclusions,
  breakdownFor,
  breakdownHistory,
  hasBreakdown,
  type BreakdownGroupId,
} from '@/lib/fuel-breakdown'
import { fuelHref, longMonthLabel, productName } from '@/lib/fuel-page'
import { monthLabel } from '@/lib/fuel'

/** One fill per group. Colour is never the only signal: every part is named with its amount. */
const GROUP_FILL: Record<BreakdownGroupId, string> = {
  import: 'bg-accent',
  taxes: 'bg-ink',
  margins: 'bg-muted',
  transport: 'bg-good',
}

const rands = (cents: number) => `R${(cents / 100).toFixed(2)}`
const percent = (share: number) => `${Math.round(share * 100)}%`

export function FuelBreakdown({ product, zone }: { product: FuelProduct; zone: FuelZone }) {
  if (!hasBreakdown(product, zone)) {
    return (
      <p className="max-w-prose text-body text-ink">
        The department publishes this breakdown only for petrol 95 and the two diesels, at the inland (Gauteng) price.
        It gives none for {productName(product).toLowerCase()}
        {zone === 'coastal' ? ' or for coastal prices' : ''}.{' '}
        <Link href={`${fuelHref({ product: 'petrol95', zone: 'inland' })}#breakdown`} className={linkClass}>
          See the breakdown for petrol 95, inland
        </Link>
        .
      </p>
    )
  }

  const current = breakdownFor(product)
  if (!current) {
    return <p className="max-w-prose text-body text-ink">No breakdown is held for {productName(product).toLowerCase()} yet.</p>
  }
  const history = breakdownHistory(product)
  const excluded = breakdownExclusions(product)
  const note = BREAKDOWN_NOTES[current.month]

  return (
    <div>
      <p className="max-w-prose text-body text-ink">
        {productName(product)} cost {rands(current.total)} a litre inland in {longMonthLabel(current.month)}.{' '}
        {current.groups
          .map((g) => `${g.label.toLowerCase()} ${rands(g.cents)} (${percent(g.share)})`)
          .join(', ')
          .replace(/^./, (c) => c.toUpperCase())}
        .
      </p>

      {/* The bar is decorative: the sentence above and the table below carry the same numbers. */}
      <div className="mt-6 flex h-6 w-full max-w-2xl overflow-hidden rounded-sm" aria-hidden="true">
        {current.groups.map((g) => (
          <div key={g.id} className={GROUP_FILL[g.id]} style={{ width: `${g.share * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 flex max-w-2xl flex-wrap gap-x-6 gap-y-1 text-small text-ink">
        {current.groups.map((g) => (
          <li key={g.id} className="flex items-center gap-2">
            <span className={`inline-block h-3 w-3 rounded-sm ${GROUP_FILL[g.id]}`} aria-hidden="true" />
            {g.label} {percent(g.share)}
          </li>
        ))}
      </ul>

      <table className="mt-8 w-full max-w-2xl text-left text-small">
        <caption className="mb-2 text-left text-small font-medium text-ink">
          Every part of a litre of {productName(product).toLowerCase()}, inland, {longMonthLabel(current.month)}
        </caption>
        <thead>
          <tr className="border-b border-ink">
            <th scope="col" className="py-2 pr-4 font-medium">Part</th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">Cents per litre</th>
          </tr>
        </thead>
        <tbody>
          {current.groups.map((g) => (
            <GroupRows key={g.id} label={g.label} detail={g.detail} cents={g.cents} items={current.elements.filter((e) => e.group === g.id)} />
          ))}
          <tr className="border-t border-ink font-semibold">
            <th scope="row" className="py-2 pr-4">Total</th>
            <td className="py-2 pr-4 text-right tabular-nums">{current.total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      {product === 'petrol95' && (
        <p className="mt-2 max-w-prose text-caption text-muted">
          The pump price is rounded to whole cents, so the parts can add up to a fraction of a cent more or less.
        </p>
      )}

      {note && (
        <p className="mt-6 max-w-prose text-small text-ink">
          <strong className="font-semibold">Temporary levy cut: </strong>
          {note.text}{' '}
          <a href={note.url} className={linkClass}>
            Source: {note.source}
          </a>
          .
        </p>
      )}

      <h3 className="mt-10 font-display text-h3 font-semibold text-ink">How the parts have changed</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[32rem] max-w-3xl text-left text-small">
          <caption className="sr-only">
            {productName(product)}, inland, each part in cents per litre by month
          </caption>
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="py-2 pr-4 font-medium">Month</th>
              {current.groups.map((g) => (
                <th key={g.id} scope="col" className="py-2 pr-4 text-right font-medium">{g.label}</th>
              ))}
              <th scope="col" className="py-2 pr-4 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map((b) => (
              <tr key={b.month} className="border-b border-rule">
                <th scope="row" className="py-2 pr-4 font-normal">{monthLabel(b.month)}</th>
                {b.groups.map((g) => (
                  <td key={g.id} className="py-2 pr-4 text-right tabular-nums">{g.cents.toFixed(2)}</td>
                ))}
                <td className="py-2 pr-4 text-right tabular-nums">{b.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {excluded.length > 0 && (
        <ul className="mt-3 max-w-prose list-disc space-y-1 pl-5 text-small text-muted">
          {excluded.map((e) => (
            <li key={e.month}>
              {monthLabel(e.month)} is left out. {e.reason}
            </li>
          ))}
        </ul>
      )}

      <SourceLine
        publisher="Department of Mineral and Petroleum Resources"
        title={BREAKDOWN_META.document}
        releasedOn={BREAKDOWN_META.released_on}
        checkedOn={BREAKDOWN_META.checked_on}
        className="mt-8"
      />
      <p className="mt-2 max-w-prose text-caption text-muted">{BREAKDOWN_META.dmpr_label}</p>
    </div>
  )
}

function GroupRows({
  label,
  detail,
  cents,
  items,
}: {
  label: string
  detail: string
  cents: number
  items: { id: string; label: string; cents: number }[]
}) {
  return (
    <>
      <tr className="border-t border-rule">
        <th scope="row" className="pt-3 pr-4 font-semibold">
          {label}
          <span className="block text-caption font-normal text-muted">{detail}</span>
        </th>
        <td className="pt-3 pr-4 text-right align-top font-semibold tabular-nums">{cents.toFixed(2)}</td>
      </tr>
      {items
        .filter((e) => e.cents !== 0)
        .map((e) => (
          <tr key={e.id}>
            <th scope="row" className="py-1 pl-4 pr-4 font-normal text-muted">{e.label}</th>
            <td className="py-1 pr-4 text-right tabular-nums text-muted">{e.cents.toFixed(2)}</td>
          </tr>
        ))}
    </>
  )
}
