import { useSyncExternalStore } from 'react'

const subscribeNothing = () => () => {}

/**
 * One query-string parameter from the page URL, read in the browser only.
 * It is '' on the server and during hydration, so the first render matches the
 * static HTML, and the real value appears right after.
 */
export function useUrlParam(name: string): string {
  return useSyncExternalStore(
    subscribeNothing,
    () => new URLSearchParams(window.location.search).get(name) ?? '',
    () => '',
  )
}
