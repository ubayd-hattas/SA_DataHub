import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, RefreshCw, BookOpen } from 'lucide-react'
import { StatCallout } from '@/components/ui/StatCallout'
import { DeltaBadge, getDeltaSemantics } from '@/components/ui/DeltaBadge'
import { StoryCard } from '@/components/ui/StoryCard'
import { FreshnessIndicator } from '@/components/ui/FreshnessIndicator'
import { getAppDataProvider } from '@/data/providers'
import { getStoryBySlug, getRelatedStories, STORIES } from '@/data/stories'
import { getScrollStoryBySlug, getScrollStoryStatIds } from '@/data/scroll-stories'
import { StoryScrollPage } from '@/components/stories/StoryScrollPage'
import { cn, getGoodDirection } from '@/lib/utils'
import { buildPageMetadata, AUTHOR } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { articleSchema, breadcrumbSchema } from '@/lib/schema'

interface StoryPageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return STORIES.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const story = getStoryBySlug(slug)
  if (!story) return {}
  return buildPageMetadata({
    title: story.title,
    description: story.summary,
    path: `/insights/${story.slug}`,
    ogType: 'article',
    publishedTime: story.publishedDate,
    modifiedTime: story.lastUpdated,
    authors: [AUTHOR.name],
    tags: story.tags,
  })
}

const STORY_CATEGORY_LINKS: Record<string, { href: string; label: string }> = {
  unemployment: { href: '/category/unemployment', label: 'Unemployment data' },
  economy: { href: '/category/gdp', label: 'GDP & economy data' },
  inflation: { href: '/category/inflation', label: 'Inflation data' },
  crime: { href: '/category/crime', label: 'Crime statistics' },
  education: { href: '/category/education', label: 'Education data' },
  population: { href: '/category/population', label: 'Population data' },
  housing: { href: '/category/housing', label: 'Housing data' },
  policy: { href: '/methodology', label: 'Methodology' },
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

export default async function StoryPage({ params }: StoryPageProps) {
  const { slug } = await params
  const story = getStoryBySlug(slug)
  if (!story) return notFound()

  const scrollStory = getScrollStoryBySlug(slug)
  const provider = await getAppDataProvider()
  const related = getRelatedStories(slug)
  const catColor = categoryColors[story.category] ?? categoryColors.policy

  const storyStatIds = scrollStory
    ? getScrollStoryStatIds(scrollStory)
    : Array.from(
        new Set([
          ...story.relatedStatIds,
          ...story.sections.flatMap((section) => section.statCallouts ?? []),
        ])
      )
  const relatedStats = await provider.getStatsByIds(storyStatIds)
  const relatedStatMap = new Map(relatedStats.map((stat) => [stat.id, stat]))

  const primarySource = relatedStats[0]?.source
  const categoryLink = STORY_CATEGORY_LINKS[story.category]

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Insights', path: '/insights' },
    { name: story.title, path: `/insights/${story.slug}` },
  ]

  return (
    <div className="animate-fade-in py-8">
      <JsonLd data={[breadcrumbSchema(breadcrumbs), articleSchema(story)]} />
      <div className="container-page">

        <Breadcrumbs items={breadcrumbs} className="mb-6" />

        {/* Back */}
        <Link
          href="/insights"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={14} aria-hidden="true" /> All stories
        </Link>

        <div className="mx-auto max-w-3xl">

          {/* ── Article header ──────────────────────────────────────────── */}
          <header className="mb-10">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-3xl" aria-hidden="true">{story.coverEmoji}</span>
              <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', catColor)}>
                {story.categoryLabel}
              </span>
              {story.featured && (
                <span className="rounded-full bg-gold-400/20 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-gold-300">
                  Featured
                </span>
              )}
            </div>

            <h1 className="heading-display text-3xl font-semibold leading-tight sm:text-4xl">
              {story.title}
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-slate-500 dark:text-slate-400">
              {story.subtitle}
            </p>

            {/* Byline */}
            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-5 text-xs text-slate-400 dark:border-slate-800">
              <span>
                By{' '}
                <a
                  href={AUTHOR.url}
                  rel="author me"
                  className="font-medium text-slate-500 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                >
                  {AUTHOR.name}
                </a>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={12} aria-hidden="true" />
                <time dateTime={story.publishedDate}>
                  {new Date(story.publishedDate).toLocaleDateString('en-ZA', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </time>
              </span>
              <span className="flex items-center gap-1.5">
                <RefreshCw size={12} aria-hidden="true" />
                Updated{' '}
                <time dateTime={story.lastUpdated}>
                  {new Date(story.lastUpdated).toLocaleDateString('en-ZA', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </time>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={12} aria-hidden="true" />
                {story.readingTimeMinutes} min read
              </span>
            </div>
          </header>
        </div>

        {/* ── Scroll story or standard story ───────────────────────────── */}
        {scrollStory ? (
          <div className="mt-8">
            <StoryScrollPage story={scrollStory} stats={relatedStats} />
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">

            {/* Table of contents */}
            {story.sections.length > 2 && (
              <nav
                className="mb-10 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/50"
                aria-label="Table of contents"
              >
                <div className="mb-3 flex items-center gap-2">
                  <BookOpen size={13} className="text-slate-400" aria-hidden="true" />
                  <p className="section-label">Contents</p>
                </div>
                <ol className="space-y-1.5">
                  {story.sections.map((section, i) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="flex gap-3 text-sm text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400"
                      >
                        <span className="shrink-0 font-mono text-slate-400">{String(i + 1).padStart(2, '0')}</span>
                        {section.heading}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* Key statistics */}
            {relatedStats.length > 0 && (
              <div className="mb-10">
                <p className="section-label mb-4">Key statistics in this story</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {relatedStats.slice(0, 4).map((stat) => stat && (
                    <div key={stat.id} className="card overflow-hidden p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{stat.title}</p>
                        <DeltaBadge
                          delta={stat.change}
                          trend={stat.trend}
                          semantics={getDeltaSemantics(stat.trend, getGoodDirection(stat))}
                          unit={stat.unit}
                          className="shrink-0"
                        />
                      </div>
                      <p className="mt-2 font-mono text-2xl font-medium tabular-nums text-slate-900 dark:text-white">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {stat.changeLabel} · {stat.source.shortName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Article body — prose-story CSS now defined in globals.css */}
            <article className="prose-story">
              {story.sections.map((section) => {
                const sectionStats = (section.statCallouts ?? [])
                  .map((id) => relatedStatMap.get(id))
                  .filter(Boolean)

                return (
                  <section key={section.id} id={section.id} className="scroll-mt-24">
                    <h2>{section.heading}</h2>

                    {section.body.split('\n\n').map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}

                    {section.highlight && (
                      <blockquote>
                        <p>"{section.highlight}"</p>
                      </blockquote>
                    )}

                    {sectionStats.map((stat) => stat && (
                      <StatCallout key={stat.id} stat={stat} />
                    ))}
                  </section>
                )
              })}
            </article>

            {/* Tags */}
            {story.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2 border-t border-slate-100 pt-6 dark:border-slate-800">
                <span className="section-label self-center">Tags</span>
                {story.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Related dataset link */}
            {categoryLink && (
              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                Explore the underlying data:{' '}
                <Link href={categoryLink.href} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                  {categoryLink.label}
                </Link>
              </p>
            )}

            {/* Data freshness */}
            {primarySource && (
              <div className="mt-8">
                <p className="section-label mb-3">Data currency</p>
                <FreshnessIndicator
                  lastUpdated={story.lastUpdated}
                  source={primarySource}
                  updateFrequency="Quarterly"
                />
              </div>
            )}
          </div>
        )}

        {/* ── Related stories ──────────────────────────────────────────── */}
        {related.length > 0 && (
          <div className="mt-20 border-t border-slate-100 pt-12 dark:border-slate-800">
            <div className="mx-auto max-w-3xl">
              <p className="section-label mb-5">Related stories</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {related.map((s) => (
                  <StoryCard key={s.slug} story={s} />
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
