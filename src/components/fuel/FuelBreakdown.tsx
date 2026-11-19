import Link from 'next/link'
import { BarList } from '@/components/editorial/BarList'
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
} from '@/lib/fuel-breakdown'
import { fuelHref, longMonthLabel, productName } from '@/lib/fuel-page'
import { formatRandsPerLitre, monthLabel } from '@/lib/fuel'
import { formatDecimal, formatPercent } from '@/lib/format'
import { BREAKDOWN_PRODUCTS } from '@/lib/fuel-breakdown'

const cents = (value: number) => formatDecimal(value, 2)
const share = (value: number) => formatPercent(value * 100, 1)

export function FuelBreakdown({ product, zone, litres }: { product: FuelProduct; zone: FuelZone; litres?: number }) {
  if (!hasBreakdown(product, zone)) {
    const covered = BREAKDOWN_PRODUCTS.includes(product)
    const target: FuelProduct = covered ? product : 'petrol95'
    return (
      <p className="max-w-prose text-body text-ink">
        The department publishes this breakdown only for petrol 95 and the two diesels, at the inland (Gauteng) price.
        {covered ? ' It gives none for coastal prices.' : ` It gives none for ${productName(product).toLowerCase()}.`}{' '}
        <Link href={`${fuelHref({ product: target, zone: 'inland' }, litres)}#breakdown`} className={linkClass}>
          See the breakdown for {productName(target).toLowerCase()}, inland
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
        {productName(product)} cost {formatRandsPerLitre(current.total)} a litre inland in {longMonthLabel(current.month)}.{' '}
        {current.groups
          .map((g) => `${g.label.toLowerCase()} ${formatRandsPerLitre(g.cents)} (${share(g.share)})`)
          .join(', ')
          .replace(/^./, (c) => c.toUpperCase())}
        .
      </p>

      {/* One bar per part, each named with its amount, so no colour has to be matched to a legend. */}
      <div className="mt-6 max-w-2xl">
        <BarList
          max={1}
          bars={current.groups.map((g) => ({ label: g.label, value: g.share, display: `${formatRandsPerLitre(g.cents)}, ${share(g.share)}` }))}
        />
      </div>

      <table className="mt-8 w-full max-w-2xl text-left text-small">
        <caption className="mb-2 text-left text-small font-medium text-ink">
          Every part of a litre of {productName(product).toLowerCase()}, inland, {longMonthLabel(current.month)}
        </caption>
        <thead>
          <tr className="border-b border-ink">
            <th scope="col" className="py-2 pr-4 font-medium">Part</th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">Cents a litre</th>
          </tr>
        </thead>
        <tbody>
          {current.groups.map((g) => (
            <GroupRows key={g.id} label={g.label} detail={g.detail} amount={g.cents} items={current.elements.filter((e) => e.group === g.id)} />
          ))}
          <tr className="border-t border-ink font-semibold">
            <th scope="row" className="py-2 pr-4">Total</th>
            <td className="py-2 pr-4 text-right tabular-nums">{cents(current.total)}</td>
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
          <strong className="font-semibold">{monthLabel(current.month)}: </strong>
          {note.text}{' '}
          <a href={note.url} className={linkClass}>
            Source: {note.source}
          </a>
          .
        </p>
      )}

      <h3 className="mt-10 font-display text-h3 font-semibold text-ink">How the parts have changed</h3>
      <div
        className="mt-3 overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        role="region"
        aria-label={`${productName(product)}, each part by month (scrolls sideways)`}
        tabIndex={0}
      >
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
                  <td key={g.id} className="py-2 pr-4 text-right tabular-nums">{cents(g.cents)}</td>
                ))}
                <td className="py-2 pr-4 text-right tabular-nums">{cents(b.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {levyMonths(history).length > 0 && (
        <p className="mt-3 max-w-prose text-small text-muted">
          The general fuel levy in these tables changed in {levyMonths(history).map(monthLabel).join(', ')}, which is
          why taxes and levies move between those months.{notedMonths(history)}
        </p>
      )}
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

/** Months in which the general fuel levy differs from the month before. */
function levyMonths(history: ReturnType<typeof breakdownHistory>): string[] {
  const levy = (b: (typeof history)[number]) => b.elements.find((e) => e.id === 'fuelLevy')?.cents
  return history.filter((b, i) => i > 0 && levy(b) !== levy(history[i - 1])).map((b) => b.month)
}

/** A pointer to the months that have a sourced note. */
function notedMonths(history: ReturnType<typeof breakdownHistory>): string {
  const noted = history.filter((b) => BREAKDOWN_NOTES[b.month]).map((b) => monthLabel(b.month))
  return noted.length ? ` The reason is given, with its source, for ${noted.join(' and ')}.` : ''
}

function GroupRows({
  label,
  detail,
  amount,
  items,
}: {
  label: string
  detail: string
  amount: number
  items: { id: string; label: string; cents: number }[]
}) {
  return (
    <>
      <tr className="border-t border-rule">
        <th scope="row" className="pt-3 pr-4 font-semibold">
          {label}
          <span className="block text-caption font-normal text-muted">{detail}</span>
        </th>
        <td className="pt-3 pr-4 text-right align-top font-semibold tabular-nums">{formatDecimal(amount, 2)}</td>
      </tr>
      {items
        .filter((e) => e.cents !== 0)
        .map((e) => (
          <tr key={e.id}>
            <th scope="row" className="py-1 pl-4 pr-4 font-normal text-muted">{e.label}</th>
            <td className="py-1 pr-4 text-right tabular-nums text-muted">{formatDecimal(e.cents, 2)}</td>
          </tr>
        ))}
    </>
  )
}
