import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { FuelPriceTable } from '@/components/fuel/FuelPriceTable'
import { NumberBlock } from '@/components/editorial/NumberBlock'
import { Column, PageHeader, Section, linkClass } from '@/components/editorial/Section'
import { SourceLine } from '@/components/editorial/SourceLine'
import { formatLongDate } from '@/lib/explainers'
import { FUEL_PRODUCTS, FUEL_PUBLISHER, FUEL_ZONES, fuelSeriesId, latestAdjustment } from '@/lib/fuel'
import {
  DEFAULT_PRODUCT,
  DEFAULT_ZONE,
  FUEL_PATH,
  fuelHeadline,
  fuelPageTitle,
  zoneLabel,
  productName,
} from '@/lib/fuel-page'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'
import { seriesCsvHref, seriesHref } from '@/lib/series'

const DESCRIPTION =
  'The official monthly petrol price, and the wholesale diesel and paraffin prices, for inland and coastal South Africa, from the Department of Mineral and Petroleum Resources. Every price with its source and a CSV download.'

export function generateMetadata(): Metadata {
  return buildPageMetadata({ title: fuelPageTitle(), description: DESCRIPTION, path: FUEL_PATH })
}

export default function FuelPage() {
  const latest = latestAdjustment()
  const head = fuelHeadline(DEFAULT_PRODUCT, DEFAULT_ZONE)
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Fuel prices', path: FUEL_PATH },
  ]

  return (
    <Column className="pb-16">
      <JsonLd data={[breadcrumbSchema(breadcrumbs)]} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader kicker="Fuel prices" title={fuelPageTitle()} />

      <section aria-labelledby="headline" className="border-t border-rule py-10">
        <h2 id="headline" className="sr-only">
          {head.product.label}, {zoneLabel(head.zone).toLowerCase()}
        </h2>
        <NumberBlock
          label={`${productName(head.product.id)} price per litre, ${zoneLabel(head.zone).toLowerCase()}`}
          value={head.price}
          meaning={
            <>
              Took effect on <time dateTime={head.effectiveFrom} className="whitespace-nowrap">{formatLongDate(head.effectiveFrom)}</time>.{' '}
              {head.change}
            </>
          }
          source={<p className="max-w-prose text-body text-ink">{head.stat.description}</p>}
        />
        {head.stat.note && (
          <p className="mt-4 max-w-prose text-small text-muted">
            <strong className="font-semibold text-ink">Note: </strong>
            {head.stat.note}
          </p>
        )}
      </section>

      <Section id="all-products" title={`Every product, ${head.month}`}>
        <FuelPriceTable month={head.month} />
        <p className="mt-4 max-w-prose text-small text-muted">
          Diesel and paraffin prices are wholesale prices. Filling stations set their own pump prices for them.
        </p>
      </Section>

      <Section id="series" title="Every month, and the downloads">
        <p className="mb-4 text-body text-ink">
          Each product and zone has its own page with every monthly price since January 2022, and downloads.
        </p>
        <ul className="space-y-2 text-body">
          {FUEL_PRODUCTS.flatMap((p) =>
            FUEL_ZONES.map((z) => {
              const id = fuelSeriesId(p.id, z.id)
              return (
                <li key={id}>
                  <Link href={seriesHref(id)} className={linkClass}>
                    {productName(p.id)}, {z.label.toLowerCase()}
                  </Link>{' '}
                  <a href={seriesCsvHref(id)} className="text-small text-muted underline underline-offset-4">
                    CSV<span className="sr-only"> for {productName(p.id)}, {z.label.toLowerCase()}</span>
                  </a>
                </li>
              )
            })
          )}
        </ul>
      </Section>

      <section aria-labelledby="source" className="border-t border-rule py-10">
        <h2 id="source" className="mb-5 font-display text-[1.5rem] font-semibold leading-snug text-ink sm:text-h2">
          Where these prices come from
        </h2>
        <SourceLine
          publisher={FUEL_PUBLISHER.name}
          title={latest.source.document}
          releasedOn={latest.releasedOn ?? latest.effectiveFrom}
          checkedOn={head.stat.checkedOn ?? latest.effectiveFrom}
        />
        <p className="mt-3 max-w-prose text-small text-muted">
          The price took effect on {formatLongDate(latest.effectiveFrom)}. Prices were read from the department&apos;s
          files by a script and checked by hand against them.
        </p>
      </section>
    </Column>
  )
}
