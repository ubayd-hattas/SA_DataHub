import Link from 'next/link'
import { BarChart3, ExternalLink } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <BarChart3 size={16} />
              </div>
              <span className="text-slate-900 dark:text-white">
                SA <span className="text-brand-600">Data</span> Hub
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              A modern, accessible platform for exploring South African public data. Built to make government statistics
              understandable for everyone.
            </p>
            <p className="mt-4 text-xs text-slate-400">
              Data sourced from Statistics South Africa, SARB, SAPS and other official bodies. Not affiliated with any
              government department.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Categories</h3>
            <ul className="space-y-2 text-sm">
              {['Unemployment', 'GDP & Economy', 'Inflation', 'Crime', 'Education', 'Population', 'Housing', 'Census 2022'].map(
                (label) => (
                  <li key={label}>
                    <Link
                      href={`/category/${label.toLowerCase().replace(/[^a-z]/g, '-').replace(/-+/g, '-').replace(/-$/, '')}`}
                      className="text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                    >
                      {label}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Sources */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Platform</h3>
            <ul className="space-y-2 text-sm mb-6">
              {[
                { label: 'Data Stories', href: '/insights' },
                { label: 'Data Downloads', href: '/downloads' },
                { label: 'Province Explorer', href: '/provinces' },
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Methodology', href: '/methodology' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Data Sources</h3>
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
                    className="flex items-center gap-1 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                  >
                    {label}
                    <ExternalLink size={11} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-slate-100 pt-6 sm:flex-row sm:items-center dark:border-slate-800">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} SA Data Hub. Open source and not for profit.
          </p>
          <p className="text-xs text-slate-400">
            Built by Ubayd Hattas · Data from official South African sources
          </p>
        </div>
      </div>
    </footer>
  )
}
