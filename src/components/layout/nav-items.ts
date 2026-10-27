/**
 * The five sections of the main navigation. The desktop bar and the phone
 * menu both render this list, so they always have the same structure.
 * tests/unit/navigation.test.ts checks that every link is an existing route.
 */

export interface NavLink {
  href: string
  label: string
}

export interface NavSection {
  id: string
  label: string
  /** A section with one destination is a plain link. */
  href?: string
  links?: NavLink[]
  /** Paths that mark this section as the current one. */
  match: string[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'what-changed',
    label: 'What changed',
    href: '/explainers',
    match: ['/explainers'],
  },
  {
    id: 'your-area',
    label: 'Your area',
    links: [
      { href: '/municipalities', label: 'Municipalities' },
      { href: '/provinces', label: 'Provinces' },
    ],
    match: ['/municipalities', '/provinces'],
  },
  {
    id: 'topics',
    label: 'Topics',
    links: [
      { href: '/category/unemployment', label: 'Unemployment' },
      { href: '/category/gdp', label: 'GDP and economy' },
      { href: '/category/inflation', label: 'Inflation' },
      { href: '/category/crime', label: 'Crime' },
      { href: '/category/education', label: 'Education' },
      { href: '/category/population', label: 'Population' },
      { href: '/category/housing', label: 'Housing' },
      { href: '/category/census', label: 'Census 2022' },
      { href: '/dashboard', label: 'All statistics' },
    ],
    match: ['/category', '/dashboard'],
  },
  {
    id: 'tools',
    label: 'Tools',
    links: [
      // Moves to /tools/money-value when that page exists.
      { href: '/explainers/cpi-2026-09#money-worth', label: 'Money value calculator' },
      { href: '/provinces#compare', label: 'Compare provinces' },
      { href: '/downloads', label: 'Downloads' },
    ],
    match: ['/tools', '/downloads'],
  },
  {
    id: 'about-the-data',
    label: 'About the data',
    links: [
      { href: '/methodology', label: 'Methodology' },
      { href: '/updates', label: 'Updates' },
      { href: '/about', label: 'About' },
    ],
    match: ['/methodology', '/updates', '/about'],
  },
]

export function isCurrentSection(section: NavSection, pathname: string): boolean {
  return section.match.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
