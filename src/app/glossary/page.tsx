import Link from 'next/link'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { Column, PageHeader, Section, linkClass } from '@/components/editorial/Section'
import { GLOSSARY, GLOSSARY_PATH, GLOSSARY_TOPICS } from '@/data/glossary'
import { getSeries, seriesHref } from '@/lib/series'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  title: 'Glossary: the terms behind South African statistics',
  description:
    'What the unemployment rate, labour force, inflation rate, mid-year estimate, GDP growth and the ballots in a local election mean, each with Stats SA’s own definition and page.',
  path: GLOSSARY_PATH,
})

export default function GlossaryPage() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Glossary', path: GLOSSARY_PATH },
  ]
  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        kicker="About the data"
        title="Glossary"
        lede="What the words in South African statistics mean. Each term has a one-line explanation, then the publisher's own definition, quoted with the page it comes from."
      >
        <nav aria-label="Glossary topics" className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-small">
          {GLOSSARY_TOPICS.map((t) => (
            <a key={t.id} href={`#topic-${t.id}`} className={linkClass}>
              {t.label}
            </a>
          ))}
        </nav>
      </PageHeader>

      {GLOSSARY_TOPICS.map((topic) => (
        <Section key={topic.id} id={`topic-${topic.id}`} title={topic.label}>
          <dl className="space-y-8">
            {GLOSSARY.filter((t) => t.topic === topic.id).map((t) => {
              const series = (t.seriesIds ?? []).map(getSeries).filter((s) => s !== undefined)
              return (
                <div key={t.slug} id={t.slug} className="scroll-mt-20">
                  <dt className="font-display text-h3 font-semibold text-ink">{t.term}</dt>
                  <dd className="mt-2 text-body text-ink">{t.plain}</dd>
                  {t.official && (
                    <dd className="mt-3">
                      <blockquote className="m-0 border-l-2 border-rule pl-4 text-small italic text-ink">
                        &ldquo;{t.official.text}&rdquo;
                      </blockquote>
                      <p className="mt-1 text-caption text-muted">
                        {t.official.source.document}, {t.official.source.location}.
                      </p>
                    </dd>
                  )}
                  {(series.length > 0 || t.links?.length) && (
                    <dd className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-small">
                      {series.map((s) => (
                        <Link key={s.id} href={seriesHref(s.id)} className={linkClass}>
                          {s.title}
                        </Link>
                      ))}
                      {t.links?.map((l) => (
                        <Link key={l.href} href={l.href} className={linkClass}>
                          {l.label}
                        </Link>
                      ))}
                    </dd>
                  )}
                </div>
              )
            })}
          </dl>
        </Section>
      ))}
    </Column>
  )
}
