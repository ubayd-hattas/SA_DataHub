import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { FuelCalculator } from '@/components/fuel/FuelCalculator'
import { FuelChart } from '@/components/fuel/FuelChart'
import { FuelPriceTable } from '@/components/fuel/FuelPriceTable'
import { FuelSelector } from '@/components/fuel/FuelSelector'
import { NumberBlock } from '@/components/editorial/NumberBlock'
import { Column, PageHeader, Section, linkClass } from '@/components/editorial/Section'
import { SourceLine } from '@/components/editorial/SourceLine'
import { formatLongDate } from '@/lib/explainers'
import { calculateFuelCost, parseShareQuery } from '@/lib/fuel-calc'
import { costSentence, litresFromParams } from '@/lib/fuel-calc-text'
import { FUEL_PRODUCTS, FUEL_PUBLISHER, FUEL_ZONES, fuelSeriesId, latestAdjustment } from '@/lib/fuel'
import {
  FUEL_PATH,
  fuelHeadline,
  fuelPageTitle,
  longMonthLabel,
  productInfo,
  parseFuelSelection,
  zoneLabel,
  productName,
} from '@/lib/fuel-page'
import { FUEL_HISTORY_PATH } from '@/lib/fuel-history'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'
import { seriesCsvHref, seriesHref } from '@/lib/series'

const DESCRIPTION =
  'The official monthly petrol price, and the wholesale diesel and paraffin prices, for inland and coastal South Africa, from the Department of Mineral and Petroleum Resources. Every price with its source and a CSV download.'

interface FuelPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Every variant has the same title and canonical URL. Only a link that
 * carries calculator litres gets the calculator's share image and sentence.
 */
export async function generateMetadata({ searchParams }: Partial<FuelPageProps> = {}): Promise<Metadata> {
  const meta = buildPageMetadata({ title: fuelPageTitle(), description: DESCRIPTION, path: FUEL_PATH })
  const params = (await searchParams) ?? {}
  const litres = Array.isArray(params.litres) ? params.litres[0] : params.litres
  if (litres === undefined) return meta
  const { product, zone } = parseFuelSelection(params)
  const query = parseShareQuery({ litres, product: productInfo(product).slug, zone })
  const result = query.ok ? calculateFuelCost(query) : null
  if (!result?.ok) return meta
  const sentence = costSentence(result)
  const image = new URLSearchParams({ litres: String(result.litres), product: productInfo(product).slug, zone })
  const withImage = buildPageMetadata({
    title: fuelPageTitle(),
    description: DESCRIPTION,
    path: FUEL_PATH,
    image: { url: `${FUEL_PATH}/share-image?${image}`, alt: sentence },
  })
  return {
    ...withImage,
    openGraph: { ...withImage.openGraph, description: sentence },
    twitter: { ...withImage.twitter, description: sentence },
  }
}

export default async function FuelPage({ searchParams }: FuelPageProps) {
  const params = await searchParams
  const selection = parseFuelSelection(params)
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

      <section aria-labelledby="calculator" className="border-t border-rule py-10">
        <h2 id="calculator" className="mb-2 font-display text-[1.5rem] font-semibold leading-snug text-ink sm:text-h2">
          What would a tank cost?
        </h2>
        <p className="mb-6 max-w-prose text-body text-ink">
          Litres times the official price per litre for {longMonthLabel(latest.month)}, with the working shown.
        </p>
        <FuelCalculator
          initialLitres={litresFromParams(params)}
          initialProduct={selection.product}
          initialZone={selection.zone}
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
        <p className="mb-4 text-body text-ink">
          <Link href={FUEL_HISTORY_PATH} className={linkClass}>See every monthly adjustment in one table</Link>, with
          the change in cents and the source document for each month.
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
          February 2026 was typed in from the department&apos;s PDFs, with paraffin from its History of Fuel
          Prices table. March and April 2026 have no monthly file online, so those prices were typed in from
          that table.
        </p>
        <p className="mt-3 max-w-prose text-small text-muted">
          Where no file SA Data Hub holds gives a price, that month is left out and the line joins the months either
          side.
        </p>
      </section>
    </Column>
  )
}
