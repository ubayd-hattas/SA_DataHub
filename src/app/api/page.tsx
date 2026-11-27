import type { Metadata } from 'next'
import Link from 'next/link'
import { Column, PageHeader, Section, linkClass } from '@/components/editorial/Section'
import { API_ENDPOINTS, API_DOCS_PATH, apiMeta } from '@/lib/api-envelope'
import { fuelLatestData, fuelLatestMeta } from '@/lib/api-fuel'
import { absoluteUrl, buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  title: 'Free API for South African fuel prices and statistics',
  description:
    'Read-only JSON for official fuel prices since 2022, the price breakdown and every statistic on SA Data Hub. No key, no sign-up. Each response names its source and terms.',
  path: API_DOCS_PATH,
})

/** The example is produced by the same code as the endpoint, trimmed to two prices so it stays short. */
function latestExample(): string {
  const data = fuelLatestData()
  const meta = fuelLatestMeta()
  const example = { data: { ...data, products: data.products.slice(0, 1), zones: data.zones, prices: data.prices.slice(0, 2) }, meta }
  return JSON.stringify(example, null, 2).replace(/"prices": \[([\s\S]*?)\n    \]/, (m) => m.replace(/\n    \]$/, ',\n      "...": "8 more"\n    ]'))
}

const metaKeys = Object.keys(
  apiMeta({ source: { publisher: '', document: '', url: '', releasedOn: null }, checkedOn: '', attribution: '', terms: '', estimate: false }, '')
)

export default function ApiDocsPage() {
  return (
    <Column className="pb-16">
      <PageHeader
        kicker="For developers"
        title="SA Data Hub API"
        lede="Read-only JSON for South Africa's official fuel prices and every statistic on this site. No key and no sign-up. Every response says where the numbers come from and on what terms you may reuse them."
      />

      <Section id="endpoints" title="Endpoints">
        <ul className="space-y-3 text-body">
          {API_ENDPOINTS.map((e) => (
            <li key={e.path}>
              {e.path.includes('{') ? (
                <code className="font-mono text-small">{e.path}</code>
              ) : (
                <a href={e.path} className={`${linkClass} font-mono text-small`}>
                  {e.path}
                </a>
              )}
              <span className="block text-small text-muted">{e.about}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-prose text-small text-muted">
          The base address is {absoluteUrl('/api/v1')}. A series id is the last part of a series page address, for
          example <code className="font-mono">cpi-headline</code> or <code className="font-mono">fuel-petrol-95-inland</code>.
        </p>
      </Section>

      <Section id="shape" title="What every response looks like">
        <p className="max-w-prose text-body text-ink">
          Each response has <code className="font-mono">data</code> and <code className="font-mono">meta</code>. The
          meta block always has: {metaKeys.map((k, i) => <span key={k}>{i ? ', ' : ''}<code className="font-mono">{k}</code></span>)}.
        </p>
        <ul className="mt-4 max-w-prose list-disc space-y-2 pl-5 text-body text-ink">
          <li>Fuel prices are in cents per litre, exactly as the department printed them. Divide by 100 for rands.</li>
          <li>
            <code className="font-mono">null</code> means no document SA Data Hub holds gives that value. It is never
            filled in by guessing.
          </li>
          <li>
            Diesel and illuminating paraffin prices are official wholesale prices, not what a filling station charges.
          </li>
          <li>
            <code className="font-mono">meta.estimate</code> is <code className="font-mono">true</code> only when a value
            is an estimate, not an official figure.
          </li>
        </ul>
        <h3 className="mt-8 font-display text-h3 font-semibold text-ink">Example: /api/v1/fuel/latest, shortened</h3>
        <pre className="mt-3 max-h-[28rem] overflow-auto rounded border border-rule bg-subtle p-4 text-caption" tabIndex={0} aria-label="Example response">
          <code>{latestExample()}</code>
        </pre>
      </Section>

      <Section id="terms" title="Terms and credit">
        <ul className="max-w-prose list-disc space-y-2 pl-5 text-body text-ink">
          <li>
            Fuel prices come from the Department of Mineral and Petroleum Resources. Its terms allow reproduction that is
            accurate, not for financial or commercial gain, not misleading, and credited to the department. The API
            cannot give you more rights than that.
          </li>
          <li>Other series name their publisher. Credit that publisher, and SA Data Hub as the place you got it.</li>
          <li>
            Each response has an <code className="font-mono">attribution</code> line you can copy.
          </li>
        </ul>
      </Section>

      <Section id="fair-use" title="Fair use">
        <p className="max-w-prose text-body text-ink">
          The files are built when the site is updated and served from a cache, so they change at most once a day
          (fuel prices once a month). Please cache what you fetch and ask at most once a minute per endpoint. There is
          no rate limit today; one may be added if the service is abused.
        </p>
      </Section>

      <Section id="versions" title="Versions">
        <p className="max-w-prose text-body text-ink">
          This is version 1. Fields may be added to it but will not be renamed or removed. A change that would break a
          client gets a new address, <code className="font-mono">/api/v2</code>, next to this one.
        </p>
        <p className="mt-4 text-small">
          <Link href="/methodology" className={linkClass}>
            How the data is collected and checked
          </Link>
          {' · '}
          <Link href="/support" className={linkClass}>
            Report a problem
          </Link>
        </p>
      </Section>
    </Column>
  )
}
