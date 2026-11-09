import { Clock, RefreshCw, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { DataSource } from '@/types'
import { cn, getFreshness, formatRelativeDate, formatAbsoluteDate, FreshnessStatus } from '@/lib/utils'

interface FreshnessIndicatorProps {
  lastUpdated: string        // ISO date string
  source: DataSource
  updateFrequency?: string   // e.g. "Monthly", "Quarterly", "Annual"
  className?: string
  compact?: boolean
}

const statusConfig: Record<FreshnessStatus, {
  label: string
  icon: typeof CheckCircle
  textClass: string
  bgClass: string
  borderClass: string
}> = {
  fresh: {
    label: 'Up to date',
    icon: CheckCircle,
    textClass: 'text-brand-700 dark:text-brand-300',
    bgClass: 'bg-brand-50 dark:bg-brand-950/30',
    borderClass: 'border-brand-200 dark:border-brand-800',
  },
  recent: {
    label: 'Recent',
    icon: CheckCircle,
    textClass: 'text-slate-600 dark:text-slate-300',
    bgClass: 'bg-slate-50 dark:bg-slate-800/50',
    borderClass: 'border-slate-200 dark:border-slate-700',
  },
  aging: {
    label: 'Due for update',
    icon: AlertTriangle,
    textClass: 'text-amber-700 dark:text-amber-300',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-200 dark:border-amber-800',
  },
  stale: {
    label: 'May be outdated',
    icon: AlertCircle,
    textClass: 'text-red-700 dark:text-red-300',
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    borderClass: 'border-red-200 dark:border-red-800',
  },
}

export function FreshnessIndicator({
  lastUpdated,
  source,
  updateFrequency,
  className,
  compact = false,
}: FreshnessIndicatorProps) {
  const status = getFreshness(lastUpdated, updateFrequency)
  const config = statusConfig[status]
  const StatusIcon = config.icon

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs', className)}>
        <Clock size={11} className="text-muted shrink-0" />
        <span className="text-slate-500 dark:text-slate-400">
          {formatRelativeDate(lastUpdated)}
        </span>
        <span className="text-slate-300 dark:text-slate-700">·</span>
        <span className={cn('font-medium', config.textClass)}>{config.label}</span>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border p-4', config.bgClass, config.borderClass, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Status badge */}
          <div className="mb-2 flex items-center gap-1.5">
            <StatusIcon size={13} className={config.textClass} />
            <span className={cn('text-xs font-semibold', config.textClass)}>{config.label}</span>
          </div>

          {/* Date info */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Clock size={11} className="text-muted shrink-0" />
              <span>
                Last updated:{' '}
                <strong className="font-medium">{formatAbsoluteDate(lastUpdated)}</strong>
                {' '}({formatRelativeDate(lastUpdated)})
              </span>
            </div>

            {updateFrequency && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <RefreshCw size={11} className="text-muted shrink-0" />
                <span>Update frequency: <strong className="font-medium text-slate-600 dark:text-slate-300">{updateFrequency}</strong></span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="text-muted">Source:</span>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-600 underline underline-offset-2 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400"
              >
                {source.name}
              </a>
            </div>

            {(source.publicationName ?? source.release) && (
              <div className="text-xs text-muted">
                {source.publicationName ?? source.release}
                {source.publicationDate && (
                  <span> · {formatAbsoluteDate(source.publicationDate)}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
