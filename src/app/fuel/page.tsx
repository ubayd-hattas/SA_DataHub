import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { FuelChart } from '@/components/fuel/FuelChart'
import { FuelPriceTable } from '@/components/fuel/FuelPriceTable'
import { FuelSelector } from '@/components/fuel/FuelSelector'
import { NumberBlock } from '@/components/editorial/NumberBlock'
import { Column, PageHeader, Section, linkClass } from '@/components/editorial/Section'
import { SourceLine } from '@/components/editorial/SourceLine'
import { formatLongDate } from '@/lib/explainers'
import { FUEL_PRODUCTS, FUEL_PUBLISHER, FUEL_ZONES, fuelSeriesId, latestAdjustment } from '@/lib/fuel'
import {
  FUEL_PATH,
  fuelHeadline,
  fuelPageTitle,
  parseFuelSelection,
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

interface FuelPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function FuelPage({ searchParams }: FuelPageProps) {
  const selection = parseFuelSelection(await searchParams)
  const latest = latestAdjustment()
  const head = fuelHeadline(selection.product, selection.zone)
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Fuel prices', path: FUEL_PATH },
  ]

  return (
    <Column className="pb-16">
      <JsonLd data={[breadcrumbSchema(breadcrumbs)]} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader kicker="Fuel prices" title={fuelPageTitle()} />

      <div className="border-t border-rule py-8">
        <FuelSelector selection={selection} />
      </div>

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

      <section aria-labelledby="chart" className="border-t border-rule py-10">
        <h2 id="chart" className="sr-only">Price history</h2>
        <FuelChart
          stat={head.stat}
          source={
            <SourceLine
              publisher={FUEL_PUBLISHER.name}
              title={latest.source.document}
              releasedOn={latest.releasedOn ?? latest.effectiveFrom}
              checkedOn={head.stat.checkedOn ?? latest.effectiveFrom}
            />
          }
        />
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
        <p className="max-w-prose text-body text-ink">
          The latest prices are from {FUEL_PUBLISHER.name} ({FUEL_PUBLISHER.shortName}), {latest.source.document}. They
          took effect on {formatLongDate(latest.effectiveFrom)}. Earlier months come from the department&apos;s files
          for each month. A script read the prices from those files and they were checked against them by hand.
          March and April 2026 have no monthly file online, so those prices were typed in from the
          department&apos;s History of Fuel Prices table.
        </p>
        <p className="mt-3 max-w-prose text-small text-muted">
          Where no file SA Data Hub holds gives a price, that month is left out and the line joins the months either
          side.
        </p>
      </section>
    </Column>
  )
}
