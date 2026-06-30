import React from 'react'
import { highlightPython } from '@/lib/highlight'

/* ---------------------------------------------------------------- *
 *  Pills (round / tier / difficulty tags)
 * ---------------------------------------------------------------- */
type PillTone = 'neutral' | 'primary' | 'violet' | 'cyan' | 'warn'

const PILL_TONE: Record<PillTone, string> = {
  neutral: 'border-border bg-secondary/60 text-muted-foreground',
  primary: 'border-primary/40 bg-primary/15 text-primary',
  violet: 'border-violet-500/40 bg-violet-500/15 text-violet-300',
  cyan: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300',
  warn: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
}

export function Pill({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: React.ReactNode
  tone?: PillTone
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold uppercase tracking-wide ${PILL_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

/** Map a difficulty string to its pill tone — mirrors host.js diffClass. */
export function diffTone(d?: string): PillTone {
  if (d === 'tricky') return 'warn'
  if (d === 'medium') return 'cyan'
  return 'violet'
}

/* Buttons — the shared global "cartoon" button (rounded pill + 3D press + shine). */
export { Button } from '@/components/ui/button'

/* ---------------------------------------------------------------- *
 *  Highlighted Python snippet — projector-legible, auto-sized
 * ---------------------------------------------------------------- */
export function CodeBlock({
  code,
  className = '',
  size,
}: {
  code: string
  className?: string
  /** 'sm' | 'md' | 'lg' — overrides the auto-size heuristic. */
  size?: 'sm' | 'md' | 'lg'
}) {
  const step = size ?? autoSize(code)
  const fontSize =
    step === 'sm' ? 'text-base sm:text-lg' : step === 'md' ? 'text-lg sm:text-2xl' : 'text-2xl sm:text-3xl'
  return (
    <pre
      aria-label="Python snippet"
      className={`code-block px-5 py-4 ${fontSize} ${className}`}
      dangerouslySetInnerHTML={{ __html: highlightPython(code) }}
    />
  )
}

/** Pick a font step from line count + width so big snippets read from the back row. */
function autoSize(code: string): 'sm' | 'md' | 'lg' {
  const lines = code.split('\n')
  let maxLen = 0
  for (const l of lines) maxLen = Math.max(maxLen, l.length)
  const nLines = lines.length
  if (nLines > 14 || maxLen > 56) return 'sm'
  if (nLines > 9 || maxLen > 44) return 'md'
  return 'lg'
}

export const OPTION_LABELS = ['A', 'B', 'C', 'D']

/** Normalize an answer for matching (drop whitespace/quotes, lowercase) — mirrors host.js normAnswer. */
export function normAnswer(s: string | null | undefined): string {
  return String(s == null ? '' : s)
    .replace(/['"`]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
}
