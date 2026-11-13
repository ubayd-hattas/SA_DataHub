# SA Data Hub: site structure and UX plan

**Date:** 13 November 2026. Plan only. No code or design files were changed.

## Result

The site does not need an overhaul. The home page, topic pages and series pages already follow "number first, plain sentence, chart, table, source" and already use the editorial design system in `docs/DESIGN.md`. The work is to (1) add fuel to the front of the site, (2) finish moving the last old-look pages onto the existing system, (3) turn the layout that topic and series pages already share into one named component so fuel reuses it, and (4) add the two states the system lacks: stale and estimate.

## How this was reviewed

- Live site at 375 px wide on 13 November 2026: `/`, `/category/inflation`, `/series/cpi-headline`, `/dashboard`.
- Code read: `src/app/page.tsx`, `nav-items.ts`, `layout.tsx`, `LineChartCard.tsx`, `FreshnessIndicator.tsx`, `ExportButton.tsx`, `tailwind.config.ts`, `docs/DESIGN.md`.
- Screenshots already in `docs/case-study/after/` at 390 and 1280 px.
- **Not reviewed in a browser:** municipality pages, province pages, explainers, answers, tools, stories, `/downloads`, `/updates`, desktop width, dark theme, keyboard use, a screen reader. The implementing model must check each page it touches at 375 px and 1280 px, in both themes, before calling it done.

## 1. Information architecture

### What exists

Five menu sections: What changed, Your area, Topics, Tools, About the data. Eight topics. The home page shows four headline numbers (inflation, unemployment, GDP growth, repo rate), the municipality finder, "What changed this month", the money calculator, four questions and the topic list.

### Two-tap test

| Number | Taps from home today | After this plan |
|---|---|---|
| Inflation, unemployment, GDP growth, repo rate | 0 (on the home page) | 0 |
| Petrol and diesel price | Not on the site | 0 |
| Expected fuel price change next month | Not on the site | 1 |
| Any topic's headline number | 0 (topic list shows it) | 0 |
| Any other statistic | 2 (topic, then scroll) | 2 |
| A municipality's population | 2 (type name, choose) | 2 |
| Prime rate | 2 | 1 (shown beside repo on the home tile's page) |

The site already passes. The one real gap is fuel.

### Proposed changes

1. **Add "Fuel" as a top-level menu item**, a plain link like "What changed". Order: Fuel, What changed, Your area, Topics, Tools, About the data. Fuel is the only section people will check every month, so it earns the first slot. Six items still fit the phone menu.
2. **Fuel routes** (detail in `docs/fuel.md`):
   - `/fuel`: this month's prices, the next expected change, the calculator, the chart, what a litre is made of.
   - `/fuel/next-month`: the estimate, how it is worked out, and the track record.
   - `/fuel/history`: every monthly price as a table, with CSV.
3. **Home page, in this order:**
   1. Heading and the headline grid. Add a fifth and sixth tile so the grid stays even: **Petrol 95 (inland)** and **Diesel 0.05% (inland, wholesale)**. Each links to `/fuel`. On phones the grid is 2 columns by 3 rows.
   2. A one-line fuel strip under the grid, only while an estimate exists: "Petrol is expected to go up by between X and Y cents on 2 December. This is an estimate." Links to `/fuel/next-month`. No strip when there is no estimate.
   3. **Questions people ask**, moved up from fifth place to second, and rebuilt as the main way in. Six questions, each a full-width tappable row showing the question and the answer's number on the right, the same pattern as the topic list. Start with: What is the petrol price this month? What will petrol cost next month? What is the unemployment rate? What is the inflation rate? What is the repo rate? How many people live in my municipality? The first four existing questions stay available under "All questions".
   4. Find your municipality (unchanged).
   5. What changed this month (unchanged).
   6. Money calculator (unchanged).
   7. Topics (unchanged).
   8. Trust line (unchanged).
   
   Question order should follow Search Console, as the existing comment in `page.tsx` line 19 already says. The fuel questions are placed first on the owner's statement that fuel is the top search trend. I did not verify that trend.
4. **Retire `/dashboard` as a destination.** `/series` already lists every statistic. Keep the URL and redirect it to `/series`, after checking Search Console that `/dashboard` gets no meaningful clicks. Rename the menu item "All statistics" to point at `/series`. This removes the last big old-look page instead of rebuilding it.
5. **No other structural change.** Do not add categories, landing pages or a second navigation.

## 2. One data page layout

Topic pages and series pages already do this by hand. Make it one component so fuel, and every later dataset, gets it for free.

`DataPage` (new, in `src/components/editorial/`), built from pieces that exist:

| Order | Slot | Existing piece | Rule |
|---|---|---|---|
| 1 | Headline number | `NumberBlock` | One number, its period, and the change in words ("Up from 4.4% in Aug 2026") |
| 2 | Plain-English line | `NumberBlock` meaning line | One sentence, no jargon, under 25 words |
| 3 | Chart | `ChartFigure` | Title states the takeaway. Server-rendered SVG. No Recharts on new pages |
| 4 | Table toggle | exists on topic pages | "Show the numbers as a table" directly under the chart |
| 5 | Detail | `Section` and `Prose` | What it covers, what it leaves out, how to read it |
| 6 | Source and dates | `SourceLine` | Source, release date, checked date. Always last in the block, never missing |
| 7 | Actions | `ExportButton`, citation | CSV, JSON, cite, share |

Props, so the implementer does not invent them: `headline`, `meaning`, `chart`, `table`, `detail`, `source`, `actions`, and `status` (`'ok' | 'stale' | 'estimate' | 'error' | 'empty'`).

Acceptance: `/series/[id]` and one topic page render through `DataPage` with no visual change (compare screenshots before and after at 375 and 1280 px).

## 3. Design system

The system exists. This section lists only what to add or enforce. Everything else stays as `docs/DESIGN.md` says.

### Spacing, type, colour

- Spacing steps: 1, 2, 3, 4, 6, 8, 10, 12, 16. Already set. Enforce on the pages being moved.
- Type scale: `caption` 13, `small` 15, `body` 17, `lede` 20, `h3` 22, `h2` 28, `h1` 40, `figure` 64. Already in `tailwind.config.ts`. The home page uses raw sizes (`text-[1.75rem]`, `text-[2.25rem]`, `text-[3rem]`). Replace with scale names, adding one token (`figure-sm`, 36 px) if needed rather than more raw values.
- Palette roles: `paper`, `subtle`, `ink`, `muted`, `rule`, `accent`, `good`, `bad`. Keep.
- **Add one token: `warn`**, for stale data and estimates. Suggested light `#8a5a00`, dark `#e6b450`. These are proposals. They must pass the 4.5:1 check on `paper` and `subtle` in `tests/unit/design-system.test.ts` before use. Adjust the shade until the test passes.
- **Remove** from new work and, page by page, from old work: `brand-*`, `gold-*`, `slate-*`, the `card` class, the `fade-in` and `slide-up` animations.

### Chart colour rules

- One series: `accent`.
- Two to four series: `accent`, `ink`, `muted`, then `good`. Label each line at its end. No legend unless end labels collide.
- More than four series: do not draw them on one chart. Use a selector (fuel: choose product and zone).
- An estimate is never drawn like an actual value: dashed line or a shaded band in `subtle`, labelled "estimate" in words.
- Never colour a fuel price move `good` or `bad` by default. A price rise is bad for a motorist and neutral as a fact. Use words ("up 12 cents") and `ink`.
- Y-axis starts at a sensible floor, not always zero, and the axis says so when it is cut.

### Components and their states

Every data component must render all five states. Stories or test fixtures for each state are part of done.

| Component | Loading | Empty | Error | Stale | Normal |
|---|---|---|---|---|---|
| `NumberBlock` | Not needed for static pages. For client-computed values (calculator): a dash in place of the number, same height | "No figure yet" and why | "This figure could not be loaded" plus the last good value and its date if one exists | The value, with a `warn` line: "Last checked 11 Nov 2026. A newer figure may exist." | Value, period, change, source |
| `ChartFigure` | Fixed-height box so the page does not jump | "No data for this period" | Table shown instead of the chart | Chart with the stale line above it | Chart, table toggle, source |
| `SourceLine` | n/a | Must never be empty: the build fails (`assertSiteSourced`) | n/a | Adds "Automated check failed on [date]" when the pipeline says so | Source, released, checked |
| `EstimateBlock` (new) | Dash | "No estimate yet. The first figures for next month arrive a few days after the price change." | Hidden, with the reason in one line | "Based on figures up to [date]" in `warn` | Range, "estimate" label, as-of date, link to track record |
| `Calculator` (new, fuel) | Result area shows a dash until inputs are valid | Prompt: "Enter your tank size" | Inline message under the field that is wrong | Uses the last official price and says which month | Result in rands, share buttons |
| `ExportButton` | Brief "Preparing" is not needed: files are static links | Hidden when there is nothing to export | n/a | n/a | Link to the static CSV, not a client-side build |

**Stale on a static site.** Pages are built once, so "stale" cannot be decided at build time. Each automated figure carries its `asOf` date in the HTML. A small client component compares it with today and shows the stale line when the gap is more than the allowed number of days (3 for daily CEF figures, 40 for monthly prices). With JavaScript off, the dates are still printed, so nothing is hidden.

### Figma

The brief asks for tokens and key screens in Figma for review before build. That has not been done in this pass. See the note at the end of `docs/implementation-plan.md`: it is task UX-0 and it comes before any UI task.

## 4. Accessibility and copy

- **Contrast:** token pairs are tested. Old `slate-*` text on old cards is not. It goes away with the old classes.
- **Chart alternative:** every chart has the table toggle. The table is a real `<table>` with a `<caption>`, `<th scope>` and tabular figures.
- **Chart text alternative:** the chart title is the takeaway sentence, so a screen reader gets the finding, not "line chart".
- **Touch targets:** 44 px minimum height for every row, button and selector. The topic rows and headline tiles already use full-tile links.
- **Forms (calculator, selectors):** a visible `<label>` for every field, `inputmode="decimal"`, errors tied with `aria-describedby`, results in an `aria-live="polite"` region.
- **Motion:** remove the fade-in on the dashboard. Respect `prefers-reduced-motion` anywhere motion stays (stories).
- **Colour is never the only signal:** already a rule. Keep "up" and "down" in words.

### Words to replace or explain

| Jargon | Use instead, or explain on first use |
|---|---|
| Basic fuel price (BFP) | "The import cost: what it would cost to buy the fuel overseas and ship it here" |
| Over-recovery / under-recovery | "So far this month the import cost is lower (or higher) than the price was set for. If it stays that way, the price goes down (or up)" |
| Slate levy | "A charge that pays back months when the price was set too low" |
| General fuel levy | "Fuel tax" on first use, then the official name |
| RAF levy | "Road Accident Fund levy, which pays for crash injury claims" |
| Inland / coastal | "Inland (Gauteng and the interior), coastal (near the ports). Inland costs more because the fuel is piped or trucked up" |
| Diesel 0.05% / 0.005% | "500 ppm" and "50 ppm" beside the official label, because that is what the pump says |
| Wholesale price (diesel) | "The official diesel price is a wholesale price. Stations set their own pump price, so yours will differ" |
| c/l | Show rands per litre in headlines (R30.24). Keep cents per litre for changes ("down 1 cent") and in the CSV |
| LFPR, NEET, LU3 | Already explained in the glossary. Link the first use on each page |

Rules for all copy: number first, one idea per sentence, no adjectives about the number ("shocking", "relief"), the date in words, and no em dashes.

## 5. Trust signals

Already strong: source, release date and checked date on every figure, enforced at build time. Add:

1. **How it got here.** One of two labels beside the checked date: "Entered by hand" or "Updated automatically". Only pipeline-fed figures may say automatic (see audit H2).
2. **Estimate label.** Any number that is not an official price says "Estimate" in the same line as the number, not in a footnote.
3. **Track record link** beside every estimate.
4. **Stale line** as defined above.
5. **The source link goes to the exact document**, not the publisher's home page.
6. **Corrections stay public.** A wrong automated figure that was live gets an entry on `/updates` like any other correction.

## 6. Page-by-page list

| Page | State | Action |
|---|---|---|
| `/` | On the new system. Raw font sizes | Add fuel tiles, move questions up, use scale names |
| `/category/[slug]` | On the new system | Render through `DataPage`. Fix the CSV button (audit H1) |
| `/series/[id]` | On the new system | Render through `DataPage` |
| `/dashboard` | Old look, animation, squashed axes, duplicate search | Redirect to `/series` after a Search Console check |
| `/downloads` | Old look, untrue automation badges | Fix labels first (audit H2). Restyle later with tokens |
| `/provinces/[id]` | Old look per `docs/DESIGN.md` | Move to tokens. Not reviewed live |
| Navbar, footer | Old look per `docs/DESIGN.md` | Move to tokens when adding the Fuel item |
| `/municipalities/*`, `/explainers/*`, `/answers/*`, `/tools/*` | New system per `docs/DESIGN.md` | No change. Not reviewed live |
| `/fuel`, `/fuel/next-month`, `/fuel/history` | New | Build on `DataPage` |
