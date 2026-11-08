# SA Data Hub V3 — Research & Implementation Plan
**Insights Layer · Data Stories · UI/UX Redesign**

Date: 2026-08-19
Status: Research complete. Nothing implemented. This document is a research + architecture + phased plan handoff for an implementation agent.

Sources consulted: `ai-context.md`, `SA_DATA_HUB_Architecture_Review.md`, `CURRENT_STATE.md` (uploaded), the live GitHub repo README (`github.com/ubayd-hattas/SA_DataHub`), and the live site (`sadatahub.tech` — home, `/insights`). External research was done via web search across npm, GitHub, and vendor documentation on 2026-08-19; each external claim below is either sourced inline or flagged as general/unverified.

---

## PART 1 — Current State Relevant to V3

### What we already have (verified from repo README + docs)

| Area | What exists | File(s) |
|---|---|---|
| Charting | Recharts wrappers: line, bar, pie, age-structure, basic-services, housing-composition | `src/components/charts/` |
| Insight generation | Rule-based, category-level auto-insight generator, already in production | `src/lib/insights.ts` |
| Stat-level explanations | "What changed / long-term trend / why it matters / caveats" generator | `src/lib/explanations.ts` |
| Citation engine | APA/Harvard/Vancouver generator, clipboard copy with HTTP fallback | `src/lib/citation.ts` |
| Dataset registry | Single source of truth: freshness, automation level, cadence, geography | `src/lib/registry.ts` |
| Data Stories | Structured content module, 5 published stories, category filter, featured/more split, "read time," stat callouts, TOC on story pages | `src/data/stories.ts`, `src/app/insights/` |
| Styling system | Tailwind 3, three-font system (DM Serif Display / DM Sans / DM Mono), dark mode via `next-themes` | `globals.css`, `tailwind.config.ts` |
| Static generation | `generateStaticParams` across 8 categories, 9 provinces, 213 municipalities | `src/app/*` |
| Data layer abstraction | `DATA_SOURCE=json\|database` provider switch, 4 datasets DB-backed as of 2026-08-18 | `src/data/providers/` |

### What can be reused as-is
- `insights.ts` / `explanations.ts` — this **is** the deterministic insight engine's starting point. It is not a stub; it's a working rule-based generator already in production. V3's "Insight Engine" is an *extension*, not a new system.
- `registry.ts`, `citation.ts` — explicitly protected per `ai-context.md`; any new insight or story surface should read from these, not duplicate them.
- Recharts chart components — proven, styled, dark-mode aware, CSV-export wired.
- The `Statistic` type and `mock.ts` facade — the data contract insights/stories will consume.
- Three-font design system and card/heading Tailwind utilities in `globals.css`.

### What is incomplete
- `stories.ts` is a flat, hardcoded content module, not a schema-driven system — every new story is hand-authored TypeScript, not composed from reusable chapter/block primitives. This is the main gap Part 8B addresses.
- No scroll-driven or chapter-navigation UX on story pages beyond a table of contents (per the live `/insights` and story index inspected — stories are presented as long-form articles with inline stat callouts, not scrollytelling).
- No cross-dataset correlation in `insights.ts` (per Architecture Review §Phase 6) — insights are single-category.
- No animation library in the stack (README's technology table lists Next.js, TypeScript, Tailwind, Recharts, Lucide, next-themes, Vercel Analytics — no Framer Motion, no scroll library).

### What is missing entirely
- Anomaly/outlier detection, rolling averages, record-high/low detection, YoY vs QoQ distinctions as reusable statistical primitives (currently whatever `insights.ts` does ad hoc — not reviewed line-by-line here, but the architecture doc doesn't mention a dedicated stats/math module).
- A story authoring schema that separates content (narrative, statistic, visualization, citation) into typed blocks.
- Scroll-triggered chart transitions.
- A component library layer above raw Recharts wrappers (no shadcn/ui, no Tremor, no design-token-driven chart theming visible in the stack).

### What should NOT be rebuilt
- **Recharts** — do not replace. See Part 5.
- **`insights.ts` / `explanations.ts`** — extend with new deterministic calculators; don't discard the existing rule engine.
- **`registry.ts` / `citation.ts`** — explicitly protected in `ai-context.md`; V3 work must read from these, never fork them.
- **The static-generation architecture** (`generateStaticParams` across 213 municipalities etc.) — any Insights/Stories additions must stay compatible with this, not force the app into full client-rendering.
- **The JSON/DB provider abstraction** — new insight calculations should be written against the `Statistic` type returned by `getAppDataProvider()`, not against raw JSON or raw SQL, so they keep working through the PostgreSQL migration.

---

## PART 2 — Insights Layer Research

### Verified finding: no JS library "does" automated data narratives well enough to adopt wholesale
There is no actively maintained, general-purpose "detect a trend and write a sentence about it" library worth adopting. This space (data-journalism narrative generation) is dominated by proprietary products (Arria NLG, Automated Insights/Wordsmith) with no meaningful open-source equivalent for this scale of project. **Verdict: build this ourselves — which SA Data Hub already has started doing in `insights.ts`.** This matches the brief's own instruction: prefer deterministic calculation, treat LLM narrative generation as an optional future layer.

### What's genuinely worth adopting: a statistics primitives library, not a narrative library

| Library | Repo | License | Maintenance (verified) | What it gives us | Verdict |
|---|---|---|---|---|---|
| **simple-statistics** | `simple-statistics/simple-statistics` (github.com/simple-statistics/simple-statistics) | ISC (permissive, OSI-approved) | Actively maintained — v7.8.9 shipped ~2 months before this review, **898K weekly downloads**, healthy release cadence per Socket.dev's dependency-health analysis | Descriptive stats (mean, median, mode, stddev, quantile), linear regression, z-scores — useful building blocks for "record high," "N standard deviations from trend," rolling averages via `sampleCorrelation`/custom windowing | **B. Adapt** — pull in the ~10 functions actually needed (mean, stddev, linearRegression, quantile) rather than the whole package if bundle size matters; it's zero-dependency and tree-shakeable either way |
| `d3-array` | part of the D3 ecosystem | BSD-3 | Actively maintained as part of D3 | `rollup`, `group`, `bisector`, `pairs` — useful for period-over-period diffing and rolling windows if the team already reaches for D3 primitives elsewhere | **C. Inspiration/optional** — only worth adding if Part 3's scrollytelling work also pulls in D3 primitives; don't add D3 solely for this |
| `stats-analysis` (npm) | — | unlicensed/legacy | Last published ~10 years ago per npm listing | Outlier detection (MAD, median-differencing) | **D. Do not use** — abandoned, easily replicated in ~20 lines using `simple-statistics`'s stddev + z-score |

**Recommendation for the Insight Engine's math layer:** add `simple-statistics` as a small, well-maintained dependency for the primitives (mean, stddev, z-score, quantile, linear regression slope for trend direction), and write SA Data Hub–specific detectors on top of it (record high/low, N-quarter momentum, YoY vs QoQ framing, "furthest from the 5-year average," anomaly flag at >2 stddev). This is a thin, deterministic layer — a few hundred lines of TypeScript in `src/lib/insights/` — not a new subsystem. Nothing here should touch an LLM; wording templates stay hand-authored, as `explanations.ts` already does.

**Do not build:** a general statistics engine from scratch (mean/stddev/regression math). That's exactly the kind of work `simple-statistics` already gives away for free, correctly tested, for zero meaningful integration cost (it's a flat function import, no build-step changes, works identically server- and client-side, and has no React/Next-specific concerns since it just operates on number arrays).

---

## PART 3 — Data Stories Research (scrollytelling)

### The landscape (verified via GitHub/npm search, 2026-08-19)

| Project | Repo | License | Maintenance signal (verified) | Framework | What it provides | Classification |
|---|---|---|---|---|---|---|
| **Scrollama** (core) | `russellsamora/scrollama` (also mirrored as `alexnoz/scrollama`) | MIT | Actively iterated — v3.2.0, core being refactored for maintainability, built on native IntersectionObserver | Vanilla JS, framework-agnostic | The foundational "sticky graphic, enter/exit step" scrollytelling pattern used by most data-journalism scrollytellers | **C. Architectural inspiration** for the *pattern*; not consumed directly since we're in React |
| **react-scrollama** | `jsonkao/react-scrollama` (npm: `react-scrollama`) | MIT | v2.4.2, actively listed on npm with recent publish; used in production by outlets referenced in its own docs (Columbia Daily Spectator, Politico-affiliated work) | React, wraps Scrollama's IntersectionObserver approach | `<Scrollama>` + `<Step>` components, `onStepEnter`/`onStepExit`/`onStepProgress` callbacks — exactly the primitive needed for "chart reacts as you scroll through chapter text" | **A. Use directly** for story scroll-triggering |
| `@bsmnt/scrollytelling` (basement studio) | `basementstudio/scrollytelling` | — (verify before adopting; 718★, actively updated per GitHub topic listing) | Recently updated | React + GSAP ScrollTrigger | Full animation-timeline abstraction over GSAP, more powerful than needed | **D. Do not use** — adds a GSAP dependency and a heavier mental model for animation the project doesn't need; scroll-triggering a chart's data window is a state-swap problem, not a timeline-animation problem |
| `react-scrolly-telling` | `guptasiddhant/react-scrolly-telling` | — | Actively maintained, SSR/Suspense-aware, uses `useSyncExternalStore` | React | Lower-level position-tracking hook rather than the Step/Scrollama pattern | **D. Do not use** — react-scrollama already covers the need with a simpler API; this is a second, redundant primitive |

### Recommendation
Adopt **`react-scrollama`** directly for the "chart reacts to scroll position" mechanic inside story chapters. It is MIT-licensed, small, has no animation opinions (so it composes with whatever CSS transitions or Framer Motion choices come later), and its `<Step>`/`onStepEnter` model maps directly onto the "chapter → statistic → visualization" schema the brief asks for in Part 8B: each `<Step>` corresponds to one story chapter, and `onStepEnter` swaps which stat/chart is highlighted or which chart's data window is shown.

**Do not build a custom IntersectionObserver wrapper from scratch** — `react-scrollama` is the exact, tested, MIT-licensed implementation of that wrapper, and reimplementing it wastes an implementation agent's context on infrastructure that already exists and is well-understood (World Bank's own SDG Atlas and multiple newsroom interactives use the underlying Scrollama pattern per its documentation, indicating it survives real production scrutiny).

**Coexistence with Recharts confirmed:** react-scrollama does not touch rendering — it only fires callbacks on scroll position. Recharts components stay exactly as they are; a chapter's `onStepEnter` callback just updates React state (e.g., `highlightedPeriod`, `activeSeries`) that an existing `LineChartCard` already accepts or can be extended to accept as props. No SSR conflict: `react-scrollama` is a client-only interaction layer, so story pages stay server components for the narrative text and data-fetch, with a `'use client'` island wrapping just the `<Scrollama>` region — consistent with the project's existing "client island" discipline (`ai-context.md`: "'use client' only for interactivity").

### Not adopting whole "story framework" products
Datawrapper and Flourish are not open source (SaaS products); this rules them out as *code* to reuse, though their published design conventions (annotation style, chart-to-narrative pairing) are worth studying as **inspiration only**, not as dependencies. No credible open-source "Flourish-equivalent" framework was found with material adoption evidence; recommend not chasing one.

---

## PART 4 — UI/UX Research

### Live-site assessment (from direct inspection of `sadatahub.tech`, 2026-08-19)
Observed from the homepage and `/insights`:
- Content structure is strong: key indicators, category grid, "why SA Data Hub," data stories teaser, methodology, footer with full sitemap — an information-dense but organized layout.
- Story cards on `/insights` already carry emoji category icons, read-time, featured/more distinction, and category filter chips — a reasonable content model, but visually plain (no imagery, no visual hierarchy beyond typography and an emoji).
- No visible component system beyond hand-built cards; nothing that looks like a shared "badge," "stat delta," or "KPI tile" primitive reused consistently — each card type (key-indicator card, category card, story card) appears to be its own bespoke component, which is consistent with the repo's `src/components/ui/` inventory (`CategoryCard`, `CitationWidget`, `DatasetExplanation`, `ExportButton` — a small, curated set, not a full design system).
- This is a genuine opportunity: the project needs a *thin, consistent UI primitive layer* (KPI tile, delta badge, section header) more than it needs a full dashboard rebuild.

### Verified external findings

**Tremor** (`tremorlabs/tremor`, MIT license) — **directly relevant, high-value finding.**
Tremor was acquired by Vercel in January 2025; as of the acquisition, the full component library **and** the paid "Tremor Blocks" (300+ prebuilt sections) became MIT-licensed and free. Critically, Tremor is **built on top of Recharts, Tailwind CSS, and Radix UI** — the exact stack SA Data Hub already uses for charts and styling (Tailwind is already in place; Radix is a new but tiny, unopinionated dependency). It follows a copy-paste model like shadcn/ui (components live in your repo, no lock-in) and its stated design philosophy — "show the data, hide the chrome" — is a direct match for a statistics portal. It ships KPI cards, delta/badge components, spark-lines, data bars, and trackers: precisely the "thin UI primitive layer" the live-site review above identifies as missing.
**Verdict: B. Adapt.** Don't install Tremor as a runtime dependency wholesale; copy the specific components (KPI card, delta badge, spark-line) that plug the gap, matching the existing three-font/Tailwind design tokens. This avoids taking on Tremor's own design opinions wholesale while reusing its solved problems (accessible KPI/delta patterns on top of Recharts).

**shadcn/ui official Charts** (`ui.shadcn.com/docs/components/base/chart`, part of `shadcn-ui/ui`, MIT) — **directly relevant.**
This is not a separate charting engine — it is a **thin, copy-paste theming layer over Recharts** (confirmed: "We use Recharts under the hood... you build your charts using Recharts components," "We do not wrap Recharts... you're not locked into an abstraction"). It gives CSS-variable-driven theming (so dark mode / three-font system integrates cleanly), a `ChartTooltip`/`ChartContainer` pattern, and area/bar/line/pie/radar variants — all installed via `npx shadcn add chart-area-interactive` and editable in-repo.
**Verdict: A. Use directly** for new chart variants and to re-skin the theming layer of existing Recharts wrappers, since it changes zero charting logic — only the presentational wrapper.

**shadcn/ui `dashboard-01` block** (`ui.shadcn.com/blocks`, MIT) — reference architecture for a sidebar + KPI cards + interactive chart + data table shell. **Verdict: C. Architectural inspiration** for any future `/dashboard` layout rework — the project's dashboard is a client-island search/filter page, not an admin shell, so don't adopt the sidebar pattern literally, but the `SectionCards` → `ChartAreaInteractive` → `DataTable` composition order is a good reference for a redesigned category or province page.

**Aceternity UI / Magic UI** — animated marketing-site component libraries (hero sections, beams, marquees). **Verdict: D. Do not use** for the core statistics pages — their visual language (glow effects, gradient beams) is a mismatch for a sober, government-statistics-adjacent portal, and would fight the existing three-font editorial identity. They could be considered *only* for a homepage hero flourish, and even then cautiously.

**Radix UI** — the accessibility/primitive layer underneath both shadcn/ui and Tremor (dialogs, popovers, tooltips with correct ARIA/focus handling). Not a visual library. **Verdict: A. Use directly**, transitively, as the dependency both shadcn and Tremor components need — do not build custom accessible popovers/tooltips from scratch when Radix primitives are the de facto standard being pulled in anyway.

### License/practicality audit summary
| Library | License | Concern? |
|---|---|---|
| Recharts | MIT | None |
| Tremor | MIT (confirmed post-Vercel acquisition, Jan 2025) | None |
| shadcn/ui | MIT | None |
| Radix UI | MIT | None |
| react-scrollama | MIT | None |
| simple-statistics | ISC | None (OSI-approved, permissive) |
| Aceternity/Magic UI (not recommended) | mixed, some components paywalled | N/A — not recommended |
| visx | MIT (Airbnb) | None, but see Part 5 — not recommended for this project regardless of license |

No GPL, no proprietary, no unclear-license dependency is being recommended anywhere in this plan.

---

## PART 5 — Data Visualization Stack Decision

**Firm recommendation: A — Recharts remains the primary visualization library. Supplement (not replace) with the shadcn/ui chart theming layer.**

Reasoning, backed by the research above:
- **Existing investment**: five working chart components, dark-mode aware, CSV-export wired, already tuned to the three-font system. Replacing this is pure migration cost with no product-facing benefit.
- **Ecosystem gravity**: shadcn/ui's official charts, Tremor, and the majority of current (2026) shadcn-ecosystem dashboard tooling are *themselves* built on Recharts — the market has converged on Recharts as the default React/Next.js/Tailwind charting layer, which is exactly SA Data Hub's stack. Adopting Tremor/shadcn charts is additive to Recharts, not a fork away from it.
- **visx** (Airbnb, MIT, actively maintained — confirmed via GitHub issues/discussions showing ongoing 2026 activity and a React 19–compatible v4) is a legitimate, well-maintained alternative, but it is a *lower-level primitives library*, not a chart library — teams report 2–3× the code to build the same chart versus Recharts. It earns its keep only for bespoke, D3-grade custom visuals (e.g., a genuinely novel scrollytelling chart type). **Recommendation: keep visx in reserve for Phase 5 flagship-story custom visuals only — do not adopt it as a general dependency.**
- **Nivo** was reported as having "stalled out" in maintenance in community discussion on the visx repo, and its main advantage (canvas/SSR chart image generation) is not a current SA Data Hub need. **Not recommended.**
- **Vega-Lite/Observable/ECharts/Plotly**: none solve a problem Recharts + shadcn theming doesn't already solve for this project's chart types (line, bar, area, pie/donut, radial), and all would mean learning a second declarative grammar for marginal benefit. **Not recommended.**

---

## PART 6 — The "Don't Build From Scratch" Stack

```
UI:
    shadcn/ui official components + chart theming layer   (MIT — install via CLI)
    Tremor components (KPI tile, delta badge, spark-line)  (MIT — copy specific components, not whole lib)
    Radix UI                                                (MIT — transitive, for accessible primitives)
    Existing SA Data Hub components (CategoryCard, StatCard, CitationWidget, etc.) — keep, restyle only

Charts:
    Recharts                                                (MIT — unchanged, primary)
    visx (reserve, Phase 5 only, for bespoke story visuals) (MIT — Airbnb)

Stories:
    react-scrollama                                         (MIT — scroll-triggered chapter/chart binding)
    New: story schema + chapter/block components             (build — SA Data Hub–specific, see Part 8B)

Insights:
    simple-statistics                                       (ISC — math primitives: mean, stddev, quantile, regression)
    Existing src/lib/insights.ts / explanations.ts, extended (build — deterministic detectors + templates)

Animation:
    Framer Motion                                            (MIT — new addition; industry-standard, React-native,
                                                               works with server components via client islands,
                                                               needed for chapter transitions/chart highlight fades)

Icons:
    Lucide React                                             (existing — keep, no change)

Data processing:
    Existing DATA_SOURCE=json|database provider abstraction  (existing — new insight code reads Statistic type only)
```

Every entry above is either already in the codebase, MIT/ISC-licensed with verified 2026 maintenance activity, or explicitly justified against a gap identified in Part 1/4.

---

## PART 7 — License & Practicality Audit (consolidated)

| Library | License | Maintenance evidence (2026) | Next.js 14 / React compat | Verdict |
|---|---|---|---|---|
| simple-statistics | ISC | v7.8.9, released ~2 months prior to this review, 898K weekly downloads | Pure JS, no framework coupling | Safe to adopt |
| react-scrollama | MIT | v2.4.2 on npm, actively listed | React 17/18 (verify 19 peer range before install) | Safe to adopt |
| Tremor | MIT | Actively backed by Vercel post-acquisition (Jan 2025); component library "actively maintained" per multiple 2026 sources | Built for React/Tailwind/Radix — same stack | Safe to adopt (selectively) |
| shadcn/ui + charts | MIT | Recharts v3 support merged into shadcn chart docs (per shadcn-ui/ui issue #7669, closed) — actively tracked | Explicitly Next.js-first | Safe to adopt |
| Radix UI | MIT | Industry-standard accessibility primitive layer, transitively required by shadcn/Tremor | React-native | Safe to adopt |
| Framer Motion | MIT | Industry standard; not independently re-verified in this pass — low risk, ubiquitous | React-native, SSR-safe via client components | Safe to adopt |
| visx | MIT | Confirmed active in 2026 (GitHub discussion #1908: maintainers confirm ongoing development, v4 alpha with React 19 support) | React-native | Safe to hold in reserve |
| Nivo | MIT (not independently re-verified) | Reported "stalled" per community discussion on visx repo | — | Not recommended, not blocked by license — blocked by momentum |

No licensing red flags found for anything recommended.

---

## PART 8 — Recommended SA Data Hub V3 Architecture

### A. Insight Engine

```
INPUT:  Statistic (existing type: id, headline value, unit, series[], geography, category)
          → sourced via getAppDataProvider(), same path pages already use
PROCESSING:
  1. Math layer (new, thin):  src/lib/insights/stats.ts
     - wraps simple-statistics: mean(), standardDeviation(), quantile(), linearRegressionLine()
     - adds SA Data Hub-specific helpers: periodOverPeriodDelta(), yearOverYearDelta(),
       rollingAverage(windowSize), zScoreOfLatest(), isRecordHighOrLow(series)
  2. Detector layer (new):    src/lib/insights/detectors.ts
     - pure functions: (series) => InsightFact[] where InsightFact is a discriminated union:
       { type: 'record_high' | 'record_low' | 'trend_reversal' | 'anomaly' | 'momentum' | 'yoy_comparison', ... }
     - each detector is independently unit-testable against fixture series
  3. Rendering layer (existing, extended): src/lib/explanations.ts / insights.ts
     - maps InsightFact[] → the existing plain-English template strings
     - this is where the project's current rule-based prose generation already lives; extend its
       switch/template logic to cover the new fact types rather than replacing it
OUTPUT: same InsightPanel / StatCallout components already rendering insight text today —
        no new UI component required for MVP, only richer input facts
CITATION INTEGRATION: InsightFact carries the same datasetId/period the Statistic already has,
        so CitationWidget usage is unchanged — insights never invent unsourced numbers
TESTING: detectors are pure functions over arrays of numbers/periods — ideal for the project's
        existing "citation.ts/registry.ts/insights.ts are good candidates for tests" guidance
        (ai-context.md) — add fixture-based unit tests per detector
LLM LAYER (explicitly optional, future, Phase 6+ at earliest):
        an LLM could later rephrase/vary the deterministic template output for readability,
        but MUST NOT be the source of any number, trend direction, or comparison — it would
        receive the already-computed InsightFact[] as structured input and only vary wording.
        Not part of this implementation plan's scope.
```

### B. Data Stories (schema-driven)

```
Story
 ├── metadata: { slug, title, dek, category, emoji/icon, readTimeMinutes, featured, publishedAt, updatedAt }
 ├── introduction: RichText block
 ├── chapters: Chapter[]
 │    └── Chapter
 │         ├── id (used as react-scrollama <Step> key)
 │         ├── narrative: RichText block(s)
 │         ├── statCallout?: { statId, comparisonPeriod? }   — resolves via existing getStatById()
 │         ├── visualization?: { chartComponent: 'LineChartCard' | 'BarChartCard' | ..., 
 │         │                     datasetId, seriesConfig, highlightPeriod? }
 │         ├── citation?: { datasetId }  — resolves via existing citation.ts, not duplicated per-chapter
 │         └── scrollBehavior?: { pinChart: boolean, highlightOnEnter: <period or series> }
 └── conclusion: RichText block + relatedStatIds (existing pattern, unchanged)
```

Key design decisions and why:
- **`statId`/`datasetId` references, not inline numbers.** This is already the pattern `stories.ts`'s `relatedStatIds` uses (per `ai-context.md`: "Stories reference `relatedStatIds` that resolve via `getStatById()`"). V3 extends this pattern down into individual chapters instead of only the story's related-stats footer, so a story never goes stale relative to its own cited numbers as datasets update.
- **`react-scrollama` binds chapter entry to visualization state**, not to new chart components — `scrollBehavior.highlightOnEnter` is consumed by extending existing `LineChartCard`/`BarChartCard` props (e.g., an optional `highlightPeriod` prop), not by building parallel "scrolly chart" components.
- **Authoring workflow**: stories remain TypeScript objects (matching the existing `stories.ts` pattern and the "Data stories — write a structured story in `src/data/stories.ts` following the existing schema" contribution guidance already in the README) — this plan does **not** propose a CMS or MDX pipeline; that would be new infrastructure the brief's "don't reinvent" framing argues against, and the existing authoring pattern already works for a solo developer.
- **Responsive behaviour**: on mobile, `scrollBehavior.pinChart` should degrade to a static chart above each chapter's text rather than attempting a sticky-pinned layout — mobile scrollytelling pinning is a known source of jank; the safer default is disabling pin-on-scroll under a Tailwind breakpoint and simply re-rendering the chart per chapter.

### C. UI/UX

- **Design system**: keep the three-font identity; introduce a small set of shared primitives (KPI tile with delta badge, section header, empty/loading/error states) adapted from Tremor/shadcn patterns, restyled to match DM Serif/DM Sans/DM Mono rather than Tremor's own defaults.
- **Component reuse**: `CategoryCard`, `CitationWidget`, `DatasetExplanation`, `ExportButton` stay as-is; new KPI/delta components slot alongside them in `src/components/ui/`.
- **Page hierarchy**: no route changes (URLs are protected per `ai-context.md`). Visual hierarchy improvements happen within existing pages — e.g., replacing the plain-text story cards on `/insights` with image/icon-forward cards using the new KPI/delta primitives for embedded stat previews.
- **Accessibility**: adopting Radix-based primitives (via Tremor/shadcn) is itself an accessibility upgrade — Radix ships correct focus management and ARIA out of the box, which the current hand-rolled component set may not fully have.

---

## PART 9 — Implementation Plan

### Phase 0 — Research + dependency decisions ✅ (this document)
Nothing to implement. Output: this plan, reviewed and approved before Phase 1 starts.

### Phase 1 — Insight engine foundation
- **Objective**: add deterministic statistical detectors on top of existing `insights.ts`/`explanations.ts`.
- **Tasks**: install `simple-statistics`; create `src/lib/insights/stats.ts` (math wrappers) and `src/lib/insights/detectors.ts` (fact detectors); extend `explanations.ts` template switch to render new fact types; add fixture-based unit tests per detector.
- **Files likely to change**: `src/lib/insights.ts`, `src/lib/explanations.ts` (extend, don't rewrite); new `src/lib/insights/` subfolder.
- **Dependencies to install**: `simple-statistics`.
- **Existing infrastructure to reuse**: `Statistic` type, `getAppDataProvider()`, existing InsightPanel/StatCallout rendering components.
- **New infrastructure required**: detector functions, fixture test suite.
- **Testing requirements**: unit tests per detector against known series (record high, anomaly, reversal cases).
- **Acceptance criteria**: at least record-high/low, YoY delta, and anomaly-flag detectors working end-to-end on 2+ real datasets, rendered through existing UI with no new components.
- **Estimated complexity**: Low-Medium.
- **Risks**: false-positive anomaly flags on naturally volatile series (e.g., GDP) — tune thresholds per dataset via registry metadata if needed.
- **What should NOT be done**: no LLM call anywhere in this phase; no new chart components; no changes to `registry.ts`/`citation.ts` shape.

### Phase 2 — Data Stories infrastructure
- **Objective**: build the chapter/block schema and scroll-binding mechanics described in Part 8B, without yet writing new story content.
- **Tasks**: define `Chapter`/`StoryV2` TypeScript types in `src/types/index.ts` (additive, doesn't break existing `stories.ts` entries); install `react-scrollama`; build a `StoryScrollamaWrapper` client island; extend `LineChartCard`/`BarChartCard` with optional `highlightPeriod`/`activeSeries` props; build mobile-degraded (non-pinned) chapter layout.
- **Files likely to change**: `src/types/index.ts`, new `src/components/stories/` folder, `src/components/charts/LineChartCard.tsx` & `BarChartCard.tsx` (additive props only).
- **Dependencies to install**: `react-scrollama`, `framer-motion` (for chapter-enter fade/highlight transitions).
- **Existing infrastructure to reuse**: existing story routing (`insights/[slug]/page.tsx`), `getStatById()`, `CitationWidget`.
- **New infrastructure required**: chapter schema, scroll-binding client island, chart prop extensions.
- **Testing requirements**: manual QA across desktop/mobile breakpoints; verify SSR still works for narrative text (only the scroll-interaction layer is client-side).
- **Acceptance criteria**: one internal test story renders with at least 3 chapters, each triggering a chart-state change on scroll, degrading gracefully to static charts on mobile.
- **Estimated complexity**: Medium.
- **Risks**: IntersectionObserver behavior differences across mobile browsers; sticky/pin CSS conflicts with existing sticky navbar — test the two stickies don't fight.
- **What should NOT be done**: do not migrate existing 5 stories to the new schema yet (that's Phase 3); do not adopt GSAP or a full animation-timeline library.

### Phase 3 — Build 1 flagship Data Story
- **Objective**: prove the Phase 2 infrastructure end-to-end with a real, published story (e.g., rebuild "South Africa's Unemployment Crisis" in the new schema, since it's already the featured story with the richest data).
- **Tasks**: author chapters in the new schema; wire real dataset references; add scroll-triggered highlights (e.g., highlighting the Q4 2025 point when its chapter is in view); visual QA against the three-font system.
- **Files likely to change**: `src/data/stories.ts` (or new `src/data/stories/` per-story files if the flat file gets unwieldy).
- **Existing infrastructure to reuse**: everything from Phase 1 (if the story benefits from an auto-generated insight callout) and Phase 2.
- **New infrastructure required**: none — this phase is content + integration, not new code.
- **Acceptance criteria**: the flagship story is live, passes Lighthouse mobile performance/accessibility checks, and is a visibly better reading experience than the current static version.
- **Estimated complexity**: Low (infrastructure already built in Phase 2).
- **Risks**: scope creep into "just one more chart" — timebox authoring.
- **What should NOT be done**: don't touch the other 4 existing stories yet.

### Phase 4 — UI/UX system improvements
- **Objective**: introduce the KPI tile / delta badge / section-header primitives (Part 8C) sitewide, restyled from Tremor/shadcn patterns.
- **Tasks**: install shadcn CLI + official chart components (`npx shadcn add chart-area-interactive` etc.) for theming; hand-adapt 2–3 Tremor components (KPI card, delta badge) into `src/components/ui/` with project fonts/colors; apply to homepage key-indicators section and `/insights` cards first (highest visual-hierarchy payoff per the live-site review in Part 4).
- **Files likely to change**: `src/components/ui/` (new KPI/delta components), `src/app/page.tsx`, `src/app/insights/page.tsx` (restyle only, no data/logic changes).
- **Dependencies to install**: shadcn CLI (dev-time only), Radix UI primitives (transitive via shadcn/Tremor).
- **Testing requirements**: visual regression check across light/dark mode; accessibility spot-check (keyboard nav, screen reader labels) — this phase is also where the Architecture Review's Phase 5 accessibility goals get partial credit.
- **Acceptance criteria**: homepage key indicators and insights cards visually upgraded with no route/URL/data changes; dark mode intact.
- **Estimated complexity**: Medium.
- **Risks**: Tailwind class conflicts between shadcn's default tokens and the existing custom design tokens — resolve by restyling copied components to existing CSS variables, not shipping Tremor's defaults unmodified.
- **What should NOT be done**: no full dashboard-shell rebuild (`dashboard-01`'s sidebar pattern is inspiration only, per Part 4); no adoption of Aceternity/Magic UI.

### Phase 5 — Build remaining flagship stories
- Repeat Phase 3's pattern for 2–3 more of the existing 5 stories (Inflation, GDP, Crime, Education, Population as prioritized by traffic/editorial priority — not specified here, defer to owner). This is the phase where `visx` may be justified **only if** a specific story needs a bespoke visual Recharts genuinely can't do (e.g., a province-level small-multiples grid) — otherwise stay on Recharts + the Phase 2 chapter/highlight mechanism.

### Phase 6 — SEO/discoverability
- Per the Architecture Review's own Phase 7 assessment, SEO infrastructure is already strong (sitemap, robots, JSON-LD, OG images). Remaining work here is narrow: add `Article`/`BreadcrumbList` JSON-LD to the new chapter-based story pages (the schema module `src/lib/schema.ts` is explicitly flagged "should NOT be touched" for its existing shape, so this is additive, not a rewrite), and verify the new scroll-driven story pages still render meaningful static HTML for crawlers (they will, since only the scroll-interaction layer is client-side).

### Phase 7 — Return to remaining PostgreSQL migrations
- Out of scope for this document; per `ai-context.md`, this continues independently (9 of 13 datasets still JSON-only). Nothing in Phases 1–6 above blocks or is blocked by this work, since all new code is written against the `Statistic` type from the provider abstraction, not against JSON or SQL directly.

---

## PART 10 — "Use Existing Code" Implementation Map

| Requirement | Existing SA Data Hub code | External project/library | Action |
|---|---|---|---|
| Statistic cards / KPI tiles | `StatCard` (exists, per repo inventory) | Tremor KPI card pattern | Adapt Tremor's KPI/delta pattern into existing `StatCard`, restyle to project fonts |
| Charts (line/bar/pie/etc.) | `src/components/charts/*` (Recharts wrappers) | shadcn/ui official Charts (Recharts-based theming layer) | Keep Recharts; adopt shadcn's CSS-variable theming layer for new/refreshed charts |
| Story chapters | `stories.ts` flat content | — (no external chapter framework adopted) | Build a typed `Chapter`/`StoryV2` schema in-repo (Part 8B) |
| Scroll transitions | none | `react-scrollama` (MIT) | Use directly |
| Insights math | `insights.ts` rule engine | `simple-statistics` (ISC) | Add as dependency; write detectors on top |
| Insights narrative rendering | `explanations.ts` templates | — | Extend existing templates; do not replace |
| Navigation / navbar | `Navbar.tsx` (sticky, dark-mode, mobile) | shadcn `dashboard-01` sidebar (inspiration only) | Keep existing navbar; no adoption needed |
| Dashboard layout | `dashboard/page.tsx` (search/filter client island) | shadcn `dashboard-01` composition order | Inspiration only for future rework — not this plan's scope |
| Citation | `citation.ts` | — | Reuse unchanged; new insight/story surfaces call into it |
| Animation | none currently | Framer Motion (MIT) | Install; use for chapter-enter transitions and KPI delta reveals |
| Icons | Lucide React (existing) | — | Keep, no change |
| Accessibility primitives | ad hoc | Radix UI (transitive via shadcn/Tremor) | Adopt transitively; don't hand-roll new popovers/tooltips |
| Data access for new code | `getAppDataProvider()` | — | Reuse unchanged; never bypass with raw JSON/SQL |

---

## PART 11 — Cost & AI Efficiency Notes

For each major task, the mode an implementation agent should operate in:

| Task | Mode |
|---|---|
| Statistical math primitives (mean, stddev, regression) | **Install library** (`simple-statistics`) — do not hand-write |
| Record-high/anomaly/YoY detectors | **Build from scratch** — this is SA Data Hub–specific logic, appropriately small |
| Narrative template rendering | **Reuse existing SA Data Hub code** (`explanations.ts`) — extend, don't replace |
| Scroll-triggered chapter mechanics | **Install library** (`react-scrollama`) — do not hand-roll IntersectionObserver logic |
| Chart theming refresh | **Adapt existing repository** (shadcn chart components) — do not restyle Recharts by hand from zero |
| KPI/delta UI primitives | **Adapt existing repository** (Tremor components, hand-ported) — do not design from a blank canvas |
| Story schema & authoring | **Build from scratch** — inherently project-specific data modeling; no good generic fit exists |
| Chapter-enter animation | **Install library** (Framer Motion) — do not hand-write CSS keyframe orchestration |
| Citation/registry integration | **Reuse existing SA Data Hub code** unchanged |

This ordering front-loads library installs (cheap, low-context-cost) before the two genuinely bespoke build tasks (detectors, story schema) — those are where an implementation agent's context budget should actually go.

---

## PART 12 — Final Recommendation

1. **Build first**: the Phase 1 insight detector layer (`simple-statistics` + a handful of pure detector functions). It's the lowest-risk, highest-leverage change — it improves every category page immediately, using data already in production, with no new UI.
2. **Reuse**: `insights.ts`/`explanations.ts`, `registry.ts`, `citation.ts`, all existing Recharts wrappers, the static-generation architecture, the `Statistic` type/provider abstraction.
3. **Install**: `simple-statistics` (ISC), `react-scrollama` (MIT), `framer-motion` (MIT), shadcn/ui CLI + official chart components (MIT), selected Tremor components hand-copied (MIT).
4. **Do NOT build**: a custom statistics library, a custom IntersectionObserver scroll wrapper, a custom chart engine, a CMS/MDX authoring pipeline for stories, an LLM-driven narrative generator (not now — explicitly deferred), any Aceternity/Magic UI–style animated marketing components.
5. **Repositories the implementation agent should inspect** before writing code:
   - `github.com/simple-statistics/simple-statistics` (API surface for math primitives)
   - `github.com/jsonkao/react-scrollama` (Step/Scrollama API and its own examples)
   - `ui.shadcn.com/docs/components/base/chart` (theming layer conventions)
   - `github.com/tremorlabs/tremor` (KPI/delta component source, for hand-porting)
6. **Dependencies to add**: `simple-statistics`, `react-scrollama`, `framer-motion`, `@radix-ui/*` (transitive via shadcn components), plus whatever shadcn CLI pulls in for the specific chart components installed.
7. **Files to preserve exactly as-is (do not restructure)**: `src/lib/registry.ts`, `src/lib/citation.ts`, `src/lib/schema.ts`, `automation/core/*`, `automation/adapters/base.py`, `db/migrations/001-004` — all explicitly protected per existing project documentation, unrelated to this plan's scope but worth restating since an implementation agent may touch adjacent files.
8. **First implementation PR should contain**: Phase 1 only — `simple-statistics` dependency, `src/lib/insights/stats.ts`, `src/lib/insights/detectors.ts`, extended `explanations.ts` templates, and unit tests. No UI changes, no story schema changes. This keeps the first PR reviewable and reversible.
9. **Postpone**: the full dashboard-shell UI rework (only take `dashboard-01` as inspiration, not a migration target), any LLM narrative layer, any custom bespoke-visual library (`visx`) until a specific Phase 5 story genuinely needs it.
10. **Highest-ROI path**: Phase 1 (insight detectors) → Phase 2 (story infrastructure) → Phase 3 (one flagship story) → Phase 4 (UI primitives sitewide) — in that order, because each phase is independently shippable, none requires the others to provide value, and the ordering matches "maximum visible/product value per unit of engineering effort" from the brief: Phase 1 improves 8 existing category pages for a few hundred lines of code; Phase 3 turns the infrastructure investment of Phase 2 into one visible, shareable flagship page before committing to a full UI overhaul.

---

## Appendix — Research Verification Notes

- Live site (`sadatahub.tech`) and `/insights` were fetched directly on 2026-08-19 for the UI/UX assessment in Part 4; findings above are based on that direct inspection, not screenshots.
- GitHub repo README was fetched directly from `github.com/ubayd-hattas/SA_DataHub` on 2026-08-19; the "Current State" section is grounded in that README plus the two attached documentation files.
- All external libraries recommended for adoption (`simple-statistics`, `react-scrollama`, Tremor, shadcn/ui, Radix UI, visx) were verified via live web search on 2026-08-19 against npm/GitHub/vendor sources — repository existence, license, and recent maintenance activity were each confirmed, not assumed from training data. Framer Motion's specific 2026 maintenance status was not independently re-verified in this pass (it is included on the strength of its status as the de facto standard React animation library); confirm current release cadence before pinning a version.
- No repository is cited in this document that could not be located via search; any library considered but not verifiable (e.g., generic "automated insights" narrative-generation open-source projects) was explicitly marked as not found rather than assumed to exist.
