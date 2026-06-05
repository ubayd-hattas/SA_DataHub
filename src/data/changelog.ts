// Changelog data for SA Data Hub platform releases

export interface ChangelogEntry {
  version: string
  date: string // ISO date (YYYY-MM-DD)
  title: string
  summary: string
  features: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
    {
    version: "V5",
    date: "2026-06-05",
    title: "Municipality Explorer, Municipality Profiles, Census 2022 Integration, Interactive Visualizations",
    summary: "Expanded SA Data Hub from provincial statistics to municipality-level intelligence across South Africa.",
    features: [
      "Municipality Explorer for all 213 local and metropolitan municipalities",
      "Dedicated municipality profile pages",
      "Census 2022 municipality data integration",
      "Interactive demographic, housing, and services visualizations",
      "Municipality benchmarking against provincial and national averages",
    ],
  },
  {
    version: "V4",
    date: "2026-06-02",
    title: "CSV Exports, Download Center, Citation Generator, Dataset Update Log, Search Intelligence",
    summary: "Major platform enhancements for data export and discoverability.",
    features: [
      "CSV export for all datasets",
      "Dedicated Download Center",
      "Citation Generator tool",
      "Dataset Update Log (internal tracking, not public)",
      "Search Intelligence UI",
    ],
  },
  {
    version: "V3",
    date: "2026-06-01",
    title: "Insights Hub",
    summary: "Introduced analytics dashboards and insights.",
    features: ["Interactive visualizations", "Custom query builder"],
  },
  {
    version: "V2",
    date: "2026-05-31",
    title: "Additional Datasets",
    summary: "Added 12 new municipal datasets.",
    features: ["Health statistics", "Education metrics"],
  },
  {
    version: "V1",
    date: "2026-05-30",
    title: "Initial launch",
    summary: "Public release of the SA Data Hub platform.",
    features: ["Core dataset catalogue", "Basic search"],
  },
];
