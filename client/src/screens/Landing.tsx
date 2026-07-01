import { useRef, useState } from 'react'
import { highlightPython } from '@/lib/highlight'
import { Button } from '@/components/ui/button'
import TiltedCard from '@/components/ui/tilted-card'
import BorderGlow from '@/components/ui/border-glow'
import DecryptedText from '@/components/ui/decrypted-text'
import ScrambledText from '@/components/ui/scrambled-text'

// The signature: a real, correct, slightly tricky snippet (the mutable-default gotcha —
// prints "1 2 3", not "1 1 1"). The hero ends in a blinking >>> where the answer would go.
const HERO = `def counter(start=[]):
    start.append(1)
    return len(start)

print(counter(), counter(), counter())`

// The hero snippet actually prints "1 2 3" — the default list is shared across the calls.
const HERO_OUTPUT = '1 2 3'
const normOut = (s: string) => s.trim().replace(/\s+/g, ' ')

const CODE_LEN = 4

function cleanChar(v: string): string {
  return (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1)
}
function cleanCode(v: string): string {
  return (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN)
}
function go(href: string) {
  window.location.href = href
}

export default function Landing() {
  const [chars, setChars] = useState<string[]>(Array(CODE_LEN).fill(''))
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const boxRefs = useRef<(HTMLInputElement | null)[]>([])
  const code = chars.join('')

  // Interactive demo — the visitor predicts the output right on the landing.
  const [guess, setGuess] = useState('')
  const [checked, setChecked] = useState<null | 'correct' | 'wrong'>(null)
  function submitGuess(e: React.FormEvent) {
    e.preventDefault()
    setChecked(normOut(guess) === normOut(HERO_OUTPUT) ? 'correct' : 'wrong')
  }
  function resetGuess() {
    setGuess('')
    setChecked(null)
  }

  function setChar(i: number, raw: string) {
    const c = cleanChar(raw)
    setChars((prev) => {
      const next = [...prev]
      next[i] = c
      return next
    })
    if (error) setError('')
    if (c && i < CODE_LEN - 1) boxRefs.current[i + 1]?.focus()
  }
  function onBoxKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !chars[i] && i > 0) boxRefs.current[i - 1]?.focus()
  }
  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = cleanCode(e.clipboardData.getData('text'))
    if (!pasted) return
    e.preventDefault()
    const next = Array(CODE_LEN).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setChars(next)
    boxRefs.current[Math.min(pasted.length, CODE_LEN - 1)]?.focus()
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const c = cleanCode(code)
    const n = name.trim()
    if (c.length < CODE_LEN) {
      setError('Enter the 4-character room code.')
      boxRefs.current[c.length]?.focus()
      return
    }
    if (!n) {
      setError('Add a name so the host can see you.')
      return
    }
    setError('')
    go(`/player?code=${encodeURIComponent(c)}&name=${encodeURIComponent(n)}`)
  }

  const highlighted = highlightPython(HERO)

  return (
    <main className="relative min-h-full">
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center gap-9 px-5 py-12 sm:py-16">
        {/* SIGNATURE — the snippet is the hero, not a headline over noise */}
        <section className="animate-title-in">
          <div className="overflow-x-auto rounded-xl border border-border bg-[#0c0a09] px-5 py-5 shadow-sm sm:px-6 sm:py-6">
            <pre
              className="font-mono text-[15px] leading-relaxed text-foreground sm:text-lg"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
            {checked === null ? (
              <form onSubmit={submitGuess} className="mt-2 flex items-center gap-2 font-mono text-[15px] sm:text-lg">
                <span className="shrink-0 text-muted-foreground">&gt;&gt;&gt;</span>
                <input
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="type the output…"
                  aria-label="Predict the output"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 bg-transparent font-mono text-foreground caret-primary outline-none placeholder:text-muted-foreground/40"
                />
                <button type="submit" className="shrink-0 font-display text-xs uppercase tracking-wide text-primary hover:underline">
                  check
                </button>
              </form>
            ) : (
              <div className="mt-2 font-mono text-[15px] sm:text-lg">
                <div>
                  <span className="text-muted-foreground">&gt;&gt;&gt;</span>{' '}
                  <span className="text-foreground">{guess.trim() || '(nothing)'}</span>
                </div>
                {checked === 'correct' ? (
                  <p className="mt-1 text-primary">✓ nice — it prints <span className="font-bold">1 2 3</span></p>
                ) : (
                  <p className="mt-1 text-destructive">
                    ✗ not quite — it prints <span className="font-bold text-foreground">1 2 3</span> (the default list is shared)
                  </p>
                )}
                <button
                  type="button"
                  onClick={resetGuess}
                  className="mt-1 font-display text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                  try again
                </button>
              </div>
            )}
          </div>
          <p className="mt-3 font-display text-sm text-muted-foreground">// predict the output — then press check</p>
        </section>

        {/* RESOLUTION — the game name + actions sit below the signature */}
        <section>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            <DecryptedText
              text="Guess the "
              animateOn="view"
              sequential
              revealDirection="center"
              speed={70}
              className="text-foreground"
              encryptedClassName="text-primary/40"
            />
            <DecryptedText
              text="Output"
              animateOn="view"
              sequential
              revealDirection="center"
              speed={70}
              className="text-primary"
              encryptedClassName="text-primary/40"
            />
          </h1>
          <ScrambledText className="mt-2 text-sm text-muted-foreground sm:text-base" radius={80} duration={1} speed={0.4}>
            Read the Python. Predict exactly what it prints.
          </ScrambledText>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            {/* HOST — dominant action; the card you liked, now with tilt + BorderGlow */}
            <TiltedCard className="h-full rounded-xl" rotateAmplitude={8}>
              <BorderGlow
                className="h-full"
                backgroundColor="#19171A"
                borderRadius={12}
                glowColor="146 65 55"
                colors={['#3ecf7e', '#4ade80', '#22c55e']}
                edgeSensitivity={38}
                glowIntensity={0.65}
                coneSpread={34}
              >
                <span className="h-0.5 w-full shrink-0 bg-primary/70" aria-hidden="true" />
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-primary">Host</span>
                  <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Run the room</h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Pick the topics and difficulty, then put a room code on the projector for the class to join.
                  </p>
                  <Button size="lg" onClick={() => go('/host')} className="mt-6">
                    Host game
                  </Button>
                </div>
              </BorderGlow>
            </TiltedCard>

            {/* JOIN — compact; same card, now with tilt + BorderGlow */}
            <TiltedCard className="h-full rounded-xl" rotateAmplitude={8}>
              <BorderGlow
                className="h-full"
                backgroundColor="#19171A"
                borderRadius={12}
                glowColor="146 65 55"
                colors={['#3ecf7e', '#4ade80', '#22c55e']}
                edgeSensitivity={38}
                glowIntensity={0.65}
                coneSpread={34}
              >
                <span className="h-0.5 w-full shrink-0 bg-primary/70" aria-hidden="true" />
                <form onSubmit={handleJoin} className="flex flex-1 flex-col p-6 sm:p-7" noValidate>
              <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-primary">Join</span>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Jump in</h2>

              <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">Code</label>
                  <div className="flex gap-2" onPaste={onPaste}>
                    {chars.map((ch, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          boxRefs.current[i] = el
                        }}
                        value={ch}
                        onChange={(e) => setChar(i, e.target.value)}
                        onKeyDown={(e) => onBoxKeyDown(i, e)}
                        inputMode="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={1}
                        aria-label={`Room code character ${i + 1}`}
                        className="h-14 w-11 rounded-lg border border-input bg-background text-center font-display text-2xl font-bold uppercase text-foreground caret-primary transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      />
                    ))}
                  </div>
                </div>
                <div className="min-w-[8rem] flex-1">
                  <label htmlFor="join-name" className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                    Name
                  </label>
                  <input
                    id="join-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder="Ada"
                    maxLength={24}
                    autoComplete="off"
                    className="h-14 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
              </div>

              <p className="mt-2 min-h-[1.25rem] text-sm text-destructive" role="alert" aria-live="polite">
                {error}
              </p>

              <Button type="submit" variant="neutral" className="mt-auto w-full">
                Join
              </Button>
                </form>
              </BorderGlow>
            </TiltedCard>
          </div>
        </section>
      </div>
    </main>
  )
}
