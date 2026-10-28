/**
 * Where readers report an error. The maintainer's address on ubayd.me goes in
 * REPORT_ERROR_EMAIL; until it is set, reports go to the repository's public
 * issue tracker instead of a guessed address.
 */
export const REPORT_ERROR_EMAIL = ''

export const REPO_URL = 'https://github.com/ubayd-hattas/SA_DataHub'

/** A link that opens a pre-filled report for the given page. */
export function reportErrorHref(pagePath = '/'): string {
  const subject = `Error on SA Data Hub: ${pagePath}`
  const body = `Page: https://sadatahub.tech${pagePath}\n\nWhat looks wrong, and where you saw the correct figure (if you know):\n`
  if (REPORT_ERROR_EMAIL) {
    return `mailto:${REPORT_ERROR_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }
  return `${REPO_URL}/issues/new?title=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
