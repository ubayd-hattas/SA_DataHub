import Link from 'next/link'
import type { Metadata } from 'next'
import { ANSWERS, ANSWERS_PATH, type Answer } from '@/data/answers'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { Column, PageHeader, Section, linkClass } from '@/components/editorial/Section'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  title: 'Answers: questions about South African statistics',
  description: 'Short, sourced answers to common questions about South Africa: municipalities, population, unemployment, inflation, interest rates and housing.',
  path: ANSWERS_PATH,
})

const GROUPS: { label: string; topics: Answer['topic'][] }[] = [
  { label: 'Municipalities and the census', topics: ['municipalities', 'census'] },
  { label: 'Population', topics: ['population'] },
  { label: 'Jobs and unemployment', topics: ['unemployment'] },
  { label: 'Prices and interest rates', topics: ['inflation'] },
  { label: 'Housing and services', topics: ['housing'] },
]

export default function AnswersPage() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Answers', path: ANSWERS_PATH },
  ]
  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        title="Answers"
        lede={`${ANSWERS.length} questions people ask about South Africa's numbers, each answered in one sentence with its source.`}
      />
      {GROUPS.map((g) => (
        <Section key={g.label} id={g.label.toLowerCase().replace(/[^a-z]+/g, '-')} title={g.label}>
          <ul className="space-y-3">
            {ANSWERS.filter((a) => g.topics.includes(a.topic)).map((a) => (
              <li key={a.slug}>
                <Link href={`${ANSWERS_PATH}/${a.slug}`} className={`text-body ${linkClass}`}>
                  {a.question}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </Column>
  )
}
