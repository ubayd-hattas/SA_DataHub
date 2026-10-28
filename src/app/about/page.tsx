import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { Column, PageHeader, Section, Prose, linkClass } from '@/components/editorial/Section'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata, AUTHOR } from '@/lib/seo'
import { REPO_URL, reportErrorHref } from '@/lib/contact'

export const metadata: Metadata = buildPageMetadata({
  title: 'About',
  description:
    'SA Data Hub explains South Africa\'s official statistics with the source and two dates on every figure. Built and maintained by Ubayd Hattas, a Computer Science, Statistics and Data Science student at UCT.',
  path: '/about',
})

const breadcrumbs = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
]

interface Project {
  name: string
  href: string
  text: string
}

const PROJECTS: Project[] = [
  {
    name: 'Evidence Before Erasure',
    href: 'https://github.com/ubayd-hattas/AI_Incident',
    text: 'Team entry for the Apart and CeSIA AI Incident Response Sprint. It asks how much critical evidence different collection policies keep from a live AI incident before it disappears. The main comparison came out null, and the report says so.',
  },
  {
    name: 'AfriGuard',
    href: 'https://github.com/ubayd-hattas/AfriGuard',
    text: 'Team entry for the Global South AI Safety Hackathon: 40 prompts in seven South African languages run against four models, 1,120 responses in all. The first scoring used an English-only refusal check, so no attack success rate is claimed. The scoring is being redone.',
  },
  {
    name: 'Digital Minds Research',
    href: 'https://github.com/UbaJaz/Digital_Minds_Research',
    text: 'Team entry for an Apart Research sprint: can a language model predict its own output better than a cheap outside observer? Across 9,269 trials, a one-feature rule that picks the longer reply beat Hermes-3\'s own prediction.',
  },
  {
    name: 'Madrid to Amsterdam building-age transfer',
    href: 'https://github.com/ubayd-hattas/data_science_hackathon',
    text: 'Team entry for the Hack4Dev data science hackathon. A model trained on Madrid labels is reused in Amsterdam, with a fixed rule for adapting it from a few local labels. Scores are from our own evaluation on the supplied data, not the organisers\' held-out set.',
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
            Official South African statistics are published as PDFs, Excel workbooks and portals that assume you
            already know where to look. SA Data Hub takes figures from Stats SA, the South African Reserve Bank, the
            South African Police Service and the Department of Basic Education, and puts them in plain English next
            to the place or release you are asking about.
          </p>
          <p>
            It is independent. It is not affiliated with any government department, it has no advertising and no
            paywall, and it does not adjust official figures.
          </p>
        </Prose>
      </Section>

      <Section id="trust" title="How to check a number">
        <Prose>
          <p>
            Every figure shows its source, the date the source released it and the date it was last checked on SA
            Data Hub. The site will not build if a displayed statistic is missing any of these.
          </p>
          <p>
            When a number changes, the reason comes from the source&apos;s own breakdown, quoted and cited. Anything
            under &ldquo;what it means&rdquo; is a calculation with the working shown. There are no forecasts.
          </p>
          <p>
            Data is entered by hand from releases downloaded from the publisher, and a person checks each figure
            against the release before it goes live. The site makes no automated requests to Stats SA. When a figure was wrong,
            the{' '}
            <Link href="/updates" className={linkClass}>
              corrections log
            </Link>{' '}
            shows what it was, what it is now and why. Full definitions, release schedules and known limits are on the{' '}
            <Link href="/methodology" className={linkClass}>
              methodology page
            </Link>
            .
          </p>
          <p>
            If something looks wrong, tell me:{' '}
            <a href={reportErrorHref('/about')} className={linkClass}>
              report an error
            </a>
            . Please include the page and where you saw the right figure.
          </p>
        </Prose>
      </Section>

      <Section id="maintainer" title="Who builds it">
        <Prose>
          <p>
            I am{' '}
            <a href={AUTHOR.url} rel="me author" className={linkClass}>
              {AUTHOR.name}
            </a>
            , a first-year BSc student at the{' '}
            <a href="https://www.uct.ac.za" target="_blank" rel="noopener noreferrer" className={linkClass}>
              University of Cape Town
            </a>{' '}
            studying Computer Science, Statistics and Data Science, with graduation expected in 2029. I started SA
            Data Hub in May 2026 and design, build and maintain it myself, alongside my studies.
          </p>
          <p>
            I built it because the numbers that shape South African life, like unemployment, inflation and census
            counts, are hard to read in the form they are published. I would like a student, a journalist or a
            municipal official to find the figure, see where it came from and understand what it does and does not
            say.
          </p>
          <p>
            Outside this site I work on data science and AI evaluation in small teams, usually in hackathons and
            research sprints. The code for all of it is public.
          </p>
        </Prose>
      </Section>

      <Section id="projects" title="Other projects">
        <ul className="space-y-6">
          {PROJECTS.map((p) => (
            <li key={p.name}>
              <h3 className="mb-1 font-display text-h3 font-semibold text-ink">
                <a href={p.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {p.name}
                </a>
              </h3>
              <p className="text-body text-ink">{p.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-small text-muted">
          These are team projects. The repositories show who did what, and each one states what it does and does not
          claim.
        </p>
      </Section>

      <Section id="links" title="Find me elsewhere">
        <ul className="space-y-2 text-body text-ink">
          <li>
            <a href={AUTHOR.url} rel="me" target="_blank" className={linkClass}>
              ubayd.me
            </a>{' '}
            (portfolio and writing)
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
              SA Data Hub source code
            </a>{' '}
            (MIT licence)
          </li>
        </ul>
      </Section>
    </Column>
  )
}
