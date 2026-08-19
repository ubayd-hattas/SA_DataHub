import Link from 'next/link'
import { Clock } from 'lucide-react'
import { Statistic } from '@/types'
import { cn, formatDate, isGoodWhenDown } from '@/lib/utils'
import { DeltaBadge, getDeltaSemantics } from '@/components/ui/DeltaBadge'

interface StatCardProps {
  stat: Statistic
  compact?: boolean
  href?: string
}

export function StatCard({ stat, compact = false, href }: StatCardProps) {
  const goodDown = isGoodWhenDown(stat.categoryId)
  const semantics = getDeltaSemantics(stat.trend, goodDown)

  const content = (
    <div
      className={cn(
        'card group flex flex-col gap-0 overflow-hidden transition-all duration-200',
        href && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
      )}
    >
      {/* Top accent bar — colour-coded by semantics */}
      <div
        className={cn(
          'h-0.5 w-full shrink-0',
          semantics === 'positive' && 'bg-brand-400',
          semantics === 'negative' && 'bg-red-400',
          semantics === 'neutral'  && 'bg-slate-300 dark:bg-slate-700',
          semantics === 'informational' && 'bg-blue-400'
        )}
      />

      <div className="flex flex-col gap-3 p-5">
        {/* Header — label + delta badge */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug text-slate-500 dark:text-slate-400">
            {stat.title}
          </p>
          <DeltaBadge
            delta={stat.change}
            trend={stat.trend}
            semantics={semantics}
            unit={stat.unit}
            className="shrink-0"
          />
        </div>

        {/* Value + unit */}
        <div>
          <div className="flex items-baseline gap-1.5">
            <p className="stat-value">{stat.value}</p>
            {stat.unit && stat.unit !== '%' && (
              <span className="text-sm text-slate-400 dark:text-slate-500">{stat.unit}</span>
            )}
          </div>
          {stat.changeLabel && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{stat.changeLabel}</p>
          )}
        </div>

        {/* Description (only non-compact) */}
        {!compact && (
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3">
            {stat.description}
          </p>
        )}

        {/* Footer — date + source */}
        <div className="flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          <Clock size={11} aria-hidden="true" />
          <span>Updated {formatDate(stat.lastUpdated)}</span>
          <span className="mx-1 text-slate-200 dark:text-slate-700">·</span>
          <span>{stat.source.shortName}</span>
        </div>
      </div>
    </div>
  )

  if (href) return <Link href={href} aria-label={`${stat.title}: ${stat.value}`}>{content}</Link>
  return content
}
