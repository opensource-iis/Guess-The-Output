import { useEffect, useMemo, useState } from 'react'
import { MODE, CONTENT, DIFFICULTY, ANSWER_MODE, DEFAULTS } from '@/lib/protocol'
import type { BankMeta } from '@/lib/protocol'
import {
  Timer,
  Layers,
  Gauge,
  Sliders,
  ListChecks,
  Users,
  Tags,
  Hash,
  Clock,
  Rocket,
  Check,
  Database,
} from 'lucide-react'
import DecryptedText from '@/components/ui/decrypted-text'
import AnimatedList from '@/components/ui/animated-list'
import { Button } from './ui'

export interface CreateOpts {
  mode: string
  content: string
  difficulty: string
  topic: string
  answerMode: string
  teamMode: boolean
  roundCount?: number
  timerSeconds?: number
}

/* A labelled control group: small lucide icon + uppercase legend, then its control. */
function Group({
  icon: Icon,
  label,
  children,
}: Readonly<{
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}>) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4 text-primary/80" />
        {label}
      </legend>
      {children}
    </fieldset>
  )
}

/* A segmented control (radio group) with crisp green selected states + a check. */
function SegGroup<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; desc?: string }[]
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value
        return (
          <label
            key={o.value}
            className={`relative min-w-0 flex-1 basis-[4.75rem] cursor-pointer rounded-xl border px-3 py-2.5 text-center transition-all duration-150 ${
              active
                ? 'border-primary/60 bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]'
                : 'border-border bg-secondary/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={active}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className="block truncate text-sm font-semibold">{o.label}</span>
            {o.desc && <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">{o.desc}</span>}
            {active && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-primary" />}
          </label>
        )
      })}
    </div>
  )
}

function clampInt(v: string | number, lo: number, hi: number, fallback: number): number {
  let n = typeof v === 'number' ? v : parseInt(v, 10)
  if (isNaN(n)) n = fallback
  return Math.max(lo, Math.min(hi, n))
}

/**
 * SETUP view (no room yet): a premium one-screen game-setup control panel. The live "N snippets
 * match" count and the topic picker stay in sync with the bank via GET /api/meta, counting
 * meta.tags against the chosen filters exactly like host.js does.
 */
export default function SetupView({
  connected,
  error,
  busy,
  onCreate,
}: {
  connected: boolean
  error: string | null
  busy: boolean
  onCreate: (opts: CreateOpts) => void
}) {
  const [mode, setMode] = useState<string>(MODE.QUICK)
  const [content, setContent] = useState<string>(CONTENT.ALL)
  const [difficulty, setDifficulty] = useState<string>(DIFFICULTY.ALL)
  const [answerMode, setAnswerMode] = useState<string>(ANSWER_MODE.TEXT)
  const [teamMode, setTeamMode] = useState(false)
  const [topic, setTopic] = useState<string>('all')
  const [roundCount, setRoundCount] = useState<number>(10)
  const [timerSeconds, setTimerSeconds] = useState<number>(DEFAULTS.FULL_TIMER)
  const [meta, setMeta] = useState<BankMeta | null>(null)

  // Fetch the snippet-bank metadata once; filters still work offline (count just hides).
  useEffect(() => {
    let alive = true
    fetch('/api/meta')
      .then((r) => r.json())
      .then((m: BankMeta) => {
        if (alive && m && m.tags) setMeta(m)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // Topic list for the AnimatedList: "All topics" first, then "topic (count)".
  const topicItems = useMemo(() => {
    const items = ['All topics']
    if (meta) for (const t of meta.topics) items.push(`${t.topic} (${t.count})`)
    return items
  }, [meta])

  const topicValues = useMemo(() => {
    const vals = ['all']
    if (meta) for (const t of meta.topics) vals.push(t.topic)
    return vals
  }, [meta])

  // Live count: tags matching the current content/difficulty/topic filters.
  const matchCount = useMemo(() => {
    if (!meta || !meta.tags) return null
    let n = 0
    for (const t of meta.tags) {
      if (content !== 'all' && t.tier !== content) continue
      if (difficulty !== 'all' && t.difficulty !== difficulty) continue
      if (topic !== 'all' && t.topic !== topic) continue
      n++
    }
    return n
  }, [meta, content, difficulty, topic])

  const noMatches = matchCount === 0
  const canHost = connected && !busy && !noMatches

  const selectedTopicIndex = Math.max(0, topicValues.indexOf(topic))

  const submit = () => {
    if (!canHost) return
    const opts: CreateOpts = { mode, content, difficulty, topic, answerMode, teamMode }
    if (mode === MODE.FULL) {
      const maxRounds = Math.max(1, matchCount ?? 1)
      opts.roundCount = clampInt(roundCount, 1, maxRounds, Math.min(10, maxRounds))
      opts.timerSeconds = clampInt(timerSeconds, DEFAULTS.MIN_TIMER, DEFAULTS.MAX_TIMER, DEFAULTS.FULL_TIMER)
    }
    onCreate(opts)
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6">
      {/* Heading */}
      <header className="mb-6 text-center">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sliders className="h-3.5 w-3.5" />
          Host control panel
        </span>
        <h1 className="animate-title-in text-3xl font-extrabold tracking-tight sm:text-4xl">
          <DecryptedText
            text="Host a game"
            animateOn="view"
            sequential
            revealDirection="center"
            speed={95}
            className="text-foreground"
            encryptedClassName="text-primary/50"
          />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tune the round, then put this screen on the projector.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="grid flex-1 items-start gap-5 lg:grid-cols-[1.55fr_1fr]"
      >
        {/* Left column: the choices */}
        <div className="grid gap-5 rounded-2xl border border-border bg-card p-5 transition-shadow duration-150 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.12)] sm:grid-cols-2">
          <Group icon={Timer} label="Session length">
            <SegGroup
              name="mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: MODE.QUICK, label: 'Quick', desc: '5 rounds · 45s' },
                { value: MODE.FULL, label: 'Full', desc: 'Set rounds & timer' },
              ]}
            />
          </Group>

          <Group icon={Layers} label="Content">
            <SegGroup
              name="content"
              value={content}
              onChange={setContent}
              options={[
                { value: CONTENT.ALL, label: 'All' },
                { value: CONTENT.CORE, label: 'Core' },
                { value: CONTENT.LIBRARY, label: 'Library' },
              ]}
            />
          </Group>

          <Group icon={Gauge} label="Difficulty">
            <SegGroup
              name="difficulty"
              value={difficulty}
              onChange={setDifficulty}
              options={[
                { value: DIFFICULTY.ALL, label: 'Any' },
                { value: DIFFICULTY.EASY, label: 'Easy' },
                { value: DIFFICULTY.MEDIUM, label: 'Medium' },
                { value: DIFFICULTY.TRICKY, label: 'Tricky' },
              ]}
            />
          </Group>

          <Group icon={ListChecks} label="Answer mode">
            <SegGroup
              name="answerMode"
              value={answerMode}
              onChange={setAnswerMode}
              options={[
                { value: ANSWER_MODE.TEXT, label: 'Type it', desc: 'Type the output' },
                { value: ANSWER_MODE.MCQ, label: 'Choices', desc: 'Pick one of four' },
              ]}
            />
          </Group>

          {/* Team mode toggle — spans both columns */}
          <div className="sm:col-span-2">
            <Group icon={Users} label="Team mode">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-secondary/40 px-4 py-2.5 transition-colors duration-150 hover:border-primary/30">
                <span className="text-xs text-muted-foreground">Players join as teams, not individuals</span>
                <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={teamMode}
                    onChange={(e) => setTeamMode(e.target.checked)}
                    aria-label="Team mode"
                    className="peer sr-only"
                  />
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-secondary transition-colors duration-150 peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card" />
                  <span className="pointer-events-none absolute left-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 peer-checked:translate-x-5" />
                </span>
              </label>
            </Group>
          </div>

          {/* Full-session extras — spans both columns */}
          {mode === MODE.FULL && (
            <div className="grid grid-cols-2 gap-4 sm:col-span-2">
              <Group icon={Hash} label="Rounds">
                <input
                  id="roundCount"
                  aria-label="Rounds"
                  type="number"
                  min={1}
                  max={Math.max(1, matchCount ?? 1)}
                  step={1}
                  inputMode="numeric"
                  value={roundCount}
                  onChange={(e) => setRoundCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-foreground transition-colors focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Group>
              <Group icon={Clock} label="Seconds / question">
                <input
                  id="timerSeconds"
                  aria-label="Seconds per question"
                  type="number"
                  min={DEFAULTS.MIN_TIMER}
                  max={DEFAULTS.MAX_TIMER}
                  step={5}
                  inputMode="numeric"
                  value={timerSeconds}
                  onChange={(e) => setTimerSeconds(parseInt(e.target.value, 10) || DEFAULTS.FULL_TIMER)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-foreground transition-colors focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Group>
            </div>
          )}
        </div>

        {/* Right column: topic picker + count + host CTA */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 transition-shadow duration-150 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Tags className="h-4 w-4 text-primary/80" />
              Topic
            </p>
            <AnimatedList
              key={topicValues.length}
              items={topicItems}
              initialSelectedIndex={selectedTopicIndex}
              enableArrowNavigation={false}
              maxHeight="220px"
              onItemSelect={(_item, index) => setTopic(topicValues[index] ?? 'all')}
            />
            {!meta && <p className="mt-2 text-xs text-muted-foreground">Loading topics…</p>}
          </div>

          {/* Live match readout */}
          <div
            className={`flex items-center gap-3 rounded-2xl border px-5 py-4 transition-colors duration-150 ${
              noMatches ? 'border-destructive/40 bg-destructive/10' : 'border-primary/30 bg-primary/[0.07]'
            }`}
            aria-live="polite"
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                noMatches ? 'border-destructive/40 text-destructive' : 'border-primary/40 text-primary'
              }`}
            >
              <Database className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <span
                className={`block font-mono text-2xl font-bold tabular-nums ${
                  noMatches ? 'text-destructive' : 'text-primary'
                }`}
              >
                {matchCount == null ? '—' : matchCount}
              </span>
              <span className="block text-xs text-muted-foreground">
                {matchCount === 1 ? 'snippet matches your filters' : 'snippets match your filters'}
              </span>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={!canHost} className="w-full gap-2">
            <Rocket className="h-5 w-5" />
            {busy ? 'Creating room…' : 'Host game'}
          </Button>
        </div>
      </form>
    </div>
  )
}
