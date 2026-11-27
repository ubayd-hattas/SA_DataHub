import Link from 'next/link'
import type { Metadata } from 'next'
import { Column, PageHeader, Prose, Section, linkClass } from '@/components/editorial/Section'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { getAllMunicipalities } from '@/data/mock'
import { REPO_URL } from '@/lib/contact'
import { formatCount } from '@/lib/format'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'
import { allSeries, SERIES_PATH } from '@/lib/series'

const PATH = '/how-it-works'

export const metadata: Metadata = buildPageMetadata({
  title: 'How this site works: the engineering behind SA Data Hub',
  description:
    'How SA Data Hub is built: a build that fails on unsourced figures, public corrections, automated checks, and why it has no database. With links to the code.',
  path: PATH,
})

/** A link to a file in the public repository, so a reader can check the claim beside it. */
function Code({ file }: { file: string }) {
  return (
    <a href={`${REPO_URL}/blob/main/${file}`} className={`${linkClass} break-all font-mono text-small`}>
      {file}
    </a>
  )
}

export default function HowItWorksPage() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'How this site works', path: PATH },
  ]
  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        kicker="For developers and the curious"
        title="How this site works"
        lede={`SA Data Hub shows ${allSeries().length} data series and ${formatCount(getAllMunicipalities().length)} municipality profiles. This page explains how it tries to keep them right, and links to the code so you can check.`}
      />

      <Section id="shape" title="Files, not a database">
        <Prose>
          <p>
            The figures are JSON files kept in git. <a href="https://nextjs.org" className={linkClass}>Next.js</a> reads them when
            the site is built, and almost every page is made in advance. A change to a figure is a pull request, so it can be
            reviewed before it goes live, undone with a revert, and traced in the history.
          </p>
          <p>
            A move to PostgreSQL was started and then stopped. Four datasets had import pipelines and tests comparing the database
            with the files. Finishing it would have added a running service, a secret and a new way to fail, with nothing a reader
            could see. The notes are in <Code file="db/README.md" /> and <Code file="docs/audit.md" />.
          </p>
        </Prose>
      </Section>

      <Section id="sourcing" title="The build fails on an unsourced figure">
        <Prose>
          <p>
            Every statistic needs a source, the source&apos;s release date and the date it was checked, and the checked date cannot
            come before the release. If one is missing, the site does not build. For municipality figures the check also needs the
            page of each census table. The rule is in <Code file="src/lib/sourcing.ts" />. Explainers have their own check in{' '}
            <Code file="src/lib/explainers.ts" />.
          </p>
          <p>
            This checks that the record of a source is complete. It cannot tell whether a number was copied correctly. That still
            takes a person reading the release.
          </p>
        </Prose>
      </Section>

      <Section id="checks" title="Checks on every change">
        <Prose>
          <p>
            Each pull request runs a type check, a lint, the unit tests, checks on the datasets, tests for the validation and fuel
            scripts, and a full build. The steps are listed in <Code file=".github/workflows/ci.yml" />.
          </p>
        </Prose>
      </Section>

      <Section id="corrections" title="Corrections are public">
        <Prose>
          <p>
            When a figure on the site was wrong or could not be traced, the change is written up on the{' '}
            <Link href="/updates" className={linkClass}>
              updates page
            </Link>
            . A figure that cannot be traced to a release is withheld, not shown without a date.
          </p>
          <p>
            Automatic collection from Stats SA is paused, and new releases are entered by hand. The{' '}
            <Link href="/methodology" className={linkClass}>
              methodology page
            </Link>{' '}
            says more about the sources.
          </p>
        </Prose>
      </Section>

      <Section id="speed" title="Measured speed">
        <Prose>
          <p>
            On 27 November 2026, Lighthouse gave the home page, a topic page, a municipality page and a series page performance
            scores from 86 to 93 out of 100, with the largest content showing within 1.2 seconds in its simulated mobile test. The
            older dashboard page scored 78. These are single lab runs, not what visitors measured. All the figures, and how to
            repeat them, are in <Code file="docs/case-study/lighthouse-2026-11.md" />.
          </p>
        </Prose>
      </Section>

      <Section id="reuse" title="Use the data">
        <Prose>
          <p>
            Every{' '}
            <Link href={SERIES_PATH} className={linkClass}>
              data series
            </Link>{' '}
            has a CSV and a JSON file. There is a read-only{' '}
            <Link href="/api" className={linkClass}>
              API
            </Link>
            , and a small server that lets AI assistants fetch figures with their citations, run on your own computer:{' '}
            <Code file="mcp/README.md" />. Each source sets its own terms.
          </p>
          <p>
            The code is public on{' '}
            <a href={REPO_URL} className={linkClass}>
              GitHub
            </a>
            .
          </p>
        </Prose>
      </Section>
    </Column>
  )
}
