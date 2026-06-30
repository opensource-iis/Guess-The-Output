import { useEffect, useRef } from 'react'

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  size: number
  color: string
}

const COLORS = ['#22c55e', '#4ade80', '#86efac', '#eab308', '#38bdf8', '#f0883e']

/**
 * A self-contained one-shot confetti burst on mount (the React stand-in for the vanilla
 * GTOConfetti.burst at podium entry). Pointer-events off; respects reduced-motion.
 */
export default function Confetti({ count = 160, duration = 3200 }: { count?: number; duration?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const W = canvas.offsetWidth
    const pieces: Piece[] = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: -20 - Math.random() * canvas.offsetHeight * 0.5,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 2 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      size: 5 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }))

    let raf = 0
    const start = performance.now()
    const frame = (now: number) => {
      const t = now - start
      const H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)
      for (const p of pieces) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.03
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(0, 1 - t / duration)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      }
      if (t < duration) raf = requestAnimationFrame(frame)
      else ctx.clearRect(0, 0, W, H)
    }
    raf = requestAnimationFrame(frame)

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [count, duration])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 h-full w-full" />
}
