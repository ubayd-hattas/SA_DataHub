import type { Metadata } from 'next'
import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Page Not Found',
    description: 'The page you are looking for does not exist on SA Data Hub.',
    path: '/404',
    noIndex: true,
  }),
}

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center justify-center py-32 text-center">
      <p className="font-mono text-6xl font-bold text-brand-600 dark:text-brand-400">404</p>
      <h1 className="heading-display mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-slate-500 dark:text-slate-400">
        There is no page at this address. It may have moved, or the link may be wrong. Try the search at the top, or
        start from the home page.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
      >
        Back to home
      </Link>
    </div>
  )
}
