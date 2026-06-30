import { useState } from 'react'
import { Gamepad2, LogIn, ArrowRight, Terminal } from 'lucide-react'
import DecryptedText from '@/components/ui/decrypted-text'
import ScrambledText from '@/components/ui/scrambled-text'
import TiltedCard from '@/components/ui/tilted-card'
import { Button } from '@/components/ui/button'

// Match the player client's code normalization (public/js/player.js sanitizeCode):
// uppercase, A-Z0-9 only, max 4 chars.
function sanitizeCode(v: string): string {
  return (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
}

function go(href: string) {
  window.location.href = href
}

export default function Landing() {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const c = sanitizeCode(code)
    const n = name.trim()
    if (!c) {
      setError('Enter the room code.')
      return
    }
    if (!n) {
      setError('Enter a name so the host can see you.')
      return
    }
    setError('')
    go(`/player?code=${encodeURIComponent(c)}&name=${encodeURIComponent(n)}`)
  }

  return (
    <main className="relative min-h-full">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center px-5 py-12 sm:py-16">
        {/* Hero */}
        <header className="w-full max-w-3xl text-center">
          {/* Eyebrow */}
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <Terminal className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Live Python output-prediction</span>
          </div>

          <h1 className="animate-title-in mt-6 text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
            <DecryptedText
              text="Guess the "
              animateOn="view"
              sequential
              revealDirection="center"
              speed={95}
              className="text-foreground"
              encryptedClassName="text-muted-foreground/40"
            />
            <DecryptedText
              text="Output"
              animateOn="view"
              sequential
              revealDirection="center"
              speed={95}
              className="text-primary"
              encryptedClassName="text-primary/30"
            />
          </h1>

          <ScrambledText className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Read the Python. Predict exactly what it prints.
          </ScrambledText>
        </header>

        {/* Action cards */}
        <section className="mt-10 grid w-full max-w-3xl gap-5 sm:mt-12 sm:grid-cols-2">
          {/* Host a game */}
          <TiltedCard className="group rounded-2xl border border-border bg-card p-6 shadow-sm ring-1 ring-inset ring-white/[0.02] transition-colors duration-200 hover:border-primary/40 sm:p-7">
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 transition-colors duration-200 group-hover:bg-primary/15"
                  aria-hidden="true"
                >
                  <Gamepad2 className="h-5 w-5" />
                </span>
                <h2 className="text-xl font-bold text-foreground">Host a game</h2>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                Spin up a room, pick the topics and difficulty, and put a code on the big screen.
              </p>
              <Button type="button" onClick={() => go('/host')} className="mt-6 w-full">
                Host a game
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
                  aria-hidden="true"
                />
              </Button>
            </div>
          </TiltedCard>

          {/* Join a game */}
          <TiltedCard className="group rounded-2xl border border-border bg-card p-6 shadow-sm ring-1 ring-inset ring-white/[0.02] transition-colors duration-200 hover:border-primary/40 sm:p-7">
            <form onSubmit={handleJoin} className="flex h-full flex-col" noValidate>
            <div className="flex items-center gap-3">
              <span
                className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 transition-colors duration-200 group-hover:bg-primary/15"
                aria-hidden="true"
              >
                <LogIn className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-bold text-foreground">Join a game</h2>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="join-code"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Room code
                </label>
                <input
                  id="join-code"
                  name="code"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="ABCD"
                  maxLength={4}
                  value={code}
                  onChange={(e) => {
                    setCode(sanitizeCode(e.target.value))
                    if (error) setError('')
                  }}
                  aria-invalid={Boolean(error && !sanitizeCode(code))}
                  className="h-12 w-full rounded-xl border border-input bg-background px-4 text-center font-mono text-2xl font-bold uppercase tracking-[0.4em] text-foreground placeholder:tracking-[0.4em] placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label
                  htmlFor="join-name"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Your name
                </label>
                <input
                  id="join-name"
                  name="name"
                  autoComplete="off"
                  placeholder="e.g. Ada"
                  maxLength={24}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (error) setError('')
                  }}
                  className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <p
              className="mt-2 min-h-[1.25rem] text-sm text-destructive"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>

            <Button type="submit" variant="neutral" className="mt-auto w-full">
              Join game
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
                aria-hidden="true"
              />
            </Button>
            </form>
          </TiltedCard>
        </section>

        <footer className="mt-10 text-center text-xs text-muted-foreground/70">
          Python output-prediction, live and multiplayer.
        </footer>
      </div>
    </main>
  )
}
