import { useEffect, useRef, useState } from 'react'
import { Eye, SkipForward, Users, Terminal, AlertTriangle } from 'lucide-react'
import { ANSWER_MODE } from '@/lib/protocol'
import type { GameState, QuestionView as QView } from '@/lib/protocol'
import TimerRing from './TimerRing'
import { Pill, diffTone, Button, CodeBlock, OPTION_LABELS } from './ui'

function isMcq(q: QView | null): boolean {
  return !!q && q.answerMode === ANSWER_MODE.MCQ && Array.isArray(q.options) && q.options.length > 0
}

/**
 * QUESTION: the highlighted snippet front and center, a skew-correct timer ring, the live
 * "X of Y answered" count (pops on each increment), read-only A–D option cards in MCQ mode,
 * and the host controls. Reveal also serves "end round early"; the server auto-reveals at 0.
 */
export default function QuestionView({
  state,
  counts,
  onReveal,
  onSkip,
  onManage,
}: {
  state: GameState
  counts: { answered: number; total: number } | null
  onReveal: () => void
  onSkip: () => void
  onManage: () => void
}) {
  const q = state.question
  const roundNo = state.roundIndex >= 0 ? state.roundIndex + 1 : 1
  const answered = counts?.answered ?? state.counts?.answered ?? 0
  const total = counts?.total ?? state.counts?.total ?? (state.players || []).length

  // Pop the answered count on each increase (tasteful "+1" feedback).
  const [pop, setPop] = useState(false)
  const lastAnswered = useRef(0)
  // Reset the pop baseline whenever a new question begins.
  useEffect(() => {
    lastAnswered.current = 0
  }, [q?.id])
  useEffect(() => {
    if (answered > lastAnswered.current) {
      setPop(true)
      const t = setTimeout(() => setPop(false), 260)
      lastAnswered.current = answered
      return () => clearTimeout(t)
    }
    lastAnswered.current = answered
  }, [answered])

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6">
      {/* Header: pills + timer */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="neutral">
            Round {roundNo} / {state.totalRounds}
          </Pill>
          <Pill tone="violet">{q?.tier || 'core'}</Pill>
          <Pill tone={diffTone(q?.difficulty)}>{q?.difficulty || 'easy'}</Pill>
        </div>
        <TimerRing timer={state.timer} />
      </div>

      {/* Snippet */}
      <div className="flex-1">
        <CodeBlock code={q?.code || ''} />

        {isMcq(q) && (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="Answer choices">
            {q!.options!.map((opt, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 transition-colors hover:border-primary/30"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-background font-mono text-lg font-bold text-muted-foreground">
                  {OPTION_LABELS[i] || i + 1}
                </span>
                <span className="break-all font-mono text-lg text-foreground">{opt}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer: prompt + answered count + controls */}
      <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="flex items-center gap-2 text-lg text-muted-foreground">
          {q?.isError ? (
            <>
              <AlertTriangle className="h-5 w-5 text-amber-300" />
              What <strong className="text-foreground">exception</strong> does this raise?
            </>
          ) : (
            <>
              <Terminal className="h-5 w-5 text-primary/80" />
              What does this <strong className="text-foreground">print</strong>?
            </>
          )}
        </p>

        <div className="flex items-baseline gap-2">
          <span
            className={`font-mono text-3xl font-bold tabular-nums text-primary transition-transform duration-150 ${
              pop ? 'scale-125' : 'scale-100'
            }`}
          >
            {answered}
          </span>
          <span className="text-muted-foreground">of {total} answered</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="warn" onClick={onReveal} className="gap-2">
            <Eye className="h-4 w-4" />
            Reveal answer
          </Button>
          <Button variant="ghost" onClick={onSkip} className="gap-2">
            <SkipForward className="h-4 w-4" />
            Skip
          </Button>
          <Button variant="ghost" onClick={onManage} className="gap-2">
            <Users className="h-4 w-4" />
            Manage players
          </Button>
        </div>
      </div>
    </div>
  )
}
