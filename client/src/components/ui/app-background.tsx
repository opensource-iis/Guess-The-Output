import LetterGlitch from './letter-glitch'

/**
 * One consistent backdrop for every screen (mounted once in App). The React-Bits LetterGlitch
 * "digital rain", tinted to the green palette and kept subtle, over a warm vignette.
 */
export default function AppBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.12]">
        <LetterGlitch glitchSpeed={72} smooth outerVignette={false} glitchColors={['#16341f', '#3ecf7e', '#4ade80']} />
      </div>
      {/* warm vignette from the top to seat the content */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_110%_at_50%_-10%,hsl(24_18%_9%/0.65),transparent_55%)]" />
      {/* fade to solid at the bottom so controls sit cleanly */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}
