import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  MapPin, ArrowLeft, TrendingUp, TrendingDown, Minus,
  Users, GraduationCap, Home, Zap, Droplets, BarChart3,
  ArrowRight,
} from 'lucide-react'
import { getProvinceById, getProvinceData, getMunicipalitiesByProvince } from '@/data/mock'
import { cn, getProvinceCodeFromSlug } from '@/lib/utils'
import { buildPageMetadata } from '@/lib/seo'
import { provinceDescription, provinceTitle } from '@/lib/page-seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, provincePlaceSchema } from '@/lib/schema'

interface ProvincePageProps {
  params: { id: string }
}

const PROVINCE_COLORS: Record<string, string> = {
  'western-cape':   '#22c55e',
  'gauteng':        '#3b82f6',
  'kwazulu-natal':  '#f59e0b',
  'eastern-cape':   '#ef4444',
  'limpopo':        '#8b5cf6',
  'mpumalanga':     '#06b6d4',
  'north-west':     '#f97316',
  'free-state':     '#ec4899',
  'northern-cape':  '#14b8a6',
}

const PROVINCE_DESCRIPTIONS: Record<string, string> = {
  'western-cape': 'The Western Cape is South Africa\'s most economically productive province per capita and home to Cape Town. It consistently records the lowest unemployment rate nationally, driven by tourism, finance, and agri-processing sectors.',
  'gauteng': 'Gauteng is the economic powerhouse of South Africa, contributing over a third of national GDP despite being the smallest province by area. Johannesburg and Pretoria (Tshwane) are its dominant cities, anchoring banking, mining services, and government.',
  'kwazulu-natal': 'KwaZulu-Natal is South Africa\'s third-largest economy, centred on Durban\'s port — the busiest in sub-Saharan Africa. Agriculture, logistics, and manufacturing are key sectors alongside a growing automotive industry.',
  'eastern-cape': 'The Eastern Cape faces structural economic challenges with high unemployment and poverty rates. The province is home to Nelson Mandela Bay (Port Elizabeth/Gqeberha) and a significant automotive manufacturing cluster.',
  'limpopo': 'Limpopo is rich in mineral resources including platinum, chrome, and coal. Despite this, high unemployment persists. The province borders Zimbabwe, Botswana, and Mozambique and is a key agricultural producer.',
  'mpumalanga': 'Mpumalanga is central to South Africa\'s energy supply, hosting most of Eskom\'s coal-fired power stations. Tourism around the Kruger National Park and Blyde River Canyon supports a growing services sector.',
  'north-west': 'North West records one of the highest unemployment rates nationally. The Bushveld Complex, the world\'s largest known platinum deposit, anchors the mining economy. Rustenburg is the provincial economic hub.',
  'free-state': 'The Free State is centrally located and primarily agricultural, producing significant shares of the nation\'s grain. Bloemfontein serves as the judicial capital of South Africa and the provincial capital.',
  'northern-cape': 'The Northern Cape is South Africa\'s largest province by area but smallest by population. Mining (iron ore, manganese, diamonds) and agriculture drive the economy. Upington and Kimberley are major centres.',
}

export function generateStaticParams() {
  return [
    'western-cape', 'gauteng', 'kwazulu-natal', 'eastern-cape',
    'limpopo', 'mpumalanga', 'north-west', 'free-state', 'northern-cape',
  ].map((id) => ({ id }))
}

export function generateMetadata({ params }: ProvincePageProps): Metadata {
  const province = getProvinceById(params.id)
  if (!province) return {}
  return buildPageMetadata({
    title: provinceTitle(province),
    description: provinceDescription(province),
    path: `/provinces/${province.id}`,
  })
}

function StatRow({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: 'good' | 'bad' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <div className="text-right">
        <span className={cn(
          'font-mono text-sm font-semibold',
          highlight === 'good' ? 'text-green-600 dark:text-green-400' :
          highlight === 'bad' ? 'text-red-500 dark:text-red-400' :
          'text-slate-900 dark:text-white'
        )}>{value}</span>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

function StatBlock({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('rounded-md p-1.5', color)}>
          <Icon size={14} className="text-white" />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <p className="font-mono text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function ProvincePage({ params }: ProvincePageProps) {
  const province = getProvinceById(params.id)
  if (!province) return notFound()

  const allProvinces = getProvinceData()
  const color = PROVINCE_COLORS[province.id] ?? '#64748b'
  const description = PROVINCE_DESCRIPTIONS[province.id] ?? ''

  const unem = province.stats.unemployment
  const edu = province.stats.education
  const housing = province.stats.housing
  const pop = province.stats.population

  const trend = unem.trend
  const TrendIcon = trend === 'down' ? TrendingDown : trend === 'up' ? TrendingUp : Minus
  const trendColor = trend === 'down' ? 'text-green-500' : trend === 'up' ? 'text-red-500' : 'text-slate-400'

  // National averages
  const avgUnemployment = allProvinces.reduce((s, p) => s + p.unemploymentRate, 0) / allProvinces.length
  const avgMatric = allProvinces.reduce((s, p) => s + p.matricPassRate, 0) / allProvinces.length
  const avgElectricity = allProvinces.reduce((s, p) => s + p.stats.housing.electricityAccess, 0) / allProvinces.length

  // Neighbouring provinces for nav (sorted by id for simplicity)
  const sorted = [...allProvinces].sort((a, b) => a.name.localeCompare(b.name))
  const idx = sorted.findIndex(p => p.id === province.id)
  const prev = idx > 0 ? sorted[idx - 1] : sorted[sorted.length - 1]
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : sorted[0]

  const provinceCode = getProvinceCodeFromSlug(province.id)
  const municipalities = provinceCode
    ? [...getMunicipalitiesByProvince(provinceCode)].sort((a, b) => b.population2022 - a.population2022)
    : []

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Provinces', path: '/provinces' },
    { name: province.name, path: `/provinces/${province.id}` },
  ]

  return (
    <div className="container-page py-10 space-y-8">
      <JsonLd
        data={[
          breadcrumbSchema(breadcrumbs),
          provincePlaceSchema(province.name, `/provinces/${province.id}`, description),
        ]}
      />
      {/* Breadcrumb */}
      <Breadcrumbs items={breadcrumbs} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
            <h1 className="font-display text-3xl font-semibold text-slate-900 dark:text-white">
              {province.name}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-3">
            <MapPin size={13} />
            Capital: {province.capital}
          </div>
          {description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Unemployment spotlight */}
        <div className="card p-5 min-w-[180px]">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Official Unemployment Rate (LU1)</p>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-900 dark:text-white">{unem.rate}%</span>
            <span className={cn('flex items-center gap-0.5 text-sm font-medium', trendColor)}>
              <TrendIcon size={14} />
              {Math.abs(unem.change).toFixed(1)}pp
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{unem.period} · Rank #{province.unemploymentRank} lowest</p>
          {unem.lu3 !== undefined && (
            <div className="mt-2 text-xs text-slate-500">
              Unemployment + potential labour force (LU3): <span className="font-medium text-slate-700 dark:text-slate-300">{unem.lu3}%</span>
            </div>
          )}
          <div className="mt-1 text-xs text-slate-400">
            Expanded: <span className="font-medium text-slate-700 dark:text-slate-300">{unem.expanded}%</span>
            <span className="text-[11px] block text-slate-400">Legacy measure (Q3 2025)</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            National avg: {avgUnemployment.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatBlock
          label="Population (2026 est.)"
          value={(province.population / 1_000_000).toFixed(2) + 'M'}
          sub={`${province.populationShare}% of SA (MYPE 2026)`}
          icon={Users}
          color="bg-blue-500"
        />
        <StatBlock
          label="GDP Share"
          value={province.gdpShare + '%'}
          sub="of national GDP"
          icon={BarChart3}
          color="bg-brand-600"
        />
        <StatBlock
          label="Matric Pass"
          value={province.matricPassRate + '%'}
          sub={'2024 · avg ' + avgMatric.toFixed(1) + '%'}
          icon={GraduationCap}
          color="bg-purple-500"
        />
        <StatBlock
          label="Electricity Access"
          value={housing.electricityAccess + '%'}
          sub={'of households · avg ' + avgElectricity.toFixed(1) + '%'}
          icon={Zap}
          color="bg-amber-500"
        />
      </div>

      {/* Detailed stats */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Labour */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Labour Market</h3>
          <StatRow label="Unemployment (official LU1)" value={unem.rate + '%'} sub={unem.period} highlight={unem.rate > avgUnemployment ? 'bad' : 'good'} />
          {unem.lu3 !== undefined && (
            <StatRow
              label="Unemployment + potential labour force (LU3)"
              value={unem.lu3 + '%'}
              sub={unem.period}
            />
          )}
          <StatRow
            label="Expanded unemployment (legacy)"
            value={unem.expanded + '%'}
            sub="Q3 2025 legacy"
          />
          <StatRow label="National rank" value={'#' + province.unemploymentRank + ' lowest'} />
          <StatRow label="Change (qoq)" value={(unem.change > 0 ? '+' : '') + unem.change.toFixed(1) + 'pp'} highlight={unem.change < 0 ? 'good' : unem.change > 0 ? 'bad' : 'neutral'} />
        </div>

        {/* Education */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Education</h3>
          <StatRow label="Matric pass rate" value={edu.matricPassRate + '%'} sub={String(edu.year)} highlight={edu.matricPassRate > avgMatric ? 'good' : 'neutral'} />
          <StatRow label="Literacy rate" value={edu.literacyRate + '%'} />
          <StatRow label="vs national avg" value={(edu.matricPassRate - avgMatric).toFixed(1) + 'pp'} highlight={edu.matricPassRate > avgMatric ? 'good' : 'bad'} />
        </div>

        {/* Housing & Services */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Services & Housing</h3>
          <StatRow label="Electricity access" value={housing.electricityAccess + '%'} highlight={housing.electricityAccess > avgElectricity ? 'good' : 'neutral'} />
          <StatRow label="Piped water (in dwelling)" value={housing.pipedWaterInDwelling + '%'} />
          <StatRow label="Formal dwellings" value={housing.formalDwellings + '%'} />
          <StatRow label="Urban population" value={pop.urban + '%'} />
        </div>
      </div>

      {/* National context bar */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Provincial Ranking — Unemployment</h3>
        <div className="space-y-2">
          {[...allProvinces]
            .sort((a, b) => a.unemploymentRate - b.unemploymentRate)
            .map((p) => {
              const pColor = PROVINCE_COLORS[p.id] ?? '#64748b'
              const isThis = p.id === province.id
              return (
                <div key={p.id} className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                  isThis ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}>
                  <Link href={`/provinces/${p.id}`} className="contents">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: pColor }} />
                    <span className={cn(
                      'text-sm flex-1',
                      isThis ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                    )}>
                      {p.name}
                    </span>
                    <div className="flex-1 max-w-[200px]">
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${(p.unemploymentRate / 45) * 100}%`, backgroundColor: pColor }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300 w-12 text-right">
                      {p.unemploymentRate}%
                    </span>
                  </Link>
                </div>
              )
            })}
        </div>
        <p className="text-xs text-slate-400 mt-3">Source: Stats SA QLFS Q2 2026</p>
      </div>

      {/* Municipalities in this province */}
      {municipalities.length > 0 && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Municipalities in {province.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Population figures based on Census 2022 baseline</p>
            </div>
            <Link
              href="/municipalities"
              className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              View all municipalities →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {municipalities.map((m) => (
              <Link
                key={m.id}
                href={`/municipalities/${m.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 text-sm hover:border-brand-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="font-medium text-slate-800 dark:text-slate-200">{m.name}</span>
                <span className="font-mono text-xs text-slate-400">
                  {m.population2022.toLocaleString('en-ZA')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Province navigation */}
      <div className="flex gap-4">
        <Link
          href={`/provinces/${prev.id}`}
          className="flex-1 card p-4 flex items-center gap-3 hover:shadow-md transition-all group"
        >
          <ArrowLeft size={16} className="text-slate-400 group-hover:text-brand-600 transition-colors" />
          <div>
            <p className="text-xs text-slate-400">Previous</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{prev.name}</p>
          </div>
        </Link>
        <Link
          href={`/provinces/${next.id}`}
          className="flex-1 card p-4 flex items-center justify-end gap-3 hover:shadow-md transition-all group text-right"
        >
          <div>
            <p className="text-xs text-slate-400">Next</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{next.name}</p>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-brand-600 transition-colors" />
        </Link>
      </div>
    </div>
  )
}
