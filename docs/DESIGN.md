# SA Data Hub design system

The site should read like a statistics publication: calm, typographic and trustworthy. Numbers and their sources are the content. Everything else stays out of the way.

The explainer page (`/explainers/cpi-2026-09`) is the reference implementation. Shared pieces live in `src/components/editorial/`.

## Rules

1. Light theme by default. Dark is an option (the toggle in the navbar). The theme is set by the `dark` class, and every colour is a CSS variable in `src/app/globals.css`.
2. One accent colour, neutrals, and one colour each for a good and a bad change.
3. No gradients, glows, orbs, glass effects, badges or decorative icons. Icons are only for actions: search, download, share, menu.
4. Sections are separated by whitespace and a thin rule. Cards (a border or a background) are only for something you can click.
5. Colour is never the only signal. A change always says "up" or "down" in words.

## Colour

Tailwind names map to CSS variables, so a class such as `text-muted` follows the theme.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `paper` | `#faf9f6` | `#131412` | Page background |
| `subtle` | `#f2f0ea` | `#1c1d1a` | Quiet fills, bar tracks |
| `ink` | `#1b1b19` | `#eceae3` | Text and headings |
| `muted` | `#595853` | `#a6a59d` | Labels, source lines |
| `rule` | `#e3e1da` | `#2c2d2a` | Thin dividers and gridlines |
| `accent` | `#0f6e56` | `#4fc8a2` | Links, chart line, selected tab |
| `good` | `#1d5fa8` | `#8ab4f0` | A change in the good direction |
| `bad` | `#b42318` | `#f08a80` | A change in the bad direction |

The accent is the logo's green. The logo itself uses `#198e70` (`--brand-green`), which is only 3.9:1 on `paper`, so text and lines use a darker shade of the same hue in light mode and a lighter one in dark mode. "Good" is blue rather than green so a good change does not look like a link.

Text tokens (`ink`, `muted`, `accent`, `good`, `bad`) meet WCAG AA (4.5:1) on `paper` and on `subtle` in both themes. `tests/unit/design-system.test.ts` reads the values from `globals.css` and fails if any pair drops below 4.5:1. `rule` is a divider and is not used for text.

| Token | Light on `paper` | Dark on `paper` |
| --- | --- | --- |
| `ink` | 16.4:1 | 15.4:1 |
| `muted` | 6.8:1 | 7.5:1 |
| `accent` | 5.9:1 | 8.9:1 |
| `good` | 6.1:1 | 8.7:1 |
| `bad` | 6.2:1 | 7.6:1 |

## Logo

`public/brand/logo-mark.svg` is the mark in the navbar, the footer and the browser tab. `BrandMark` crops its viewBox to the tile. PNG fallbacks in `public/brand/`: `icon-32.png` (favicon), `icon-192.png` and `icon-512.png` (manifest), `apple-touch-icon.png` (180 px, on a `paper` background because iOS fills transparency with black).

Whether a move is good or bad comes from `judgeMove()` in `src/lib/utils.ts`, which uses the per-statistic direction table. A statistic with no direction gets no colour.

## Type

- Headings: Source Serif 4 (`font-display`).
- Body, labels and numbers: Inter (`font-sans`).
- Numbers use tabular figures (`tabular-nums`) wherever they line up or change.

Fixed scale. Use these names and no other sizes in new work.

| Class | Size | Use |
| --- | --- | --- |
| `text-caption` | 13 px | Source lines, notes |
| `text-small` | 15 px | Labels, table cells, controls |
| `text-body` | 17 px | Running text |
| `text-lede` | 20 px | Standfirst under the headline |
| `text-h3` | 22 px | Chart and table titles |
| `text-h2` | 28 px | Section headings |
| `text-h1` | 40 px | Page headline (32 px on phones) |
| `text-figure` | 64 px | The big number (48 px on phones) |

## Spacing

Use steps of the Tailwind scale: 1, 2, 3, 4, 6, 8, 10, 12, 16 (4 px to 64 px). Sections have `py-10` and a top rule. Text columns are 44 rem wide, centred, with a 16 px gutter on phones.

## Components

All in `src/components/editorial/`.

- `Column`, `PageHeader`, `Section`, `Prose`: the page frame. A headline, a standfirst, then sections divided by rules.
- `NumberBlock`: label, big value, one line of plain English, then a small source line. Use `Change` inside the meaning line for a good or bad move.
- `SourceLine`: "Source: ... Source released ... Checked on SA Data Hub ...". Goes under every number, table and chart.
- `ChartFigure`: the chart frame (see below).

## Charts

- The title is a sentence that states the takeaway ("Inflation was highest at 13.7% in 1986..."), worked out from the data shown, not a description of the chart.
- Label the line directly, at the points that matter. A single series has no legend. With two or more series, label each line at its end and add a legend only if that is not possible.
- Gridlines are thin and light (`text-rule`), horizontal only. No axis lines or tick marks.
- The line is `text-accent`, 2 px. No fills, shadows or animation.
- The source line sits under the chart. A table view of the numbers is one click away.

## Numbers

One format everywhere, from `src/lib/format.ts`:

- A decimal point, not a comma.
- One decimal place: `4.5%`, `1.5 points`, `118.3`.
- A non-breaking space between thousands: `1 234 567`.
- Counts of people and things have no decimals: `formatCount`.
- Exception: rand amounts keep cents (`R1 045.45`) because they are prices.

## Not yet moved to this system

The navbar, footer, homepage, category pages, municipality and province pages, and the dashboard still use the old look. They are moved in later pull requests. Until then the old `card`, `brand-*` and `slate-*` classes remain, but new work does not use them.
