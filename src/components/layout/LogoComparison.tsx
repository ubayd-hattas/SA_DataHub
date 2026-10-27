import { SITE_LOGO_MARK_PATH } from '@/lib/seo'

/**
 * TEMPORARY, for the review of PR #15. Shows the SVG mark beside
 * public/icon.png on Vercel preview builds only. Remove both this component
 * and public/icon.png once a logo is chosen.
 */
export function LogoComparison() {
  if (process.env.VERCEL_ENV !== 'preview') return null
  const candidates = [
    { src: SITE_LOGO_MARK_PATH, label: 'public/brand/logo-mark.svg (in use)' },
    { src: '/icon.png', label: 'public/icon.png' },
  ]
  return (
    <section aria-labelledby="logo-comparison" className="border-t border-rule bg-subtle py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 id="logo-comparison" className="font-display text-h3 font-semibold text-ink">
          Logo comparison (preview builds only)
        </h2>
        <p className="mt-1 text-small text-muted">Each candidate at 128 px, 32 px and 16 px, on light and dark.</p>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          {candidates.map((c) => (
            <figure key={c.src} className="m-0">
              <div className="flex flex-wrap items-end gap-6">
                {['#faf9f6', '#131412'].map((bg) => (
                  <div key={bg} className="flex items-end gap-4 border border-rule p-4" style={{ background: bg }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.src} alt="" width={128} height={128} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.src} alt="" width={32} height={32} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.src} alt="" width={16} height={16} />
                  </div>
                ))}
              </div>
              <figcaption className="mt-2 text-caption text-muted">{c.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
