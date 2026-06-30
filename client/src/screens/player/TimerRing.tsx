import { useEffect, useRef, useState } from 'react'
import type { GameState } from '@/lib/protocol'

const R = 20
const CIRC = 2 * Math.PI * R

/**
 * A circular countdown derived from state.timer (phaseEndsAt - serverNow). The only
 * client timing job: estimate server time via an offset and tick down locally with
 * requestAnimationFrame, which survives clock skew + reconnect. Turns amber in the
 * last 10s and red in the last 5s.
 */
export default function TimerRing({ timer }: { timer: GameState['timer'] | undefined }) {
  const [remainMs, setRemainMs] = useState<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const endsAt = timer?.phaseEndsAt ?? null
  const durationMs = timer?.durationMs ?? 0
  const serverNow = timer?.serverNow ?? null

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (!endsAt || !durationMs) {
      setRemainMs(null)
      return
    }
    const offset = (serverNow ?? Date.now()) - Date.now()
    const tick = () => {
      const now = Date.now() + offset
      const remain = Math.max(0, endsAt - now)
      setRemainMs(remain)
      if (remain > 0) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [endsAt, durationMs, serverNow])

  if (remainMs == null || !durationMs) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border text-muted-foreground">
        <span className="font-mono text-lg">--</span>
      </div>
    )
  }

  const secs = Math.ceil(remainMs / 1000)
  const frac = Math.max(0, Math.min(1, remainMs / durationMs))
  const warn = remainMs <= 10000 && remainMs > 0
  const danger = remainMs <= 5000 && remainMs > 0
  const stroke = danger ? 'hsl(var(--destructive))' : warn ? '#eab308' : 'hsl(var(--primary))'
  const numColor = danger ? 'text-destructive' : warn ? 'text-amber-400' : 'text-foreground'

  return (
    <div className="relative h-16 w-16" aria-label={`${secs} seconds remaining`}>
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
        <circle cx="24" cy="24" r={R} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - frac)}
          style={{ transition: 'stroke 200ms linear' }}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-mono text-xl font-bold tabular-nums ${numColor}`}>
        {secs}
      </div>
    </div>
  )
}
