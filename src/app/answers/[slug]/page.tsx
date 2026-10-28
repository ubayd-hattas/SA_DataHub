import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ANSWERS, ANSWERS_PATH, getAnswer } from '@/data/answers'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { Column, PageHeader, Prose, Section, linkClass } from '@/components/editorial/Section'
import { ChartFigure } from '@/components/editorial/ChartFigure'
import { BarList } from '@/components/editorial/BarList'
import { SourceLine } from '@/components/editorial/SourceLine'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

interface AnswerPageProps {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return ANSWERS.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: AnswerPageProps): Promise<Metadata> {
  const a = getAnswer((await params).slug)
  if (!a) return {}
  return buildPageMetadata({ title: a.question, description: a.answer, path: `${ANSWERS_PATH}/${a.slug}`, ogType: 'article' })
}

export default async function AnswerPage({ params }: AnswerPageProps) {
  const a = getAnswer((await params).slug)
  if (!a) notFound()
  const related = a.related.map((s) => getAnswer(s)!).filter(Boolean)
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Answers', path: ANSWERS_PATH },
    { name: a.question, path: `${ANSWERS_PATH}/${a.slug}` },
  ]
  const sources = (
    <div className="space-y-1">
      {a.sources.map((s) => (
        <SourceLine key={`${s.title}-${s.location}`} {...s} />
      ))}
    </div>
  )

  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      {/* The answer is the standfirst: nothing sits between the question and its answer. */}
      <PageHeader title={a.question} lede={a.answer} />

      <section aria-label="The figures" className="border-t border-rule py-10">
        <ChartFigure title={a.figure.title} source={sources}>
          {a.figure.kind === 'bars' ? (
            <BarList max={a.figure.max} bars={a.figure.rows.map((r) => ({ label: r.label, value: r.value, display: r.display, note: r.note }))} />
          ) : (
            <ol className="text-small">
              {a.figure.rows.map((r, i) => (
                <li key={`${r.label}-${i}`} className="flex items-baseline justify-between gap-3 border-t border-rule py-2">
                  <span className="min-w-0">
                    {r.href ? (
                      <Link href={r.href} className={linkClass}>
                        {r.label}
                      </Link>
                    ) : (
                      r.label
                    )}
                    {r.note && <span className="block text-caption text-muted">{r.note}</span>}
                  </span>
                  <span className="shrink-0 text-right tabular-nums text-ink">{r.display}</span>
                </li>
              ))}
            </ol>
          )}
        </ChartFigure>
        {a.figure.kind === 'bars' && a.figure.rows.some((r) => r.href) && (
          <p className="mt-4 text-small text-muted">
            Open:{' '}
            {a.figure.rows
              .filter((r) => r.href)
              .map((r, i, list) => (
                <span key={r.href}>
                  <Link href={r.href!} className={linkClass}>
                    {r.label}
                  </Link>
                  {i < list.length - 1 ? ', ' : ''}
                </span>
              ))}
          </p>
        )}
      </section>

      <Section id="method" title="How this was worked out">
        <Prose>
          {a.method.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </Prose>
      </Section>

      <Section id="related" title="Related questions">
        <ul className="space-y-2 text-body">
          {related.map((r) => (
            <li key={r.slug}>
              <Link href={`${ANSWERS_PATH}/${r.slug}`} className={linkClass}>
                {r.question}
              </Link>
            </li>
          ))}
          <li>
            <Link href={ANSWERS_PATH} className={linkClass}>
              All questions
            </Link>
          </li>
        </ul>
      </Section>
    </Column>
  )
}
