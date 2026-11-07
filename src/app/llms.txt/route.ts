import { buildLlmsTxt } from '@/lib/llms-txt'

export const dynamic = 'force-static'

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
