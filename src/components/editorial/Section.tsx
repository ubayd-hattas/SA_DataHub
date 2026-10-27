import { cn } from '@/lib/utils'

/** A page column: one readable measure, centred. */
export function Column({ children, className, wide = false }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn('mx-auto px-4 sm:px-6', wide ? 'max-w-5xl' : 'max-w-[44rem]', className)}>{children}</div>
}

/** Kicker, serif headline and a plain-English standfirst. */
export function PageHeader({
  kicker,
  title,
  lede,
  children,
}: {
  kicker?: string
  title: string
  lede?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="pb-10 pt-8 sm:pt-12">
      {kicker && <p className="mb-3 text-caption font-medium text-muted">{kicker}</p>}
      <h1 className="font-display text-[2rem] font-semibold leading-[1.15] tracking-tight text-ink sm:text-h1">{title}</h1>
      {lede && <p className="mt-4 text-lede text-ink">{lede}</p>}
      {children}
    </header>
  )
}

/** A section divided from the one above by whitespace and a thin rule. */
export function Section({
  id,
  title,
  children,
  className,
}: {
  id: string
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section aria-labelledby={id} className={cn('border-t border-rule py-10', className)}>
      <h2 id={id} className="mb-5 font-display text-[1.5rem] font-semibold leading-snug text-ink sm:text-h2">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Running text. */
export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-4 text-body text-ink', className)}>{children}</div>
}

/** A text link: accent colour, underlined. */
export const linkClass =
  'text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
