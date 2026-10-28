/**
 * src/data/update-history.ts
 *
 * Dataset-level update events used by Phase 4's update log UI.
 * This complements (not replaces) live `lastUpdated` values derived from stats.
 */

export type UpdateHistoryType =
  | 'data-update'
  | 'methodology-change'
  | 'new-dataset'
  | 'correction'

export interface UpdateHistoryEntry {
  date: string
  datasetId: string
  datasetLabel: string
  type: UpdateHistoryType
  summary: string
  source?: string
}

export const UPDATE_HISTORY: UpdateHistoryEntry[] = [
  {
    date: '2026-10-28',
    datasetId: 'crime',
    datasetLabel: 'Crime Statistics',
    type: 'data-update',
    summary:
      'Checked the SAPS fourth-quarter 2025/26 workbook (January to March 2026, compared with January to March 2022 to 2025). It covers one quarter, not a full financial year, so the annual 2023/24 figures are unchanged (murder 26 232, contact crime 561 947, robbery with aggravating circumstances 162 618). The quarterly figures (January to March 2026: murder 5 181, down from 5 727; contact crime 154 267, down from 161 672; robbery with aggravating circumstances 26 796, down from 31 749) will be shown once the SAPS release date is confirmed; the workbook does not state one. It has no notes on definition or category changes.',
  },
  {
    date: '2026-10-27',
    datasetId: 'inflation',
    datasetLabel: 'Inflation & CPI',
    type: 'correction',
    summary:
      'Eight values corrected to the official rates in the Stats SA CPI history file (Table B2). Headline CPI: June 2025 3.2% to 3.0%, July 3.3% to 3.5%, August 3.4% to 3.3%, September 3.5% to 3.4%, October 3.3% to 3.6%, November 3.0% to 3.5%, December 3.2% to 3.6%. Annual average CPI for 2018: 4.6% to 4.7%.',
  },
  // ── October 2026 data refresh ────────────────────────────────────────────────
  {
    date: '2026-10-19',
    datasetId: 'unemployment',
    datasetLabel: 'Unemployment',
    type: 'data-update',
    summary: 'Refreshed to QLFS Q2 2026 (33.6%). Historical points for Q2 2023, Q3 2023, Q4 2023, Q1 2025 corrected against original Stats SA releases. Some older observations not re-verified.',
    source: 'https://www.statssa.gov.za/publications/P0211/P02112ndQuarter2026.pdf',
  },
  {
    date: '2026-10-19',
    datasetId: 'youth-unemployment',
    datasetLabel: 'Youth Unemployment',
    type: 'data-update',
    summary: 'Refreshed to QLFS Q2 2026 (15–34: 47.4%; 15–24: 62.8%). Eight Q1 2024–Q4 2025 points for 15–24 corrected. Q1 2026 (15–34) is a derived value, not published directly. youth-unemployment-expanded headline (60.8%) is flagged unsupported; owner decision pending.',
    source: 'https://www.statssa.gov.za/publications/P0211/P02112ndQuarter2026.pdf',
  },
  {
    date: '2026-10-19',
    datasetId: 'labour-force',
    datasetLabel: 'Labour Force Participation',
    type: 'data-update',
    summary: 'Refreshed to QLFS Q2 2026 (overall LFPR 59.6%, female 54.9%). Historical corrections across all ten female LFPR points and Q1 2024–Q4 2025 overall LFPR points. Unverified labour-force-participation (42.7%) record removed per owner decision D1.',
    source: 'https://www.statssa.gov.za/publications/P0211/P02112ndQuarter2026.pdf',
  },
  {
    date: '2026-10-19',
    datasetId: 'inflation',
    datasetLabel: 'Inflation & CPI',
    type: 'data-update',
    summary: 'CPI updated to September 2026 (headline 4.5%, food 1.2%; published 2026-10-21). Repo rate corrected from 6.75% to 7.25% (SARB MPC 2026-09-23). Correction: July 2026 MPC was a hold, not a hike. The hike was on 28 May 2026. Pre-April 2026 monthly CPI points not re-verified.',
    source: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0141',
  },
  {
    date: '2026-10-19',
    datasetId: 'interest-rates',
    datasetLabel: 'Interest Rates',
    type: 'correction',
    summary: 'Corrected repo rate from 7.00% to 7.25% and prime from 10.50% to 10.75% (SARB MPC 2026-09-23). Corrected a prior entry that recorded a July 2026 hike: July was a hold, and the hike was on 28 May 2026 (effective 29 May). May and July 2026 SARB statements not yet verified from primary source.',
    source: 'https://www.resbank.co.za/en/home/what-we-do/monetary-policy/monetary-policy-decisions',
  },
  {
    date: '2026-10-19',
    datasetId: 'gdp',
    datasetLabel: 'GDP & Economic Growth',
    type: 'data-update',
    summary: 'GDP growth updated to Q2 2026 (−0.2% q/q). Annual growth (1.1%), nominal GDP (R7.67T) and per-capita (R120,800) unchanged pending rebasing to 2022 base year (expected Oct 2026). Quarterly points before Q1 2026 not re-verified. Series name renamed to "GDP Growth (%, QoQ, seasonally adjusted)" per D2c.',
    source: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0441',
  },
  {
    date: '2026-10-19',
    datasetId: 'provinces',
    datasetLabel: 'Provinces',
    type: 'data-update',
    summary: 'Refreshed provincial official unemployment (LU1) to QLFS Q2 2026. Added additive LU3 (unemployment + potential labour force) fields. Updated provincial populations to Stats SA Mid-Year Population Estimates 2026 (Appendix 1, summing to 63.5M). Legacy expanded rate preserved with Q3 2025 label.',
    source: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0211',
  },
  {
    date: '2026-10-19',
    datasetId: 'population',
    datasetLabel: 'Population',
    type: 'data-update',
    summary: 'Updated to MYPE 2026 (63,522,380, mid-2026). Urban share (63.7%) and median age (28.0) unchanged (Census 2022, no newer comparable measure). Series points 2015–2024 are derived back-casts from growth rates, ±≈0.03M; replace with Stats SA published Excel series when available.',
    source: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0302',
  },
  {
    date: '2026-10-19',
    datasetId: 'education',
    datasetLabel: 'Education',
    type: 'data-update',
    summary: 'Matric pass rate updated to 2025 (88%, DBE announcement 2026-01-12). One-decimal figure (88.0) is inferred; denominator not verified from the DBE NSC report (D3b). Literacy and university enrolment unchanged.',
    source: 'https://www.sanews.gov.za/south-africa/class-2025-sets-new-national-record-historic-88-pass-rate',
  },
  {
    date: '2026-10-19',
    datasetId: 'housing',
    datasetLabel: 'Housing & Services',
    type: 'correction',
    summary: 'Corrected to verified Census 2022 values: piped water in dwelling 59.7% (was 63.0%), electricity for lighting 94.7% (was 91.2%), formal dwellings 88.5% (was 80.9%), households 17,828,778 / size 3.5 (was 17.3M / 3.0), internet access 79% (was 64%). Historical points and GHS comparison not re-verified.',
    source: 'https://www.statssa.gov.za/census/census_2022/',
  },
  {
    date: '2026-10-19',
    datasetId: 'census',
    datasetLabel: 'Census 2022',
    type: 'correction',
    summary: 'Corrected to verified Census 2022 values (households, internet access). census-no-income (30.4%) is unverified: Stats SA withheld the income theme from Census 2022; value should be sourced or removed (D6a).',
    source: 'https://www.statssa.gov.za/census/census_2022/',
  },

  {
    date: '2026-05-31',
    datasetId: 'provinces',
    datasetLabel: 'Provinces',
    type: 'data-update',
    summary: 'Provincial unemployment and comparative indicators refreshed using the latest QLFS-aligned release.',
    source: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0211',
  },
  {
    date: '2026-05-31',
    datasetId: 'unemployment',
    datasetLabel: 'Unemployment',
    type: 'data-update',
    summary: 'Metadata verification run completed for unemployment indicators and source attribution.',
    source: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0211',
  },
  {
    date: '2026-05-31',
    datasetId: 'youth-unemployment',
    datasetLabel: 'Youth Unemployment',
    type: 'data-update',
    summary: 'Youth unemployment and NEET series validated against the latest QLFS publication.',
    source: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0211',
  },
  {
    date: '2026-05-31',
    datasetId: 'labour-force',
    datasetLabel: 'Labour Force Participation',
    type: 'data-update',
    summary: 'Labour force participation indicators verified and aligned with QLFS metadata.',
    source: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0211',
  },
  {
    date: '2026-05-31',
    datasetId: 'inflation',
    datasetLabel: 'Inflation & CPI',
    type: 'data-update',
    summary: 'Inflation dataset metadata validated for monthly CPI release tracking.',
    source: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0141',
  },
  {
    date: '2026-05-31',
    datasetId: 'gdp',
    datasetLabel: 'GDP & Economic Growth',
    type: 'data-update',
    summary: 'GDP quarterly indicators and coverage range validated for registry consistency.',
    source: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0441',
  },
  {
    date: '2026-05-31',
    datasetId: 'interest-rates',
    datasetLabel: 'Interest Rates',
    type: 'methodology-change',
    summary: 'Registry and lookup alignment updated for SARB repo/prime dataset identifier consistency.',
    source: 'https://www.resbank.co.za/en/home/what-we-do/monetary-policy/monetary-policy-decisions',
  },
  {
    date: '2025-05-01',
    datasetId: 'crime',
    datasetLabel: 'Crime Statistics',
    type: 'data-update',
    summary: 'Annual SAPS crime series refreshed with the latest published reporting cycle.',
    source: 'https://www.saps.gov.za/services/crimestats.php',
  },
  {
    date: '2025-01-15',
    datasetId: 'education',
    datasetLabel: 'Education',
    type: 'data-update',
    summary: 'NSC exam results and education indicators updated from latest DBE release.',
    source: 'https://www.education.gov.za/Informationfor/Examinationsresults.aspx',
  },
  {
    date: '2024-07-30',
    datasetId: 'population',
    datasetLabel: 'Population',
    type: 'data-update',
    summary: 'Population indicators aligned with latest mid-year population estimates publication.',
    source: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0302',
  },
  {
    date: '2023-10-10',
    datasetId: 'housing',
    datasetLabel: 'Housing & Services',
    type: 'data-update',
    summary: 'Housing and services indicators updated from Census 2022 and household survey sources.',
    source: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0318',
  },
  {
    date: '2023-10-10',
    datasetId: 'census',
    datasetLabel: 'Census 2022',
    type: 'new-dataset',
    summary: 'Census 2022 baseline dataset published and marked as static until the next census cycle.',
    source: 'https://www.statssa.gov.za/census/census_2022/',
  },
]
