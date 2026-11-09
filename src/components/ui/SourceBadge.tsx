import { ExternalLink } from 'lucide-react'
import { DataSource } from '@/types'
import { cn } from '@/lib/utils'

interface SourceBadgeProps {
  source: DataSource
  className?: string
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  return (
    <div className={cn('flex items-start gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50', className)}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Data Source</p>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{source.name}</p>
        {source.publicationName && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{source.publicationName}</p>
        )}
        {source.publicationDate && (
          <p className="text-xs text-muted">
            Published{' '}
            {new Date(source.publicationDate).toLocaleDateString('en-ZA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
      </div>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/30 transition-colors"
      >
        Visit source
        <ExternalLink size={11} />
      </a>
    </div>
  )
}
