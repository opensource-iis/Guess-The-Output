import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Award, Check, Flag, Hash, Medal, Trophy, UserMinus } from 'lucide-react'
import { useGame } from '@/hooks/useGame'
import { PHASE, ANSWER_MODE } from '@/lib/protocol'
import CodeBlock from './player/CodeBlock'
import TimerRing from './player/TimerRing'
import { Button } from '@/components/ui/button'

/*
 * Player.tsx — the phone/laptop client, rebuilt in React with useGame.
 * Mirrors public/js/player.js: join (with token auto-rejoin),
 * waiting, question (text input OR 4 MCQ buttons with a double-submit guard),
 * reveal (from useGame.result), podium, and kicked/roomClosed messages.
 * The server is the single source of truth; the only local timing job is the
 * countdown ring (handled in TimerRing).
 */

// ----- localStorage helpers (per-room token + profile) -----
const PROFILE_KEY = 'gto_profile'
const tokenKey = (code: string) => `gto_player_${code}`
const nameKey = (code: string) => `gto_pname_${code}`

function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function lsSet(key: string, val: string) {
  try {
    window.localStorage.setItem(key, val)
  } catch {
    /* ignore quota/private-mode errors */
  }
}
function lsRemove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

interface Profile {
  name: string
}
function loadProfile(): Profile | null {
  const raw = lsGet(PROFILE_KEY)
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return null
    return {
      name: typeof p.name === 'string' ? p.name : '',
    }
  } catch {
    return null
  }
}
function saveProfile(name: string) {
  lsSet(PROFILE_KEY, JSON.stringify({ name: name || '' }))
}

// ----- URL query + sanitisers -----
function readQuery() {
  const params = new URLSearchParams(window.location.search)
  return { code: params.get('code') || '', name: params.get('name') || '' }
}
function sanitizeCode(v: string): string {
  return (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
}
// Compare option text to correct output ignoring surrounding whitespace + quotes.
function normForCompare(s: unknown): string {
  return String(s ?? '').trim().replace(/^['"]+|['"]+$/g, '').trim()
}
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function Player() {
  const game = useGame()
  const { state, counts, result, connected, kicked, roomClosed, playerJoin, playerAnswer } = game

  // ----- identity / join state -----
  const initial = useMemo(() => {
    const q = readQuery()
    const code = sanitizeCode(q.code)
    const profile = loadProfile()
    const savedName = code ? lsGet(nameKey(code)) || '' : ''
    const name = (q.name || savedName || profile?.name || '').trim()
    return { code, name }
  }, [])

  const [code, setCode] = useState(initial.code)
  const [name, setName] = useState(initial.name)

  const [joined, setJoined] = useState(false)
  const [myId, setMyId] = useState<string | null>(null)
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  // committed identity used by reconnect (the values we actually joined with)
  const roomCodeRef = useRef('')
  const myNameRef = useRef('')

  // ----- per-round answer state -----
  const [answered, setAnswered] = useState(false)
  const [lockedAnswer, setLockedAnswer] = useState<string | null>(null)
  const [chosenOption, setChosenOption] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [answerHint, setAnswerHint] = useState('')
  const submittingRef = useRef(false) // double-submit guard across async ack
  const lastRoundRef = useRef<number>(-2)

  const phase = state?.phase ?? null

  // Learn my own id from the roster (helps podium / "(you)" markers on reconnect).
  useEffect(() => {
    if (myId || !state?.players || !myNameRef.current) return
    const mine = state.players.find(
      (p) => (p.name || '').toLowerCase() === myNameRef.current.toLowerCase()
    )
    if (mine) setMyId(mine.id)
  }, [state, myId])

  // ----- JOIN -----
  const doJoin = useCallback(
    async (joinCode: string, joinName: string, token: string | null, fromForm: boolean) => {
      setJoining(true)
      const res = await playerJoin({
        roomCode: joinCode,
        name: joinName,
        ...(token ? { token } : {}),
      })
      setJoining(false)
      if (res?.ok) {
        setJoined(true)
        setJoinError('')
        roomCodeRef.current = joinCode
        myNameRef.current = joinName
        if (res.playerId) setMyId(res.playerId)
        if (res.token) lsSet(tokenKey(joinCode), res.token)
        if (joinName) lsSet(nameKey(joinCode), joinName)
        saveProfile(joinName)
      } else {
        setJoined(false)
        setJoinError(res?.error || 'Could not join. Check the code and try again.')
        // A stale/invalid token (e.g. the name is now taken) — drop it so the player
        // can retype a fresh name without being auto-rejected on every reload.
        if (token) lsRemove(tokenKey(joinCode))
        if (fromForm && !code) setCode(joinCode)
      }
    },
    [playerJoin, code]
  )

  // Auto-rejoin on load if we already have a token for this room.
  const bootedRef = useRef(false)
  useEffect(() => {
    if (bootedRef.current || !connected) return
    bootedRef.current = true
    const c = sanitizeCode(initial.code)
    if (!c) return
    const token = lsGet(tokenKey(c))
    if (token) {
      roomCodeRef.current = c
      myNameRef.current = initial.name
      doJoin(c, initial.name, token, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  // On reconnect after a drop, silently re-join with the stored token.
  const wasConnected = useRef(connected)
  useEffect(() => {
    if (connected && !wasConnected.current && joined && roomCodeRef.current) {
      doJoin(roomCodeRef.current, myNameRef.current, lsGet(tokenKey(roomCodeRef.current)), false)
    }
    wasConnected.current = connected
  }, [connected, joined, doJoin])

  const onJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const c = sanitizeCode(code)
    const n = name.trim()
    if (!c) {
      setJoinError('Enter the room code.')
      return
    }
    if (!n) {
      setJoinError('Enter a name so the host can see you.')
      return
    }
    setJoinError('')
    roomCodeRef.current = c
    myNameRef.current = n
    doJoin(c, n, lsGet(tokenKey(c)), true)
  }

  const onCodeChange = (v: string) => setCode(sanitizeCode(v))
  const onNameChange = (v: string) => setName(v)

  // ----- ANSWER (text or mcq), with double-submit guard -----
  const submitAnswer = useCallback(
    async (val: string): Promise<boolean> => {
      if (answered || submittingRef.current) return false
      submittingRef.current = true
      const res = await playerAnswer(val)
      submittingRef.current = false
      if (res?.ok && res.locked) {
        setAnswered(true)
        setLockedAnswer(val)
        return true
      }
      setAnswerHint(res?.error || 'Could not submit — try again.')
      return false
    },
    [answered, playerAnswer]
  )

  const onTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (answered || submittingRef.current) return
    const val = answerText
    if (val == null || val.trim() === '') {
      setAnswerHint('Type your guess first, then lock it in.')
      return
    }
    await submitAnswer(val)
  }

  const onPickOption = async (optText: string) => {
    if (answered || submittingRef.current) return
    setChosenOption(optText) // optimistic visual lock so a second tap can't land
    const ok = await submitAnswer(optText)
    if (!ok) setChosenOption(null) // round moved on / rejected — re-open
  }

  // Reset the answer UI on each new round; respect a server-reported prior answer
  // (reconnect mid-round).
  useEffect(() => {
    if (phase !== PHASE.QUESTION || !state) return
    const roundIndex = state.roundIndex | 0
    if (roundIndex !== lastRoundRef.current) {
      lastRoundRef.current = roundIndex
      setAnswered(false)
      setLockedAnswer(null)
      setChosenOption(null)
      setAnswerText('')
      game.clearResult() // drop the previous round's reveal so SCOREBOARD/REVEAL never shows stale data
      const q = state.question
      setAnswerHint(
        q?.answerMode === ANSWER_MODE.MCQ
          ? q?.isError
            ? 'Tap the exception you expect.'
            : 'Tap the output you expect.'
          : q?.isError
            ? 'Name the exception, then press Enter.'
            : 'Press Enter to lock it in.'
      )
    }
    // If a STATE shows WE already answered (reconnect mid-round), lock the UI.
    if (!answered && myId && state.players) {
      const mine = state.players.find((p) => p.id === myId)
      if (mine?.answered) {
        setAnswered(true)
        setLockedAnswer((prev) => prev ?? '')
      }
    }
  }, [phase, state, myId, answered])

  // ===========================================================================
  // KICKED / ROOM CLOSED
  // ===========================================================================
  if (kicked || roomClosed) {
    const msg = kicked || roomClosed
    return (
      <Centered>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-lg ring-1 ring-white/5">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary text-muted-foreground"
            aria-hidden="true"
          >
            {kicked ? <UserMinus className="h-7 w-7" /> : <Flag className="h-7 w-7" />}
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {kicked ? 'Removed from the game' : 'The game ended'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
          <Button
            onClick={() => {
              window.location.href = '/'
            }}
            className="mt-6"
          >
            Back to start
          </Button>
        </div>
      </Centered>
    )
  }

  // ===========================================================================
  // JOIN
  // ===========================================================================
  if (!joined || !state) {
    return (
      <Centered>
        <div className="w-full max-w-sm">
          <header className="mb-5 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Guess the <span className="text-primary">Output</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Join the game on your device.</p>
          </header>

          <form
            onSubmit={onJoinSubmit}
            className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-lg"
          >
            <div>
              <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-foreground">
                Room code
              </label>
              <input
                id="code"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="ABCD"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] uppercase text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                maxLength={4}
              />
            </div>

            <div>
              <label htmlFor="pname" className="mb-1.5 block text-sm font-medium text-foreground">
                Your name
              </label>
              <input
                id="pname"
                autoComplete="off"
                placeholder="e.g. Ada"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                maxLength={24}
              />
            </div>

            {joinError && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {joinError}
              </p>
            )}

            <Button type="submit" disabled={joining || !connected} className="w-full">
              {joining ? 'Joining…' : connected ? 'Join game' : 'Connecting…'}
            </Button>
          </form>
        </div>
      </Centered>
    )
  }

  // From here on we are joined and have a state. A small status bar pins identity.
  const statusBar = (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{myNameRef.current || name}</p>
        <p className="font-mono text-xs text-muted-foreground">Room {roomCodeRef.current || code}</p>
      </div>
      {!connected && <span className="text-xs text-amber-400">Reconnecting…</span>}
    </div>
  )

  // ===========================================================================
  // PODIUM
  // ===========================================================================
  if (phase === PHASE.PODIUM) {
    const board = state.leaderboard || []
    const me = board.find((p) => p.id === myId) || null
    const onPodium = !!me && me.rank >= 1 && me.rank <= 3
    const top3 = board.slice(0, 3)
    return (
      <Centered>
        <div className="w-full max-w-sm">
          {statusBar}
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-lg ring-1 ring-white/5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center" aria-hidden="true">
              {onPodium ? (
                <RankMedal rank={me!.rank} className="h-12 w-12" />
              ) : me ? (
                <span className="flex items-center font-mono text-3xl font-bold text-muted-foreground">
                  <Hash className="h-7 w-7" />
                  {me.rank}
                </span>
              ) : (
                <Trophy className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">
              {me
                ? `You finished ${ordinal(me.rank | 0)} with ${me.score | 0} points`
                : 'Thanks for playing!'}
            </p>

            <ul className="mt-6 space-y-2 text-left">
              {top3.map((p, i) => (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                    p.id === myId ? 'border-primary/60 bg-primary/10' : 'border-border bg-background'
                  }`}
                >
                  <span className="flex w-6 justify-center" aria-hidden="true">
                    <RankMedal rank={i + 1} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {p.name}
                    {p.id === myId && <span className="text-muted-foreground"> (you)</span>}
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-primary">{p.score | 0}</span>
                </li>
              ))}
            </ul>

            <a
              href="/"
              className="mt-6 inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-border px-6 font-semibold text-foreground transition hover:bg-secondary active:scale-[0.98]"
            >
              Back to start
            </a>
          </div>
        </div>
      </Centered>
    )
  }

  // ===========================================================================
  // REVEAL  (also covers SCOREBOARD for the player — keep showing their result)
  // ===========================================================================
  if (phase === PHASE.REVEAL || (phase === PHASE.SCOREBOARD && result)) {
    const r = result
    const isError = !!(state.reveal?.isError || r?.isError)
    const didAnswer = !!r && typeof r.correct === 'boolean'
    const correct = didAnswer && r!.correct
    const correctOut = r?.correctOutput ?? state.reveal?.output ?? ''

    const verdict = !didAnswer ? "Time's up" : correct ? 'Correct!' : isError ? 'Not that exception' : 'Not quite'
    const pts = r && typeof r.points === 'number' ? r.points : 0

    return (
      <Centered>
        <div className="w-full max-w-sm">
          {statusBar}
          <div
            className={`rounded-2xl border-2 p-6 text-center transition ${
              correct ? 'border-primary bg-primary/10' : 'border-destructive/70 bg-destructive/10'
            }`}
          >
            <h1 className={`text-2xl font-extrabold ${correct ? 'text-primary' : 'text-destructive'}`}>
              {verdict}
            </h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {correct && pts > 0
                ? `+${pts} points`
                : didAnswer
                  ? 'No points this round'
                  : "You didn't answer in time"}
            </p>

            <div className="mt-5 rounded-xl border border-border bg-background p-3 text-left">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isError ? 'The exception' : 'Correct output'}
              </p>
              <pre
                className={`whitespace-pre-wrap break-words font-mono text-sm ${
                  isError ? 'text-destructive' : 'text-primary'
                }`}
              >
                {correctOut}
              </pre>
            </div>

            {didAnswer && r?.yourAnswer != null && String(r.yourAnswer).trim() !== '' && (
              <div className="mt-3 rounded-xl border border-border bg-background p-3 text-left">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Your answer
                </p>
                <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground">
                  {r.yourAnswer}
                </pre>
              </div>
            )}

            <p className="mt-4 text-sm text-muted-foreground">
              Your rank: <span className="font-mono font-semibold text-foreground">{r && typeof r.rank === 'number' ? `#${r.rank}` : '—'}</span>
            </p>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">Waiting for the host…</p>
        </div>
      </Centered>
    )
  }

  // ===========================================================================
  // QUESTION
  // ===========================================================================
  if (phase === PHASE.QUESTION && state.question) {
    const q = state.question
    const isMcq = q.answerMode === ANSWER_MODE.MCQ
    const options = (q.options || []).slice(0, 4)
    const letters = ['A', 'B', 'C', 'D']

    return (
      <Centered top>
        <div className="w-full max-w-md">
          {statusBar}

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill>Round {(state.roundIndex | 0) + 1}{state.totalRounds ? ` / ${state.totalRounds}` : ''}</Pill>
                {q.tier && <Pill>{q.tier}</Pill>}
                {q.difficulty && <Pill>{q.difficulty}</Pill>}
              </div>
              <TimerRing timer={state.timer} />
            </div>

            <p className="mb-2 text-sm font-semibold text-foreground">
              {q.isError ? 'What happens when this runs?' : 'What does this print?'}
            </p>
            <CodeBlock code={q.code} />

            <p className="mt-2 text-right text-xs text-muted-foreground">
              {counts ? `${counts.answered | 0} of ${counts.total | 0} answered` : ''}
            </p>

            {/* Locked banner */}
            {answered ? (
              <div className="mt-4 rounded-xl border border-primary/50 bg-primary/10 p-4 text-center">
                <p className="flex items-center justify-center gap-1.5 font-semibold text-primary">
                  <Check className="h-4 w-4" />
                  Locked in
                </p>
                {lockedAnswer && (
                  <p className="mt-1 font-mono text-sm text-foreground">“{lockedAnswer}”</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Hang tight for the reveal.</p>
              </div>
            ) : isMcq ? (
              <div className="mt-4 grid gap-2.5">
                {options.map((opt, i) => {
                  const chosen = chosenOption === opt
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onPickOption(opt)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition active:scale-[0.99] ${
                        chosen
                          ? 'border-primary bg-primary/15 shadow-[0_0_0_1px_hsl(var(--primary)/0.6)]'
                          : 'border-border bg-background hover:border-primary/50 hover:bg-secondary'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold transition ${
                          chosen ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {letters[i]}
                      </span>
                      <span className="min-w-0 flex-1 break-words font-mono text-sm text-foreground">{opt}</span>
                      {chosen && <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <form onSubmit={onTextSubmit} className="mt-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Your guess…"
                    className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 font-mono text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                  />
                  <Button type="submit" disabled={submittingRef.current} className="shrink-0">
                    Lock in
                  </Button>
                </div>
              </form>
            )}

            {!answered && answerHint && (
              <p className="mt-2 text-center text-xs text-muted-foreground">{answerHint}</p>
            )}
          </div>
        </div>
      </Centered>
    )
  }

  // ===========================================================================
  // WAITING  (LOBBY / SCOREBOARD-without-result / fallback)
  // ===========================================================================
  return (
    <Centered>
      <div className="w-full max-w-sm text-center">
        {statusBar}
        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="text-xl font-bold text-foreground">You're in!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Waiting for the host to start the game…
          </p>
          <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
            <Dot delay="0ms" />
            <Dot delay="150ms" />
            <Dot delay="300ms" />
          </div>
        </div>
      </div>
    </Centered>
  )
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------
function Centered({ children, top = false }: { children: React.ReactNode; top?: boolean }) {
  return (
    <main
      className={`flex min-h-full w-full justify-center p-4 ${
        top ? 'items-start pt-6 sm:pt-10' : 'items-center'
      }`}
    >
      {children}
    </main>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
      {children}
    </span>
  )
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-pulse rounded-full bg-primary"
      style={{ animationDelay: delay }}
    />
  )
}

// Rank 1/2/3 → trophy / medal / award, tinted gold / silver / bronze.
function RankMedal({ rank, className = '' }: { rank: number; className?: string }) {
  if (rank === 1) return <Trophy className={`${className} text-amber-400`} aria-hidden="true" />
  if (rank === 2) return <Medal className={`${className} text-slate-300`} aria-hidden="true" />
  if (rank === 3) return <Award className={`${className} text-amber-600`} aria-hidden="true" />
  return <Hash className={`${className} text-muted-foreground`} aria-hidden="true" />
}
