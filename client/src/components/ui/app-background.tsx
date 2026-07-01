/**
 * One consistent backdrop for every screen (mounted once in App). A near-invisible dot grid
 * for depth + a soft warm vignette — deliberately quiet. (Replaces the digital-rain texture,
 * which was generic "coding site" shorthand unrelated to this product.)
 */
export default function AppBackground() {
  return (
    <div aria-hidden="true" className="dot-grid pointer-events-none fixed inset-0 -z-10">
      {/* warm vignette from the top to seat the content */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_110%_at_50%_-10%,hsl(24_18%_9%/0.7),transparent_55%)]" />
      {/* fade to solid at the bottom so controls sit cleanly */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}
