import type { Metadata } from 'next'
import Link from 'next/link'
import { Column, PageHeader, Section, linkClass } from '@/components/editorial/Section'
import { FUEL_PRODUCTS, monthLabel } from '@/lib/fuel'
import { FUEL_PATH, productName } from '@/lib/fuel-page'
import { formatLongDate } from '@/lib/explainers'
import {
  KNOWN_CHANGES,
  UNCONFIRMED_CHANGES,
  describeRange,
  fuelEstimate,
  largestSlateMove,
  FUEL_NEXT_MONTH_PATH,
} from '@/lib/fuel-estimate'
import { buildPageMetadata } from '@/lib/seo'

/**
 * Not indexed and not linked from the site while the Central Energy Fund's
 * reuse terms are unknown (docs/fuel.md, decision D3).
 */
export const metadata: Metadata = buildPageMetadata({
  title: 'Expected change in next month’s fuel prices',
  description: 'An estimate, as a range, of next month’s official fuel price change, with how it is worked out.',
  path: FUEL_NEXT_MONTH_PATH,
  noIndex: true,
})

export default function FuelNextMonthPage() {
  const estimate = fuelEstimate()
  const slate = largestSlateMove()

  return (
    <Column className="pb-16">
      <PageHeader
        kicker="Fuel prices"
        title="Expected change in next month’s fuel prices"
        lede="An estimate, not the official price. The official price is set by the Department of Mineral and Petroleum Resources and shown on the fuel page."
      />

      <section aria-labelledby="estimate" className="border-t border-rule py-10">
        <h2 id="estimate" className="sr-only">The estimate</h2>
        {estimate.status === 'none' && (
          <p className="max-w-prose text-body text-ink">
            No estimate is published yet. {estimate.reason}
          </p>
        )}
        {estimate.status === 'too-early' && (
          <p className="max-w-prose text-body text-ink">
            No estimate yet for {monthLabel(estimate.targetMonth)}. SA Data Hub does not estimate in the first five
            working days of a price period, and there are {estimate.workingDays} so far.
          </p>
        )}
        {estimate.status === 'ok' && (
          <>
            <ul className="space-y-3">
              {FUEL_PRODUCTS.filter((p) => estimate.products[p.id]).map((p) => (
                <li key={p.id} className="text-body text-ink">
                  <strong className="font-semibold">{productName(p.id)}, inland:</strong> estimate {describeRange(estimate.products[p.id]!)}
                  {' '}a litre in {monthLabel(estimate.targetMonth)}.
                </li>
              ))}
            </ul>
            <p className="mt-4 text-small text-muted">
              Estimate based on figures up to {formatLongDate(estimate.asOf)} ({estimate.workingDays} working days).
            </p>
          </>
        )}
      </section>

      <Section id="method" title="How the estimate is worked out">
        <ol className="max-w-prose list-decimal space-y-3 pl-5 text-body text-ink">
          <li>
            Each working day the Central Energy Fund publishes how far the import cost of fuel has run above or below the
            cost built into the current price, averaged over the month so far. If that gap holds to the end of the
            month, the price moves by about that much.
          </li>
          <li>Changes that an official document has already announced, such as a levy cut ending, are added.</li>
          <li>
            The range comes from how far this figure has been from the final import cost in past months, at the same
            point in the month. No estimate is shown in the first five working days.
          </li>
        </ol>
        <h3 className="mt-8 font-display text-h3 font-semibold text-ink">What it leaves out</h3>
        <p className="mt-2 max-w-prose text-body text-ink">
          The slate levy, which pays back months when the price was set too low, is set each month and not announced
          ahead.
          {slate && slate.cents > 0
            ? ` In the department’s breakdown tables it moved by up to ${slate.cents.toFixed(2)} cents a litre from one month to the next (${monthLabel(slate.month)}).`
            : ''}{' '}
          Margins and tax changes not yet announced are left out too.
        </p>
        {KNOWN_CHANGES.length > 0 && (
          <>
            <h3 className="mt-8 font-display text-h3 font-semibold text-ink">Changes already announced</h3>
            <ul className="mt-2 max-w-prose list-disc space-y-2 pl-5 text-body text-ink">
              {KNOWN_CHANGES.map((c) => (
                <li key={`${c.month}-${c.source}`}>
                  {monthLabel(c.month)}: {c.what}{' '}
                  <a href={c.url} className={linkClass}>
                    Source: {c.source}
                  </a>
                  .
                </li>
              ))}
            </ul>
            <p className="mt-3 max-w-prose text-small text-muted">Not included: {UNCONFIRMED_CHANGES}</p>
          </>
        )}
      </Section>

      <p className="border-t border-rule pt-8 text-small text-muted">
        <Link href={FUEL_PATH} className={linkClass}>
          This month’s official prices
        </Link>
      </p>
    </Column>
  )
}
