'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Menu, Moon, Search, Sun, X } from 'lucide-react'
import { BrandMark } from '@/components/layout/BrandMark'
import { NAV_SECTIONS, isCurrentSection, type NavSection } from '@/components/layout/nav-items'
import { cn } from '@/lib/utils'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

/** One button that switches between the light and dark themes. */
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  // The theme is only known in the browser; render a neutral button until then.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted && resolvedTheme === 'dark'
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className={cn('rounded p-2 text-muted hover:text-ink', FOCUS)}
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  )
}

/** Always visible. Submits to the existing search on /dashboard, and works without JavaScript. */
function NavSearch({ className }: { className?: string }) {
  const id = useId()
  return (
    <form action="/dashboard" method="get" role="search" className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        Search statistics and places
      </label>
      <input
        id={id}
        name="search"
        type="search"
        placeholder="Search"
        className="h-10 w-full rounded border border-rule bg-paper pl-3 pr-10 text-small text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <button type="submit" aria-label="Search" className={cn('absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-ink', FOCUS)}>
        <Search size={16} aria-hidden="true" />
      </button>
    </form>
  )
}

function DesktopSection({
  section,
  current,
  open,
  onToggle,
  onClose,
}: {
  section: NavSection
  current: boolean
  open: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const panelId = useId()
  const itemClass = cn(
    'inline-flex h-16 items-center border-b-2 px-3 text-small',
    current ? 'border-accent font-medium text-ink' : 'border-transparent text-muted hover:text-ink',
    FOCUS,
  )

  if (section.href) {
    return (
      <li>
        <Link href={section.href} className={itemClass} aria-current={current ? 'page' : undefined}>
          {section.label}
        </Link>
      </li>
    )
  }

  return (
    <li className="relative">
      <button type="button" className={itemClass} aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        {section.label}
      </button>
      {open && (
        <ul id={panelId} className="absolute left-0 top-full z-50 min-w-56 border border-rule bg-paper py-2">
          {section.links!.map((link) => (
            <li key={link.href}>
              <Link href={link.href} onClick={onClose} className={cn('block px-4 py-2 text-small text-ink hover:bg-subtle', FOCUS)}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function Navbar() {
  const pathname = usePathname() ?? '/'
  const [openId, setOpenId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  // Close everything when the page changes.
  useEffect(() => {
    setOpenId(null)
    setMobileOpen(false)
  }, [pathname])

  // Escape closes, and focus goes back to the button that opened the panel.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (openId) {
        navRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus()
        setOpenId(null)
      }
      setMobileOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [openId])

  // A click outside the desktop nav closes its open panel.
  useEffect(() => {
    if (!openId) return
    function onMouseDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenId(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [openId])

  // Lock page scroll behind the open phone menu.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-paper">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className={cn('flex shrink-0 items-center gap-2.5 rounded', FOCUS)}>
          <BrandMark />
          <span className="font-display text-lg font-semibold text-ink">SA Data Hub</span>
        </Link>

        <nav ref={navRef} aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center">
            {NAV_SECTIONS.map((section) => (
              <DesktopSection
                key={section.id}
                section={section}
                current={isCurrentSection(section, pathname)}
                open={openId === section.id}
                onToggle={() => setOpenId(openId === section.id ? null : section.id)}
                onClose={() => setOpenId(null)}
              />
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <NavSearch className="hidden w-64 md:block" />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className={cn('rounded p-2 text-ink lg:hidden', FOCUS)}
          >
            {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* On phones the search gets its own row, so it is always visible. */}
      <div className="border-t border-rule px-4 py-2 md:hidden">
        <NavSearch />
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="overflow-y-auto border-t border-rule bg-paper lg:hidden"
          style={{ maxHeight: 'calc(100dvh - 7.5rem)' }}
        >
          <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
            {NAV_SECTIONS.map((section) => (
              <li key={section.id} className="border-b border-rule py-3 last:border-b-0">
                {section.href ? (
                  <Link
                    href={section.href}
                    aria-current={isCurrentSection(section, pathname) ? 'page' : undefined}
                    className={cn('block py-1 text-body font-medium text-ink', FOCUS)}
                  >
                    {section.label}
                  </Link>
                ) : (
                  <>
                    <p className="py-1 text-body font-medium text-ink">{section.label}</p>
                    <ul className="mt-1 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                      {section.links!.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href} className={cn('block py-2 text-small text-muted hover:text-ink', FOCUS)}>
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
