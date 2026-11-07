import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ReactNode } from 'react'

/**
 * Shared frame for the 1200x630 share images rendered with next/og (Satori).
 * Colours are the light-theme tokens from docs/DESIGN.md.
 */
export const SHARE_COLORS = {
  paper: '#faf9f6',
  ink: '#1b1b19',
  muted: '#595853',
  rule: '#e3e1da',
  accent: '#0f6e56',
} as const

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const

export async function loadLogoDataUri(): Promise<string> {
  const logo = await readFile(join(process.cwd(), 'public/brand/logo-mark.svg'), 'utf8')
  return `data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}`
}

interface ShareFrameProps {
  logoSrc: string
  /** Text at the top right, beside the site name. */
  label: string
  /** The source line along the bottom rule. */
  footer: string
  children: ReactNode
}

export function ShareFrame({ logoSrc, label, footer, children }: ShareFrameProps) {
  const { paper, ink, muted, rule } = SHARE_COLORS
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: paper, color: ink, padding: '56px 72px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Rendered to a PNG by Satori, so alt text never reaches a reader. */}
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={logoSrc} width={72} height={72} style={{ margin: -8 }} />
        <div style={{ fontSize: 30, fontWeight: 700 }}>SA Data Hub</div>
        <div style={{ fontSize: 26, color: muted, marginLeft: 'auto' }}>{label}</div>
      </div>
      {children}
      <div style={{ display: 'flex', borderTop: `2px solid ${rule}`, paddingTop: 20, fontSize: 24, color: muted }}>{footer}</div>
    </div>
  )
}
