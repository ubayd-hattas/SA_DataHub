'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { BarChart3, Sun, Moon, Monitor, Menu, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/insights', label: 'Insights' },
  { href: '/downloads', label: 'Downloads' },
  { href: '/provinces', label: 'Provinces' },
  { href: '/municipalities', label: 'Municipalities' },
  {
    label: 'Categories',
    children: [
      { href: '/category/unemployment', label: 'Unemployment' },
      { href: '/category/gdp', label: 'GDP & Economy' },
      { href: '/category/inflation', label: 'Inflation' },
      { href: '/category/crime', label: 'Crime' },
      { href: '/category/education', label: 'Education' },
      { href: '/category/population', label: 'Population' },
      { href: '/category/housing', label: 'Housing' },
      { href: '/category/census', label: 'Census 2022' },
    ],
  },
  { href: '/methodology', label: 'Methodology' },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const themes = [
    { value: 'light', icon: Sun,     label: 'Light mode' },
    { value: 'dark',  icon: Moon,    label: 'Dark mode'  },
    { value: 'system', icon: Monitor, label: 'System mode' },
  ] as const

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Theme">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'rounded-md p-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            theme === value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          )}
          aria-label={label}
          aria-pressed={theme === value}
        >
          <Icon size={14} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ── Body scroll lock when mobile menu is open ────────────────────────────
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  // ── Close mobile menu on route change ────────────────────────────────────
  useEffect(() => {
    setMobileOpen(false)
    setCategoryOpen(false)
  }, [pathname])

  // ── Click-outside handler for desktop dropdown ────────────────────────────
  useEffect(() => {
    if (!categoryOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoryOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [categoryOpen])

  // ── Escape key closes both menus ─────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setCategoryOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="container-page flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white" aria-hidden="true">
            <BarChart3 size={16} />
          </div>
          <span className="text-slate-900 dark:text-white">
            SA <span className="text-brand-600">Data</span> Hub
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navLinks.map((link) =>
            link.children ? (
              <div key={link.label} className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setCategoryOpen(!categoryOpen)}
                  aria-expanded={categoryOpen}
                  aria-haspopup="true"
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
                  )}
                >
                  {link.label}
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={cn('transition-transform duration-200', categoryOpen && 'rotate-180')}
                  />
                </button>
                {categoryOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full mt-1 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                  >
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        role="menuitem"
                        onClick={() => setCategoryOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.label}
                href={link.href!}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  pathname === link.href
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                )}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu — max-height + overflow prevents viewport overflow */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:hidden"
          aria-label="Mobile navigation"
        >
          <nav
            className="container-page overflow-y-auto py-3"
            style={{ maxHeight: 'calc(100dvh - 4rem)' }}
            aria-label="Mobile navigation links"
          >
            <div className="space-y-1">
              {navLinks.map((link) =>
                link.children ? (
                  <div key={link.label}>
                    <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {link.label}
                    </p>
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href!}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'block rounded-lg px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
                      pathname === link.href
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    )}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
