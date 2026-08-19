'use client'

/**
 * src/components/stories/StoryChapterText.tsx
 *
 * A single scrollama step — the narrative side of a story chapter.
 * Renders heading, body paragraphs, pull quote, and source attribution.
 *
 * Uses framer-motion for a subtle fade-in that respects prefers-reduced-motion.
 * No state — purely presentational. Active state is driven by the parent.
 */

import { motion, useReducedMotion } from 'framer-motion'
import { Quote } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StoryChapter } from '@/types/scroll-story'
import type { Statistic } from '@/types'

interface StoryChapterTextProps {
  chapter: StoryChapter
  isActive: boolean
  /** Pre-fetched stat objects keyed by stat ID */
  statMap: Map<string, Statistic>
  /** Chapter index (0-based) */
  index: number
}

export function StoryChapterText({
  chapter,
  isActive,
  statMap,
  index,
}: StoryChapterTextProps) {
  const reduced = useReducedMotion()

  // Citation stats for this chapter
  const citationStats = (chapter.citationStatIds ?? [])
    .map((id) => statMap.get(id))
    .filter((s): s is Statistic => s !== undefined)

  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={
        isActive
          ? { opacity: 1, y: 0 }
          : reduced
          ? { opacity: 0.45 }
          : { opacity: 0.35, y: 4 }
      }
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'rounded-2xl border p-6 transition-colors duration-300 lg:p-8',
        isActive
          ? 'border-brand-200 bg-white shadow-sm dark:border-brand-900/40 dark:bg-slate-900'
          : 'border-transparent bg-slate-50/60 dark:bg-slate-900/40'
      )}
    >
      {/* Chapter number + heading */}
      <div className="mb-5">
        <span className="mb-2 block font-mono text-xs font-medium tracking-widest text-brand-500 dark:text-brand-400">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h2 className="font-display text-xl font-semibold leading-snug text-slate-900 dark:text-white sm:text-2xl">
          {chapter.heading}
        </h2>
      </div>

      {/* Body paragraphs */}
      <div className="space-y-4">
        {chapter.body.split('\n\n').map((para, i) => (
          <p
            key={i}
            className="text-base leading-[1.75] text-slate-600 dark:text-slate-300"
          >
            {para}
          </p>
        ))}
      </div>

      {/* Pull quote */}
      {chapter.highlight && (
        <blockquote className="my-6 flex gap-3 rounded-xl border-l-4 border-brand-400 bg-brand-50/60 px-5 py-4 dark:border-brand-600 dark:bg-brand-950/20">
          <Quote
            size={16}
            className="mt-0.5 shrink-0 text-brand-400 dark:text-brand-500"
          />
          <p className="text-base font-medium italic leading-relaxed text-slate-700 dark:text-slate-200">
            {chapter.highlight}
          </p>
        </blockquote>
      )}

      {/* Citation row */}
      {citationStats.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          {citationStats.map((stat) => (
            <a
              key={stat.id}
              href={stat.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              {stat.source.shortName}
            </a>
          ))}
        </div>
      )}
    </motion.div>
  )
}
