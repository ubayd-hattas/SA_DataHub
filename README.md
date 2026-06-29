# SA Data Hub

**South Africa's public data, made clear.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwind-css)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://sadatahub.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-Not%20for%20profit-brand)](https://sadatahub.tech)

SA Data Hub is a modern platform that aggregates, visualises, and explains national statistics from trusted South African government sources — Stats SA, the Reserve Bank, SAPS, the Department of Basic Education, and more. Built for students, researchers, journalists, developers, policymakers, and the general public.

**[→ sadatahub.tech](https://sadatahub.tech)**

---

## What it does

Government statistics in South Africa are real and important — but the official releases are PDFs, Excel sheets, and sparse portals that require domain knowledge to navigate. SA Data Hub pulls from the same primary sources and presents the data without the friction.

- **8 data categories** — unemployment, GDP, inflation, crime, education, population, housing, Census 2022
- **9 provinces**, each with a full profile: unemployment trend, matric pass rate, electricity access, GDP share, and more
- **213 municipalities** with Census 2022 profiles covering demographics, housing composition, basic services, age structure, and school attendance
- **Data Stories** — long-form, data-driven narratives that explain what the numbers actually mean
- **Free CSV downloads** for every dataset, with citation metadata
- **Zero paywalls, zero advertising, no government affiliation**

---

## Screenshots


| Homepage | Province Explorer | Municipality Profile |
|----------|-------------------|----------------------|
| ![Homepage](docs/screenshots/home.png) | ![Provinces](docs/screenshots/provinces.png) | ![Municipality](docs/screenshots/municipality.png) |

| Dashboard | Data Downloads | Methodology |
|-----------|----------------|-------------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Downloads](docs/screenshots/downloads.png) | ![Methodology](docs/screenshots/methodology.png) |

---

## Key features

### Data & content
- **Dashboard with live search** — intent-aware search across statistics, provinces, and datasets; returns typed, ranked results
- **8 category pages** — each with stat cards, trend charts (line + bar), auto-generated insights, dataset freshness indicators, and APA/Harvard/Vancouver citation widgets
- **Province Explorer** — sortable comparison chart across all 9 provinces; side-by-side province comparator; click-through to full provincial profiles with provincial unemployment rankings
- **Municipality Explorer** — searchable, filterable, paginated directory of all 213 municipalities (Category A/B/C); full demographic profiles powered by Census 2022 data, including age-structure charts, housing composition (pie), basic services coverage (bar), and national/provincial/peer comparisons
- **Insights (Data Stories)** — long-form articles with inline stat callouts, table of contents, data-freshness indicators, and related-story recommendations
- **Data Downloads** — one-click CSV export for every dataset; per-dataset automation level badges (auto/semi-auto/manual/static); citation widget with APA, Harvard, and Vancouver formats
- **Dataset Updates tracker** — status dashboard (up-to-date / update expected / potentially outdated) with full update history timeline
- **Methodology page** — source documentation for all 5 data providers, per-dataset definitions and known limitations, verification process, and transparency notes
- **Platform Changelog** — versioned release history for platform updates

### Technical
- **App Router + static generation** — `generateStaticParams` used across categories, provinces, and all 213 municipality pages for zero-latency navigations
- **Server/client boundary discipline** — data-heavy pages are server components; interactive features (search, filters, province comparator, municipality explorer) are isolated client islands
- **Three-font typographic system** — DM Serif Display (headings), DM Sans (body), DM Mono (data values) via `next/font/google` with CSS variable injection
- **Dark mode** — full system-aware dark mode via `next-themes`; all charts, cards, and components support both modes
- **Citation engine** — `lib/citation.ts` generates APA, Harvard, and Vancouver citations from structured dataset registry entries; clipboard copy with graceful HTTP fallback
- **Insight engine** — `lib/insights.ts` and `lib/explanations.ts` auto-generate plain-English context (what changed, long-term trend, why it matters, caveats) from stat objects
- **Dataset registry** — `lib/registry.ts` is a single source of truth for all datasets: automation level, publication cadence, freshness status, geographic level, and update history
- **Per-chart CSV export** — individual chart-level and category-level CSV export with source attribution headers
- **Vercel Analytics** — embedded with `@vercel/analytics/react`
- **OpenGraph metadata** — per-page SEO metadata including OG images, titles, and descriptions on municipality and story pages
- **Responsive design** — mobile-first layout; sticky backdrop-blur navbar with collapsible mobile menu and category dropdown

---

## Architecture overview

```
Browser
  └── Next.js App Router (sadatahub.tech, Vercel Edge Network)
        ├── Server Components (layout, category pages, municipality profiles, methodology)
        │     └── Static Generation at build time (all 213 municipality pages, 9 province pages, 8 category pages)
        ├── Client Islands (dashboard search, province comparator, municipality explorer, theme toggle)
        │     └── React state + useMemo for filtering / sorting / pagination
        ├── Data Layer
        │     ├── src/data/mock.ts          — in-memory statistics, categories, provinces, municipalities
        │     ├── src/data/stories.ts       — data story content
        │     ├── src/data/update-history.ts — dataset update log
        │     ├── src/lib/registry.ts       — dataset registry & freshness logic
        │     ├── src/lib/citation.ts       — multi-format citation generator
        │     ├── src/lib/insights.ts       — auto-insight generator (category level)
        │     └── src/lib/explanations.ts   — auto-explanation generator (stat level)
        └── UI Components
              ├── src/components/charts/    — Recharts wrappers (Line, Bar, Pie, Age Structure, Services)
              ├── src/components/ui/        — StatCard, CitationWidget, DatasetExplanation, ExportButton, etc.
              └── src/components/layout/    — Navbar (sticky, dark-mode, mobile), Footer, ThemeProvider
```

**Deployment:** Vercel (automatic deployments from `main`). All pages are statically generated at build time; no runtime database or API calls.

---

## Technology stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Icons | Lucide React |
| Fonts | DM Serif Display · DM Sans · DM Mono (Google Fonts via `next/font`) |
| Dark mode | next-themes |
| Analytics | Vercel Analytics |
| Deployment | Vercel |
| Data sources | Stats SA · SARB · SAPS · DBE · World Bank |

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # Homepage — hero, featured stats, category grid, insights promo
│   ├── dashboard/page.tsx          # Dashboard — search, filters, chart showcase, historical timeline
│   ├── category/[slug]/page.tsx    # Category detail — stat cards, charts, citations, dataset log
│   ├── provinces/page.tsx          # Province Explorer — chart, grid, comparator
│   ├── provinces/[id]/page.tsx     # Province profile — full stats, ranking bar, nav
│   ├── municipalities/page.tsx     # Municipality directory — search, filter, paginate
│   ├── municipalities/[code]/page.tsx  # Municipality profile — census data, comparisons, charts
│   ├── municipalities/MunicipalityExplorer.tsx  # Client island for search/filter/paginate
│   ├── insights/page.tsx           # Data stories index — search, category filter
│   ├── insights/[slug]/page.tsx    # Story reader — TOC, stat callouts, related stories
│   ├── downloads/page.tsx          # Data downloads — CSV export, citation, freshness
│   ├── updates/page.tsx            # Dataset update tracker
│   ├── methodology/page.tsx        # Full methodology — sources, definitions, limitations
│   ├── changelog/page.tsx          # Platform changelog
│   ├── layout.tsx                  # Root layout — fonts, ThemeProvider, Navbar, Footer
│   └── globals.css                 # Tailwind directives, design tokens, card/heading utilities
├── components/
│   ├── charts/
│   │   ├── LineChartCard.tsx       # Recharts line chart with custom tooltip and cursor
│   │   ├── BarChartCard.tsx        # Recharts bar chart with per-bar CSV export
│   │   ├── AgeStructureChart.tsx   # Coloured bar chart for age cohorts
│   │   ├── BasicServicesChart.tsx  # Horizontal bar chart for service coverage
│   │   └── HousingCompositionChart.tsx  # Donut chart for dwelling types
│   ├── layout/
│   │   ├── Navbar.tsx              # Sticky nav with dropdown, mobile menu, theme toggle
│   │   ├── Footer.tsx              # Four-column footer with source links
│   │   └── ThemeProvider.tsx       # next-themes wrapper
│   └── ui/
│       ├── CitationWidget.tsx      # Collapsible APA/Harvard/Vancouver citation with clipboard copy
│       ├── DatasetExplanation.tsx  # Expandable "understanding the data" panel (4-quadrant)
│       ├── CategoryCard.tsx        # Category grid card with icon, description, dataset count
│       └── ExportButton.tsx        # CSV export button (category-level and per-chart)
├── data/
│   ├── mock.ts                     # Statistics, categories, provinces, municipalities
│   ├── stories.ts                  # Data story content and metadata
│   └── update-history.ts           # Dataset update history log
├── lib/
│   ├── registry.ts                 # Dataset registry, freshness, status logic
│   ├── citation.ts                 # Multi-format citation generator
│   ├── insights.ts                 # Category-level auto-insight generator
│   ├── explanations.ts             # Stat-level explanation generator
│   ├── changelog.ts                # Platform changelog data
│   └── utils.ts                    # Date formatting, cn(), province label map
└── types/
    └── index.ts                    # Shared TypeScript types
```

---

## Data sources

| Source | Datasets | Coverage | Frequency |
|--------|----------|----------|-----------|
| **Statistics South Africa (Stats SA)** | Unemployment (QLFS), CPI/PPI, GDP, Census 2022, Population Estimates, Housing (GHS) | 1994–present | Quarterly / Annual |
| **South African Reserve Bank (SARB)** | Repo/Prime Rate, Government Debt, Balance of Payments | 1960–present | Monthly / Quarterly |
| **SA Police Service (SAPS)** | Crime Statistics (contact, property, provincial) | 2000–present | Annual (September) |
| **Department of Basic Education (DBE)** | Matric Pass Rates, School Enrolment, Provincial Education | 2000–present | Annual (January) |
| **World Bank Open Data** | Long-run GDP, Gini Coefficient, Poverty, Internet Access | 1960–present | Annual |

All data is sourced directly from official publications. SA Data Hub is not affiliated with any government department. See [sadatahub.tech/methodology](https://sadatahub.tech/methodology) for full source documentation, per-dataset definitions, and known limitations.

---

## Local development

**Prerequisites:** Node.js 18+, npm or pnpm

```bash
# 1. Clone
git clone https://github.com/<your-username>/sa-data-hub.git
cd sa-data-hub

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
# → http://localhost:3000

# 4. Build for production
npm run build

# 5. Run production build locally
npm start
```

No environment variables are required for the default data layer — all statistics are stored in `src/data/mock.ts`.

### Updating a dataset

Each dataset has a corresponding Python update script (referenced in `src/app/methodology/page.tsx`). To add or update data:

1. Run the relevant `scripts/update_<dataset>.py` against the latest official release
2. Update the corresponding section in `src/data/mock.ts`
3. Bump `lastUpdated` in `src/lib/registry.ts` for that dataset entry
4. Add a record to `src/data/update-history.ts`

---

## Roadmap

- [ ] **REST API** — public JSON endpoints for all datasets (currently data-layer only)
- [ ] **Search autocomplete** — real-time suggestions as you type on the dashboard
- [ ] **Provincial unemployment breakdowns** — per-province filter wired in dashboard
- [ ] **Interest rate timeline** — SARB repo rate data with MPC meeting annotations
- [ ] **Map visualisations** — choropleth maps for provincial and municipal data
- [ ] **User bookmarks** — save stats and provinces for quick reference (localStorage or Supabase)
- [ ] **Embed widgets** — shareable stat card embeds for external sites
- [ ] **Automated data pipeline** — GitHub Actions workflow to run update scripts on release days
- [ ] **International comparisons** — SA vs BRICS vs SSA peers on key indicators

---

## Contributing

Contributions are welcome. The most impactful areas right now:

- **Data accuracy** — if you spot an outdated or incorrect figure, open an issue referencing the official source
- **New datasets** — add a registry entry in `src/lib/registry.ts`, data in `src/data/mock.ts`, and a chart where appropriate
- **Data stories** — write a structured story in `src/data/stories.ts` following the existing schema
- **Accessibility** — keyboard navigation, screen reader labels, focus management
- **Tests** — unit tests for `lib/citation.ts`, `lib/registry.ts`, and `lib/insights.ts` would be a great starting point

Please open an issue before a large pull request so we can discuss scope.

---

## License

MIT. Free for personal, academic, and commercial use. Data remains subject to the terms of the original government sources.

---

*Built by [Ubayd Hattas](https://github.com/ubayd-hattas) · Data from official South African sources · Not affiliated with any government department.*
