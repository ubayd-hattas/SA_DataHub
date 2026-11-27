# Lighthouse baseline, November 2026

Lighthouse 13.6.0, default mobile settings (simulated slow phone and network), headless Microsoft Edge on a Windows laptop, against the live site on 27 November 2026, 20:43 to 20:46 UTC. Taken after the indexing changes of that day.

**One run per page.** Lighthouse scores move between runs, Total Blocking Time most of all, so treat small differences as noise. These are lab measurements, not what real visitors saw.

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | Transfer |
|---|---|---|---|---|---|---|---|---|
| `/` | 86 | 100 | 100 | 100 | 1.2 s | 0 | 480 ms | 485 KiB |
| `/category/inflation` | 93 | 100 | 100 | 100 | 1.0 s | 0 | 290 ms | 461 KiB |
| `/municipalities/CPT` | 86 | 100 | 100 | 100 | 1.1 s | 0 | 550 ms | 353 KiB |
| `/series/cpi-headline` | 86 | 100 | 100 | 100 | 1.0 s | 0 | 560 ms | 440 KiB |
| `/dashboard` | 78 | 96 | 100 | 63 | 3.2 s | 0 | 570 ms | 465 KiB |

LCP is Largest Contentful Paint, CLS is Cumulative Layout Shift, TBT is Total Blocking Time.

## What stands out

- Total Blocking Time is the main thing holding performance back. I have not looked into the cause.
- `/dashboard` fails the colour contrast check. Its low SEO score is the "page is blocked from indexing" check, and it is `noindex` on purpose.
- An automated accessibility score of 100 does not mean a page is fully accessible. Lighthouse checks only part of what matters.

## To repeat

```bash
npx lighthouse@13.6.0 https://sadatahub.tech/ --only-categories=performance,accessibility,best-practices,seo
```
