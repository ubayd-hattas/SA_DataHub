'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { reportErrorHref } from '@/lib/contact'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/** Shown inside the site layout when a page throws while rendering. */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const pathname = usePathname() ?? '/'

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container-page flex flex-col items-center justify-center py-32 text-center">
      <h1 className="heading-display text-2xl font-semibold">This page failed to load</h1>
      <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">
        Something broke while building this page. Try again, or go back to the home page. If it keeps happening, report
        it and say which page you were on.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Go to the home page
        </Link>
        <a
          href={reportErrorHref(pathname)}
          className="rounded-xl px-5 py-2.5 text-sm font-medium text-brand-700 underline underline-offset-4 dark:text-brand-400"
        >
          Report this error
        </a>
      </div>
      {error.digest && <p className="mt-6 font-mono text-xs text-slate-500 dark:text-slate-400">Error reference: {error.digest}</p>}
    </div>
  )
}
