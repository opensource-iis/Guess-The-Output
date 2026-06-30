import { AnimatePresence, motion } from 'motion/react'
import { Users, Play, Smartphone } from 'lucide-react'
import type { GameState } from '@/lib/protocol'
import { Button } from './ui'

/**
 * LOBBY: a designed "join" panel (room code shown as keycap tiles, no glow) next to a live
 * players roster. Background comes from the shared AppBackground. Start stays disabled until at
 * least one player is connected (the server's start() guard).
 */
export default function LobbyView({
  state,
  roomCode,
  onStart,
}: {
  state: GameState
  roomCode: string
  onStart: () => void
}) {
  const players = state.players || []
  const connectedCount = players.filter((p) => p.connected).length

  // Prefer the server's join URL; fall back to this origin. Defend against a stale server still
  // emitting the old /player.html path.
  const rawJoin = state.joinUrl || `${window.location.origin}/player?code=${roomCode}`
  const joinUrl = rawJoin.replace('/player.html', '/player').replace(/^https?:\/\//, '')
  const codeChars = (roomCode || '----').split('')

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:py-10">
      <div className="grid items-stretch gap-6 lg:grid-cols-[1.05fr_1fr]">
        {/* JOIN + CODE */}
        <section className="flex flex-col justify-center rounded-3xl border border-border bg-card/70 p-8 backdrop-blur-sm sm:p-10">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <Smartphone className="h-4 w-4 text-primary" />
            Join at
          </p>
          <p className="mt-2 w-fit rounded-lg border border-border bg-background/60 px-3 py-1.5 font-mono text-base text-foreground sm:text-lg">
            {joinUrl}
          </p>

          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Room code
          </p>
          <div className="mt-3 flex gap-2 sm:gap-3" aria-label={`Room code ${roomCode}`}>
            {codeChars.map((ch, i) => (
              <span
                key={i}
                className="grid h-[4.5rem] w-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10 font-mono text-5xl font-extrabold text-primary sm:h-24 sm:w-[4.5rem] sm:text-6xl"
              >
                {ch}
              </span>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Open the link on your phone, then type the code.</p>
        </section>

        {/* PLAYERS */}
        <section className="flex flex-col rounded-3xl border border-border bg-card/70 p-6 backdrop-blur-sm sm:p-7">
          <header className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Users className="h-5 w-5 text-primary" />
              Players
            </h2>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-sm font-semibold text-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {players.length} joined
            </span>
          </header>

          {players.length === 0 ? (
            <div className="grid flex-1 place-items-center gap-3 py-12 text-center">
              <span className="grid h-14 w-14 animate-pulse place-items-center rounded-2xl border border-border bg-secondary/40 text-muted-foreground">
                <Users className="h-7 w-7" />
              </span>
              <p className="text-muted-foreground">Waiting for players to join…</p>
            </div>
          ) : (
            <ul className="grid max-h-[52vh] flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pr-1 scrollbar-hide sm:grid-cols-3">
              <AnimatePresence initial={false}>
                {players.map((p) => (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                    className={`flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2 transition-opacity ${
                      p.connected ? '' : 'opacity-50'
                    }`}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <Button variant="primary" size="lg" disabled={connectedCount < 1} onClick={onStart} className="gap-2">
          <Play className="h-5 w-5" />
          Start game
        </Button>
        <p className="text-xs text-muted-foreground">
          {connectedCount < 1
            ? 'Start unlocks once a player connects'
            : `${connectedCount} ${connectedCount === 1 ? 'player' : 'players'} ready`}
        </p>
      </div>
    </div>
  )
}
