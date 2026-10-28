import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Database, RefreshCw, BookOpen, Shield, AlertTriangle,
  ExternalLink, CheckCircle, Clock, FileText, Globe,
} from 'lucide-react'
import { buildPageMetadata, AUTHOR } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/schema'
import { SourceLine } from '@/components/editorial/SourceLine'
import { linkClass } from '@/components/editorial/Section'
import { formatCount } from '@/lib/format'
import { REPO_URL, reportErrorHref } from '@/lib/contact'

export const metadata: Metadata = buildPageMetadata({
  title: 'Data Methodology',
  description:
    'How SA Data Hub sources, processes, and presents South African statistics. Official data providers, indicator definitions, update schedules, and known limitations.',
  path: '/methodology',
})

interface Source {
  name: string
  shortName: string
  url: string
  coverage: string
  frequency: string
  datasets: string[]
  notes?: string
}

const SOURCES: Source[] = [
  {
    name: 'Statistics South Africa (Stats SA)',
    shortName: 'Stats SA',
    url: 'https://www.statssa.gov.za',
    coverage: '1994 – present',
    frequency: 'Quarterly / Annual',
    datasets: ['Unemployment (QLFS)', 'Inflation (CPI / PPI)', 'GDP (National Accounts)', 'Census 2022', 'Population Estimates', 'Housing (GHS)'],
    notes: 'The primary national statistical office. All headline macroeconomic indicators originate here. StatSA releases are the reference source for all economic data on this platform.',
  },
  {
    name: 'South African Reserve Bank (SARB)',
    shortName: 'SARB',
    url: 'https://www.resbank.co.za',
    coverage: '1960 – present',
    frequency: 'Monthly / Quarterly',
    datasets: ['Interest Rates (Repo / Prime)', 'Government Debt', 'Balance of Payments'],
    notes: 'SARB\'s online statistical query tool provides downloadable time series for monetary policy variables. Data is authoritative for financial indicators.',
  },
  {
    name: 'Department of Basic Education (DBE)',
    shortName: 'DBE',
    url: 'https://www.education.gov.za',
    coverage: '2000 – present',
    frequency: 'Annual',
    datasets: ['Matric Pass Rates', 'School Enrollment', 'Provincial Education Statistics'],
    notes: 'DBE releases annual matric results in January for the previous year. Provincial breakdowns are available in the full NSC diagnostic report.',
  },
  {
    name: 'South African Police Service (SAPS)',
    shortName: 'SAPS',
    url: 'https://www.saps.gov.za/services/crimestats.php',
    coverage: '2000 – present',
    frequency: 'Annual (September)',
    datasets: ['Crime Statistics', 'Contact Crime', 'Property Crime', 'Provincial Crime'],
    notes: 'SAPS releases annual crime statistics in September covering April–March financial years. Station-level data is available from the Crime Statistics portal.',
  },
  {
    name: 'World Bank Open Data',
    shortName: 'World Bank',
    url: 'https://data.worldbank.org/country/ZA',
    coverage: '1960 – present',
    frequency: 'Annual',
    datasets: ['Long-run GDP', 'Poverty Headcount', 'Gini Coefficient', 'Internet Access', 'Labour Force Participation'],
    notes: 'Used for long-run time series and international comparisons. World Bank figures may lag Stats SA by 1–2 years but provide consistent methodology across decades.',
  },
]

interface DatasetDoc {
  id: string
  name: string
  source: string
  sourceUrl: string
  frequency: string
  lag: string
  unit: string
  definition: string
  limitations: string[]
  seriesStart: string
}

const DATASETS: DatasetDoc[] = [
  {
    id: 'unemployment',
    name: 'Unemployment Rate',
    source: 'Stats SA — Quarterly Labour Force Survey (QLFS, P0211)',
    sourceUrl: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0211',
    frequency: 'Quarterly (Feb, May, Aug, Nov)',
    lag: '~6 weeks after reference quarter',
    unit: '% of labour force (15–64)',
    definition: 'The narrow (official) unemployment rate measures persons without work, available to work, and actively seeking work as a percentage of the labour force. The expanded rate includes discouraged work-seekers.',
    limitations: [
      'Does not capture underemployment (part-time workers seeking full-time work).',
      'Household survey — subject to sampling error (±0.5pp at national level).',
      'Does not reflect quality or formality of employment.',
      'COVID-19 disrupted Q2 2020 fieldwork; Q2 2020 data should be treated with caution.',
    ],
    seriesStart: '2008 Q1',
  },
  {
    id: 'gdp',
    name: 'Gross Domestic Product (GDP)',
    source: 'Stats SA — National Accounts (P0441)',
    sourceUrl: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0441',
    frequency: 'Quarterly',
    lag: '~60 days after reference quarter',
    unit: 'R billion (constant 2015 prices) and % growth',
    definition: 'GDP measures the monetary value of all goods and services produced within South Africa\'s borders in a reference period, adjusted for inflation (real GDP) and seasonally adjusted.',
    limitations: [
      'Preliminary estimates are subject to revision — sometimes material revisions in subsequent releases.',
      'Seasonal adjustment methodology may change, causing historical revisions.',
      'Informal economy and subsistence agriculture are partially captured.',
      'Sectoral decompositions (agriculture, mining, manufacturing etc.) are released with a further delay.',
    ],
    seriesStart: '2010 Q1',
  },
  {
    id: 'inflation',
    name: 'Consumer Price Index (CPI)',
    source: 'Stats SA — Consumer Price Index (P0141)',
    sourceUrl: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0141',
    frequency: 'Monthly (published ~3–4 weeks after reference month)',
    lag: '~25 days',
    unit: 'Index (Dec 2016 = 100) and YoY % change',
    definition: 'CPI measures the rate of change in prices paid by urban households for a representative basket of goods and services. It is the primary measure of consumer price inflation in South Africa.',
    limitations: [
      'Based on urban households only — may not reflect rural price dynamics.',
      'Basket weights are updated periodically (last major revision 2017); the basket may lag consumption pattern changes.',
      'Core CPI (excluding food and energy) is not officially published by Stats SA but is estimated by analysts.',
      'Individual component indices (food, transport, housing) may diverge significantly from headline.',
    ],
    seriesStart: '2008 Jan',
  },
  {
    id: 'provinces',
    name: 'Provincial Statistics',
    source: 'Stats SA — QLFS, Census 2022, General Household Survey',
    sourceUrl: 'https://www.statssa.gov.za',
    frequency: 'Quarterly (unemployment) / Annual (other indicators)',
    lag: 'Quarterly unemployment: ~6 weeks. Housing/education: annual.',
    unit: 'Various (%, count, index)',
    definition: 'Provincial data aggregates multiple Stats SA surveys: QLFS for unemployment, Census 2022 for population and housing access, NSC results for education. GDP share is from national accounts regional estimates.',
    limitations: [
      'Provincial unemployment estimates have higher sampling error than national (±1–2pp).',
      'Census data (2022) may not fully reflect subsequent migration patterns.',
      'Provincial GDP estimates are released annually with a longer lag than quarterly national GDP.',
      'Service delivery indicators (electricity, water) from General Household Survey, which is conducted annually but with a 1-year publication lag.',
    ],
    seriesStart: 'Varies by indicator',
  },
]

function SectionIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shrink-0">
      <Icon size={16} />
    </div>
  )
}

/** Figures for "Why do the numbers disagree?", each checked against the release named beside it. */
const QLFS = {
  publisher: 'Stats SA',
  title: 'Quarterly Labour Force Survey, Quarter 2: 2026',
  code: 'P0211',
  location: 'Table A, page 1',
  releasedOn: '2026-08-11',
  checkedOn: '2026-10-28',
}
const MYPE = {
  publisher: 'Stats SA',
  title: 'Mid-year population estimates, 2026',
  code: 'P0302',
  location: 'Appendix 1, page 27; Introduction, page 1',
  releasedOn: '2026-07-30',
  checkedOn: '2026-10-28',
}
const CENSUS = {
  publisher: 'Stats SA',
  title: 'Census 2022 Provinces at a glance',
  code: 'Report no. 03-01-43',
  location: 'sum of the nine province rows, Person indicators per municipality, pages 6 to 44',
  releasedOn: '2023-10-10',
  edition: 'revised edition',
  downloadedOn: '2026-10-27',
  checkedOn: '2026-10-28',
}
const NUMBERS_DISAGREE = {
  officialRate: 33.6,
  lu3: 43.8,
  censusCount: 62027503,
  midYear2026: 63522380,
}

/** Stats SA's condition for reusing its data, quoted from a release in sources/releases. */
function ReuseCondition() {
  return (
    <section id="reuse" aria-labelledby="reuse-title" className="mb-12 scroll-mt-20 border-b border-rule pb-10">
      <h2 id="reuse-title" className="font-display text-[1.5rem] font-semibold leading-snug text-ink sm:text-h2">
        Using Stats SA&apos;s data
      </h2>
      <div className="mt-5 max-w-[44rem] space-y-3 text-body text-ink">
        <p>Stats SA sets this condition on its publications:</p>
        <blockquote className="m-0 border-l-2 border-ink pl-5 italic">
          &ldquo;Users may apply or process this data, provided Statistics South Africa (Stats SA) is acknowledged as the
          original source of the data; that it is specified that the application and/or analysis is the result of the
          user&apos;s independent processing of the data; and that neither the basic data nor any reprocessed version or
          application thereof may be sold or offered for sale in any form whatsoever without prior permission from Stats
          SA.&rdquo;
        </blockquote>
        <p className="text-caption text-muted">
          Stats SA, Census 2022 Provinces at a glance (Report no. 03-01-43), page iii.
        </p>
        <p>
          So every Stats SA figure on SA Data Hub names Stats SA as the original source, and every change, share, average or
          ranking worked out from it is SA Data Hub&apos;s own processing, not Stats SA&apos;s. SA Data Hub is free and sells
          nothing.
        </p>
      </div>
    </section>
  )
}

function NumbersDisagree() {
  const n = NUMBERS_DISAGREE
  return (
    <section id="numbers-disagree" aria-labelledby="numbers-disagree-title" className="mb-12 scroll-mt-20 border-y border-rule py-10">
      <h2 id="numbers-disagree-title" className="font-display text-[1.5rem] font-semibold leading-snug text-ink sm:text-h2">
        Why do the numbers disagree?
      </h2>
      <div className="mt-5 max-w-[44rem] space-y-8 text-body text-ink">
        <div>
          <h3 className="font-display text-h3 font-semibold">Unemployment: {n.officialRate}% or {n.lu3}%?</h3>
          <p className="mt-2">
            Both are Stats SA figures for April to June 2026. {n.officialRate}% is the official unemployment rate (LU1): people
            without work who looked for it, as a share of the labour force. {n.lu3}% is LU3, which also counts the potential
            labour force: people who want work but did not look, or looked but could not start yet. Stats SA publishes four such
            rates and says they should be &ldquo;understood as complementary&rdquo;.
          </p>
          <p className="mt-2">
            <Link href="/explainers/qlfs-2026-q2#more-than-one-rate" className={linkClass}>
              Why South Africa has more than one unemployment rate
            </Link>
          </p>
          <SourceLine {...QLFS} className="mt-2" />
        </div>
        <div>
          <h3 className="font-display text-h3 font-semibold">Population: {formatCount(n.censusCount)} or {formatCount(n.midYear2026)}?</h3>
          <p className="mt-2">
            Census 2022 counted {formatCount(n.censusCount)} people. Stats SA&apos;s mid-year estimate for 2026 is{' '}
            {formatCount(n.midYear2026)}. They describe different dates, and they are made differently. In Stats SA&apos;s words,
            &ldquo;The mid-year estimates are an estimate of the population as of 30 June in a given year&rdquo;, and they use
            &ldquo;the cohort-component method for population estimation&rdquo;, projecting a base population forward with
            levels of fertility, mortality and migration.
          </p>
          <p className="mt-2">
            On SA Data Hub, municipality pages use the Census 2022 counts and province pages use the 2026 mid-year estimates, so
            the municipalities in a province do not add up to the figure on its province page.
          </p>
          <SourceLine {...CENSUS} className="mt-2" />
          <SourceLine {...MYPE} className="mt-1" />
        </div>
      </div>
    </section>
  )
}

export default function MethodologyPage() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Methodology', path: '/methodology' },
  ]

  return (
    <div className="container-page py-10 max-w-4xl">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display text-3xl font-semibold text-slate-900 dark:text-white mb-3">
          Data Methodology
        </h1>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
          SA Data Hub is committed to transparency about how data is sourced, processed, and presented.
          This page documents every data source, update schedule, indicator definition, and known limitation.
        </p>
      </div>

      <NumbersDisagree />
      <ReuseCondition />

      {/* Principles */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <SectionIcon icon={Shield} />
          <h2 className="font-semibold text-xl text-slate-900 dark:text-white">Core Principles</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: CheckCircle, title: 'Primary Sources Only', desc: 'All data originates from official government statistical agencies or internationally recognised institutions. No data aggregators or news sources.' },
            { icon: FileText, title: 'No Editorial Adjustment', desc: 'Data is presented as released. We do not seasonally adjust, smooth, or normalise figures beyond what is in the official release.' },
            { icon: AlertTriangle, title: 'Limitations Disclosed', desc: 'Every dataset page documents known caveats, sampling limitations, and revision risks. Provisional data is clearly labelled.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-5">
              <Icon size={18} className="text-brand-600 dark:text-brand-400 mb-2" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data Sources */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <SectionIcon icon={Database} />
          <h2 className="font-semibold text-xl text-slate-900 dark:text-white">Data Sources</h2>
        </div>
        <div className="space-y-4">
          {SOURCES.map((s) => (
            <div key={s.shortName} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{s.name}</h3>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 mt-0.5"
                  >
                    {s.url.replace('https://', '')} <ExternalLink size={10} />
                  </a>
                </div>
                <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><Clock size={11} />{s.frequency}</span>
                  <span className="flex items-center gap-1"><Globe size={11} />{s.coverage}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {s.datasets.map((d) => (
                  <span key={d} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-950/30 dark:text-brand-300">
                    {d}
                  </span>
                ))}
              </div>
              {s.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{s.notes}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Update Frequencies */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <SectionIcon icon={RefreshCw} />
          <h2 className="font-semibold text-xl text-slate-900 dark:text-white">Update Schedule</h2>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Dataset</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Frequency</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Approx. Publication Lag</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden sm:table-cell">Automation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { name: 'CPI Inflation', freq: 'Monthly', lag: '~25 days', auto: 'Semi-manual (Stats SA P0141 transcription)' },
                { name: 'GDP Growth', freq: 'Quarterly', lag: '~60 days', auto: 'Semi-manual (Stats SA P0441 transcription)' },
                { name: 'Unemployment (QLFS)', freq: 'Quarterly', lag: '~6 weeks', auto: 'Semi-manual (Stats SA P0211 transcription)' },
                { name: 'Provincial Unemployment', freq: 'Quarterly', lag: '~6 weeks', auto: 'Semi-manual (Stats SA QLFS Table E)' },
                { name: 'Matric Pass Rates', freq: 'Annual', lag: '~2 weeks (Jan)', auto: 'Manual (DBE release announcement)' },
                { name: 'Crime Statistics', freq: 'Annual', lag: 'September', auto: 'Manual (SAPS annual workbooks)' },
                { name: 'Population Estimates', freq: 'Annual', lag: 'Mid-year', auto: 'Semi-manual (Stats SA MYPE P0302)' },
                { name: 'Housing / GHS', freq: 'Annual', lag: '~12 months', auto: 'Decennial Census / GHS tables' },
                { name: 'Census Data', freq: 'Decennial', lag: '~2 years', auto: 'Static — next census ~2032' },
                { name: 'Interest Rates (Repo)', freq: 'MPC meetings (~bi-monthly)', lag: 'Same day', auto: 'Semi-manual (SARB MPC statement)' },
              ].map((row) => (
                <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.freq}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.lag}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 hidden sm:table-cell">{row.auto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dataset Definitions */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <SectionIcon icon={BookOpen} />
          <h2 className="font-semibold text-xl text-slate-900 dark:text-white">Dataset Definitions & Limitations</h2>
        </div>
        <div className="space-y-5">
          {DATASETS.map((d) => (
            <div key={d.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <h3 className="font-semibold text-slate-900 dark:text-white">{d.name}</h3>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">{d.frequency}</span>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">Lag: {d.lag}</span>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">Since {d.seriesStart}</span>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Source</p>
                <a
                  href={d.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 inline-flex items-center gap-1"
                >
                  {d.source} <ExternalLink size={11} />
                </a>
              </div>

              <div className="mb-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Definition</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{d.definition}</p>
              </div>

              {d.limitations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <AlertTriangle size={11} /> Known Limitations
                  </p>
                  <ul className="space-y-1">
                    {d.limitations.map((lim, i) => (
                      <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-400 shrink-0" />
                        {lim}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Verification */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <SectionIcon icon={CheckCircle} />
          <h2 className="font-semibold text-xl text-slate-900 dark:text-white">Verification Process</h2>
        </div>
        <div className="card p-5 space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          <p>
            All data is sourced directly from official statistical publications and cross-referenced with the original press releases before publication. Rather than relying on unverified third-party automated aggregators, headline figures and series are curated from official primary releases (Stats SA, SARB, DBE, SAPS) and validated against historical trends and official statistical tables.
          </p>
          <p>
            For datasets without structured APIs (most Stats SA releases are PDF or Excel files), data is transcribed from the official statistical release tables. Transcribed values are verified against the headline figure in the press release and, where possible, against secondary coverage in <em>Business Day</em> or Bloomberg SA.
          </p>
          <p>
            Historical revisions issued by Stats SA are incorporated in the next scheduled update cycle. We do not backdate individual data points between cycles unless the revision is material (defined as a change exceeding 1 percentage point for rates, or 0.5% for index levels).
          </p>
        </div>
      </section>

      {/* Code and corrections */}
      <section id="code" aria-labelledby="code-title" className="mb-10 border-t border-rule pt-8">
        <h2 id="code-title" className="font-display text-[1.5rem] font-semibold leading-snug text-ink sm:text-h2">
          Code and corrections
        </h2>
        <div className="mt-4 max-w-[44rem] space-y-3 text-body text-ink">
          <p>
            The code, the data files and the scripts that check them against each release are public on{' '}
            <a href={REPO_URL} className={linkClass}>
              GitHub
            </a>
            . Every correction is listed on the{' '}
            <Link href="/updates" className={linkClass}>
              corrections and updates page
            </Link>
            .
          </p>
          <p>
            Found a figure that does not match its source?{' '}
            <a href={reportErrorHref('/methodology')} className={linkClass}>
              Report an error
            </a>
            .
          </p>
        </div>
      </section>

      {/* Transparency notes */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <SectionIcon icon={AlertTriangle} />
          <h2 className="font-semibold text-xl text-slate-900 dark:text-white">Transparency Notes</h2>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-5 space-y-3 text-sm text-amber-900 dark:text-amber-200">
          <p>
            <strong>This is not an official Stats SA product.</strong> SA Data Hub is an independent platform. While we strive for accuracy, users requiring data for official, legal, or academic purposes should consult the primary sources directly.
          </p>
          <p>
            <strong>Data may be provisional.</strong> Stats SA frequently issues preliminary estimates ahead of final figures. We label provisional data where known, but users should verify the status of individual data points on Stats SA&apos;s website.
          </p>
          <p>
            <strong>Automation limitations.</strong> Third-party APIs and automated pipelines (such as World Bank modelled indicators) are strictly gated or kept manual to prevent overwriting official national survey observations. All data updates undergo automated regression and consistency checks prior to release.
          </p>
          <p>
            <strong>No commercial affiliation.</strong> SA Data Hub has no commercial relationship with any of the data sources listed on this page and does not receive compensation for referencing them.
          </p>
        </div>
      </section>

      <p className="mt-10 text-sm text-slate-500 dark:text-slate-400">
        SA Data Hub is maintained by{' '}
        <a href={AUTHOR.url} rel="me author" className="text-brand-600 hover:underline dark:text-brand-400">
          {AUTHOR.name}
        </a>
        . See the{' '}
        <Link href="/about" className="text-brand-600 hover:underline dark:text-brand-400">
          About page
        </Link>{' '}
        for project background and the update process.
      </p>
    </div>
  )
}
