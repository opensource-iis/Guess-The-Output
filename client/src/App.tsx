import AppBackground from './components/ui/app-background'
import Landing from './screens/Landing'
import Host from './screens/Host'
import Player from './screens/Player'

// Simple path-based routing. The Express server serves index.html for these paths (SPA fallback),
// and screens navigate with full-page links (window.location), so reading pathname on load is enough.
// AppBackground is mounted once here so the backdrop is identical on every screen.
export default function App() {
  const path = window.location.pathname
  const screen = path.startsWith('/host') ? <Host /> : path.startsWith('/player') ? <Player /> : <Landing />
  return (
    <>
      <AppBackground />
      {screen}
    </>
  )
}
