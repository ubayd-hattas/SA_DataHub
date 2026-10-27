import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getMunicipalityByCode,
  getAllMunicipalities,
  getMunicipalityNationalAverages,
  getMunicipalityProvincialAverages,
  getLargestMunicipalityInProvince,
  generateMunicipalityInsights,
  getSortedMunicipalityList,
} from '@/data/mock'
import type { MunicipalityRecord } from '@/types'
import { AgeStructureChart } from '@/components/charts/AgeStructureChart'
import { HousingCompositionChart } from '@/components/charts/HousingCompositionChart'
import { BasicServicesChart } from '@/components/charts/BasicServicesChart'
import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'
import {
  CENSUS_2011_SOURCE,
  SIMILAR_COUNT,
  census2011vs2022,
  fmtCount,
  municipalitySummary,
  percentChange,
  signed,
  similarMunicipalities,
  type CensusRow,
} from '@/lib/municipality-profile'
import { BOUNDARY_SOURCE, has2011Comparison } from '@/data/municipal-boundaries'
import { municipalityDescription, municipalityTitle } from '@/lib/page-seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, placeSchema } from '@/lib/schema'
import { getProvinceSlugFromCode } from '@/lib/utils'

// ─── Static params ──────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return getAllMunicipalities().map((m) => ({ code: m.id }))
}

// ─── SEO metadata ───────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  const m = getMunicipalityByCode(code)
  if (!m) return {}
  return buildPageMetadata({
    title: municipalityTitle(m),
    description: municipalityDescription(m),
    path: `/municipalities/${m.id}`,
  })
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return '—'
  return `${n.toFixed(decimals)}%`
}

// ─── Sub-components (server, no state) ─────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
      {children}
    </h2>
  )
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-xl font-semibold text-slate-900 dark:text-white leading-tight">
        {value}
      </span>
      {sub && (
        <span className="text-xs text-slate-400 dark:text-slate-500">{sub}</span>
      )}
    </div>
  )
}

function PctCard({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-2xl font-bold text-brand-600 dark:text-brand-400 leading-tight">
        {value}
      </span>
      {note && (
        <span className="text-xs text-slate-400 dark:text-slate-500">{note}</span>
      )}
    </div>
  )
}

// ─── Section components ─────────────────────────────────────────────────────

function DemographicsSection({ m }: { m: MunicipalityRecord }) {
  const derivedDensity =
    m.areaKm2 > 0 ? m.population2022 / m.areaKm2 : null

  return (
    <section>
      <SectionHeading>Demographics</SectionHeading>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard
          label="Population (2022)"
          value={fmt(m.population2022)}
          sub="Census 2022"
        />
        {has2011Comparison(m.id) && (
          <>
            <StatCard label="Population (2011)" value={fmt(m.population2011)} sub="Census 2011" />
            <StatCard
              label="Change since 2011"
              value={`${signed(percentChange(m.population2011, m.population2022))}%`}
              sub="Census 2011 to 2022"
            />
          </>
        )}
        <StatCard
          label="Male Population"
          value={fmt(m.populationDetail.malePop2022)}
          sub="2022"
        />
        <StatCard
          label="Female Population"
          value={fmt(m.populationDetail.femalePop2022)}
          sub="2022"
        />
        <StatCard
          label="Sex Ratio"
          value={m.sexRatio2022 != null ? `${m.sexRatio2022.toFixed(1)}` : '—'}
          sub="Males per 100 females"
        />
        <StatCard
          label="Population Density"
          value={
            derivedDensity != null
              ? `${fmt(derivedDensity, 1)} /km²`
              : m.populationDensity2022 != null
              ? `${fmt(m.populationDensity2022, 1)} /km²`
              : '—'
          }
          sub={`${fmt(m.areaKm2)} km² total area`}
        />
      </div>
    </section>
  )
}

function AgeStructureSection({ m }: { m: MunicipalityRecord }) {
  const pct35to59 = m.ageDetail?.pctAge35to59_2022 ?? null

  const chartData = [
    { group: '0–14', pct: m.pctAge0to14_2022 ?? null },
    { group: '15–34', pct: m.pctAge15to34_2022 ?? null },
    { group: '35–59', pct: pct35to59 },
    { group: '60+', pct: m.pctAge60plus_2022 ?? null },
  ]

  return (
    <section>
      <SectionHeading>Age Structure</SectionHeading>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <PctCard
          label="0–14 years"
          value={fmtPct(m.pctAge0to14_2022)}
          note="Census 2022"
        />
        <PctCard
          label="15–34 years"
          value={fmtPct(m.pctAge15to34_2022)}
          note="Census 2022"
        />
        <PctCard
          label="35–59 years"
          value={fmtPct(pct35to59)}
          note="Census 2022"
        />
        <PctCard
          label="60+ years"
          value={fmtPct(m.pctAge60plus_2022)}
          note="Census 2022"
        />
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Age distribution (% of population)
        </p>
        <AgeStructureChart data={chartData} />
      </div>
    </section>
  )
}

function HousingSection({ m }: { m: MunicipalityRecord }) {
  const hd = m.housingDetail

  const chartData = [
    { name: 'Formal', value: hd?.formalDwellings2022 ?? null },
    { name: 'Informal', value: hd?.informalDwellings2022 ?? null },
    { name: 'Traditional', value: hd?.traditionalDwellings2022 ?? null },
    { name: 'Other', value: hd?.otherDwellings2022 ?? null },
  ]

  return (
    <section>
      <SectionHeading>Housing</SectionHeading>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total Households"
          value={fmt(m.households2022)}
          sub="Census 2022"
        />
        <StatCard
          label="Avg Household Size"
          value={m.avgHouseholdSize2022 != null ? m.avgHouseholdSize2022.toFixed(1) : '—'}
          sub="Persons per household"
        />
        <StatCard
          label="Formal Dwellings"
          value={fmt(hd?.formalDwellings2022)}
          sub={fmtPct(m.pctFormalDwelling2022)}
        />
        <StatCard
          label="Informal Dwellings"
          value={fmt(hd?.informalDwellings2022)}
          sub={fmtPct(m.pctInformalDwelling2022)}
        />
        <StatCard
          label="Traditional Dwellings"
          value={fmt(hd?.traditionalDwellings2022)}
          sub={fmtPct(m.pctTraditionalDwelling2022)}
        />
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
          Dwelling type composition
        </p>
        <HousingCompositionChart data={chartData} />
      </div>
    </section>
  )
}

function BasicServicesSection({ m }: { m: MunicipalityRecord }) {
  const sd = m.serviceDetail

  const chartData = [
    { name: 'Flush toilet', pct: m.pctFlushToilet2022 ?? null },
    { name: 'No toilet', pct: m.pctNoToilet2022 ?? null },
    { name: 'Electricity (cooking)', pct: m.pctElectricityCooking2022 ?? null },
    { name: 'Water scheme', pct: m.pctWaterScheme2022 ?? null },
  ]

  return (
    <section>
      <SectionHeading>Basic Services</SectionHeading>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Flush Toilet Access"
          value={fmtPct(m.pctFlushToilet2022)}
          sub={fmt(sd?.flushToilet2022) + ' households'}
        />
        <StatCard
          label="No Toilet Access"
          value={fmtPct(m.pctNoToilet2022)}
          sub={fmt(sd?.noToilet2022) + ' households'}
        />
        <StatCard
          label="Electricity for Cooking"
          value={fmtPct(m.pctElectricityCooking2022)}
          sub={fmt(sd?.electricityCooking2022) + ' households'}
        />
        <StatCard
          label="Water Scheme Access"
          value={fmtPct(m.pctWaterScheme2022)}
          sub={fmt(sd?.waterScheme2022) + ' households'}
        />
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Services coverage (% of households)
        </p>
        <BasicServicesChart data={chartData} />
      </div>
    </section>
  )
}

function EducationSection({ m }: { m: MunicipalityRecord }) {
  const pd = m.populationDetail
  return (
    <section>
      <SectionHeading>Education</SectionHeading>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="School Attendance (ages 5–24)"
          value={fmt(pd?.schoolAttendance2022)}
          sub="Persons attending school, 2022"
        />
        {has2011Comparison(m.id) && (
          <StatCard label="School Attendance (2011)" value={fmt(pd?.schoolAttendance2011)} sub="Census 2011" />
        )}
      </div>
    </section>
  )
}

// ─── Comparison Section ─────────────────────────────────────────────────────

type ComparisonMetric = {
  label: string
  currentValue: number | null
  compareValue: number | null
  format: 'number' | 'pct' | 'decimal'
}

function formatCompValue(v: number | null, format: ComparisonMetric['format']): string {
  if (v == null || isNaN(v)) return '—'
  if (format === 'pct')     return `${v.toFixed(1)}%`
  if (format === 'decimal') return v.toFixed(1)
  return v.toLocaleString('en-ZA', { maximumFractionDigits: 0 })
}

function DeltaBadge({ delta, format }: { delta: number | null; format: ComparisonMetric['format'] }) {
  if (delta == null || isNaN(delta)) return <span className="text-xs text-slate-400">—</span>
  const isUp    = delta > 0
  const isZero  = Math.abs(delta) < (format === 'pct' ? 0.05 : 0.5)
  const display = isZero
    ? 'Same'
    : `${isUp ? '+' : ''}${format === 'pct' ? delta.toFixed(1) + '%' : format === 'decimal' ? delta.toFixed(1) : delta.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`

  if (isZero) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        {display}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        isUp
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-500 dark:text-red-400'
      }`}
    >
      {isUp ? '▲' : '▼'} {display}
    </span>
  )
}

function ComparisonCard({
  metric,
  comparatorLabel,
}: {
  metric: ComparisonMetric
  comparatorLabel: string
}) {
  const delta =
    metric.currentValue != null && metric.compareValue != null
      ? metric.currentValue - metric.compareValue
      : null

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-2">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {metric.label}
      </span>

      {/* Current vs comparator */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-xl font-semibold text-slate-900 dark:text-white leading-tight">
            {formatCompValue(metric.currentValue, metric.format)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">This municipality</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-tight">
            {formatCompValue(metric.compareValue, metric.format)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{comparatorLabel}</div>
        </div>
      </div>

      {/* Delta */}
      <div className="pt-1 border-t border-slate-100 dark:border-slate-700/50">
        <DeltaBadge delta={delta} format={metric.format} />
      </div>
    </div>
  )
}

function ComparisonGroup({
  heading,
  comparatorLabel,
  metrics,
}: {
  heading: string
  comparatorLabel: string
  metrics: ComparisonMetric[]
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
        {heading}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((metric) => (
          <ComparisonCard key={metric.label} metric={metric} comparatorLabel={comparatorLabel} />
        ))}
      </div>
    </div>
  )
}

function ComparisonSection({ m }: { m: MunicipalityRecord }) {
  const national   = getMunicipalityNationalAverages()
  const provincial = getMunicipalityProvincialAverages(m.province)
  const largest    = getLargestMunicipalityInProvince(m.province, m.id)

  function buildMetrics(
    pop: number | null,
    density: number | null,
    hhSize: number | null,
    formal: number | null,
    elec: number | null,
    toilet: number | null
  ): ComparisonMetric[] {
    return [
      { label: 'Population',           currentValue: m.population2022,            compareValue: pop,    format: 'number' },
      { label: 'Pop. Density /km²',    currentValue: m.populationDensity2022,     compareValue: density, format: 'decimal' },
      { label: 'Avg Household Size',   currentValue: m.avgHouseholdSize2022,      compareValue: hhSize, format: 'decimal' },
      { label: 'Formal Dwelling %',    currentValue: m.pctFormalDwelling2022,     compareValue: formal, format: 'pct' },
      { label: 'Electricity Access %', currentValue: m.pctElectricityCooking2022, compareValue: elec,   format: 'pct' },
      { label: 'Flush Toilet %',       currentValue: m.pctFlushToilet2022,        compareValue: toilet, format: 'pct' },
    ]
  }

  const nationalMetrics   = buildMetrics(national.population, national.populationDensity, national.avgHouseholdSize, national.pctFormalDwelling, national.pctElectricityCooking, national.pctFlushToilet)
  const provincialMetrics = buildMetrics(provincial.population, provincial.populationDensity, provincial.avgHouseholdSize, provincial.pctFormalDwelling, provincial.pctElectricityCooking, provincial.pctFlushToilet)
  const largestMetrics    = largest
    ? buildMetrics(largest.population2022, largest.populationDensity2022, largest.avgHouseholdSize2022, largest.pctFormalDwelling2022, largest.pctElectricityCooking2022, largest.pctFlushToilet2022)
    : null

  return (
    <section>
      <SectionHeading>Comparisons</SectionHeading>
      <div className="space-y-6">
        <ComparisonGroup
          heading="vs National Average"
          comparatorLabel="National avg"
          metrics={nationalMetrics}
        />
        <ComparisonGroup
          heading={`vs ${m.provinceName} Provincial Average`}
          comparatorLabel="Provincial avg"
          metrics={provincialMetrics}
        />
        {largestMetrics && largest && (
          <ComparisonGroup
            heading={`vs Largest in ${m.provinceName} (${largest.name})`}
            comparatorLabel={largest.name}
            metrics={largestMetrics}
          />
        )}
      </div>
    </section>
  )
}

// ─── Municipality Insights ──────────────────────────────────────────────────

const SENTIMENT_STYLES = {
  positive: {
    dot: 'bg-emerald-400',
    pill: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
    text: 'text-emerald-800 dark:text-emerald-200',
  },
  negative: {
    dot: 'bg-red-400',
    pill: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60',
    text: 'text-red-800 dark:text-red-200',
  },
  neutral: {
    dot: 'bg-brand-400',
    pill: 'bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-800/60',
    text: 'text-brand-800 dark:text-brand-200',
  },
} as const

function InsightsSection({ m }: { m: MunicipalityRecord }) {
  const insights = generateMunicipalityInsights(m)
  if (insights.length === 0) return null

  return (
    <section>
      <SectionHeading>Municipality Insights</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((insight, i) => {
          const styles = SENTIMENT_STYLES[insight.sentiment]
          return (
            <div
              key={i}
              className={`border rounded-xl p-4 flex gap-3 ${styles.pill}`}
            >
              <span className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${styles.dot}`} />
              <p className={`text-sm leading-relaxed ${styles.text}`}>
                {insight.text}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Census 2011 vs 2022 ────────────────────────────────────────────────────

function formatCensusValue(v: number, kind: CensusRow['kind']): string {
  if (kind === 'count') return fmtCount(v)
  if (kind === 'percent') return `${v.toFixed(1)}%`
  return v.toFixed(1)
}

function formatCensusChange(r: CensusRow): string {
  if (r.kind === 'count') return `${signed(r.change)}%`
  if (r.kind === 'percent') return `${signed(r.change)} pts`
  return signed(r.change)
}

function CensusComparisonSection({ m }: { m: MunicipalityRecord }) {
  const rows = census2011vs2022(m)
  return (
    <section aria-labelledby="census-compare">
      <h2 id="census-compare" className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
        Census 2011 and Census 2022
      </h2>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">The boundaries of {m.name} changed after Census 2011, so the comparison is withheld.</p>
          <p className="mt-1">
            The Municipal Demarcation Board changed this municipality&apos;s boundaries before the 2016 local government
            elections, so its 2011 and 2022 figures may not cover the same area. Source: {BOUNDARY_SOURCE.publisher},{' '}
            <a href={BOUNDARY_SOURCE.url} className="underline hover:no-underline" rel="noopener noreferrer" target="_blank">
              {BOUNDARY_SOURCE.title}
            </a>{' '}
            ({BOUNDARY_SOURCE.year}), pages {BOUNDARY_SOURCE.pages}.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-2 py-2 font-medium sm:px-4">Measure</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium sm:px-4"><span className="hidden sm:inline">Census </span>2011</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium sm:px-4"><span className="hidden sm:inline">Census </span>2022</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium sm:px-4">Change</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-t border-slate-100 dark:border-slate-800">
                    <th scope="row" className="px-2 py-2 font-normal text-slate-700 dark:text-slate-200 sm:px-4">{r.label}</th>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400 sm:px-4">{formatCensusValue(r.value2011, r.kind)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-slate-900 dark:text-white sm:px-4">{formatCensusValue(r.value2022, r.kind)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200 sm:px-4">{formatCensusChange(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Changes are SA Data Hub&apos;s own calculations from the two figures: a percentage change for counts, and the
            difference in percentage points (pts) for shares.
          </p>
        </>
      )}
    </section>
  )
}

// ─── Similar municipalities ─────────────────────────────────────────────────

function SimilarMunicipalitiesSection({ m }: { m: MunicipalityRecord }) {
  const similar = similarMunicipalities(m)
  if (similar.length === 0) return null
  return (
    <section aria-labelledby="similar">
      <h2 id="similar" className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
        Similar municipalities
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 -mt-2">
        The {SIMILAR_COUNT} other municipalities in {m.provinceName} whose Census 2022 population is closest to{' '}
        {m.name}&apos;s ({fmtCount(m.population2022)}). Where two are equally close, the lower municipal code comes first.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {similar.map((r) => (
          <Link
            key={r.id}
            href={`/municipalities/${r.id}`}
            className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-3 hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight">
                {r.name}
              </span>
              <span
                className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  CATEGORY_COLORS[r.category] ?? 'bg-slate-100 text-slate-600'
                }`}
              >
                Cat {r.category}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Population, 2022</div>
                <div className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{fmtCount(r.population2022)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Households, 2022</div>
                <div className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{fmtCount(r.households2022)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Formal dwelling</div>
                <div className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{r.pctFormalDwelling2022.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Flush toilet</div>
                <div className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{r.pctFlushToilet2022.toFixed(1)}%</div>
              </div>
            </div>
            <div className="text-xs text-brand-600 dark:text-brand-400 font-medium group-hover:translate-x-1 transition-transform duration-200 flex items-center gap-1">
              View profile →
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ─── Category colours ───────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  A: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  B: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  C: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

// ─── Prev / Next navigation ─────────────────────────────────────────────────

function MunicipalityNavigation({ currentId }: { currentId: string }) {
  const sorted = getSortedMunicipalityList()
  const idx    = sorted.findIndex((m) => m.id === currentId)
  const prev   = idx > 0 ? sorted[idx - 1] : null
  const next   = idx < sorted.length - 1 ? sorted[idx + 1] : null

  if (!prev && !next) return null

  return (
    <nav
      aria-label="Municipality navigation"
      className="flex items-stretch gap-3 pt-6 border-t border-slate-200 dark:border-slate-700"
    >
      {/* Previous */}
      {prev ? (
        <Link
          href={`/municipalities/${prev.id}`}
          className="group flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-1 hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-sm transition-all duration-200"
        >
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
            ← Previous
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {prev.name}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {prev.provinceName}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      {/* Next */}
      {next ? (
        <Link
          href={`/municipalities/${next.id}`}
          className="group flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-1 items-end text-right hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-sm transition-all duration-200"
        >
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
            Next →
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {next.name}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {next.provinceName}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  )
}

// ─── Category badge ─────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  A: 'Metropolitan',
  B: 'Local',
  C: 'District',
}

function CategoryBadge({ category }: { category: string }) {
  const colours: Record<string, string> = {
    A: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    B: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    C: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        colours[category] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      Cat {category} · {CATEGORY_LABELS[category] ?? 'Municipality'}
    </span>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function MunicipalityDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const m = getMunicipalityByCode(code)
  if (!m) return notFound()

  const summary = municipalitySummary(m)
  const provinceSlug = getProvinceSlugFromCode(m.province)

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Municipalities', path: '/municipalities' },
    { name: m.name, path: `/municipalities/${m.id}` },
  ]

  return (
    <div className="container-page py-10 space-y-10">
      <JsonLd
        data={[
          breadcrumbSchema(breadcrumbs),
          placeSchema(m, `/municipalities/${m.id}`, summary),
        ]}
      />
      {/* Breadcrumb */}
      <div>
        <Breadcrumbs items={breadcrumbs} className="mb-3" />

        {/* Header */}
        <div className="flex flex-wrap items-start gap-3 mb-1">
          <h1 className="font-display text-3xl font-semibold text-slate-900 dark:text-white">
            {m.name}
          </h1>
          <CategoryBadge category={m.category} />
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
          <Link
            href={`/provinces/${provinceSlug}`}
            className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            {m.provinceName}
          </Link>
          {m.miifCategory ? ` · MIIF ${m.miifCategory}` : ''}
          {' · '}
          <span className="font-mono text-xs">{m.id}</span>
        </p>
        <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
          {summary}
        </p>
      </div>

      {/* Data sections */}
      <CensusComparisonSection m={m} />
      <DemographicsSection m={m} />
      <AgeStructureSection m={m} />
      <HousingSection m={m} />
      <BasicServicesSection m={m} />
      <EducationSection m={m} />
      <ComparisonSection m={m} />

      {/* V5 additions */}
      <InsightsSection m={m} />
      <SimilarMunicipalitiesSection m={m} />

      {/* Source note */}
      <div className="space-y-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        <p>
          Census 2022 figures: Stats SA, Census 2022 Municipal Fact Sheets (revised August 2025). Last updated{' '}
          {m.lastUpdated}.
        </p>
        <p>
          Census 2011 figures: {CENSUS_2011_SOURCE.publisher}, {CENSUS_2011_SOURCE.publication}, released 10 October
          2023, which gives 2011 figures alongside the 2022 ones. They reached this site through the{' '}
          <a href={CENSUS_2011_SOURCE.extractUrl} className="underline hover:no-underline" rel="noopener noreferrer" target="_blank">
            {CENSUS_2011_SOURCE.extract}
          </a>{' '}
          extract on GitHub. Checked against the extract on 27 October 2026.
        </p>
        <p>
          Source of the basic data: Stats SA. The summary, changes and similar municipalities are SA Data Hub&apos;s
          own calculations from that data.
        </p>
      </div>

      {/* Prev / Next navigation */}
      <MunicipalityNavigation currentId={m.id} />
    </div>
  )
}
