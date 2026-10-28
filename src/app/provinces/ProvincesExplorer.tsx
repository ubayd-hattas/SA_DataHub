import Link from 'next/link'
import { getProvinceData } from '@/data/mock'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { Column, PageHeader, Section, linkClass } from '@/components/editorial/Section'
import { SourceLine } from '@/components/editorial/SourceLine'
import { ChartFigure } from '@/components/editorial/ChartFigure'
import { BarList } from '@/components/editorial/BarList'
import { formatCount, formatDecimal, formatPercent, formatSigned } from '@/lib/format'
import ProvinceCompare, { type CompareRow } from './ProvinceCompare'

/** Where the province figures on this page come from, checked against the releases. */
export const QLFS_SOURCE = {
  publisher: 'Stats SA',
  title: 'Quarterly Labour Force Survey, Quarter 2: 2026',
  code: 'P0211',
  location: 'Table E, page 7',
  releasedOn: '2026-08-11',
  checkedOn: '2026-10-28',
}

export const MYPE_SOURCE = {
  publisher: 'Stats SA',
  title: 'Mid-year population estimates, 2026',
  code: 'P0302',
  location: 'Appendix 1, page 27',
  releasedOn: '2026-07-30',
  checkedOn: '2026-10-28',
}

/** The /provinces page. Server-rendered; only the two-province comparison runs in the browser. */
export default function ProvincesExplorer() {
  const provinces = getProvinceData()
  const byRate = [...provinces].sort((a, b) => a.unemploymentRate - b.unemploymentRate)
  const lowest = byRate[0]
  const highest = byRate[byRate.length - 1]
  const rows: CompareRow[] = provinces.map((p) => ({
    id: p.id,
    name: p.name,
    rate: p.stats.unemployment.rate,
    change: p.stats.unemployment.change,
    lu3: p.stats.unemployment.lu3 ?? null,
    population: p.population,
  }))
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Provinces', path: '/provinces' },
  ]

  return (
    <Column className="pb-16">
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        title="Provinces"
        lede={`Unemployment and population for South Africa's nine provinces. In the second quarter of 2026 the official unemployment rate ran from ${formatPercent(lowest.unemploymentRate)} in ${lowest.name} to ${formatPercent(highest.unemploymentRate)} in ${highest.name}.`}
      />

      <Section id="unemployment" title="Unemployment by province">
        <ChartFigure
          title={`${highest.name} had the highest official unemployment rate in Q2 2026, at ${formatPercent(highest.unemploymentRate)}, and ${lowest.name} the lowest, at ${formatPercent(lowest.unemploymentRate)}.`}
          notes={<p>The line under each bar is the change from Q1 2026, in percentage points (pts), as published.</p>}
          source={<SourceLine {...QLFS_SOURCE} />}
        >
          <BarList
            bars={[...byRate].reverse().map((p) => ({
              label: p.name,
              value: p.unemploymentRate,
              display: formatPercent(p.unemploymentRate),
              note: `${p.stats.unemployment.change === 0 ? 'No change' : `${p.stats.unemployment.change > 0 ? 'Up' : 'Down'} ${formatDecimal(Math.abs(p.stats.unemployment.change))} pts`} from Q1 2026`,
            }))}
          />
        </ChartFigure>
      </Section>

      <Section id="all-provinces" title="All provinces">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-left text-small">
            <caption className="sr-only">Official unemployment rate, LU3 and population by province</caption>
            <thead>
              <tr className="border-b border-ink text-caption text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Province</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Unemployment, Q2 2026</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">LU3, Q2 2026</th>
                <th scope="col" className="py-2 pl-2 text-right font-medium">People, 2026 estimate</th>
              </tr>
            </thead>
            <tbody>
              {[...provinces].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                <tr key={p.id} className="border-t border-rule">
                  <th scope="row" className="py-2 pr-3 font-normal">
                    <Link href={`/provinces/${p.id}`} className={linkClass}>
                      {p.name}
                    </Link>
                  </th>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-ink">
                    {formatPercent(p.stats.unemployment.rate)}
                    <span className="block text-caption text-muted">{formatSigned(p.stats.unemployment.change)} pts</span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-ink">
                    {p.stats.unemployment.lu3 != null ? formatPercent(p.stats.unemployment.lu3) : 'Not published'}
                  </td>
                  <td className="whitespace-nowrap py-2 pl-2 text-right tabular-nums text-ink">{formatCount(p.population)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-caption text-muted">
            LU3 is Stats SA&apos;s combined rate of unemployment and potential labour force. It is a different measure from the
            official rate. Population figures are estimates for mid-2026 and are not comparable with the Census 2022 counts on
            municipality pages.
          </p>
          <SourceLine {...QLFS_SOURCE} />
          <SourceLine {...MYPE_SOURCE} />
        </div>
      </Section>

      <div id="compare" className="scroll-mt-20">
        <Section id="compare-heading" title="Compare two provinces">
          <ProvinceCompare provinces={rows} />
          <div className="mt-3 space-y-2">
            <SourceLine {...QLFS_SOURCE} />
            <SourceLine {...MYPE_SOURCE} />
          </div>
        </Section>
      </div>
    </Column>
  )
}
