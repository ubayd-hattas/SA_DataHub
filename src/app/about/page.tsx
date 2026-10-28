import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { Column, PageHeader, Section, Prose, linkClass } from '@/components/editorial/Section'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata, AUTHOR } from '@/lib/seo'
import { REPO_URL, reportErrorHref } from '@/lib/contact'

export const metadata: Metadata = buildPageMetadata({
  title: 'About SA Data Hub and Ubayd Hattas',
  description:
    'SA Data Hub explains South Africa\'s official statistics with a source and two dates on every figure. Built by Ubayd Hattas, a Computer Science, Statistics and Data Science student at UCT who also works on machine learning and AI evaluation research.',
  path: '/about',
})

const breadcrumbs = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
]

interface Work {
  name: string
  context: string
  href: string
  text: string
}

/** Key results only. Each line matches the project's own repository and its page on ubayd.me. */
const WORK: Work[] = [
  {
    name: 'Does AI actually know itself?',
    context: 'Apart Research, Digital Minds Research Sprint',
    href: 'https://ubayd.me/projects/digital-minds-hackathon',
    text: 'Tested whether a language model can predict its own output better than an outsider reading the same text. Across 9,269 trials on three models, Hermes-3 picked its own reply above chance (balanced accuracy 0.719), but a one-feature rule that picks the longer reply did better (0.808). The team also released two diagnostic checks for catching surface cues and position bias before an experiment is run.',
  },
  {
    name: 'Cross-city building-age classification',
    context: 'Hack4Dev data science hackathon',
    href: 'https://ubayd.me/projects/cross-city-building-age-classification',
    text: 'Estimated the construction age of buildings from about forty years of Landsat satellite data, training on Madrid and transferring to Amsterdam. Class-conditional CORAL raised zero-shot macro-F1 from 0.36 to 0.65 with no Amsterdam labels. A spatial audit showed that about half of the few-shot gain came from neighbouring pixels rather than the labels themselves.',
  },
  {
    name: 'AfriGuard',
    context: 'Global South AI Safety Hackathon',
    href: 'https://ubayd.me/projects/afriguard',
    text: 'A safety benchmark for South African languages: 40 harmful prompts in English and six African languages, run against four models for 1,120 responses. An audit withdrew the first headline attack rate because the scoring only understood English. Language-aware scoring checked by native speakers is the next step.',
  },
  {
    name: 'Evidence Before Erasure',
    context: 'Apart Research and CeSIA, AI Incident Response Sprint',
    href: 'https://ubayd.me/projects/evidence-before-erasure',
    text: 'Compared policies for preserving evidence from a live AI incident, using a real trace of AI agents sharing answers through a wiki. The primary comparison was a clean null, and the report says so along with exactly how the result was obtained.',
  },
]

export default function AboutPage() {
  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        title="About SA Data Hub"
        lede="South Africa's official numbers, explained where you live, with every figure traced to its source."
      />

      <Section id="what" title="What this is">
        <Prose>
          <p>
            SA Data Hub takes figures from Stats SA, the South African Reserve Bank, the South African Police Service
            and the Department of Basic Education and explains them in plain English: by municipality, by province and
            release by release. It covers all 213 municipalities, with Census 2011 and 2022 side by side.
          </p>
          <p>
            It is independent, has no advertising and does not adjust official figures. It is not affiliated with any
            government department.
          </p>
        </Prose>
      </Section>

      <Section id="trust" title="How to check a number">
        <Prose>
          <p>
            Every figure shows its source, the date the source released it and the date it was last checked here. The
            site will not build if a displayed statistic is missing any of the three.
          </p>
          <p>
            Figures are entered by hand from the publisher&apos;s release and checked against it before they go live.
            Reasons for a change come from the source&apos;s own breakdown, and there are no forecasts. Corrections
            are listed in the{' '}
            <Link href="/updates" className={linkClass}>
              corrections log
            </Link>
            , and definitions and known limits are on the{' '}
            <Link href="/methodology" className={linkClass}>
              methodology page
            </Link>
            .
          </p>
          <p>
            Spotted something wrong?{' '}
            <a href={reportErrorHref('/about')} className={linkClass}>
              Report an error
            </a>{' '}
            with the page and where you saw the right figure.
          </p>
        </Prose>
      </Section>

      <Section id="maintainer" title="Ubayd Hattas">
        <Prose>
          <p>
            SA Data Hub is designed, built and maintained by{' '}
            <a href={AUTHOR.url} rel="me author" className={linkClass}>
              Ubayd Hattas
            </a>
            , a Computer Science, Statistics and Data Science student at the University of Cape Town. He builds data
            products and works on machine learning and AI evaluation research, mostly through hackathons and
            research sprints. He is based in Cape Town.
          </p>
        </Prose>

        <h3 className="mb-4 mt-10 font-display text-h3 font-semibold text-ink">Selected work</h3>
        <ul className="space-y-7">
          {WORK.map((w) => (
            <li key={w.name}>
              <p className="text-body font-semibold text-ink">
                <a href={w.href} className={linkClass}>
                  {w.name}
                </a>
              </p>
              <p className="mb-1 text-caption text-muted">{w.context}</p>
              <p className="text-body text-ink">{w.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-small text-muted">
          All four were team projects. Scores are the teams&apos; own evaluations, and each repository states what it
          does and does not claim.
        </p>

        <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-body">
          <li>
            <a href={AUTHOR.url} rel="me" className={linkClass}>
              ubayd.me
            </a>
          </li>
          <li>
            <a href={AUTHOR.github} rel="me noopener noreferrer" target="_blank" className={linkClass}>
              GitHub
            </a>
          </li>
          <li>
            <a href={AUTHOR.linkedin} rel="me noopener noreferrer" target="_blank" className={linkClass}>
              LinkedIn
            </a>
          </li>
          <li>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Source code (MIT)
            </a>
          </li>
        </ul>
      </Section>
    </Column>
  )
}
