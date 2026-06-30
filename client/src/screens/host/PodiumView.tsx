import { motion } from 'motion/react'
import { Crown, Trophy, RotateCcw } from 'lucide-react'
import type { GameState, LeaderRow } from '@/lib/protocol'
import { Button } from './ui'
import Confetti from './Confetti'

const BLOCK = {
  1: { h: 'h-40 sm:h-52', ring: 'ring-amber-400/60', text: 'text-amber-300', label: 'bg-amber-400/20' },
  2: { h: 'h-28 sm:h-36', ring: 'ring-slate-300/50', text: 'text-slate-200', label: 'bg-slate-300/15' },
  3: { h: 'h-24 sm:h-28', ring: 'ring-orange-500/50', text: 'text-orange-300', label: 'bg-orange-500/15' },
} as const

function PodiumSlot({ entry, rank }: { entry: LeaderRow | undefined; rank: 1 | 2 | 3 }) {
  const b = BLOCK[rank]
  const order = rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3'
  if (!entry) return <div className={`flex-1 ${order}`} />
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: rank === 1 ? 0.1 : rank === 2 ? 0.25 : 0.4, type: 'spring', stiffness: 260, damping: 22 }}
      className={`flex flex-1 flex-col items-center ${order}`}
    >
      {rank === 1 && <Crown className="mb-1 h-7 w-7 text-amber-300" aria-hidden="true" />}
      <span className="mt-2 max-w-full truncate text-lg font-bold text-foreground">{entry.name}</span>
      <span className="font-mono text-sm text-muted-foreground">{entry.score} pts</span>
      <div className={`mt-2 grid w-full place-items-center rounded-t-xl border border-border ${b.label} ${b.h}`}>
        <span className={`font-mono text-4xl font-extrabold ${b.text}`}>{rank}</span>
      </div>
    </motion.div>
  )
}

/**
 * PODIUM: the final results — a restrained gold/silver/bronze top three plus the full ranking,
 * with a one-shot confetti burst on entry. "New game" closes the room and returns to setup.
 */
export default function PodiumView({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  const board: LeaderRow[] = (state.leaderboard || []).slice()
  const top3 = board.slice(0, 3)

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8">
      <Confetti />

      <h2 className="mb-8 flex items-center justify-center gap-3 text-center text-4xl font-extrabold tracking-tight">
        <Trophy className="h-9 w-9 text-amber-300" />
        Final results
      </h2>

      {/* Podium blocks */}
      <div className="mx-auto flex w-full max-w-xl items-end justify-center gap-3">
        <PodiumSlot entry={top3[1]} rank={2} />
        <PodiumSlot entry={top3[0]} rank={1} />
        <PodiumSlot entry={top3[2]} rank={3} />
      </div>

      {/* Full ranking */}
      <div className="mt-10">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Full ranking</h3>
        <ol className="space-y-2">
          {board.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-2.5 backdrop-blur-sm"
            >
              <span className="w-7 shrink-0 text-center font-mono font-bold text-muted-foreground">{row.rank}</span>
              <span className="flex-1 truncate font-medium text-foreground">{row.name}</span>
              <span className="font-mono font-bold text-foreground">{row.score}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-10 flex justify-center">
        <Button variant="primary" size="lg" onClick={onNewGame} className="gap-2">
          <RotateCcw className="h-5 w-5" />
          New game
        </Button>
      </div>
    </div>
  )
}
