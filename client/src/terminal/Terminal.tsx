import { memo, useCallback, useEffect, useRef, useState } from 'react'
import DecryptedText from '../components/ui/decrypted-text'
import ScrambledText from '../components/ui/scrambled-text'
import { useReducedMotion } from '../lib/motion'
import type { StatusSegments, TermLine } from './types'

/**
 * The terminal shell. Knows how to render lines, take input, keep history,
 * complete commands, and manage scroll — and nothing about the game
 * (CLAUDE.md, separation of concerns). Game logic lives entirely behind
 * the callbacks.
 */

interface TerminalProps {
  lines: TermLine[]
  status: StatusSegments
  onSubmit: (raw: string) => void
  /** Ctrl+C — cancel whatever is pending; the controller decides what that means. */
  onInterrupt?: () => void
  /** Ctrl+L — clear the scrollback without echoing a command. */
  onClearScreen?: () => void
  /** Candidates for the token being typed (last element of `tokens`). */
  getCompletions?: (tokens: string[]) => string[]
}

const KIND_CLASS: Record<TermLine['kind'], string> = {
  out: 'term-line',
  echo: 'term-line',
  snippet: 'term-pre overflow-x-auto',
  banner: 'term-pre overflow-x-auto font-flavor text-lg leading-tight',
  decrypt: 'term-pre overflow-x-auto',
  scramble: 'term-line',
  blank: 'term-line',
}

const TONE_CLASS = {
  green: 'text-term-green',
  bright: 'text-term-bright',
  dim: 'text-term-dim',
} as const

// Memoized: old lines keep object identity, so the effect components below
// never re-trigger as new output streams in.
const Line = memo(function Line({ line, reduced }: { line: TermLine; reduced: boolean }) {
  const tone = line.tone ?? (line.kind === 'echo' ? 'bright' : 'green')
  const cls = `${KIND_CLASS[line.kind]} ${TONE_CLASS[tone]}`
  if (line.kind === 'blank') return <div className={cls}> </div>

  // DecryptedText — the signature reveal (DESIGN.md): snippets, round
  // headers, CORRECT/WRONG, and flavor-font banners. One instance per line
  // so newlines never get shuffled into the scramble.
  if ((line.kind === 'decrypt' || line.kind === 'banner') && !reduced) {
    const fast = line.kind === 'banner'
    return (
      <div className={cls}>
        {line.text.split('\n').map((row, i) => (
          <div key={i}>
            <DecryptedText
              text={row || ' '}
              animateOn="view"
              speed={fast ? 25 : 40}
              maxIterations={fast ? 8 : 10}
              parentClassName="whitespace-pre-wrap"
              encryptedClassName="text-term-dim"
            />
          </div>
        ))}
      </div>
    )
  }

  // ScrambledText — body copy that sits still (explanations, boot log).
  // DESIGN values: radius=30 duration=4 scrambleChars="?".
  if (line.kind === 'scramble' && !reduced) {
    return (
      <ScrambledText radius={30} duration={4} scrambleChars="?" className={cls}>
        {line.text}
      </ScrambledText>
    )
  }

  return <div className={cls}>{line.text}</div>
})

interface TabCycle {
  stem: string // the input before the token being completed
  matches: string[]
  idx: number
}

export function Terminal({ lines, status, onSubmit, onInterrupt, onClearScreen, getCompletions }: TerminalProps) {
  const reduced = useReducedMotion()
  const [value, setValue] = useState('')
  const [caret, setCaret] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const historyRef = useRef<string[]>([])
  const histIdxRef = useRef(-1) // -1 = editing a fresh line
  const draftRef = useRef('')
  const tabRef = useRef<TabCycle | null>(null)

  // Auto-scroll on new output — unless the reader scrolled up on purpose.
  useEffect(() => {
    const el = scrollRef.current
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight
  }, [lines])

  const onScroll = () => {
    const el = scrollRef.current
    if (el) pinnedRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
  }

  const syncCaret = () => {
    const el = inputRef.current
    if (el) setCaret(el.selectionStart ?? el.value.length)
  }

  const setValueAndCaret = (next: string) => {
    setValue(next)
    setCaret(next.length)
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(next.length, next.length))
  }

  const completeTab = () => {
    if (!getCompletions || caret !== value.length) return
    const cycle = tabRef.current
    if (cycle) {
      // repeated Tab: walk the match list
      cycle.idx = (cycle.idx + 1) % cycle.matches.length
      setValueAndCaret(cycle.stem + cycle.matches[cycle.idx])
      return
    }
    const parts = value.length && !/^\s*$/.test(value) ? value.replace(/^\s+/, '').split(/\s+/) : []
    const tokens = /\s$/.test(value) || parts.length === 0 ? [...parts, ''] : parts
    const current = tokens[tokens.length - 1]
    const stem = value.slice(0, value.length - current.length)
    const matches = getCompletions(tokens).filter((c) => c.toLowerCase().startsWith(current.toLowerCase()))
    if (!matches.length) return
    if (matches.length === 1) {
      const m = matches[0]
      setValueAndCaret(stem + m + (m.endsWith('=') ? '' : ' '))
      return
    }
    const lcp = matches.reduce((a, b) => {
      let i = 0
      while (i < a.length && i < b.length && a[i] === b[i]) i++
      return a.slice(0, i)
    })
    if (lcp.length > current.length) {
      setValueAndCaret(stem + lcp)
    } else {
      tabRef.current = { stem, matches, idx: 0 }
      setValueAndCaret(stem + matches[0])
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hist = historyRef.current
    if (e.key !== 'Tab') tabRef.current = null

    if (e.key === 'Enter') {
      e.preventDefault()
      const raw = value
      if (raw.trim() && raw !== hist[hist.length - 1]) hist.push(raw)
      histIdxRef.current = -1
      setValueAndCaret('')
      pinnedRef.current = true
      onSubmit(raw)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      completeTab()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!hist.length) return
      if (histIdxRef.current === -1) {
        draftRef.current = value
        histIdxRef.current = hist.length - 1
      } else if (histIdxRef.current > 0) {
        histIdxRef.current--
      }
      setValueAndCaret(hist[histIdxRef.current])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdxRef.current === -1) return
      histIdxRef.current++
      if (histIdxRef.current >= hist.length) {
        histIdxRef.current = -1
        setValueAndCaret(draftRef.current)
      } else {
        setValueAndCaret(hist[histIdxRef.current])
      }
    } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault()
      histIdxRef.current = -1
      setValueAndCaret('')
      pinnedRef.current = true
      onInterrupt?.()
    } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault()
      onClearScreen?.()
    } else if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault()
      setValueAndCaret('')
    }
  }

  // Click anywhere to focus — but never steal an in-progress text selection.
  const focusInput = useCallback(() => {
    if (window.getSelection()?.isCollapsed) inputRef.current?.focus()
  }, [])

  const atChar = value[caret] ?? ' '

  return (
    <div className="flex h-full flex-col font-mono text-sm md:text-base" onClick={focusInput}>
      {/* tmux-style status line — the only persistent UI outside the scrollback */}
      <div
        className={`flex shrink-0 justify-between gap-4 border-b border-term-dim/40 px-3 py-1 text-xs md:text-sm ${
          status.urgent ? 'text-term-bright' : 'text-term-dim'
        }`}
      >
        <span className="truncate">{status.left}</span>
        <span className="shrink-0">{status.right}</span>
      </div>

      {/* scrollback */}
      <div ref={scrollRef} onScroll={onScroll} className="term-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {lines.map((line) => (
          <Line key={line.id} line={line} reduced={reduced} />
        ))}
      </div>

      {/* input line, pinned at the bottom */}
      <div className="relative flex shrink-0 items-center px-3 pb-2 pt-1">
        <span className="whitespace-pre text-term-bright">{'> '}</span>
        <span className="term-pre min-w-0 flex-1 overflow-hidden">
          <span className="text-term-bright">{value.slice(0, caret)}</span>
          <span className="term-cursor text-term-bg" aria-hidden>
            {atChar}
          </span>
          <span className="text-term-bright">{value.slice(caret + 1)}</span>
        </span>
        <input
          ref={inputRef}
          className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none"
          value={value}
          onChange={(e) => {
            tabRef.current = null
            setValue(e.target.value)
            setCaret(e.target.selectionStart ?? e.target.value.length)
          }}
          onKeyDown={onKeyDown}
          onKeyUp={syncCaret}
          onSelect={syncCaret}
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-label="terminal input"
        />
      </div>
    </div>
  )
}
