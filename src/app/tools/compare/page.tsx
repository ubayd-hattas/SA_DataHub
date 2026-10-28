import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { Column, PageHeader, Section, linkClass } from '@/components/editorial/Section'
import { SourceLine } from '@/components/editorial/SourceLine'
import { getAllMunicipalities } from '@/data/mock'
import { CENSUS_SOURCE } from '@/lib/municipality-profile'
import { COMPARE_INDICATORS, COMPARE_PATH, MAX_PLACES, compareCell, compareHref, parsePlaces, placeNames } from '@/lib/compare'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'
import { cn } from '@/lib/utils'

interface ComparePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const TITLE = 'Compare municipalities: Census 2011 and 2022'
const DESCRIPTION =
  'Put two or three South African municipalities side by side: population, households, dwellings, water, toilets and cooking fuel in Census 2011 and Census 2022.'

/** Every comparison shares one title and canonical URL; only the share image follows the places. */
export async function generateMetadata({ searchParams }: ComparePageProps): Promise<Metadata> {
  const places = parsePlaces(await searchParams)
  const meta = buildPageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: COMPARE_PATH,
    image: {
      url: `${COMPARE_PATH}/share-image${places.length ? `?places=${places.map((p) => p.id).join(',')}` : ''}`,
      alt: places.length ? `${placeNames(places)} compared, Census 2011 and 2022` : TITLE,
    },
  })
  if (!places.length) return meta
  const desc = `${placeNames(places)} compared: Census 2011 and Census 2022.`
  return { ...meta, openGraph: { ...meta.openGraph, description: desc }, twitter: { ...meta.twitter, description: desc } }
}

const control =
  'w-full rounded-md border border-rule bg-paper px-3 py-2 text-small text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

function PlacePicker({ chosen }: { chosen: string[] }) {
  const byProvince = new Map<string, { id: string; name: string }[]>()
  for (const m of [...getAllMunicipalities()].sort((a, b) => a.name.localeCompare(b.name))) {
    byProvince.set(m.provinceName, [...(byProvince.get(m.provinceName) ?? []), { id: m.id, name: m.name }])
  }
  const provinces = [...byProvince.keys()].sort()
  return (
    // Plain GET form: works without JavaScript; the page reads ?p= as well as ?places=.
    <form action={COMPARE_PATH} method="get" className="grid max-w-md grid-cols-1 gap-3">
      {Array.from({ length: MAX_PLACES }, (_, i) => (
        <label key={i} className="flex flex-col gap-1 text-caption text-muted">
          {i === 2 ? 'Third place (optional)' : i === 1 ? 'Second place' : 'First place'}
          <select name="p" defaultValue={chosen[i] ?? ''} className={control}>
            <option value="">Choose a municipality</option>
            {provinces.map((prov) => (
              <optgroup key={prov} label={prov}>
                {byProvince.get(prov)!.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.id})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      ))}
      <div>
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-small font-medium text-paper hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Compare
        </button>
      </div>
    </form>
  )
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const places = parsePlaces(await searchParams)
  const cols = places.length === 3 ? 'sm:grid-cols-3' : places.length === 2 ? 'sm:grid-cols-2' : ''
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Compare places', path: COMPARE_PATH },
  ]

  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        title="Compare places"
        lede="Choose two or three municipalities to see them side by side in Census 2011 and Census 2022."
      />

      <Section id="choose" title="Choose places">
        <PlacePicker chosen={places.map((p) => p.id)} />
        {places.length < 2 && (
          <p className="mt-4 text-small text-ink">
            For example,{' '}
            <Link href={compareHref(['CPT', 'WC024', 'JHB'])} className={linkClass}>
              City of Cape Town, Stellenbosch and City of Johannesburg
            </Link>
            .
          </p>
        )}
      </Section>

      {places.length >= 1 && (
        <Section id="results" title={places.length === 1 ? places[0].name : placeNames(places)}>
          {places.length === 1 && <p className="mb-6 text-body text-ink">Choose at least one more place to compare.</p>}
          <div className="space-y-8">
            {COMPARE_INDICATORS.map((ind) => (
              <div key={ind.id} className="border-t border-rule pt-4">
                <h3 className="text-small font-semibold text-ink">{ind.label}</h3>
                <dl className={cn('mt-3 grid grid-cols-1 gap-4', cols)}>
                  {places.map((m) => {
                    const c = compareCell(m, ind)
                    return (
                      <div key={m.id} className="min-w-0">
                        <dt className="text-caption text-muted">
                          <Link href={`/municipalities/${m.id}`} className={linkClass}>
                            {m.name}
                          </Link>
                        </dt>
                        <dd className="mt-1 font-display text-h3 font-semibold tabular-nums text-ink">{c.value2022}</dd>
                        <dd className="text-caption text-muted">
                          {c.value2011} in 2011. Change: {c.change}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-caption text-muted">
              2022 values are large; 2011 values and the change are underneath. Changes are SA Data Hub&apos;s calculation: a
              percentage change for counts, and the difference in percentage points (pts) for shares. Cooking shares are of
              households that named a cooking fuel.
            </p>
            <SourceLine
              publisher={CENSUS_SOURCE.publisher}
              title={CENSUS_SOURCE.title}
              code={CENSUS_SOURCE.code}
              location="person indicators and general housing information per municipality"
              releasedOn={CENSUS_SOURCE.releasedOn}
              checkedOn={CENSUS_SOURCE.checkedOn}
            />
            <p className="text-small">
              Link to this comparison:{' '}
              <Link href={compareHref(places.map((p) => p.id))} className={cn(linkClass, 'break-all')}>
                sadatahub.tech{compareHref(places.map((p) => p.id))}
              </Link>
            </p>
          </div>
        </Section>
      )}
    </Column>
  )
}
