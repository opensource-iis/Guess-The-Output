import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { EV, GameState, ResultView } from '@/lib/protocol'

/**
 * The single realtime hook for both host and player. Connects to the same-origin Socket.IO
 * server (Vite proxies /socket.io to :3000 in dev; Express serves it in prod), tracks the
 * authoritative GameState, and exposes promise-based emitters for every host/player action.
 */
export function useGame() {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [state, setState] = useState<GameState | null>(null)
  const [counts, setCounts] = useState<{ answered: number; total: number } | null>(null)
  const [result, setResult] = useState<ResultView | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [kicked, setKicked] = useState<string | null>(null)
  const [roomClosed, setRoomClosed] = useState<string | null>(null)

  useEffect(() => {
    const socket = io({ autoConnect: true })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on(EV.STATE, (s: GameState) => {
      setState(s)
      if (s && s.counts) setCounts(s.counts)
    })
    socket.on(EV.COUNTS, (c: { answered: number; total: number }) => setCounts(c))
    socket.on(EV.RESULT, (r: ResultView) => setResult(r))
    socket.on(EV.ERROR, (e: { message?: string }) => setNotice((e && e.message) || 'Something went wrong.'))
    socket.on(EV.KICKED, (e: { message?: string }) => setKicked((e && e.message) || 'You were removed.'))
    socket.on(EV.ROOM_CLOSED, (e: { message?: string }) => setRoomClosed((e && e.message) || 'The room closed.'))

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [])

  // emit with an ack, wrapped in a promise (resolves with the server's callback payload)
  const emitAck = useCallback(<T = any>(event: string, payload?: any): Promise<T> => {
    return new Promise((resolve) => {
      const s = socketRef.current
      if (!s) return resolve({ ok: false, error: 'Not connected.' } as unknown as T)
      let done = false
      const to = setTimeout(() => {
        if (!done) resolve({ ok: false, error: 'Server did not respond.' } as unknown as T)
      }, 5000)
      s.emit(event, payload, (res: T) => {
        done = true
        clearTimeout(to)
        resolve(res)
      })
    })
  }, [])

  const emit = useCallback((event: string, payload?: any) => {
    socketRef.current?.emit(event, payload)
  }, [])

  // ---- host actions ----
  const hostCreate = useCallback((opts: any) => emitAck<any>(EV.HOST_CREATE, { ...opts, origin: window.location.origin }), [emitAck])
  const hostReconnect = useCallback((roomCode: string, hostToken: string) => emitAck<any>(EV.HOST_RECONNECT, { roomCode, hostToken }), [emitAck])
  const hostStart = useCallback(() => emit(EV.HOST_START), [emit])
  const hostReveal = useCallback(() => emit(EV.HOST_REVEAL), [emit])
  const hostNext = useCallback(() => emit(EV.HOST_NEXT), [emit])
  const hostContinue = useCallback(() => emit(EV.HOST_CONTINUE), [emit])
  const hostSkip = useCallback(() => emit(EV.HOST_SKIP), [emit])
  const hostKick = useCallback((playerId: string) => emit(EV.HOST_KICK, { playerId }), [emit])
  const hostClose = useCallback(() => emit(EV.HOST_CLOSE), [emit])

  // ---- player actions ----
  const playerJoin = useCallback((opts: any) => emitAck<any>(EV.PLAYER_JOIN, opts), [emitAck])
  const playerAnswer = useCallback((text: string) => emitAck<any>(EV.PLAYER_ANSWER, { text }), [emitAck])

  const clearResult = useCallback(() => setResult(null), [])

  return {
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
  }
}
