import { ANSWER_MODE, CONTENT, DEFAULTS, DIFFICULTY, MODE } from '../lib/protocol'
import type { BankMeta } from '../lib/protocol'

/**
 * Host room setup, both entrances (DESIGN.md): a one-line flag form for
 * confident users, and a numbered wizard — one setting per prompt — for
 * everyone else. Pure logic; the controller does the printing.
 */

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

const TIERS = Object.values(CONTENT) as string[]
const DIFFS = Object.values(DIFFICULTY) as string[]

export const FLAGS_USAGE = `host flags:
  --mode=quick|full      --rounds=N (full only)    --timer=SECONDS (full only)
  --answers=text|mcq     --tier=all|core|library   --difficulty=all|easy|medium|tricky
  --topic=NAME           --team=on|off`

// ---------------------------------------------------------------- flags

export function parseHostFlags(args: string[]): { opts: CreateOpts } | { error: string } {
  const opts: CreateOpts = {
    mode: MODE.QUICK,
    content: CONTENT.ALL,
    difficulty: DIFFICULTY.ALL,
    topic: 'all',
    answerMode: ANSWER_MODE.TEXT,
    teamMode: false,
  }
  let rounds: number | undefined
  let timer: number | undefined

  for (const arg of args) {
    const m = /^--([a-z]+)=(.+)$/.exec(arg)
    if (!m) return { error: `unrecognized argument: ${arg}` }
    const [, key, val] = m
    const v = val.toLowerCase()
    switch (key) {
      case 'mode':
        if (v !== MODE.QUICK && v !== MODE.FULL) return { error: `--mode must be quick or full, not "${val}"` }
        opts.mode = v
        break
      case 'rounds': {
        const n = parseInt(v, 10)
        if (!Number.isInteger(n) || n < 1) return { error: `--rounds must be a positive number, not "${val}"` }
        rounds = n
        break
      }
      case 'timer': {
        const n = parseInt(v, 10)
        if (!Number.isInteger(n) || n < DEFAULTS.MIN_TIMER || n > DEFAULTS.MAX_TIMER)
          return { error: `--timer must be ${DEFAULTS.MIN_TIMER}-${DEFAULTS.MAX_TIMER} seconds, not "${val}"` }
        timer = n
        break
      }
      case 'answers':
        if (v !== ANSWER_MODE.TEXT && v !== ANSWER_MODE.MCQ) return { error: `--answers must be text or mcq, not "${val}"` }
        opts.answerMode = v
        break
      case 'tier':
        if (!TIERS.includes(v)) return { error: `--tier must be one of ${TIERS.join('|')}, not "${val}"` }
        opts.content = v
        break
      case 'difficulty':
        if (!DIFFS.includes(v)) return { error: `--difficulty must be one of ${DIFFS.join('|')}, not "${val}"` }
        opts.difficulty = v
        break
      case 'topic':
        opts.topic = v
        break
      case 'team':
        if (v !== 'on' && v !== 'off' && v !== 'true' && v !== 'false')
          return { error: `--team must be on or off, not "${val}"` }
        opts.teamMode = v === 'on' || v === 'true'
        break
      default:
        return { error: `unknown flag: --${key}` }
    }
  }

  if (opts.mode === MODE.FULL) {
    opts.roundCount = rounds ?? 10
    opts.timerSeconds = timer ?? DEFAULTS.FULL_TIMER
  } else if (rounds !== undefined || timer !== undefined) {
    return { error: 'quick opener is fixed at 5 rounds / 45s — --rounds and --timer need --mode=full' }
  }
  return { opts }
}

// ---------------------------------------------------------------- wizard

interface ChoiceStep {
  key: keyof CreateOpts
  title: string
  choices: { label: string; value: string | boolean }[]
  skip?: (opts: CreateOpts) => boolean
}
interface NumberStep {
  key: 'roundCount' | 'timerSeconds'
  title: string
  min: number
  max: number
  hint: string
  skip?: (opts: CreateOpts) => boolean
}
type Step = ChoiceStep | NumberStep

export interface Wizard {
  steps: Step[]
  index: number
  opts: CreateOpts
}

function buildSteps(meta: BankMeta | null): Step[] {
  const topics = meta?.topics ?? []
  return [
    {
      key: 'mode',
      title: 'MODE',
      choices: [
        { label: `Quick opener — ${DEFAULTS.QUICK_ROUNDS} rounds, ${DEFAULTS.QUICK_TIMER}s each`, value: MODE.QUICK },
        { label: 'Full session — you choose', value: MODE.FULL },
      ],
    },
    {
      key: 'roundCount',
      title: 'ROUNDS',
      min: 1,
      max: 50,
      hint: 'how many rounds?',
      skip: (o) => o.mode !== MODE.FULL,
    },
    {
      key: 'answerMode',
      title: 'ANSWERS',
      choices: [
        { label: 'Type it — players type the exact output', value: ANSWER_MODE.TEXT },
        { label: 'Multiple choice — pick A/B/C/D', value: ANSWER_MODE.MCQ },
      ],
    },
    {
      key: 'content',
      title: 'CONTENT TIER',
      choices: [
        { label: 'All — the whole bank', value: CONTENT.ALL },
        { label: 'Core — language fundamentals only', value: CONTENT.CORE },
        { label: 'Library — stdlib behavior', value: CONTENT.LIBRARY },
      ],
    },
    {
      key: 'difficulty',
      title: 'DIFFICULTY',
      choices: [
        { label: 'All', value: DIFFICULTY.ALL },
        { label: 'Easy', value: DIFFICULTY.EASY },
        { label: 'Medium', value: DIFFICULTY.MEDIUM },
        { label: 'Tricky', value: DIFFICULTY.TRICKY },
      ],
    },
    {
      key: 'topic',
      title: 'TOPIC',
      choices: [
        { label: 'All topics', value: 'all' },
        ...topics.map((t) => ({ label: `${t.topic} (${t.count})`, value: t.topic })),
      ],
    },
    {
      key: 'timerSeconds',
      title: 'TIMER',
      min: DEFAULTS.MIN_TIMER,
      max: DEFAULTS.MAX_TIMER,
      hint: 'seconds per round?',
      skip: (o) => o.mode !== MODE.FULL,
    },
    {
      key: 'teamMode',
      title: 'TEAM MODE',
      choices: [
        { label: 'Off — every player for themselves', value: false },
        { label: 'On — scores pool into teams', value: true },
      ],
    },
  ]
}

function stepPrompt(step: Step): string {
  if ('choices' in step) {
    const rows = step.choices.map((c, i) => `  [${i + 1}] ${c.label}`)
    return `${step.title}\n${rows.join('\n')}`
  }
  return `${step.title}\n  ${step.hint} (${step.min}-${step.max})`
}

function advance(w: Wizard): { prompt: string } | { done: CreateOpts } {
  while (w.index < w.steps.length && w.steps[w.index].skip?.(w.opts)) w.index++
  if (w.index >= w.steps.length) return { done: w.opts }
  return { prompt: stepPrompt(w.steps[w.index]) }
}

export function wizardStart(meta: BankMeta | null): { wizard: Wizard; prompt: string } {
  const wizard: Wizard = {
    steps: buildSteps(meta),
    index: 0,
    opts: {
      mode: MODE.QUICK,
      content: CONTENT.ALL,
      difficulty: DIFFICULTY.ALL,
      topic: 'all',
      answerMode: ANSWER_MODE.TEXT,
      teamMode: false,
    },
  }
  const first = advance(wizard)
  if ('done' in first) throw new Error('wizard has no steps') // impossible: mode never skips
  return { wizard, prompt: first.prompt }
}

/** Feed one line of user input to the wizard. */
export function wizardInput(w: Wizard, raw: string): { prompt?: string; error?: string; done?: CreateOpts } {
  const step = w.steps[w.index]
  const input = raw.trim()
  const n = parseInt(input, 10)

  if ('choices' in step) {
    if (!Number.isInteger(n) || n < 1 || n > step.choices.length)
      return { error: `type a number 1-${step.choices.length}` }
    ;(w.opts as any)[step.key] = step.choices[n - 1].value
  } else {
    if (!Number.isInteger(n) || n < step.min || n > step.max) return { error: `type a number ${step.min}-${step.max}` }
    w.opts[step.key] = n
  }
  w.index++
  return advance(w)
}
