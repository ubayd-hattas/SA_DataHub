import { SITE_LOGO_MARK_PATH } from '@/lib/seo'
import { cn } from '@/lib/utils'

/**
 * The logo mark from public/brand/logo-mark.svg. The file has space around
 * the tile for its shadow; the viewBox here crops to the tile so it lines up
 * with the wordmark text. Decorative: the link text says "SA Data Hub".
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="168 161 688 688" className={cn('h-8 w-8 shrink-0', className)} aria-hidden="true" focusable="false">
      <image href={SITE_LOGO_MARK_PATH} x="0" y="0" width="1024" height="1024" />
    </svg>
  )
}
