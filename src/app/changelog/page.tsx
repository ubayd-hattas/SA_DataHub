
import type { Metadata } from 'next'
import Link from 'next/link'
import { getChangelog } from '@/lib/changelog'
import { formatDate } from '@/lib/utils'
import { buildPageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/schema'

export const metadata: Metadata = buildPageMetadata({
  title: 'Platform Changelog',
  description:
    'Version history and release notes for SA Data Hub: new features, data additions and platform improvements.',
  path: '/changelog',
})

export default function ChangelogPage() {
  const changelog = getChangelog()
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Changelog', path: '/changelog' },
  ]

  return (
    <div className="animate-fade-in py-8">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <div className="container-page">
        <Breadcrumbs items={breadcrumbs} className="mb-6" />
        {/* Platform Transparency */}
        <section className="mb-12">
          <h1 className="heading-display text-3xl font-semibold mb-4">Platform Changelog</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-2">
            SA Data Hub is a public portal that aggregates South African municipal and national statistics.
          </p>
          <p className="text-slate-600 dark:text-slate-300 mb-2">
            We track platform‑level updates to keep citizens, researchers, and policymakers informed about new features and improvements.
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            Major releases are posted here when a new version (Vx) ships, typically on a quarterly cadence.
          </p>
        </section>

        {/* Release Timeline */}
        <section className="space-y-10">
          {changelog.map((entry) => (
            <article key={entry.version} className="border-l-4 border-brand-600 pl-4">
              <header className="mb-2">
                <h2 className="text-xl font-semibold text-brand-600 dark:text-brand-400">
                  {entry.version}: {entry.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {formatDate(entry.date)}
                </p>
              </header>
              <p className="mb-3 text-slate-700 dark:text-slate-200">{entry.summary}</p>
              <ul className="list-disc list-inside space-y-1">
                {entry.features.map((feat, i) => (
                  <li key={i} className="text-slate-600 dark:text-slate-300">
                    {feat}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}

