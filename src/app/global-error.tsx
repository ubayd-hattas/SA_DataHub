'use client'

import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Replaces the root layout when the layout itself throws, so it renders its
 * own <html> and <body> and cannot rely on Tailwind or the site fonts loading.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en-ZA">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#faf9f6', color: '#1b1b19' }}>
        <main style={{ maxWidth: 480, margin: '0 auto', padding: '128px 16px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>SA Data Hub failed to load</h1>
          <p style={{ color: '#595853', lineHeight: 1.5 }}>
            Something broke before the page could be shown. Try again. If it keeps happening, come back in a few minutes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <button
              type="button"
              onClick={reset}
              style={{ background: '#0f6e56', color: '#fff', border: 0, borderRadius: 12, padding: '10px 20px', fontSize: 14, cursor: 'pointer' }}
            >
              Try again
            </button>
            {/* A plain anchor: the router may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: '#0f6e56', padding: '10px 20px', fontSize: 14 }}>
              Go to the home page
            </a>
          </div>
          {error.digest && <p style={{ marginTop: 24, fontFamily: 'monospace', fontSize: 12, color: '#595853' }}>Error reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  )
}
