import { useEffect, useMemo, useState } from 'react'
import { MODE, CONTENT, DIFFICULTY, ANSWER_MODE, DEFAULTS } from '@/lib/protocol'
import type { BankMeta } from '@/lib/protocol'
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

/* A compact labelled control (mono uppercase legend + control). */
function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <span className="mb-1.5 block font-display text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  )
}

/* Segmented control — border-2 + fill on selected so it reads from across a room. */
function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-md border-2 px-2 py-2 font-display text-sm font-semibold transition-colors ${
              active
                ? 'border-primary bg-primary/15 text-foreground'
                : 'border-border bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* Ordinal difficulty — a stepped control (Any -> Easy -> Medium -> Tricky), not four equal pills. */
const DIFF_STEPS = [
  { value: DIFFICULTY.ALL, label: 'Any' },
  { value: DIFFICULTY.EASY, label: 'Easy' },
  { value: DIFFICULTY.MEDIUM, label: 'Medium' },
  { value: DIFFICULTY.TRICKY, label: 'Tricky' },
]
function DifficultyStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const idx = Math.max(0, DIFF_STEPS.findIndex((s) => s.value === value))
  const pct = DIFF_STEPS.length > 1 ? (idx / (DIFF_STEPS.length - 1)) * 100 : 0
  return (
    <div className="relative pt-0.5">
      <div className="absolute left-2 right-2 top-[10px] h-0.5 bg-border" aria-hidden="true" />
      <div className="absolute left-2 top-[10px] h-0.5 bg-primary" style={{ width: `calc(${pct}% - ${pct === 0 ? 0 : 8}px)` }} aria-hidden="true" />
      <div className="relative flex justify-between">
        {DIFF_STEPS.map((s, i) => {
          const on = i <= idx
          const current = i === idx
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange(s.value)}
              className="group flex flex-col items-center gap-1.5"
            >
              <span
                className={`h-[18px] w-[18px] rounded-full border-2 transition-colors ${
                  on ? 'border-primary bg-primary' : 'border-border bg-card group-hover:border-primary/50'
                }`}
              />
              <span className={`font-display text-xs ${current ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* Team-mode switch (checkbox-driven). */
function TeamToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border-2 border-border bg-background/40 px-3 py-2 transition-colors hover:border-primary/40">
      <span className="font-display text-sm font-semibold text-foreground">{value ? 'Teams' : 'Solo'}</span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          aria-label="Team mode"
          className="peer sr-only"
        />
        <span className="pointer-events-none absolute inset-0 rounded-full bg-secondary transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card" />
        <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

function clampInt(v: string | number, lo: number, hi: number, fallback: number): number {
  let n = typeof v === 'number' ? v : parseInt(v, 10)
  if (isNaN(n)) n = fallback
  return Math.max(lo, Math.min(hi, n))
}

/**
 * SETUP — a two-tier control panel. Tier 1 (topic list + live snippet-match counter + Host game)
 * is the real content decision and gets full weight. Tier 2 collapses the five smaller settings
 * into one dense strip. Everything sized/contrasted to read from across a projected room.
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

  const topics = useMemo(() => {
    const rows = [{ value: 'all', label: 'All topics', count: meta?.total ?? null }]
    if (meta) for (const t of meta.topics) rows.push({ value: t.topic, label: t.topic, count: t.count })
    return rows
  }, [meta])

  const topicItems = useMemo(
    () => topics.map((t) => (t.count != null ? `${t.label} (${t.count})` : t.label)),
    [topics],
  )
  const topicValues = useMemo(() => topics.map((t) => t.value), [topics])

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
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-6">
      <header className="animate-title-in mb-5">
        <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-keyword">Host control panel</span>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Host a game</h1>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-4"
      >
        {/* TIER 1 — topic + live counter + Host game */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          {/* Topic list — real scroll, fade at the bottom edge, strong selected signal */}
          <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-5">
            <span className="mb-2 block font-display text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Topic
            </span>
            <AnimatedList
              key={topicItems.length}
              items={topicItems}
              initialSelectedIndex={Math.max(0, topicValues.indexOf(topic))}
              onItemSelect={(_item, index) => setTopic(topicValues[index] ?? 'all')}
              showGradients
              displayScrollbar={false}
              enableArrowNavigation={false}
              maxHeight="300px"
            />
          </div>

          {/* Live counter + the decisive action */}
          <div className="flex flex-col gap-4">
            <div className={`flex flex-1 flex-col justify-center rounded-xl border-2 bg-card px-6 py-5 ${noMatches ? 'border-destructive/50' : 'border-primary/30'}`}>
              <div className={`font-display text-6xl font-bold tabular leading-none sm:text-7xl ${noMatches ? 'text-destructive' : 'text-primary'}`}>
                {matchCount ?? '—'}
              </div>
              <div className="mt-2 font-display text-sm uppercase tracking-[0.12em] text-muted-foreground">
                {noMatches ? 'no snippets match — loosen the filters' : 'snippets match your filters'}
              </div>
            </div>
            <Button type="submit" size="lg" disabled={!canHost} className="w-full">
              Host game
            </Button>
          </div>
        </div>

        {/* TIER 2 — dense settings strip */}
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Session">
              <Seg
                value={mode}
                onChange={setMode}
                options={[
                  { value: MODE.QUICK, label: 'Quick' },
                  { value: MODE.FULL, label: 'Full' },
                ]}
              />
            </Field>
            <Field label="Content">
              <Seg
                value={content}
                onChange={setContent}
                options={[
                  { value: CONTENT.ALL, label: 'All' },
                  { value: CONTENT.CORE, label: 'Core' },
                  { value: CONTENT.LIBRARY, label: 'Lib' },
                ]}
              />
            </Field>
            <Field label="Answer">
              <Seg
                value={answerMode}
                onChange={setAnswerMode}
                options={[
                  { value: ANSWER_MODE.TEXT, label: 'Type' },
                  { value: ANSWER_MODE.MCQ, label: 'Choose' },
                ]}
              />
            </Field>
            <Field label="Mode">
              <TeamToggle value={teamMode} onChange={setTeamMode} />
            </Field>
            <div className="sm:col-span-2 lg:col-span-2">
              <Field label="Difficulty">
                <DifficultyStepper value={difficulty} onChange={setDifficulty} />
              </Field>
            </div>

            {mode === MODE.FULL && (
              <>
                <Field label="Rounds">
                  <input
                    type="number"
                    aria-label="Rounds"
                    min={1}
                    max={Math.max(1, matchCount ?? 1)}
                    value={roundCount}
                    onChange={(e) => setRoundCount(clampInt(e.target.value, 1, Math.max(1, matchCount ?? 1), 10))}
                    className="h-11 w-full rounded-md border-2 border-border bg-background/40 px-3 font-display text-base text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </Field>
                <Field label="Timer (s)">
                  <input
                    type="number"
                    aria-label="Timer in seconds"
                    min={DEFAULTS.MIN_TIMER}
                    max={DEFAULTS.MAX_TIMER}
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(clampInt(e.target.value, DEFAULTS.MIN_TIMER, DEFAULTS.MAX_TIMER, DEFAULTS.FULL_TIMER))}
                    className="h-11 w-full rounded-md border-2 border-border bg-background/40 px-3 font-display text-base text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </Field>
              </>
            )}
          </div>
        </div>

        {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
        {!connected && <p className="text-center text-sm text-muted-foreground">Connecting to the server…</p>}
      </form>
    </div>
  )
}
