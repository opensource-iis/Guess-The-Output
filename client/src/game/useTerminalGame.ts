import { useCallback, useEffect, useRef, useState } from 'react'
import { useGame } from '../hooks/useGame'
import { API_BASE } from '../lib/api'
import { prefersReducedMotion } from '../lib/motion'
import { ANSWER_MODE, PHASE } from '../lib/protocol'
import type { BankMeta, GameState } from '../lib/protocol'
import type { LineKind, LineTone, StatusSegments, TermLine } from '../terminal/types'
import {
  COMMAND_NAMES,
  CREDITS,
  FAKE_FILES,
  FORTUNES,
  HELP_TEXT,
  HIDDEN_FILES,
  MAN,
  RULES,
  TOP_TABLE,
  WHOAMI,
  WORDMARK,
  cowsay,
  neofetch,
} from './content'
import { divider, indentBlock, leaderboardTable, LETTERS, mmss, optionsBlock, podiumBlock, roundHeader } from './format'
import { FLAGS_USAGE, parseHostFlags, wizardInput, wizardStart } from './hostSetup'
import type { CreateOpts, Wizard } from './hostSetup'

/**
 * The game half of the shell split: owns the scrollback CONTENT — boot,
 * command dispatch, easter eggs, and the live game driven by the existing
 * useGame socket hook (CLAUDE.md: reuse the working connection setup).
 * The Terminal component just renders what this produces.
 */

// localStorage keys — identical to the reference client, so the server-side
// reconnect path (same room + same identity) keeps working untouched.
const HOST_INDEX = 'gto_host_last'
const hostKey = (code: string) => `gto_host_${code}`
const tokenKey = (code: string) => `gto_player_${code}`
const nameKey = (code: string) => `gto_pname_${code}`
// sessionStorage marker: THIS tab is the host screen. localStorage is shared
// across tabs, so without it a fresh player tab would hijack the host seat.
const HOST_TAB = 'gto_host_tab'

const HOST_FLAG_STUBS = ['--mode=', '--rounds=', '--answers=', '--timer=', '--tier=', '--difficulty=', '--topic=', '--team=']

function ssGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}
function ssSet(key: string, val: string) {
  try {
    window.sessionStorage.setItem(key, val)
  } catch {
    /* ignore */
  }
}
function ssRemove(key: string) {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

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
    /* private mode — non-fatal */
  }
}
function lsRemove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

function hhmmss(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

type Role = 'none' | 'host' | 'player'
type Pending = { type: 'nick'; code: string } | { type: 'wizard'; wizard: Wizard }

export function useTerminalGame() {
  // Destructured because useGame returns a fresh wrapper object every render;
  // the callbacks themselves are stable and safe as effect dependencies.
  const {
    connected,
    state,
    counts,
    result,
    notice,
    kicked,
    roomClosed,
    clearResult,
    hostCreate,
    hostReconnect,
    hostStart,
    hostReveal,
    hostNext,
    hostContinue,
    hostSkip,
    hostKick,
    hostClose,
    playerJoin,
    playerAnswer,
  } = useGame()

  const [lines, setLines] = useState<TermLine[]>([])
  const [status, setStatus] = useState<StatusSegments>({ left: 'GUESS_THE_OUTPUT', right: 'offline' })
  // Full-screen LetterGlitch pulse — the matrix egg and reboot share it.
  const [glitchOn, setGlitchOn] = useState(false)
  const glitchTimerRef = useRef<number | null>(null)

  const idRef = useRef(1)
  const bootedRef = useRef(false)
  const bootTimeRef = useRef<number | null>(null)
  const bootTimersRef = useRef<number[]>([])
  const roleRef = useRef<Role>('none')
  const myNameRef = useRef('')
  const roomCodeRef = useRef('')
  const pendingRef = useRef<Pending | null>(null)
  const metaRef = useRef<BankMeta | null>(null)
  const stateRef = useRef<GameState | null>(null)
  const connectedRef = useRef(false)
  const offsetRef = useRef(0) // serverNow - Date.now()
  const phaseKeyRef = useRef('')
  const playersRef = useRef<Map<string, { name: string; connected: boolean }> | null>(null)
  const everConnectedRef = useRef(false)
  const socketLineRef = useRef<number | null>(null)
  const bankLineRef = useRef<number | null>(null)
  const answersLineRef = useRef<number | null>(null) // host: live "answers: n/N"
  const lockedLineRef = useRef<number | null>(null) // player: live "Locked in: ..."
  const lockedBaseRef = useRef('')
  const submittingRef = useRef(false)
  const hackTimerRef = useRef<number | null>(null)
  const pingTimerRef = useRef<number | null>(null)
  const commandLogRef = useRef<string[]>([]) // everything typed, for `history`

  connectedRef.current = connected

  // ---------------------------------------------------------------- printing

  const print = useCallback((kind: LineKind, text = '', tone?: LineTone): number => {
    const id = idRef.current++
    setLines((prev) => [...prev, { id, kind, text, tone }])
    return id
  }, [])

  const updateLine = useCallback((id: number, text: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, text } : l)))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const fail = useCallback((msg: string) => print('out', `[!!] ${msg}`, 'dim'), [print])

  const pulseGlitch = useCallback((ms: number) => {
    if (prefersReducedMotion()) return
    if (glitchTimerRef.current != null) clearTimeout(glitchTimerRef.current)
    setGlitchOn(true)
    glitchTimerRef.current = window.setTimeout(() => {
      setGlitchOn(false)
      glitchTimerRef.current = null
    }, ms)
  }, [])

  // ---------------------------------------------------------------- boot

  const runBoot = useCallback(() => {
    bootTimersRef.current.forEach(clearTimeout)
    bootTimersRef.current = []
    if (bootTimeRef.current == null) bootTimeRef.current = Date.now()
    const at = (ms: number, fn: () => void) => bootTimersRef.current.push(window.setTimeout(fn, ms))
    at(0, () => {
      print('banner', WORDMARK)
      print('scramble', 'Booting terminal...')
    })
    at(250, () => {
      const meta = metaRef.current
      bankLineRef.current = print(
        'scramble',
        meta ? `[OK] Loading snippet bank ... ${meta.total} snippets indexed` : '[..] Loading snippet bank ...'
      )
    })
    at(500, () => {
      socketLineRef.current = print(
        'scramble',
        connectedRef.current ? '[OK] Establishing socket link ... connected' : '[..] Establishing socket link ...'
      )
    })
    at(750, () => print('scramble', '[OK] Terminal ready'))
    at(950, () => {
      if (roleRef.current !== 'none' && roomCodeRef.current) {
        const seat = roleRef.current === 'player' ? ` as ${myNameRef.current}` : ' (host)'
        print('out', `[OK] session intact — room ${roomCodeRef.current}${seat}`, 'bright')
      }
      print('blank')
      print('out', 'Type HELP for a list of commands.', 'bright')
      print('blank')
    })
  }, [print])

  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    runBoot()
    return () => bootTimersRef.current.forEach(clearTimeout)
  }, [runBoot])

  // Snippet-bank metadata (real count for the boot line, topics for the wizard).
  useEffect(() => {
    fetch(`${API_BASE}/api/meta`)
      .then((r) => r.json())
      .then((meta: BankMeta) => {
        metaRef.current = meta
        if (bankLineRef.current != null)
          updateLine(bankLineRef.current, `[OK] Loading snippet bank ... ${meta.total} snippets indexed`)
      })
      .catch(() => {
        if (bankLineRef.current != null) updateLine(bankLineRef.current, '[!!] Loading snippet bank ... unreachable')
      })
  }, [updateLine])

  // ---------------------------------------------------------------- join/host actions

  const doJoin = useCallback(
    async (code: string, name: string, quiet = false) => {
      if (!connectedRef.current) return fail('no socket link — the server is unreachable right now.')
      const res: any = await playerJoin({ roomCode: code, name, token: lsGet(tokenKey(code)) })
      if (!res?.ok) return fail(`join failed: ${res?.error || 'unknown error'}`)
      roleRef.current = 'player'
      roomCodeRef.current = code
      myNameRef.current = name
      if (res.token) lsSet(tokenKey(code), res.token)
      lsSet(nameKey(code), name)
      phaseKeyRef.current = '' // re-print whatever phase we land in
      playersRef.current = null
      print('out', quiet ? `[OK] seat restored — ${name} in room ${code}` : `[OK] joined room ${code} as ${name}`, 'bright')
    },
    [playerJoin, print, fail]
  )

  const createRoom = useCallback(
    async (opts: CreateOpts) => {
      if (!connectedRef.current) return fail('no socket link — the server is unreachable right now.')
      const res: any = await hostCreate(opts)
      if (!res?.ok) return fail(`could not create the room: ${res?.error || 'unknown error'}`)
      roleRef.current = 'host'
      roomCodeRef.current = res.roomCode
      lsSet(hostKey(res.roomCode), res.hostToken)
      lsSet(HOST_INDEX, res.roomCode)
      ssSet(HOST_TAB, res.roomCode)
      phaseKeyRef.current = ''
      playersRef.current = null
      print('blank')
      print('banner', `ROOM CODE: ${res.roomCode}`, 'bright')
      print('blank')
      if (res.joinUrl) print('out', `players open ${res.joinUrl} and type: join ${res.roomCode} <nickname>`)
      else print('out', `players type: join ${res.roomCode} <nickname>`)
      print('blank')
      print('out', 'Waiting for players to connect...')
    },
    [hostCreate, print, fail]
  )

  // ---------------------------------------------------------------- connection lifecycle

  const prevConnectedRef = useRef<boolean | null>(null)
  useEffect(() => {
    const was = prevConnectedRef.current
    prevConnectedRef.current = connected
    if (connected === was) return // edge-triggered: act only on actual transitions

    if (connected) {
      if (socketLineRef.current != null) updateLine(socketLineRef.current, '[OK] Establishing socket link ... connected')
      if (!everConnectedRef.current) {
        everConnectedRef.current = true
        // Auto-resume ONLY on a reload of the host tab (sessionStorage marker).
        // A fresh tab with host creds in shared localStorage gets a hint instead
        // of silently hijacking the host seat — it might be a player joining.
        const tabRoom = ssGet(HOST_TAB)
        const token = tabRoom ? lsGet(hostKey(tabRoom)) : null
        if (tabRoom && token && roleRef.current === 'none') {
          hostReconnect(tabRoom, token).then((res: any) => {
            if (res?.ok) {
              roleRef.current = 'host'
              roomCodeRef.current = tabRoom
              print('out', `[OK] resumed hosting room ${tabRoom}`, 'bright')
            } else {
              ssRemove(HOST_TAB)
              lsRemove(hostKey(tabRoom))
              lsRemove(HOST_INDEX)
            }
          })
        } else {
          const last = lsGet(HOST_INDEX)
          if (last && lsGet(hostKey(last))) {
            print('out', `[..] host credentials for room ${last} found — type HOST ${last} to reclaim it.`, 'dim')
          }
        }
      } else {
        print('out', '[OK] socket link re-established', 'bright')
        // restore the seat we held before the drop — same join path, per contract
        if (roleRef.current === 'player' && roomCodeRef.current && myNameRef.current) {
          doJoin(roomCodeRef.current, myNameRef.current, true)
        } else if (roleRef.current === 'host' && roomCodeRef.current) {
          const token = lsGet(hostKey(roomCodeRef.current))
          if (token) hostReconnect(roomCodeRef.current, token)
        }
      }
    } else if (everConnectedRef.current) {
      print('out', '[!!] socket link lost — reconnecting...', 'dim')
    }
  }, [connected, hostReconnect, print, updateLine, doJoin])

  // ---------------------------------------------------------------- per-player verdict
  // (declared BEFORE the state effect: the server emits RESULT, then the
  // reveal STATE — this keeps verdict above explanation in the scrollback)

  useEffect(() => {
    if (!result) return
    const out = result.correctOutput
    const multi = out.includes('\n')
    print('blank')
    print('out', divider(), 'dim')
    if (result.correct) {
      print('decrypt', multi ? '✓ CORRECT' : `✓ CORRECT: ${out}`, 'bright')
      if (multi) print('snippet', indentBlock(out))
      print('out', `+${result.points} pts — total ${result.totalScore}${result.rank ? `, rank #${result.rank}` : ''}`)
    } else {
      print('decrypt', result.yourAnswer == null ? '✗ WRONG — no answer locked in' : '✗ WRONG', 'dim')
      if (result.yourAnswer != null) print('out', `you answered: ${result.yourAnswer}`, 'dim')
      print('out', multi ? (result.isError ? 'it raises:' : 'it prints:') : result.isError ? `it raises: ${out}` : `it prints: ${out}`)
      if (multi) print('snippet', indentBlock(out))
    }
    clearResult()
  }, [result, print, clearResult])

  // ---------------------------------------------------------------- authoritative state

  const printQuestion = useCallback(
    (s: GameState) => {
      const q = s.question!
      const role = roleRef.current
      print('blank')
      print('decrypt', roundHeader(s.roundIndex, s.totalRounds, s.timer.durationMs), 'bright')
      print('out', divider(), 'dim')
      print('decrypt', indentBlock(q.code))
      if (q.answerMode === ANSWER_MODE.MCQ && q.options) {
        print('blank')
        print('snippet', optionsBlock(q.options))
      }
      print('out', divider(), 'dim')
      if (role === 'host') {
        answersLineRef.current = print('out', `answers: ${s.counts.answered}/${s.counts.total}`, 'dim')
      } else {
        const ask = q.isError ? 'what happens when this runs?' : 'what does this print?'
        const how = q.answerMode === ANSWER_MODE.MCQ ? 'type a letter to lock in.' : 'type: answer <your guess>'
        print('out', `${ask}  ${how}`, 'dim')
      }
    },
    [print]
  )

  const enterPhase = useCallback(
    (s: GameState) => {
      const role = roleRef.current
      switch (s.phase) {
        case PHASE.QUESTION: {
          answersLineRef.current = null
          lockedLineRef.current = null
          printQuestion(s)
          break
        }
        case PHASE.REVEAL: {
          const r = s.reveal!
          if (role === 'host') {
            print('blank')
            print('out', divider(), 'dim')
            print('decrypt', r.isError ? 'IT RAISES:' : 'IT PRINTS:', 'bright')
            print('snippet', indentBlock(r.output))
            print('out', `${r.correctCount}/${r.answeredCount} answered correct.`)
          }
          if (r.explanation) print('scramble', r.explanation)
          print('out', divider(), 'dim')
          if (role === 'host') print('out', 'type NEXT for standings.', 'bright')
          break
        }
        case PHASE.SCOREBOARD: {
          print('blank')
          print('decrypt', 'STANDINGS', 'bright')
          print('snippet', leaderboardTable(s.leaderboard, myNameRef.current || undefined))
          if (roleRef.current === 'host') {
            const last = s.roundIndex + 1 >= s.totalRounds
            print('out', last ? 'type CONTINUE for the final results.' : `type CONTINUE for round ${s.roundIndex + 2}.`, 'bright')
          }
          break
        }
        case PHASE.PODIUM: {
          print('blank')
          print('banner', 'FINAL RESULTS', 'bright')
          print('blank')
          print('snippet', podiumBlock(s.leaderboard))
          print('blank')
          print('snippet', leaderboardTable(s.leaderboard, myNameRef.current || undefined))
          if (roleRef.current === 'host') print('out', 'type CLOSE to shut the room, or HOST to run another.', 'bright')
          else print('out', 'good game. type JOIN <code> <nick> to play again.', 'dim')
          break
        }
        case PHASE.CLOSED: {
          print('out', 'the room has closed.', 'dim')
          roleRef.current = 'none'
          roomCodeRef.current = ''
          break
        }
      }
    },
    [print, printQuestion]
  )

  useEffect(() => {
    if (!state) return
    stateRef.current = state
    offsetRef.current = state.timer.serverNow - Date.now()
    if (state.room?.code) roomCodeRef.current = state.room.code

    const key = `${state.phase}:${state.roundIndex}`
    if (key !== phaseKeyRef.current) {
      phaseKeyRef.current = key
      enterPhase(state)
    }

    // presence feed while the lobby is open
    if (state.phase === PHASE.LOBBY) {
      const prev = playersRef.current
      const now = new Map(state.players.map((p) => [p.id, { name: p.name, connected: p.connected }]))
      if (prev) {
        for (const [id, p] of now) {
          const was = prev.get(id)
          if (!was) print('out', `  [player] ${p.name} joined`)
          else if (was.connected && !p.connected) print('out', `  [player] ${p.name} disconnected`, 'dim')
          else if (!was.connected && p.connected) print('out', `  [player] ${p.name} reconnected`, 'dim')
        }
        for (const [id, p] of prev) if (!now.has(id)) print('out', `  [player] ${p.name} left`, 'dim')
      }
      playersRef.current = now
    } else {
      playersRef.current = null
    }
  }, [state, enterPhase, print])

  // live answer counts during a question
  useEffect(() => {
    if (!counts || stateRef.current?.phase !== PHASE.QUESTION) return
    if (answersLineRef.current != null) updateLine(answersLineRef.current, `answers: ${counts.answered}/${counts.total}`)
    if (lockedLineRef.current != null) {
      const waiting = counts.total - counts.answered
      updateLine(
        lockedLineRef.current,
        `${lockedBaseRef.current}${waiting > 0 ? `        waiting on ${waiting} more...` : '        everyone is in.'}`
      )
    }
  }, [counts, updateLine])

  // server notices / kicks / room closure
  useEffect(() => {
    if (notice) fail(notice)
  }, [notice, fail])
  useEffect(() => {
    if (!kicked) return
    fail(kicked)
    roleRef.current = 'none'
    roomCodeRef.current = ''
  }, [kicked, fail])
  useEffect(() => {
    if (!roomClosed) return
    if (roleRef.current !== 'none') fail(roomClosed)
    roleRef.current = 'none'
    roomCodeRef.current = ''
  }, [roomClosed, fail])

  // ---------------------------------------------------------------- status line

  useEffect(() => {
    const compose = (): StatusSegments => {
      const s = stateRef.current
      const role = roleRef.current
      const left: string[] = ['GUESS_THE_OUTPUT']
      if (roomCodeRef.current && role !== 'none') {
        left.push(`ROOM ${roomCodeRef.current}`)
        left.push(role === 'host' ? 'HOST' : myNameRef.current)
        if (s && s.phase !== PHASE.CLOSED) {
          left.push(s.phase === PHASE.LOBBY ? `${s.players.filter((p) => p.connected).length} players` : s.phase)
        }
      }
      let right = connectedRef.current ? 'connected' : 'offline'
      let urgent = false
      if (s?.phase === PHASE.QUESTION && s.timer.phaseEndsAt) {
        const remaining = s.timer.phaseEndsAt - (Date.now() + offsetRef.current)
        right = `[${mmss(remaining)}] · ${right}`
        urgent = remaining <= 5500
      }
      return { left: left.join(' · '), right, urgent }
    }
    const tick = () =>
      setStatus((prev) => {
        const next = compose()
        return prev.left === next.left && prev.right === next.right && prev.urgent === next.urgent ? prev : next
      })
    const t = window.setInterval(tick, 500)
    tick()
    return () => clearInterval(t)
  }, [])

  // ---------------------------------------------------------------- answers

  const submitAnswer = useCallback(
    async (value: string) => {
      const s = stateRef.current
      if (roleRef.current === 'host') return fail("the host doesn't answer — you already know the output.")
      if (roleRef.current !== 'player') return fail('join a room first: join <CODE> <nickname>')
      if (!s || s.phase !== PHASE.QUESTION || !s.question) return fail('no round is open.')
      if (submittingRef.current) return

      let text = value
      let display = value
      if (s.question.answerMode === ANSWER_MODE.MCQ) {
        const letter = value.trim().toUpperCase()
        const idx = LETTERS.indexOf(letter as (typeof LETTERS)[number])
        const options = s.question.options || []
        if (idx < 0 || idx >= options.length)
          return fail(`pick a letter A-${LETTERS[options.length - 1]} (answer B, or just B).`)
        text = options[idx]
        display = `${letter} — ${options[idx].split('\n')[0]}`
      }

      submittingRef.current = true
      const res: any = await playerAnswer(text)
      submittingRef.current = false
      if (res?.ok && res.locked) {
        lockedBaseRef.current = `Locked in: ${display}`
        lockedLineRef.current = print('out', lockedBaseRef.current, 'bright')
      } else {
        fail(res?.error || 'could not submit — try again.')
      }
    },
    [playerAnswer, print, fail]
  )

  // ---------------------------------------------------------------- host commands

  const requireHost = useCallback(
    (cmd: string): boolean => {
      if (roleRef.current !== 'host') {
        fail(`${cmd} is a host command — create a room with HOST first.`)
        return false
      }
      return true
    },
    [fail]
  )

  const startWizard = useCallback(() => {
    const { wizard, prompt } = wizardStart(metaRef.current)
    pendingRef.current = { type: 'wizard', wizard }
    print('blank')
    print('scramble', 'room setup — type the number and hit enter. CANCEL (or Ctrl+C) backs out.', 'dim')
    print('blank')
    print('out', prompt)
  }, [print])

  const hostCommand = useCallback(
    (args: string[]) => {
      const s = stateRef.current
      const midGame = s && [PHASE.LOBBY, PHASE.QUESTION, PHASE.REVEAL, PHASE.SCOREBOARD].includes(s.phase as any)
      if (roleRef.current === 'player' && midGame) return fail(`you're seated in room ${roomCodeRef.current} — finish the session first.`)
      if (roleRef.current === 'host' && midGame) return fail(`already hosting room ${roomCodeRef.current} — CLOSE it first.`)
      if (args.length === 0) return startWizard()
      // `host <CODE>` — reclaim a room this device was hosting
      if (args.length === 1 && /^[A-Z0-9]{3,8}$/i.test(args[0])) {
        const code = args[0].toUpperCase()
        const token = lsGet(hostKey(code))
        if (!token) return fail(`no host credentials for room ${code} on this device.`)
        hostReconnect(code, token).then((res: any) => {
          if (res?.ok) {
            roleRef.current = 'host'
            roomCodeRef.current = code
            ssSet(HOST_TAB, code)
            phaseKeyRef.current = ''
            print('out', `[OK] resumed hosting room ${code}`, 'bright')
          } else {
            fail(`could not reclaim room ${code}: ${res?.error || 'room is gone'}`)
            lsRemove(hostKey(code))
          }
        })
        return
      }
      const parsed = parseHostFlags(args)
      if ('error' in parsed) {
        fail(parsed.error)
        print('out', FLAGS_USAGE, 'dim')
        return
      }
      createRoom(parsed.opts)
    },
    [createRoom, startWizard, fail, print, hostReconnect]
  )

  // ---------------------------------------------------------------- animated eggs

  useEffect(
    () => () => {
      if (hackTimerRef.current) clearInterval(hackTimerRef.current)
      if (pingTimerRef.current) clearTimeout(pingTimerRef.current)
      if (glitchTimerRef.current) clearTimeout(glitchTimerRef.current)
    },
    []
  )

  const runHack = useCallback(() => {
    if (hackTimerRef.current) return // one breach at a time
    const bar = (p: number) => `[${'#'.repeat(Math.floor(p / 10)).padEnd(10)}] ${p}%`
    const id = print('out', `[..] breaching mainframe ${bar(0)}`)
    let p = 0
    hackTimerRef.current = window.setInterval(() => {
      p = Math.min(100, p + 4)
      updateLine(id, `[..] breaching mainframe ${bar(p)}`)
      if (p >= 100) {
        if (hackTimerRef.current) clearInterval(hackTimerRef.current)
        hackTimerRef.current = null
        updateLine(id, `[OK] breaching mainframe ${bar(100)}`)
        print('out', 'ACCESS GRANTED', 'bright')
        print('out', '(nothing was harmed. this terminal only ever hacks itself.)', 'dim')
      }
    }, 90)
  }, [print, updateLine])

  const runPing = useCallback(
    (host: string) => {
      if (pingTimerRef.current != null) return // one echo request at a time
      const target = host || 'python.org'
      print('out', `PING ${target} (127.0.0.1): 56 data bytes`)
      let seq = 0
      const send = () => {
        if (seq < 4) {
          const t = (12 + Math.random() * 18).toFixed(1)
          print('out', `64 bytes from 127.0.0.1: icmp_seq=${seq} ttl=64 time=${t} ms`)
          seq++
          pingTimerRef.current = window.setTimeout(send, 420)
        } else {
          print('out', `--- ${target} ping statistics ---`)
          print('out', '4 packets transmitted, 4 received, 0.0% packet loss (none of them left this room)', 'dim')
          pingTimerRef.current = null
        }
      }
      pingTimerRef.current = window.setTimeout(send, 300)
    },
    [print]
  )

  // ---------------------------------------------------------------- shell plumbing

  const handleInterrupt = useCallback(() => {
    print('echo', '^C', 'dim')
    if (pendingRef.current) {
      pendingRef.current = null
      print('out', 'cancelled.', 'dim')
    }
  }, [print])

  /** Tab-completion candidates for the token being typed. */
  const getCompletions = useCallback((tokens: string[]): string[] => {
    if (tokens.length <= 1) return COMMAND_NAMES
    const cmd = tokens[0].toLowerCase()
    if (cmd === 'cat') return [...Object.keys(FAKE_FILES), ...Object.keys(HIDDEN_FILES)]
    if (cmd === 'man' || cmd === 'help') return COMMAND_NAMES
    if (cmd === 'host') return HOST_FLAG_STUBS
    if (cmd === 'kick') return (stateRef.current?.players ?? []).map((p) => p.name)
    return []
  }, [])

  const handlePending = useCallback(
    (raw: string) => {
      const pending = pendingRef.current!
      if (raw.toLowerCase() === 'cancel') {
        pendingRef.current = null
        print('out', 'cancelled.', 'dim')
        return
      }
      if (pending.type === 'nick') {
        const name = raw.slice(0, 24)
        pendingRef.current = null
        doJoin(pending.code, name)
        return
      }
      const res = wizardInput(pending.wizard, raw)
      if (res.error) {
        print('out', `[!!] ${res.error}`, 'dim')
        return
      }
      if (res.done) {
        pendingRef.current = null
        createRoom(res.done)
        return
      }
      print('blank')
      print('out', res.prompt!)
    },
    [print, doJoin, createRoom]
  )

  const printMan = useCallback(
    (name: string) => {
      const entry = MAN[name.toLowerCase()]
      if (!entry) return fail(`no manual entry for ${name}`)
      print('out', `NAME\n  ${name.toLowerCase()} — ${entry.summary}\n\nUSAGE\n  ${entry.usage}\n\n${entry.man}`)
    },
    [print, fail]
  )

  // ---------------------------------------------------------------- input

  const handleInput = useCallback(
    (raw: string) => {
      print('echo', `> ${raw}`)
      const trimmed = raw.trim()
      if (!trimmed) return

      if (pendingRef.current) return handlePending(trimmed)
      commandLogRef.current.push(trimmed)

      const [word, ...args] = trimmed.split(/\s+/)
      const rest = trimmed.slice(word.length).trim()
      let cmd = word.toLowerCase()
      if (cmd === 'h' || cmd === '?') cmd = 'help'
      if (cmd === 'cls') cmd = 'clear'
      if (cmd === 'who') cmd = 'players'
      if (cmd === 'python3' || cmd === 'py') cmd = 'python'
      if (cmd === 'vi') cmd = 'vim'

      // MCQ shortcut: a bare letter during an open round IS the answer (DESIGN.md)
      const s = stateRef.current
      if (
        /^[a-f]$/i.test(trimmed) &&
        roleRef.current === 'player' &&
        s?.phase === PHASE.QUESTION &&
        s.question?.answerMode === ANSWER_MODE.MCQ
      ) {
        submitAnswer(trimmed)
        return
      }

      switch (cmd) {
        // ---- terminal ----
        case 'help':
          if (rest) printMan(rest)
          else print('out', HELP_TEXT)
          break
        case 'man':
          if (!rest) fail('usage: man <command>  (try: man man)')
          else printMan(rest)
          break
        case 'clear':
          clear()
          break
        case 'history': {
          const log = commandLogRef.current
          if (!log.length) print('out', 'history: nothing yet. make some.', 'dim')
          else print('out', log.map((c, i) => `  ${String(i + 1).padStart(3)}  ${c}`).join('\n'))
          break
        }
        case 'echo':
          print('out', rest)
          break
        case 'date':
          print('out', new Date().toString())
          break
        case 'uptime': {
          const up = bootTimeRef.current ? hhmmss(Date.now() - bootTimeRef.current) : '00:00:00'
          print('out', `up ${up}, 1 user, load average: 0.87, 0.61, 0.13 (the last two are guesses. fitting.)`)
          break
        }
        case 'uname':
          print('out', args[0] === '-a' ? 'GTOS crt-terminal 1.0.0 #1 SMP PREEMPT phosphor-green x86_64 GNU/Guessing' : 'GTOS')
          break
        case 'pwd':
          print('out', roleRef.current === 'host' ? '/home/host/projector' : '/home/player/hot_seat')
          break
        case 'id':
          print(
            'out',
            roleRef.current === 'host'
              ? 'uid=1000(host) gid=1000(quizmasters) groups=1000(quizmasters),27(sudo-denied)'
              : 'uid=1001(player) gid=1001(guessers) groups=1001(guessers)'
          )
          break
        case 'version':
          print('out', 'GUESS_THE_OUTPUT v1.0.0 — terminal remake, phosphor edition')
          break
        case 'neofetch': {
          const up = bootTimeRef.current ? hhmmss(Date.now() - bootTimeRef.current) : '00:00:00'
          print(
            'snippet',
            neofetch({
              user: roleRef.current === 'host' ? 'host' : myNameRef.current || 'player',
              uptime: up,
              snippets: metaRef.current?.total ?? 175,
              room: roomCodeRef.current || 'none (yet)',
              cols: `${window.innerWidth}x${window.innerHeight}`,
            })
          )
          break
        }
        case 'fortune':
          print('scramble', FORTUNES[Math.floor(Math.random() * FORTUNES.length)])
          break
        case 'cowsay':
          print('snippet', cowsay(rest))
          break
        case 'ping':
          runPing(args[0] || '')
          break
        case 'top':
          print('snippet', TOP_TABLE)
          break
        case 'reboot':
          clear()
          pulseGlitch(1800)
          runBoot()
          break

        // ---- game ----
        case 'host':
          hostCommand(args)
          break
        case 'join': {
          if (roleRef.current === 'host') return void fail('you are hosting — a host screen cannot also play.')
          const code = (args[0] || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
          if (!code) return void fail('usage: join <CODE> [nickname]')
          const nick = args.slice(1).join(' ').slice(0, 24)
          if (!nick) {
            pendingRef.current = { type: 'nick', code }
            print('out', 'nickname?', 'bright')
            return
          }
          doJoin(code, nick)
          break
        }
        case 'answer':
          if (!rest) return void fail('usage: answer <value>')
          submitAnswer(rest)
          break
        case 'question':
          if (!s || s.phase !== PHASE.QUESTION || !s.question) return void fail('no round is open.')
          printQuestion(s)
          break
        case 'leaderboard': {
          if (!s || roleRef.current === 'none') return void fail('no room yet — HOST one or JOIN one.')
          if (!s.leaderboard.length) return void fail('no scores yet.')
          print('snippet', leaderboardTable(s.leaderboard, myNameRef.current || undefined))
          break
        }
        case 'players': {
          if (!s || roleRef.current === 'none') return void fail('no room yet — HOST one or JOIN one.')
          if (!s.players.length) return void fail('nobody here yet.')
          const rows = s.players.map((p) => {
            const answered = s.phase === PHASE.QUESTION ? (p.answered ? '✓ answered' : '· thinking') : ''
            const conn = p.connected ? '' : '  [offline]'
            const you = p.name === myNameRef.current ? ' ← you' : ''
            return `  ${p.name.padEnd(18)} ${String(p.score).padStart(5)} pts  ${answered}${conn}${you}`
          })
          print('snippet', `PLAYERS (${s.players.length})\n${rows.join('\n')}`)
          break
        }
        case 'score': {
          if (!s || roleRef.current === 'none') return void fail('no room yet — HOST one or JOIN one.')
          if (roleRef.current === 'host') {
            print('out', `room ${s.room.code}: round ${Math.max(1, s.roundIndex + 1)}/${s.totalRounds}, ${s.players.length} players seated.`)
            return
          }
          const me = s.leaderboard.find((r) => r.name === myNameRef.current)
          if (!me) return void fail('no score yet — answer something first.')
          print('out', `${me.score} pts — rank #${me.rank} of ${s.leaderboard.length}`, 'bright')
          break
        }
        case 'topics': {
          const meta = metaRef.current
          if (!meta) return void fail('snippet bank unreachable right now.')
          const rows = meta.topics.map((t) => `  ${t.topic.padEnd(18)} ${String(t.count).padStart(3)} snippets`)
          print('snippet', `TOPICS (${meta.topics.length})\n${rows.join('\n')}`)
          break
        }
        case 'rules':
          print('out', RULES)
          break
        case 'room': {
          if (!s || roleRef.current === 'none') return void fail('no room yet — HOST one or JOIN one.')
          const r = s.room
          print(
            'out',
            `ROOM ${r.code}\n  mode: ${r.mode} · rounds: ${r.totalRounds} · answers: ${s.question?.answerMode ?? 'text/mcq'}\n  tier: ${r.content} · difficulty: ${r.difficulty} · topic: ${r.topic}\n  team mode: ${r.teamMode ? 'on' : 'off'} · players: ${s.players.length}`
          )
          break
        }
        case 'start':
          if (!requireHost('start')) return
          if (s?.phase !== PHASE.LOBBY) return void fail('the session is already running.')
          if (!s.players.length) return void fail('no players yet — wait for at least one join.')
          hostStart()
          break
        case 'reveal':
          if (!requireHost('reveal')) return
          if (s?.phase !== PHASE.QUESTION) return void fail('no round is open.')
          hostReveal()
          break
        case 'next':
          if (!requireHost('next')) return
          if (s?.phase !== PHASE.REVEAL) return void fail('nothing to advance — NEXT follows a reveal.')
          hostNext()
          break
        case 'continue':
          if (!requireHost('continue')) return
          if (s?.phase !== PHASE.SCOREBOARD) return void fail('CONTINUE works from the standings screen.')
          hostContinue()
          break
        case 'skip':
          if (!requireHost('skip')) return
          if (s?.phase !== PHASE.QUESTION) return void fail('no round is open.')
          hostSkip()
          print('out', 'round skipped — no scoring.', 'dim')
          break
        case 'kick': {
          if (!requireHost('kick')) return
          if (!rest) return void fail('usage: kick <name>')
          const target = s?.players.find((p) => p.name.toLowerCase() === rest.toLowerCase())
          if (!target) return void fail(`no player named "${rest}".`)
          hostKick(target.id)
          print('out', `kicked ${target.name}.`, 'dim')
          break
        }
        case 'close':
          if (!requireHost('close')) return
          hostClose()
          lsRemove(hostKey(roomCodeRef.current))
          lsRemove(HOST_INDEX)
          ssRemove(HOST_TAB)
          roleRef.current = 'none'
          roomCodeRef.current = ''
          print('out', 'room closed.', 'dim')
          break

        // ---- easter eggs ----
        case 'whoami':
          print('banner', WHOAMI)
          break
        case 'sudo':
          print('out', 'Permission denied: nice try. root is reserved for people who already know the output.')
          break
        case 'ls': {
          const all = args.includes('-a') || args.includes('-la') || args.includes('-al')
          const names = [...(all ? Object.keys(HIDDEN_FILES) : []), ...Object.keys(FAKE_FILES)].sort((a, b) =>
            a.localeCompare(b)
          )
          print('out', names.join('  '))
          break
        }
        case 'cat': {
          const name = args[0]
          if (!name) print('out', 'cat: missing operand')
          else if (FAKE_FILES[name]) print('out', FAKE_FILES[name])
          else if (HIDDEN_FILES[name]) print('out', HIDDEN_FILES[name], 'bright')
          else print('out', `cat: ${name}: No such file or directory`)
          break
        }
        case 'rm':
          print('out', 'rm: cannot remove anything: read-only filesystem (museum pieces do not delete)')
          break
        case 'vim':
          print('out', 'vim: you would never leave. for your own safety, request denied.')
          break
        case 'nano':
          print('out', 'nano: too mainstream for this machine.')
          break
        case 'emacs':
          print('out', "emacs: that's an operating system, not a command. we only have room for one.")
          break
        case 'python':
          print('out', '>>> import this')
          print('out', 'this terminal reads Python. it does not run it — that is YOUR job.', 'dim')
          print('out', '(the Zen is rationed. try FORTUNE.)', 'dim')
          break
        case 'shutdown':
          print('out', 'shutdown: and give the host the satisfaction? no.')
          break
        case 'matrix':
          print('out', 'wake up, neo...', 'bright')
          if (prefersReducedMotion()) {
            print('out', 'the matrix respects your reduced-motion settings. very considerate of it.', 'dim')
          } else {
            pulseGlitch(6000)
          }
          break
        case 'hack':
          runHack()
          break
        case 'credits':
          print('banner', CREDITS)
          break
        case 'exit':
          print('out', "nice try. you can't leave the investigation.")
          break
        default:
          print('out', `command not found: ${trimmed}`)
          print('out', '(try HELP — or TAB, it completes things.)', 'dim')
      }
    },
    [
      print,
      clear,
      fail,
      handlePending,
      hostCommand,
      doJoin,
      submitAnswer,
      requireHost,
      runHack,
      runPing,
      runBoot,
      pulseGlitch,
      printMan,
      printQuestion,
      hostStart,
      hostReveal,
      hostNext,
      hostContinue,
      hostSkip,
      hostKick,
      hostClose,
    ]
  )

  return { lines, status, handleInput, handleInterrupt, clearScreen: clear, getCompletions, glitchOn }
}
