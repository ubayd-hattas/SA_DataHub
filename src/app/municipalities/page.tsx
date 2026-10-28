import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllMunicipalities } from '@/data/mock'
import MunicipalityExplorer, { type ExplorerRow } from './MunicipalityExplorer'
import { buildPageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/schema'
import { provinceCodeToSlug, provinceLabels } from '@/lib/utils'
import type { ProvinceCode } from '@/types'
import { Column, PageHeader, Section, linkClass } from '@/components/editorial/Section'
import { SourceLine } from '@/components/editorial/SourceLine'
import { CENSUS_SOURCE } from '@/lib/municipality-profile'
import { formatCount } from '@/lib/format'

export const metadata: Metadata = buildPageMetadata({
  title: 'Municipality Explorer',
  description:
    'Browse and search all 213 South African municipalities. Population, households, and key Census 2022 indicators by province.',
  path: '/municipalities',
})

const PROVINCE_LINKS = (Object.entries(provinceCodeToSlug) as [ProvinceCode, string][]).map(([code, slug]) => ({
  code,
  slug,
  label: provinceLabels[slug] ?? slug,
  count: getAllMunicipalities().filter((m) => m.province === code).length,
}))

export default function MunicipalitiesPage() {
  const municipalities = getAllMunicipalities()
  const rows: ExplorerRow[] = municipalities.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    province: m.province,
    provinceName: m.provinceName,
    population2011: m.population2011,
    population2022: m.population2022,
    households2022: m.households2022,
  }))
  const metros = municipalities.filter((m) => m.category === 'A').length
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Municipalities', path: '/municipalities' },
  ]

  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        title="Municipalities"
        lede={`All ${municipalities.length} municipalities in South Africa: ${metros} metros and ${municipalities.length - metros} local municipalities. Each profile compares Census 2011 with Census 2022.`}
      />

      <Section id="find" title="Find a municipality">
        <MunicipalityExplorer municipalities={rows} />
        <div className="mt-4">
          <SourceLine
            publisher={CENSUS_SOURCE.publisher}
            title={CENSUS_SOURCE.title}
            code={CENSUS_SOURCE.code}
            location={`person indicators per municipality, ${formatCount(municipalities.length)} municipalities`}
            releasedOn={CENSUS_SOURCE.releasedOn}
            checkedOn={CENSUS_SOURCE.checkedOn}
          />
        </div>
      </Section>

      <Section id="by-province" title="By province">
        <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {PROVINCE_LINKS.map(({ slug, label, count }) => (
            <li key={slug} className="flex items-baseline justify-between gap-3 border-t border-rule py-2 text-small">
              <Link href={`/provinces/${slug}`} className={linkClass}>
                {label}
              </Link>
              <span className="text-muted">{count} municipalities</span>
            </li>
          ))}
        </ul>
      </Section>
    </Column>
  )
}
