import { useEffect, useRef, useState } from 'react'

const R = 54
const CIRC = 2 * Math.PI * R

interface TimerInfo {
  phaseEndsAt: number | null
  durationMs: number
  serverNow: number
}

/**
 * Skew-correct local countdown driven by state.timer (ported from host.js startTimer/tickTimer).
 * remaining = phaseEndsAt - (now + clockOffset); the arc shrinks as time runs down and turns
 * red in the last 10 seconds. The server auto-reveals at zero, so this view just rests at 0.
 */
export default function TimerRing({ timer }: { timer: TimerInfo | null | undefined }) {
  const [frac, setFrac] = useState(1)
  const [secs, setSecs] = useState<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const stop = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (!timer || timer.phaseEndsAt == null) {
      stop()
      setFrac(1)
      setSecs(null)
      return stop
    }

    const clockOffset = (timer.serverNow || Date.now()) - Date.now()
    const phaseEndsAt = timer.phaseEndsAt
    let durationMs = timer.durationMs || phaseEndsAt - (timer.serverNow || Date.now())
    if (durationMs <= 0) durationMs = 1

    const tick = () => {
      const remaining = Math.max(0, phaseEndsAt - (Date.now() + clockOffset))
      let f = durationMs > 0 ? remaining / durationMs : 0
      if (f < 0) f = 0
      if (f > 1) f = 1
      setFrac(f)
      setSecs(Math.ceil(remaining / 1000))
      if (remaining <= 0) {
        stop()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return stop
  }, [timer?.phaseEndsAt, timer?.durationMs, timer?.serverNow])

  const remainingMs = (secs ?? 0) * 1000
  const warn = secs != null && remainingMs <= 10000
  const offset = CIRC * (1 - frac)

  return (
    <div className="relative grid place-items-center" aria-hidden="true">
      <svg viewBox="0 0 120 120" className="h-24 w-24 sm:h-28 sm:w-28">
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="8" className="stroke-secondary" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          className={warn ? 'stroke-destructive' : 'stroke-primary'}
          style={{
            strokeDasharray: `${CIRC} ${CIRC}`,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 120ms linear, stroke 200ms ease',
          }}
        />
      </svg>
      <span
        role="timer"
        aria-live="off"
        className={`absolute font-mono text-3xl font-bold tabular-nums sm:text-4xl ${
          warn ? 'text-destructive' : 'text-foreground'
        }`}
      >
        {secs == null ? '—' : secs}
      </span>
    </div>
  )
}
