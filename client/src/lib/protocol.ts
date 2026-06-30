// Mirrors public/js/protocol.js — the host<->player socket contract — as typed TS for the client.

export const PHASE = {
  LOBBY: 'lobby',
  QUESTION: 'question',
  REVEAL: 'reveal',
  SCOREBOARD: 'scoreboard',
  PODIUM: 'podium',
  CLOSED: 'closed',
} as const

export const EV = {
  HOST_CREATE: 'host:create',
  HOST_RECONNECT: 'host:reconnect',
  HOST_START: 'host:start',
  HOST_REVEAL: 'host:reveal',
  HOST_NEXT: 'host:next',
  HOST_CONTINUE: 'host:continue',
  HOST_SKIP: 'host:skip',
  HOST_KICK: 'host:kick',
  HOST_CLOSE: 'host:close',
  PLAYER_JOIN: 'player:join',
  PLAYER_ANSWER: 'player:answer',
  PLAYER_LEAVE: 'player:leave',
  STATE: 'state',
  COUNTS: 'counts',
  RESULT: 'result',
  KICKED: 'kicked',
  ROOM_CLOSED: 'roomClosed',
  ERROR: 'errorMsg',
} as const

export const MODE = { QUICK: 'quick', FULL: 'full' } as const
export const CONTENT = { ALL: 'all', CORE: 'core', LIBRARY: 'library' } as const
export const DIFFICULTY = { ALL: 'all', EASY: 'easy', MEDIUM: 'medium', TRICKY: 'tricky' } as const
export const ANSWER_MODE = { TEXT: 'text', MCQ: 'mcq' } as const
export const POINTS = { MAX: 1000, MIN: 500 } as const
export const DEFAULTS = {
  QUICK_ROUNDS: 5,
  QUICK_TIMER: 45,
  FULL_TIMER: 60,
  MIN_TIMER: 10,
  MAX_TIMER: 300,
  MAX_PLAYERS: 50,
} as const

export type Phase = (typeof PHASE)[keyof typeof PHASE]
export type AnswerMode = (typeof ANSWER_MODE)[keyof typeof ANSWER_MODE]

export interface Avatar {
  e: number
  c: number
}

export interface PlayerView {
  id: string
  name: string
  score: number
  connected: boolean
  answered: boolean
  avatar: Avatar | null
}

export interface LeaderRow {
  id: string
  name: string
  score: number
  connected: boolean
  avatar: Avatar | null
  rank: number
  prevRank: number | null
  delta: number
}

export interface QuestionView {
  id: number
  tier: string
  difficulty: string
  code: string
  isError: boolean
  answerMode: AnswerMode
  options?: string[]
}

export interface RevealView {
  output: string
  explanation: string
  isError: boolean
  correctCount: number
  answeredCount: number
}

export interface GameState {
  phase: Phase
  joinUrl: string | null
  room: {
    code: string
    mode: string
    teamMode: boolean
    content: string
    difficulty: string
    topic: string
    totalRounds: number
  }
  roundIndex: number
  totalRounds: number
  question: QuestionView | null
  reveal: RevealView | null
  timer: { phaseEndsAt: number | null; durationMs: number; serverNow: number }
  counts: { answered: number; total: number }
  players: PlayerView[]
  leaderboard: LeaderRow[]
}

export interface ResultView {
  correct: boolean
  points: number
  totalScore: number
  rank: number | null
  yourAnswer: string | null
  correctOutput: string
  isError: boolean
}

export interface BankMeta {
  total: number
  topics: { topic: string; count: number }[]
  tiers: string[]
  difficulties: string[]
  tags: { tier: string; difficulty: string; topic: string }[]
}
