# Competitors and high-ROI opportunities

**Date:** 13 November 2026. Research only. Every link below was opened on that date unless it says "search result only". Traffic, revenue and audience claims about other sites are not made, because I have no data for them.

## Result

Nobody in South Africa publishes a fuel estimate as a range with a public record of how close past estimates were. News sites publish single numbers from the Central Energy Fund (CEF) sheet, without saying what the sheet leaves out, and never look back. That gap is the opening. Being first with the number is not: the news sites will always be faster. Being the page that is right about how uncertain the number is, and that keeps the full history and breakdown in one place with downloads, is achievable.

## 1. Where people get this now

### News sites that publish monthly estimates

**BusinessTech.** [Official November price article, 3 November 2026](https://businesstech.co.za/news/energy/882296/here-is-the-official-petrol-price-for-november-8/).
- Does well: fast. Full inland and coastal table for six products. Explains the drivers in the department's words (Brent from 101 to 108 dollars, rand from 16.21 to 16.55, slate levy from 87.66 to 135.84 c/l).
- Weak: no link to the official document. The breakdown is an image. One month of comparison only. No history, no download, no calculator. A unit error in the same article ("R1.83 cents per kg"). Heavy page: subscribe prompts, partner content, poll, autoloading comments.
- Why people use it: it ranks, it is free, it is first, and it repeats the story several times a month.

**CARmag.** [November forecast, 21 October 2026](https://www.carmag.co.za/news/november-2026-fuel-price-forecast-how-much-petrol-and-diesel-could-cost-in-sa/).
- Does well: turns the CEF figure into expected rand prices, inland and coastal, and links to CEF.
- Weak: single numbers, no range. Does not give the date of the CEF data. Does not say that tax and levy changes are excluded. No look back at past forecasts. Its forecast of R31.77 for petrol 95 inland was R1.53 above the official R30.24, because the levy cut was announced the same day it was published. Readers were never told the estimate had been overtaken.
- Why people use it: motoring audience, clear headline answer.

**TopAuto, Daily Investor and others** (search results only, not opened): the same pattern of CEF-based single-number stories several times a month.

### The AA

[AA fuel pricing page](https://www.aa.co.za/fuel-pricing).
- Does well: a trusted name. Inland and coastal toggle. Five fuel types. A year selector, so some history.
- Weak (from the page text my tool received; the chart itself did not load, so I could not see its numbers): no forecast, no breakdown, no calculator, no download, no "last updated" date, no source named, a 2025 copyright line, and a sales callback form for AA products on the same page.
- Why people use it: brand trust and the AA's monthly media comment, which news sites quote.

### Apps and trackers

- **SA Fuel Price (iOS app)** and **FuelSA** (search result only, not opened): current prices for Reef and Coast, historic prices, "daily predictions", alerts as a paid in-app purchase, and a paid JSON API quoted at R59 per 1 000 requests a month. One App Store review in the search summary complained about a wrong prediction. This shows there is demand for predictions, alerts and an API, enough for someone to charge for them. It is also the nearest thing to what the brief describes. Open and study it before building the tracker.
- **GlobalPetrolPrices.** [South Africa page](https://www.globalpetrolprices.com/South-Africa/gasoline_prices/): weekly, one national figure for 95 octane, ten years of history, cites CEF. No zones, no breakdown. Download and API terms not shown on the page.

### Official sources

- **DMPR.** [Fuel Prices](https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices) and [archive](https://www.dmpr.gov.za/Branches/Petroleum-Resources/Petrol-Price-Archive): the authority, with the full files. Weak: no price is visible on the page itself. Files are ZIPs behind short links, numbered download handlers and spreadsheets, with wrong month labels in places. Several links sit under a `/uat1/` path, which looks like a test area. A person on a phone cannot find "what does petrol cost" there.
- **CEF.** [Daily Basic Fuel Price](https://cefgroup.co.za/daily-basic-fuel-price/): the raw daily sheets. Weak: one PDF per day, a menu whose "2026" link opens 2025, date typos, no explanation of how to read a sheet, no history in one place.
- **Fuels Industry Association.** [Current and past prices](https://fuelsindustry.org.za/consumer-information/fuel-prices-current-past/): the longest free table found (2012 to 2026). Weak: one long HTML page, comma decimals, visible typos, no download.
- **Stats SA.** Not opened (standing rule). It publishes CPI, including a fuel component, but not pump prices.

### Other South African data portals

- **Wazimap.** [wazimap.co.za](https://wazimap.co.za/): strong map-based area profiles with partners. The marketing site has placeholder "Lorem ipsum" text, dead links and a newest blog post from May 2023. No download or API on that page. It competes with the municipality pages, not with fuel.
- Quantec EasyData, Codera, Trading Economics, Municipal Money: not opened. Unverified.

## 2. SA Data Hub, honestly

**Where it is weaker**
- Speed. News sites publish within the hour. SA Data Hub promises two working days and enters data by hand.
- Reach. About 89 indexed pages on 23 October 2026, with municipality pages bringing about 80% of clicks (`docs/PRODUCT_DIRECTION.md`). No audience for economic indicators yet.
- Nothing anyone needs monthly. Census profiles are looked up once.
- A sole maintainer. Crime is two annual releases behind for that reason.
- No brand. The AA and BusinessTech are names people already trust.

**What it is missing**
- Fuel, the single most repeated number in the country.
- A visible "how was this updated" label that is true (audit H2).
- A stable, documented API (the series JSON files exist but are not presented as one).
- Any way to come back: no alerts beyond RSS.

**What to cut**
- `/dashboard`: duplicates `/series`, old design, weakest page seen on a phone. Redirect it.
- Finishing the PostgreSQL migration: weeks of work, nothing a reader sees.
- The Stats SA automation code path: it cannot run under the no-requests rule. Guard it and stop maintaining it.
- Automation labels that are not true.
- Email alerts, for now.
- Do not start: per-station prices, LPG, a native app, translations, comments.

## 3. Highest-ROI improvements

Effort: S is under a day, M is one to three days, L is a week or more, for one person with Claude Code. Impact is my judgement, not a measurement.

| # | Improvement | Problem it solves | Evidence | Effort | Expected impact | Sponsorship or money later |
|---|---|---|---|---|---|---|
| 1 | **Fuel price page with history, breakdown and downloads** (`/fuel`, `/fuel/history`) | The official files are unusable on a phone and no free site has history, breakdown and CSV together | DMPR, CEF and AA pages above | M | Traffic: high, every month. Credibility: high, every number from the department's files | DMPR terms are non-commercial. A sponsor line on the page may count as commercial use. Ask DMPR first. Unverified |
| 2 | **Estimate as a range with a public track record** (`/fuel/next-month`) | Single-number forecasts are quoted as fact and never checked | CARmag missed by R1.53 in November 2026 and did not say so. A paid app sells predictions | M, plus the CEF permission | Return visits: high, daily in the last two weeks of a month. Credibility: the strongest differentiator. Journalists can cite a range and an error record | Same caveat, plus CEF terms unknown (D3) |
| 3 | **"What it costs me" calculator with a share image and WhatsApp text** | Cents per litre mean little. People want rands for their tank | No competitor page opened had one | S | Shares and traffic: medium to high. This is the part people forward | Could carry "calculator supported by" if terms allow. Unverified |
| 4 | **Make the automation labels true and show "entered by hand" or "updated automatically" beside each figure** | A trust site states something untrue on `/downloads` | Audit H2 | S | Credibility: high for little work | No |
| 5 | **Home page built around questions, with fuel first** | Two fuel questions cannot be answered on the site today. Questions sit fifth on the home page | `src/app/page.tsx`, section order | S | Traffic: medium through better internal links. Usability: high on phones | No |
| 6 | **Documented static API (`/api/v1/`) and a docs page** | Developers and students have no stated contract. A competitor charges for the same data | FuelSA's paid API (search result) | M | Credibility and links from developers: medium. Portfolio value: high | A free API with attribution is the kind of thing a sponsor would put a name on. Do not charge: source terms forbid it |
| 7 | **Monthly fuel explainer on the existing explainer system** ("What changed in December and why", using the department's own breakdown) | The site's strongest format is not applied to its most searched topic | Explainer system exists for CPI and QLFS | S per month after a template (M once) | Traffic: medium, recurring. Fits the "what changed this month" promise | No |
| 8 | **Fix the topic-page CSV and guard the paused scripts** | A download that silently gives one row per statistic. A script that could break the Stats SA rule | Audit H1 and M4 | S | Credibility: protects what exists | No |

Not in the top eight, but worth recording:

- **Fuel price by magisterial zone ("the price where you live")**: DMPR publishes prices per zone each month. Tying those to the 213 municipality pages would be unique. Large effort, because zones do not match municipal boundaries and need a verified mapping. Do it only if fuel traffic justifies it.
- **Catch up crime**: important for trust, but it waits on the owner's files, not on engineering.
- **Lighthouse baseline**: S. Needed before any performance claim.

## 4. Monetisation, plainly

The project decided on 8 November 2026 to stay free, with donations only and no perks, because Stats SA and SARB terms restrict commercial reuse. The DMPR terms read today add the same condition for fuel: reproduction is free only when "not used for financial or commercial gain". So:

- Selling data or API access: no.
- Advertising on fuel pages: probably counts as commercial gain. Do not, without written permission.
- GitHub Sponsors with no perks: consistent with the current decision.
- Named sponsorship of a page or tool: a grey area. Needs written permission from the source. Unverified.
- The realistic return is not money. It is a portfolio piece with real monthly users, a public accuracy record and citations from journalists.

## 5. Unverified, in one place

- That fuel is the top search trend.
- Any competitor's traffic.
- The AA page's actual numbers and features, since the chart did not load.
- The SA Fuel Price app and FuelSA, which I did not open.
- The December and January levy-relief amounts and end dates, which come from press reports.
- Whether a sponsor credit breaches the DMPR or gov.za non-commercial terms.
- Whether Vercel's Hobby plan terms allow a sponsored site.
