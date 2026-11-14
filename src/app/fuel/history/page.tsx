import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { FuelHistoryTable } from '@/components/fuel/FuelHistoryTable'
import { Column, PageHeader, Section, linkClass } from '@/components/editorial/Section'
import { formatLongDate } from '@/lib/explainers'
import { FUEL_PUBLISHER, fuelAdjustments, latestAdjustment } from '@/lib/fuel'
import { FUEL_PATH, longMonthLabel } from '@/lib/fuel-page'
import { FUEL_HISTORY_CSV_PATH, FUEL_HISTORY_PATH } from '@/lib/fuel-history'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

const TITLE = 'Fuel price history in South Africa, every monthly adjustment'
const DESCRIPTION =
  'Every monthly petrol price, and the wholesale diesel and paraffin prices, for inland and coastal South Africa since January 2022, with the change in cents and the Department of Mineral and Petroleum Resources document for each month.'

export function generateMetadata(): Metadata {
  return buildPageMetadata({ title: TITLE, description: DESCRIPTION, path: FUEL_HISTORY_PATH })
}

export default function FuelHistoryPage() {
  const first = fuelAdjustments()[0]
  const latest = latestAdjustment()
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Fuel prices', path: FUEL_PATH },
    { name: 'History', path: FUEL_HISTORY_PATH },
  ]

  return (
    <Column wide className="pb-16">
      <JsonLd data={[breadcrumbSchema(breadcrumbs)]} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        kicker="Fuel prices"
        title="Fuel price history"
        lede={`Every monthly adjustment from ${longMonthLabel(first.month)} to ${longMonthLabel(latest.month)}, newest first. Prices are in rands per litre. Under each price is the change from the month before.`}
      />

      <Section id="table" title="Every monthly adjustment">
        <FuelHistoryTable />
        <p className="mt-4 max-w-prose text-small text-muted">
          Diesel and paraffin prices are wholesale prices. Filling stations set their own pump prices for them. Where
          a price says &quot;Not available&quot;, no file SA Data Hub holds gives it, and the change for that month and
          the next is not worked out. The first month has no month before it.
        </p>
        <p className="mt-3 text-small">
          <Link href={FUEL_PATH} className={linkClass}>Back to the current prices</Link>
        </p>
      </Section>

      <Section id="downloads" title="Downloads">
        <p className="max-w-prose text-body text-ink">
          <a href={FUEL_HISTORY_CSV_PATH} className={linkClass}>Download this table as a CSV</a>. It has one line for
          each month, product and zone, with the price and the change in cents per litre, the department&apos;s own
          unit, and the document and web address each month comes from. A missing price is an empty field, not zero.
        </p>
        <p className="mt-3 max-w-prose text-body text-ink">
          Each product and zone also has its own CSV in rands per litre, listed under{' '}
          <Link href={`${FUEL_PATH}#series`} className={linkClass}>Every month, and the downloads</Link> on the fuel
          prices page.
        </p>
      </Section>

      <section aria-labelledby="source" className="border-t border-rule py-10">
        <h2 id="source" className="mb-5 font-display text-[1.5rem] font-semibold leading-snug text-ink sm:text-h2">
          Where these prices come from
        </h2>
        <p className="max-w-prose text-body text-ink">
          The latest prices are from {FUEL_PUBLISHER.name} ({FUEL_PUBLISHER.shortName}), {latest.source.document}. They
          took effect on {formatLongDate(latest.effectiveFrom)}. Earlier months come from the department&apos;s files
          for each month, and each row above links to its file. A script read the prices from those files and they
          were checked against them by hand. February 2026 was typed in from the department&apos;s PDFs, with paraffin from its History of Fuel
          Prices table. March and April 2026 have no monthly file online, so those prices were typed in from
          that table.
        </p>
      </section>
    </Column>
  )
}
