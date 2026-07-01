import { useRef, useState } from 'react'
import { highlightPython } from '@/lib/highlight'
import { Button } from '@/components/ui/button'
import TiltedCard from '@/components/ui/tilted-card'

// The signature: a real, correct, slightly tricky snippet (the mutable-default gotcha —
// prints "1 2 3", not "1 1 1"). The hero ends in a blinking >>> where the answer would go.
const HERO = `def counter(start=[]):
    start.append(1)
    return len(start)

print(counter(), counter(), counter())`

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
        {/* Live badge with a real pulsing dot */}
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-primary">Live</span>
          <span className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">· Python</span>
        </div>

        {/* SIGNATURE — the snippet is the hero, not a headline over noise */}
        <section className="animate-title-in">
          <div className="overflow-x-auto rounded-xl border border-border bg-[#0c0a09] px-5 py-5 shadow-sm sm:px-6 sm:py-6">
            <pre
              className="font-mono text-[15px] leading-relaxed text-foreground sm:text-lg"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
            <div className="mt-2 font-mono text-[15px] text-muted-foreground sm:text-lg">
              &gt;&gt;&gt; <span className="animate-blink text-primary">▋</span>
            </div>
          </div>
          <p className="mt-3 font-display text-sm text-muted-foreground">// read it — what does it print?</p>
        </section>

        {/* RESOLUTION — the game name + actions sit below the signature */}
        <section>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Guess the <span className="text-primary">Output</span>
          </h1>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            {/* HOST — the dominant action (violet host emphasis), 3D tilt card */}
            <TiltedCard className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-7" rotateAmplitude={9}>
              <span className="absolute inset-x-0 top-0 h-0.5 bg-keyword/70" aria-hidden="true" />
              <div className="flex h-full flex-col">
                <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-keyword">Host</span>
                <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Run the room</h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Pick the topics and difficulty, then put a room code on the projector for the class to join.
                </p>
                <Button size="lg" onClick={() => go('/host')} className="mt-6">
                  Host game
                </Button>
              </div>
            </TiltedCard>

            {/* JOIN — compact, one-thumb (amber join emphasis), 3D tilt card */}
            <TiltedCard className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-7" rotateAmplitude={9}>
              <span className="absolute inset-x-0 top-0 h-0.5 bg-string/70" aria-hidden="true" />
              <form onSubmit={handleJoin} className="flex h-full flex-col" noValidate>
              <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-string">Join</span>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">On your phone</h2>

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
            </TiltedCard>
          </div>
        </section>
      </div>
    </main>
  )
}
