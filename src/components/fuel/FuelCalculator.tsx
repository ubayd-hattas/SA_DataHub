'use client'

import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link2, MessageCircle } from 'lucide-react'
import { FUEL_PRODUCTS, FUEL_ZONES, type FuelProduct, type FuelZone } from '@/lib/fuel'
import { calculateFuelCost, parseLitres, LITRES_ERROR } from '@/lib/fuel-calc'
import { calcHref, changeText, rands, selectionText, whatsappHref, wholesaleNote, workingText } from '@/lib/fuel-calc-text'
import { FUEL_PATH } from '@/lib/fuel-page'

const FIELD =
  'w-full border-0 border-b border-ink/40 bg-transparent px-0 py-2 text-body tabular-nums text-ink focus:border-accent focus:outline-none focus:ring-0 focus-visible:border-b-2'

interface FuelCalculatorProps {
  /** What the litres box holds on first render: the default, or the text from the address. */
  initialLitres: string
  initialProduct: FuelProduct
  initialZone: FuelZone
}

/**
 * "What would a tank cost?": litres of one product in one zone at the latest
 * official price, with the working and the change from last month.
 * It is a plain GET form to /fuel, so without JavaScript the button reloads
 * the page with the answer; with JavaScript the answer updates as you type.
 */
export function FuelCalculator({ initialLitres, initialProduct, initialZone }: FuelCalculatorProps) {
  const litresId = useId()
  const productId = useId()
  const zoneId = useId()
  const [litresText, setLitresText] = useState(initialLitres)
  const [product, setProduct] = useState<FuelProduct>(initialProduct)
  const [zone, setZone] = useState<FuelZone>(initialZone)
  // The message belongs to the link it was about, so it disappears when the answer changes.
  const [copy, setCopy] = useState<{ href: string; message: string } | null>(null)

  const litres = parseLitres(litresText)
  const result = litres === null ? null : calculateFuelCost({ litres, product, zone })
  const ok = result?.ok ? result : null
  const litresError = litres === null ? LITRES_ERROR : result && !result.ok ? result.errors.litres : undefined

  const productSlug = FUEL_PRODUCTS.find((p) => p.id === product)!.slug
  const change = ok ? changeText(ok) : null
  const note = ok ? wholesaleNote(ok) : null

  const href = ok ? calcHref({ litres: ok.litres, product, zone }) : null

  // replaceState, not a navigation: typing should not add history entries or reload the page.
  useEffect(() => {
    if (href) window.history.replaceState(null, '', href)
  }, [href])

  async function copyLink() {
    if (!href) return
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).toString())
      setCopy({ href, message: 'Link copied.' })
    } catch {
      setCopy({ href, message: 'Could not copy the link. Copy it from the address bar instead.' })
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // The answer is already on the page; submitting only reloads it.
    event.preventDefault()
  }

  return (
    <form method="get" action={FUEL_PATH} onSubmit={onSubmit} noValidate>
      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor={litresId} className="block text-small font-medium text-muted">
            Litres
          </label>
          <input
            id={litresId}
            name="litres"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={litresText}
            onChange={(e) => setLitresText(e.target.value)}
            aria-invalid={litresError ? true : undefined}
            aria-describedby={litresError ? `${litresId}-error` : `${litresId}-hint`}
            className={FIELD}
          />
          <p id={`${litresId}-hint`} className="mt-1 text-caption text-muted">
            A tank is often 35 to 80 litres.
          </p>
        </div>
        <div>
          <label htmlFor={productId} className="block text-small font-medium text-muted">
            Fuel
          </label>
          <select
            id={productId}
            name="product"
            value={productSlug}
            onChange={(e) => setProduct(FUEL_PRODUCTS.find((p) => p.slug === e.target.value)!.id)}
            className={FIELD}
          >
            {FUEL_PRODUCTS.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.priceType === 'wholesale' ? `${p.label} (wholesale)` : p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={zoneId} className="block text-small font-medium text-muted">
            Area
          </label>
          <select id={zoneId} name="zone" value={zone} onChange={(e) => setZone(e.target.value as FuelZone)} className={FIELD}>
            {FUEL_ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <noscript>
        <button
          type="submit"
          className="mt-4 rounded border border-ink px-3 py-2 text-small font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Work out the cost
        </button>
      </noscript>

      {litresError && (
        <p id={`${litresId}-error`} className="mt-4 border-l-2 border-bad pl-3 text-small font-medium text-bad">
          <span className="sr-only">Error: </span>
          {litresError}
        </p>
      )}

      <div aria-live="polite" className="mt-8">
        {ok ? (
          <>
            <p className="text-body text-ink">{selectionText(ok)}</p>
            <p className="mt-1 font-display text-[3rem] font-semibold leading-none tabular-nums text-ink sm:text-figure">
              {rands(ok.costCents)}
            </p>
            <p className="mt-3 text-body tabular-nums text-ink">{workingText(ok)}</p>
            {change && <p className="mt-1 text-body text-ink">{change}</p>}
            {note && <p className="mt-3 max-w-prose text-small text-muted">{note}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-2 rounded border border-rule px-3 py-2 text-small font-medium text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Link2 size={16} aria-hidden="true" />
                Copy link to this answer
              </button>
              <a
                href={whatsappHref(ok)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded border border-rule px-3 py-2 text-small font-medium text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <MessageCircle size={16} aria-hidden="true" />
                Share on WhatsApp
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              {copy && copy.href === href && <span className="text-small text-muted">{copy.message}</span>}
            </div>
          </>
        ) : (
          <p className="text-body text-muted">
            <span aria-hidden="true">&ndash; </span>No cost to show until the litres are a number from 1 to 1000.
          </p>
        )}
      </div>
    </form>
  )
}
