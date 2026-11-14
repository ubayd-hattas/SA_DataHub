import Link from 'next/link'
import { FUEL_PRODUCTS, FUEL_ZONES } from '@/lib/fuel'
import { fuelHref, type FuelSelection } from '@/lib/fuel-page'
import { cn } from '@/lib/utils'

const choice =
  'inline-block rounded border px-3 py-2 text-small focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

/**
 * Product and zone as plain links, so the choice works with JavaScript off:
 * each link reloads /fuel with the choice in the address. The current choice
 * is marked with aria-current and a heavier border, not by colour alone.
 * The calculator's litres travel with the links so the amount survives a switch.
 */
export function FuelSelector({ selection, litres }: { selection: FuelSelection; /** The calculator's current valid litres, kept in each link. */ litres?: number }) {
  const group = (label: string, items: { key: string; text: string; next: FuelSelection; current: boolean }[]) => (
    <div>
      <p className="mb-2 text-caption font-medium text-muted">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={fuelHref(item.next, litres)}
              aria-current={item.current ? 'true' : undefined}
              className={cn(
                choice,
                item.current ? 'border-ink bg-subtle font-semibold text-ink' : 'border-rule text-ink hover:border-ink'
              )}
            >
              {item.text}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <nav aria-label="Choose a product and zone" className="space-y-4">
      {group(
        'Product',
        FUEL_PRODUCTS.map((p) => ({
          key: p.id,
          text: p.priceType === 'wholesale' ? `${p.label} (wholesale)` : p.label,
          next: { ...selection, product: p.id },
          current: p.id === selection.product,
        }))
      )}
      {group(
        'Zone',
        FUEL_ZONES.map((z) => ({
          key: z.id,
          text: z.label,
          next: { ...selection, zone: z.id },
          current: z.id === selection.zone,
        }))
      )}
    </nav>
  )
}
