import { memo, useEffect, useState } from 'react'
import FaultyTerminal from './components/FaultyTerminal'
import LetterGlitch from './components/ui/letter-glitch'
import { Terminal } from './terminal/Terminal'
import { useTerminalGame } from './game/useTerminalGame'
import { useReducedMotion } from './lib/motion'

// The terminal IS the app — one full-viewport shell, no routes, no other UI.
// It renders inside a CRT monitor: bezel, curved glass, scanlines, phosphor.
//
// Exactly two background effects, never simultaneous (DESIGN.md):
// FaultyTerminal is THE persistent background, mounted once here; LetterGlitch
// appears only for the boot handoff, `matrix`, and `reboot`.
const GLITCH_COLORS = ['#29cb32', '#32aa48', '#8ce992']
const GRID_MUL: [number, number] = [2, 1]

// Memoized with primitive-only props (gridMul pinned to a module constant):
// every printed line re-renders App, and FaultyTerminal rebuilds its whole
// WebGL context when any effect dependency changes identity — that teardown
// was the white flash after each command.
const CrtBackground = memo(function CrtBackground({ reduced }: Readonly<{ reduced: boolean }>) {
  return (
    <div className="absolute inset-0" aria-hidden>
      <FaultyTerminal
        tint="#87ed7a"
        scale={3}
        gridMul={GRID_MUL}
        digitSize={0.8}
        noiseAmp={0.5}
        scanlineIntensity={0.7}
        curvature={0.15}
        mouseStrength={0.12}
        mouseReact={!reduced}
        brightness={0.24}
        timeScale={reduced ? 0 : 1}
        pause={reduced}
        glitchAmount={reduced ? 0 : 1}
        flickerAmount={reduced ? 0 : 1}
        pageLoadAnimation={false}
      />
    </div>
  )
})

export default function App() {
  const { lines, status, handleInput, handleInterrupt, clearScreen, getCompletions, glitchOn } = useTerminalGame()
  const reduced = useReducedMotion()
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), reduced ? 0 : 2200)
    return () => clearTimeout(t)
  }, [reduced])

  const glitching = !reduced && (booting || glitchOn)

  return (
    <div className="crt-room">
      <div className="crt-monitor">
        <div className="crt-screen">
          <CrtBackground reduced={reduced} />
          <div className="relative z-10 h-full">
            <Terminal
              lines={lines}
              status={status}
              onSubmit={handleInput}
              onInterrupt={handleInterrupt}
              onClearScreen={clearScreen}
              getCompletions={getCompletions}
            />
          </div>
          <div className="crt-overlay" aria-hidden />
          {glitching && (
            <div className="absolute inset-0 z-30 bg-term-bg" aria-hidden>
              <LetterGlitch glitchColors={GLITCH_COLORS} glitchSpeed={65} outerVignette centerVignette={false} smooth />
            </div>
          )}
        </div>
        <div className="crt-chin" aria-hidden>
          <span className="crt-brand font-flavor">IIS DSO · TECH CORNER · CRT-1985</span>
          <span className="crt-led" />
        </div>
      </div>
    </div>
  )
}
