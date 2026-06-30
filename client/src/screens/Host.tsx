import { useCallback, useEffect, useRef, useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { PHASE } from '@/lib/protocol'
import SetupView, { CreateOpts } from './host/SetupView'
import LobbyView from './host/LobbyView'
import QuestionView from './host/QuestionView'
import RevealView from './host/RevealView'
import ScoreboardView from './host/ScoreboardView'
import PodiumView from './host/PodiumView'
import KickDialog from './host/KickDialog'
import { Button } from './host/ui'

/* ---------------------------------------------------------------- *
 *  localStorage persistence (host token + room) — mirrors host.js
 * ---------------------------------------------------------------- */
const STORE_INDEX = 'gto_host_last'
const keyFor = (code: string) => 'gto_host_' + code

function persist(code: string, token: string) {
  try {
    localStorage.setItem(keyFor(code), token)
    localStorage.setItem(STORE_INDEX, code)
  } catch {
    /* private mode — non-fatal */
  }
}
function readToken(code: string): string | null {
  try {
    return localStorage.getItem(keyFor(code))
  } catch {
    return null
  }
}
function readLastCode(): string | null {
  try {
    return localStorage.getItem(STORE_INDEX)
  } catch {
    return null
  }
}
function clearStored(code: string | null) {
  try {
    if (code) localStorage.removeItem(keyFor(code))
    localStorage.removeItem(STORE_INDEX)
  } catch {
    /* ignore */
  }
}

/* Persistent corner tag, visible everywhere except setup/closed. */
function Topbar({ code, round }: { code: string; round: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/80 px-4 py-2 text-sm backdrop-blur-sm">
      <span className="font-semibold text-foreground">Guess&nbsp;the&nbsp;Output</span>
      <span className="text-muted-foreground">·</span>
      <span className="font-mono font-bold tracking-widest text-primary">{code}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">{round}</span>
    </header>
  )
}

/**
 * Host — the projector-facing controller. All realtime flows through useGame; the authoritative
 * GameState.phase drives which view renders (plus a SETUP view before a room exists). On load it
 * tries to resume a stored room via hostReconnect; "New game" closes the room and returns to setup.
 */
export default function Host() {
  const game = useGame()
  const { state, connected, counts } = game

  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [showKick, setShowKick] = useState(false)
  // false until we've decided setup-vs-resume, so we don't flash setup over a live room.
  const [resumeChecked, setResumeChecked] = useState(false)
  const reconnectTried = useRef(false)

  // Keep the room code in sync with the authoritative state.
  useEffect(() => {
    if (state?.room?.code) setRoomCode(state.room.code)
  }, [state?.room?.code])

  // On first connect, resume a stored room if we have creds and aren't already live.
  useEffect(() => {
    if (!connected || reconnectTried.current) return
    reconnectTried.current = true
    const code = readLastCode()
    const token = code ? readToken(code) : null
    if (code && token) {
      game.hostReconnect(code, token).then((res: any) => {
        if (res && res.ok) {
          setRoomCode(code)
        } else {
          clearStored(code)
        }
        setResumeChecked(true)
      })
    } else {
      setResumeChecked(true)
    }
  }, [connected, game])

  const handleCreate = useCallback(
    async (opts: CreateOpts) => {
      if (!connected) {
        setSetupError('Not connected to the server yet — give it a second.')
        return
      }
      setSetupError(null)
      setBusy(true)
      const res: any = await game.hostCreate(opts)
      setBusy(false)
      if (!res || !res.ok) {
        setSetupError((res && res.error) || 'Could not create the room. Try again.')
        return
      }
      setRoomCode(res.roomCode)
      persist(res.roomCode, res.hostToken)
      // The authoritative STATE event paints the lobby next.
    },
    [connected, game]
  )

  const handleNewGame = useCallback(() => {
    game.hostClose()
    clearStored(roomCode)
    setRoomCode(null)
    setShowKick(false)
    setSetupError(null)
  }, [game, roomCode])

  // ---- routing by phase ----
  const phase = state?.phase
  const inLiveRoom = !!state && phase !== PHASE.CLOSED

  // Surface server / room-closed notices on setup once we're back there.
  const closedNotice = game.roomClosed

  // Don't render anything definitive until we've checked for a resumable room.
  if (!resumeChecked && !inLiveRoom) {
    return (
      <main className="grid min-h-full place-items-center">
        <p className="text-muted-foreground">Connecting…</p>
      </main>
    )
  }

  // SETUP (no live room).
  if (!inLiveRoom) {
    return (
      <main className="min-h-full">
        {closedNotice && (
          <div className="mx-auto max-w-5xl px-4 pt-4">
            <p className="rounded-xl border border-border bg-card px-4 py-2 text-center text-sm text-muted-foreground">
              {closedNotice}
            </p>
          </div>
        )}
        <SetupView connected={connected} error={setupError} busy={busy} onCreate={handleCreate} />
      </main>
    )
  }

  // Topbar round label.
  const roundLabel =
    phase === PHASE.LOBBY
      ? 'Lobby'
      : phase === PHASE.PODIUM
      ? 'Final'
      : state.roundIndex >= 0
      ? `Round ${state.roundIndex + 1} / ${state.totalRounds}`
      : '—'

  const code = roomCode || state.room?.code || '—'

  return (
    <main className="flex min-h-full flex-col">
      {phase !== PHASE.LOBBY && <Topbar code={code} round={roundLabel} />}

      <div className="relative flex-1">
        {!connected && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm text-amber-200 shadow-lg"
          >
            Reconnecting…
          </div>
        )}

        {phase === PHASE.LOBBY && <LobbyView state={state} roomCode={code} onStart={game.hostStart} />}

        {phase === PHASE.QUESTION && (
          <QuestionView
            state={state}
            counts={counts}
            onReveal={game.hostReveal}
            onSkip={game.hostSkip}
            onManage={() => setShowKick(true)}
          />
        )}

        {phase === PHASE.REVEAL && <RevealView state={state} onNext={game.hostNext} />}

        {phase === PHASE.SCOREBOARD && <ScoreboardView state={state} onContinue={game.hostContinue} />}

        {phase === PHASE.PODIUM && <PodiumView state={state} onNewGame={handleNewGame} />}
      </div>

      {showKick && (
        <KickDialog players={state.players || []} onKick={game.hostKick} onClose={() => setShowKick(false)} />
      )}
    </main>
  )
}
