import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { BarChart3, ChevronUp, ChevronDown, Minus, ArrowRight, Trophy } from 'lucide-react'
import type { GameState, LeaderRow } from '@/lib/protocol'
import { Pill, Button } from './ui'

/** Animate a number from its previous rendered value to the target (eased), per host.js. */
function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const start = prev.current
    const target = value
    if (start === target) {
      setDisplay(target)
      return
    }
    let raf = 0
    let t0: number | null = null
    const dur = 600
    const step = (ts: number) => {
      if (t0 == null) t0 = ts
      const p = Math.min(1, (ts - t0) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(start + (target - start) * eased))
      if (p < 1) raf = requestAnimationFrame(step)
      else {
        setDisplay(target)
        prev.current = target
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span className="font-mono tabular-nums">{display}</span>
}

const rankAccent = (rank: number) =>
  rank === 1
    ? 'border-amber-400/50 bg-amber-400/10'
    : rank === 2
    ? 'border-slate-300/40 bg-slate-300/5'
    : rank === 3
    ? 'border-orange-500/40 bg-orange-500/5'
    : 'border-border bg-card'

/**
 * SCOREBOARD: the ranked leaderboard between rounds. Rows reorder with motion's layout
 * animation (the React equivalent of host.js's FLIP), scores count up, and each row shows
 * its rank movement. The CTA reads "Next round" or "See final results" on the last round.
 */
export default function ScoreboardView({ state, onContinue }: { state: GameState; onContinue: () => void }) {
  const board: LeaderRow[] = (state.leaderboard || []).slice()
  const roundNo = state.roundIndex >= 0 ? state.roundIndex + 1 : 1
  const isLast = roundNo >= state.totalRounds

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-3xl font-bold sm:text-4xl">
          <BarChart3 className="h-7 w-7 text-primary" />
          Scoreboard
        </h2>
        <Pill tone="neutral">
          After round {roundNo} / {state.totalRounds}
        </Pill>
      </div>

      <ol className="flex-1 space-y-2">
        {board.map((row) => {
          const delta = row.delta || 0
          let moveColor = 'text-muted-foreground'
          if (delta > 0) moveColor = 'text-primary'
          else if (delta < 0) moveColor = 'text-destructive'
          let DeltaIcon = Minus
          if (delta > 0) DeltaIcon = ChevronUp
          else if (delta < 0) DeltaIcon = ChevronDown
          return (
            <motion.li
              key={row.id}
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${rankAccent(row.rank)}`}
            >
              <span className="w-8 shrink-0 text-center font-mono text-xl font-bold text-muted-foreground">
                {row.rank}
              </span>
              <span className="flex-1 truncate text-lg font-medium text-foreground">{row.name}</span>
              <span className={`flex items-center gap-0.5 text-sm font-semibold ${moveColor}`} aria-hidden="true">
                <DeltaIcon className="h-4 w-4" />
                {delta !== 0 && <span>{Math.abs(delta)}</span>}
              </span>
              <span className="w-20 shrink-0 text-right text-xl font-bold text-foreground">
                <AnimatedScore value={row.score} />
              </span>
            </motion.li>
          )
        })}
      </ol>

      <div className="mt-8 flex justify-center">
        <Button variant="primary" size="lg" onClick={onContinue} className="gap-2">
          {isLast ? <Trophy className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
          {isLast ? 'See final results' : 'Next round'}
        </Button>
      </div>
    </div>
  )
}
