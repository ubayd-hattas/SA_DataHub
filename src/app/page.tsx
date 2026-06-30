import Link from 'next/link'
import { ArrowRight, Database, RefreshCw, Shield } from 'lucide-react'
import type { Metadata } from 'next'
import { SearchBar } from '@/components/ui/SearchBar'
import { StatCard } from '@/components/ui/StatCard'
import { CategoryCard } from '@/components/ui/CategoryCard'
import { getAppDataProvider } from '@/data/providers'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  title: 'South African Public Data',
  description:
    'Explore South African public data — unemployment, GDP, inflation, crime, education, population, housing, and census statistics from Stats SA and official government sources.',
  path: '/',
})

export default async function HomePage() {
  const provider = await getAppDataProvider()
  const [featuredStats, categories] = await Promise.all([
    provider.getFeaturedStats(),
    provider.getCategories(),
  ])

  return (
    <div className="animate-fade-in">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-950 to-slate-950 px-4 py-20 text-white sm:py-28">
        {/* Subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Gold accent orb */}
        <div className="pointer-events-none absolute right-1/4 top-0 h-72 w-72 -translate-y-1/2 rounded-full bg-gold-400 opacity-10 blur-3xl" />

        <div className="container-page relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
              Updated regularly from official SA government sources
            </div>

            <h1 className="heading-display mb-6 text-5xl font-normal leading-tight text-white sm:text-6xl lg:text-7xl">
              South Africa's data,{' '}
              <span className="text-brand-400">made clear</span>
            </h1>

            <p className="mb-10 text-lg leading-relaxed text-white/60">
              Explore unemployment, GDP, crime, education, and more — sourced directly from Stats SA and other
              official bodies, presented without the complexity.
            </p>

            {/* Search */}
            <div className="mx-auto max-w-xl">
              <SearchBar size="lg" placeholder="Search stats — try 'unemployment' or 'matric'…" />
            </div>

            {/* Quick links */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-white/40">Popular:</span>
              {['Unemployment', 'GDP Growth', 'Inflation', 'Matric Pass Rate'].map((label) => (
                <Link
                  key={label}
                  href={`/dashboard?search=${encodeURIComponent(label)}`}
                  className="rounded-full bg-white/5 px-3 py-1 text-white/60 hover:bg-white/10 hover:text-white/90 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Stats ─────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 dark:border-slate-800 py-16">
        <div className="container-page">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="heading-display text-2xl font-semibold">Key indicators</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Latest headline statistics from official sources
              </p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredStats.map((stat) => (
              <StatCard
                key={stat.id}
                stat={stat}
                href={`/category/${stat.categoryId}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Category Grid ──────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="container-page">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="heading-display text-2xl font-semibold">Browse by category</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Dive deep into any area of South African public life
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Insights Promo ─────────────────────────────────────────────────── */}
      <section className="border-y border-slate-200 dark:border-slate-800 bg-gradient-to-r from-brand-950 to-slate-900 py-14">
        <div className="container-page">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-2">Data Stories</p>
              <h2 className="text-2xl font-semibold text-white mb-2">Beyond the numbers</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Understand what the statistics actually mean. Data-driven narratives on unemployment, inflation,
                youth employment, provincial inequality, and more.
              </p>
            </div>
            <Link
              href="/insights"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
            >
              Read the stories <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Mission ───────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 py-16">
        <div className="container-page">
          <div className="mx-auto max-w-3xl">
            <h2 className="heading-display mb-4 text-center text-2xl font-semibold">Why SA Data Hub?</h2>
            <p className="mb-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Government data should be accessible to every South African — not just researchers and policymakers.
            </p>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                {
                  icon: Database,
                  title: 'Official sources only',
                  desc: 'Every statistic is sourced directly from Stats SA, the Reserve Bank, SAPS, and other authorised government bodies.',
                },
                {
                  icon: RefreshCw,
                  title: 'Regularly updated',
                  desc: 'Data is refreshed whenever official publications are released — quarterly for labour and GDP, monthly for inflation.',
                },
                {
                  icon: Shield,
                  title: 'No spin, no agenda',
                  desc: 'We present the data as-is. Context is provided, but interpretation is left to you. No advertising, no paywalls.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-950/40">
                    <Icon size={20} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <h3 className="mb-1.5 font-semibold text-slate-900 dark:text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
