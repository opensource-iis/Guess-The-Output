import { Check, Trophy, AlertTriangle, Terminal, BarChart3 } from 'lucide-react'
import { ANSWER_MODE } from '@/lib/protocol'
import type { GameState, QuestionView as QView } from '@/lib/protocol'
import { Pill, Button, OPTION_LABELS, normAnswer } from './ui'

function isMcq(q: QView | null): boolean {
  return !!q && q.answerMode === ANSWER_MODE.MCQ && Array.isArray(q.options) && q.options.length > 0
}

/**
 * REVEAL: the real output (green, or red if it raises) + the "why" explanation + how many
 * players got it right. In MCQ mode the choices are shown with the correct one marked
 * (matched ignoring whitespace/quotes, like host.js). "Show scoreboard" advances via hostNext.
 */
export default function RevealView({ state, onNext }: Readonly<{ state: GameState; onNext: () => void }>) {
  const r = state.reveal
  const q = state.question
  const roundNo = state.roundIndex >= 0 ? state.roundIndex + 1 : 1
  const isError = !!r?.isError

  const target = normAnswer(r?.output)

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Pill tone="neutral">
          Round {roundNo} / {state.totalRounds}
        </Pill>
        <h2 className="flex items-center gap-2 text-3xl font-bold sm:text-4xl">
          {isError ? (
            <AlertTriangle className="h-7 w-7 text-destructive" />
          ) : (
            <Terminal className="h-7 w-7 text-primary" />
          )}
          {isError ? 'It crashes' : 'The output'}
        </h2>
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-2">
        {/* Output */}
        <div className="flex flex-col">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {isError ? 'It raises' : 'It prints'}
          </p>
          <pre
            className={`code-block flex-1 px-5 py-4 text-2xl font-semibold sm:text-3xl ${
              isError ? 'text-destructive' : 'text-primary'
            }`}
          >
            {r?.output ?? ''}
          </pre>

          {isMcq(q) && (
            <ul className="mt-4 grid gap-2" aria-label="Answer choices">
              {q!.options!.map((opt, i) => {
                const correct = normAnswer(opt) === target
                return (
                  <li
                    key={i}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${
                      correct
                        ? 'border-primary/60 bg-primary/15'
                        : 'border-border bg-secondary/40 opacity-70'
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border font-mono font-bold ${
                        correct ? 'border-primary/60 text-primary' : 'border-border text-muted-foreground'
                      }`}
                    >
                      {OPTION_LABELS[i] || i + 1}
                    </span>
                    <span className="break-all font-mono text-foreground">{opt}</span>
                    {correct && <Check className="ml-auto h-5 w-5 shrink-0 text-primary" />}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Why + score */}
        <div className="flex flex-col">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Why</p>
          <p className="flex-1 rounded-2xl border border-border bg-card p-5 text-lg leading-relaxed text-foreground">
            {r?.explanation ?? ''}
          </p>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary/40 text-primary">
              <Trophy className="h-5 w-5" />
            </span>
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-primary">{r?.correctCount ?? 0}</span>
              <span className="text-muted-foreground">of {r?.answeredCount ?? 0} got it right</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button variant="primary" size="lg" onClick={onNext} className="gap-2">
          <BarChart3 className="h-5 w-5" />
          Show scoreboard
        </Button>
      </div>
    </div>
  )
}
