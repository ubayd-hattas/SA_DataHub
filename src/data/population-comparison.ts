/**
 * Figures from outside Stats SA used on /why-numbers-differ to show why
 * population totals disagree. Stats SA figures are read from the datasets.
 */

export interface ExternalFigure {
  value: number
  /** What the figure is, in the publisher's terms. */
  measure: string
  /** The date the figure refers to. */
  asOf: string
  publisher: string
  title: string
  url: string
  /** Where on the page or in the file. */
  location: string
  releasedOn: string
  checkedOn: string
}

/**
 * UN World Population Prospects 2024, medium variant, total population of
 * South Africa on 1 July 2026: 65 453.084 thousand. Read from the UNdata
 * table (PopDiv, variable 12, country 710, variant 2) on 2026-11-07 and
 * checked against the raw HTML. UNdata gives 2024-10-16 as its last update
 * of this table; WPP 2024 itself was published on 11 July 2024.
 */
export const UN_WPP_2026: ExternalFigure = {
  value: 65_453_084,
  measure: 'Total population, both sexes, medium variant projection',
  asOf: '2026-07-01',
  publisher: 'United Nations, Department of Economic and Social Affairs, Population Division',
  title: 'World Population Prospects 2024',
  url: 'https://data.un.org/Data.aspx?q=south+africa&d=PopDiv&f=variableID%3A12%3BcrID%3A710%3BvarID%3A2',
  location: 'UNdata table "Total population, both sexes combined (thousands)", South Africa, 2026, Medium',
  releasedOn: '2024-07-11',
  checkedOn: '2026-11-07',
}
