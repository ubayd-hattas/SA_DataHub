import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, MapPin } from 'lucide-react'
import { ProvinceData } from '@/types'
import { cn } from '@/lib/utils'

interface ProvinceCardProps {
  province: ProvinceData
  metric?: 'unemployment' | 'education' | 'housing'
}

export function ProvinceCard({ province, metric = 'unemployment' }: ProvinceCardProps) {
  const unem = province.stats.unemployment
  const TrendIcon = unem.trend === 'up' ? TrendingUp : unem.trend === 'down' ? TrendingDown : Minus
  const trendColor = unem.trend === 'down'
    ? 'text-brand-600 dark:text-brand-400'
    : unem.trend === 'up'
    ? 'text-red-500 dark:text-red-400'
    : 'text-slate-500'

  return (
    <Link
      href={`/provinces/${province.id}`}
      className="card group flex flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {province.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
            <MapPin size={10} />
            {province.capital}
          </div>
        </div>
        <span className="shrink-0 text-xs font-medium text-slate-400">
          #{province.unemploymentRank} lowest
        </span>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Unemployment</p>
          <div className="flex items-baseline gap-1.5">
            <p className="font-mono text-xl font-medium text-slate-900 dark:text-white">
              {unem.rate}%
            </p>
            <span className={cn('flex items-center gap-0.5 text-xs font-medium', trendColor)}>
              <TrendIcon size={11} />
              {Math.abs(unem.change).toFixed(1)}pp
            </span>
          </div>
          <p className="text-xs text-slate-400">{unem.period}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Matric Pass</p>
          <p className="font-mono text-xl font-medium text-slate-900 dark:text-white">
            {province.matricPassRate}%
          </p>
          <p className="text-xs text-slate-400">2024</p>
        </div>
      </div>

      {/* Population bar */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>Population share</span>
          <span>{province.populationShare}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-1.5 rounded-full bg-brand-400"
            style={{ width: `${Math.min(province.populationShare * 4, 100)}%` }}
          />
        </div>
      </div>
    </Link>
  )
}
