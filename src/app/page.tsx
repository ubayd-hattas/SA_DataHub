import Link from 'next/link'
import { ArrowRight, Database, RefreshCw, Shield } from 'lucide-react'
import type { Metadata } from 'next'
import { SearchBar } from '@/components/ui/SearchBar'
import { StatCard } from '@/components/ui/StatCard'
import { CategoryCard } from '@/components/ui/CategoryCard'
import { ExplainerCard } from '@/components/explainers/ExplainerCard'
import { EXPLAINERS } from '@/data/explainers'
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
  // Explainers checked in the most recent month with one.
  const latestMonth = EXPLAINERS.map((e) => e.publishedOn.slice(0, 7)).sort().at(-1)
  const latestExplainers = EXPLAINERS.filter((e) => e.publishedOn.startsWith(latestMonth ?? ''))

  return (
    <div className="animate-fade-in">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-950 to-slate-950 px-4 py-20 text-white sm:py-28">
        {/* Subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Gold accent orb */}
        <div className="pointer-events-none absolute right-1/4 top-0 h-72 w-72 -translate-y-1/2 rounded-full bg-gold-400 opacity-10 blur-3xl" aria-hidden="true" />

        <div className="container-page relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" aria-hidden="true" />
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
                  className="rounded-full bg-white/5 px-3 py-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── What changed this month ───────────────────────────────────────── */}
      <section className="border-b border-slate-200 py-16 dark:border-slate-800" aria-labelledby="what-changed">
        <div className="container-page">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="section-label mb-2">Latest releases</p>
              <h2 id="what-changed" className="heading-display text-2xl font-semibold">
                What changed this month
              </h2>
            </div>
            <Link
              href="/explainers"
              className="flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              All explainers <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {latestExplainers.map((e) => (
              <ExplainerCard key={e.slug} explainer={e} />
            ))}
          </div>
          <p className="mt-6 text-small text-ink">
            What was money worth?{' '}
            <Link href="/tools/money-value" className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
              Use the money value calculator
            </Link>
          </p>
        </div>
      </section>

      {/* ── Featured Stats ─────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 dark:border-slate-800 py-16">
        <div className="container-page">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="section-label mb-2">Key indicators</p>
              <h2 className="heading-display text-2xl font-semibold">
                Latest headline statistics
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                From Stats SA, SARB, and other official sources
              </p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              View all <ArrowRight size={14} aria-hidden="true" />
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
          <div className="mb-8">
            <p className="section-label mb-2">Explore</p>
            <h2 className="heading-display text-2xl font-semibold">Browse by category</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Dive deep into any area of South African public life
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Insights Promo ─────────────────────────────────────────────────── */}
      <section className="border-y border-slate-200 dark:border-slate-800 py-14">
        <div className="container-page">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-lg">
              <p className="section-label mb-2">Data Stories</p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Beyond the numbers
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Understand what the statistics actually mean. Data-driven narratives on unemployment, inflation,
                youth employment, provincial inequality, and more.
              </p>
            </div>
            <Link
              href="/insights"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Read the stories <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Mission ───────────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="container-page">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <p className="section-label mb-2">Mission</p>
              <h2 className="heading-display text-2xl font-semibold">Why SA Data Hub?</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Government data should be accessible to every South African — not just researchers and policymakers.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
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
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950/40" aria-hidden="true">
                    <Icon size={22} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{title}</h3>
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
