'use client'

/**
 * src/components/stories/StoryStatCallout.tsx
 *
 * Enhanced version of the existing StatCallout, specifically for use inside
 * the scroll story flow. Provides a slightly more compact layout suited to the
 * narrative column width.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Statistic } from '@/types'
import { cn, getTrendBadgeClass, isGoodWhenDown } from '@/lib/utils'

interface StoryStatCalloutProps {
  stat: Statistic
  className?: string
}

export function StoryStatCallout({ stat, className }: StoryStatCalloutProps) {
  const goodDown = isGoodWhenDown(stat.categoryId)
  const badgeClass = getTrendBadgeClass(stat.trend, goodDown)
  const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Minus

  return (
    <div className={cn(
      'my-6 flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900',
      className
    )}>
      <div className="flex-shrink-0">
        <p className="font-mono text-3xl font-medium tabular-nums leading-none text-slate-900 dark:text-white">
          {stat.value}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className={cn('flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium', badgeClass)}>
            <TrendIcon size={10} />
            {Math.abs(stat.change).toFixed(1)}{stat.unit === '%' ? 'pp' : '%'}
          </span>
        </div>
      </div>
      
      <div className="flex-1 min-w-0 border-l border-slate-100 pl-4 dark:border-slate-800">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{stat.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2 dark:text-slate-400">
          {stat.description}
        </p>
      </div>
    </div>
  )
}
