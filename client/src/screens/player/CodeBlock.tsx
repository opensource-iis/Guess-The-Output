import { useMemo } from 'react'
import { highlightPython } from '@/lib/highlight'

/**
 * Renders a Python snippet with syntax highlighting. The highlighter escapes all
 * input, so the resulting HTML is safe to inject via dangerouslySetInnerHTML.
 */
export default function CodeBlock({ code, className = '' }: { code: string; className?: string }) {
  const html = useMemo(() => highlightPython(code || ''), [code])
  return (
    <pre
      className={`code-block px-4 py-3 text-[13px] sm:text-sm ${className}`}
      // eslint-disable-next-line react/no-danger -- highlightPython escapes its input
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
