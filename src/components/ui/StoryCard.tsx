import Link from 'next/link'
import { Clock, ArrowRight, Calendar } from 'lucide-react'
import { Story } from '@/types'
import { cn } from '@/lib/utils'

interface StoryCardProps {
  story: Story
  featured?: boolean
}

const categoryColors: Record<string, string> = {
  unemployment: 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300',
  economy:      'bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300',
  inflation:    'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
  crime:        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  education:    'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
  population:   'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300',
  housing:      'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  policy:       'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300',
}

function formatStoryDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function StoryCard({ story, featured = false }: StoryCardProps) {
  const catColor = categoryColors[story.category] ?? categoryColors.policy

  if (featured) {
    return (
      <Link href={`/insights/${story.slug}`} className="group block" aria-label={`Read story: ${story.title}`}>
        <article className="card overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          {/* Top accent strip */}
          <div className="h-1 w-full bg-brand-500" />

          {/* Header band */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl" aria-hidden="true">{story.coverEmoji}</span>
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', catColor)}>
                {story.categoryLabel}
              </span>
              <span className="rounded-full bg-gold-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-gold-300">
                Featured
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
              <Clock size={11} aria-hidden="true" />
              <span>{story.readingTimeMinutes} min read</span>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <h2 className="heading-display text-xl font-semibold leading-snug text-slate-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400 sm:text-2xl">
              {story.title}
            </h2>
            {story.subtitle && (
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{story.subtitle}</p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3">
              {story.summary}
            </p>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar size={11} aria-hidden="true" />
                <time dateTime={story.publishedDate}>{formatStoryDate(story.publishedDate)}</time>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400">
                Read story <ArrowRight size={14} aria-hidden="true" />
              </div>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  return (
    <Link href={`/insights/${story.slug}`} className="group block" aria-label={`Read story: ${story.title}`}>
      <article className="card flex h-full flex-col gap-0 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        {/* Compact meta header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg" aria-hidden="true">{story.coverEmoji}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', catColor)}>
              {story.categoryLabel}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
            <Clock size={10} aria-hidden="true" />
            <span>{story.readingTimeMinutes} min</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex-1">
            <h3 className="font-semibold leading-snug text-slate-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
              {story.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {story.summary}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <time
              dateTime={story.publishedDate}
              className="text-xs text-slate-400"
            >
              {formatStoryDate(story.publishedDate)}
            </time>
            <span className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
              Read <ArrowRight size={11} aria-hidden="true" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
