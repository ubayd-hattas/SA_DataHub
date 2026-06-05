import { CHANGELOG, ChangelogEntry } from '@/data/changelog'

/**
 * Returns the changelog entries sorted newest‑first.
 * The function is deliberately simple – future callers can filter or paginate.
 */
export function getChangelog(): ChangelogEntry[] {
  // shallow copy then sort descending by date string (ISO format)
  return [...CHANGELOG].sort((a, b) => b.date.localeCompare(a.date))
}
