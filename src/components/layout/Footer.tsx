
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { BrandMark } from '@/components/layout/BrandMark'
import { categories } from '@/data/mock'
import { AUTHOR } from '@/lib/seo'

export function Footer() {
  return (
    <footer className="border-t border-rule bg-paper">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold">
              <BrandMark />
              <span className="text-ink">
                SA <span className="text-accent">Data</span> Hub
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              A modern, accessible platform for exploring South African public data. Built to make government statistics
              understandable for everyone.
            </p>
            <p className="mt-4 text-xs text-muted">
              Data sourced from Statistics South Africa, SARB, SAPS and other official bodies. Not affiliated with any
              government department.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Categories</h3>
            <ul className="space-y-2 text-sm">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/category/${category.id}`}
                    className="text-muted hover:text-accent"
                  >
                    {category.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Platform</h3>
            <ul className="space-y-2 text-sm mb-6">
              {[
                { label: 'Release Explainers', href: '/explainers' },
                { label: 'Data Stories', href: '/insights' },
                { label: 'Data Downloads', href: '/downloads' },
                { label: 'Dataset Updates', href: '/updates' },
                { label: 'Province Explorer', href: '/provinces' },
                { label: 'Municipalities', href: '/municipalities' },
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Methodology', href: '/methodology' },
                { label: 'About', href: '/about' },
                { label: 'Changelog', href: '/changelog' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-muted hover:text-accent">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Data Sources</h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Stats SA', href: 'https://www.statssa.gov.za' },
                { label: 'SARB', href: 'https://www.resbank.co.za' },
                { label: 'SAPS', href: 'https://www.saps.gov.za' },
                { label: 'National Treasury', href: 'https://www.treasury.gov.za' },
                { label: 'DBE', href: 'https://www.education.gov.za' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-muted hover:text-accent"
                  >
                    {label}
                    <ExternalLink size={11} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-rule pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} SA Data Hub. Open source and not for profit.
          </p>
          <p className="text-xs text-muted">
            Built by{' '}
            <a
              href={AUTHOR.url}
              rel="me author"
              className="hover:text-accent transition-colors"
            >
              {AUTHOR.name}
            </a>
            {' · '}
            <a
              href={AUTHOR.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              Source on GitHub
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
