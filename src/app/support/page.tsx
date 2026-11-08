import Link from 'next/link'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { Column, PageHeader, Prose, Section, linkClass } from '@/components/editorial/Section'
import { REPO_URL, reportErrorHref, requestDataHref, SPONSORS_URL } from '@/lib/contact'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

const PATH = '/support'

export const metadata: Metadata = buildPageMetadata({
  title: 'Help improve SA Data Hub',
  description:
    'SA Data Hub is free and open source. Report an error, ask for a dataset, share a page or help with the code.',
  path: PATH,
})

export default function SupportPage() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Help improve SA Data Hub', path: PATH },
  ]
  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        kicker="Support"
        title="Help improve SA Data Hub"
        lede="SA Data Hub is free and open source, and it will stay that way. One person builds it and checks every figure against the original release. These are the ways you can help it get better."
      />

      <Section id="tell-me" title="Tell me what is wrong or missing">
        <Prose>
          <p>
            Reports from readers are the most useful help there is. A wrong figure gets fixed and listed on the{' '}
            <Link href="/updates" className={linkClass}>
              updates page
            </Link>
            . A request tells me what to add next.
          </p>
        </Prose>
        <ul className="mt-4 space-y-2 text-body">
          <li>
            <a href={reportErrorHref(PATH)} className={linkClass}>
              Report an error
            </a>
          </li>
          <li>
            <a href={requestDataHref()} className={linkClass}>
              Ask for a dataset, a place or a feature
            </a>
          </li>
        </ul>
      </Section>

      <Section id="share" title="Share it">
        <Prose>
          <p>
            Send a page to a teacher, a journalist, a councillor or a colleague who needs the numbers. Every{' '}
            <Link href="/series" className={linkClass}>
              data series
            </Link>{' '}
            has its own link, a citation you can paste and a chart you can embed.
          </p>
        </Prose>
      </Section>

      <Section id="code" title="Help with the code">
        <Prose>
          <p>
            The code and the data are public on{' '}
            <a href={REPO_URL} className={linkClass}>
              GitHub
            </a>
            . You can open an issue, suggest a change or star the repository so others find it.
          </p>
        </Prose>
      </Section>

      {SPONSORS_URL && (
        <Section id="sponsor" title="Support it with money">
          <Prose>
            <p>
              If the site saves you time, you can{' '}
              <a href={SPONSORS_URL} className={linkClass}>
                sponsor it on GitHub
              </a>
              . Sponsorship pays for time: publishing explainers soon after each release and adding the datasets readers
              ask for.
            </p>
            <p>
              Sponsors get no extra features or early access, and have no say over what the site publishes. Every figure
              follows the same sourcing rules, whoever pays.
            </p>
          </Prose>
        </Section>
      )}
    </Column>
  )
}
