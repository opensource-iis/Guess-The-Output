import LetterGlitch from './letter-glitch'

/**
 * One consistent backdrop for every screen (mounted once in App). A very subtle code-glitch
 * layer + a soft top wash + a bottom fade — so the background reads the same on the landing,
 * host, and player pages instead of each screen doing its own thing.
 */
export default function AppBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.09]">
        <LetterGlitch glitchSpeed={72} outerVignette smooth />
      </div>
      {/* faint green wash up top to seat the content */}
      <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_-12%,hsl(var(--primary)/0.05),transparent_60%)]" />
      {/* fade to solid at the bottom so footers/controls sit cleanly */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}
