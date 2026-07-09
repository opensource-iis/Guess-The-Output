import type { LeaderRow } from '../lib/protocol'

/** Text-shaping helpers for the terminal — pure functions, no game state. */

export const WIDTH = 57
export const divider = () => '─'.repeat(WIDTH)

export function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** `ROUND 1 / 5` left, `[00:45]` right, on one rule-width line. */
export function roundHeader(index: number, total: number, durationMs: number): string {
  const left = `ROUND ${index + 1} / ${total}`
  const right = `[${mmss(durationMs)}]`
  return left.padEnd(WIDTH - right.length) + right
}

export function indentBlock(text: string, pad = '  '): string {
  return text
    .split('\n')
    .map((l) => pad + l)
    .join('\n')
}

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

/** MCQ options as an indented, whitespace-safe block. */
export function optionsBlock(options: string[]): string {
  return options
    .map((opt, i) => {
      const tag = `  [${LETTERS[i]}] `
      const lines = opt.split('\n')
      return tag + lines.join('\n' + ' '.repeat(tag.length))
    })
    .join('\n')
}

function clip(name: string, max: number): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

function move(row: LeaderRow): string {
  if (row.prevRank == null) return 'new'
  if (row.delta > 0) return `↑${row.delta}`
  if (row.delta < 0) return `↓${-row.delta}`
  return '='
}

/** Standings as a real box-drawing table (DESIGN.md: `┌─┬─┐`, not HTML). */
export function leaderboardTable(rows: LeaderRow[], meName?: string): string {
  const nameW = Math.min(16, Math.max(8, ...rows.map((r) => clip(r.name, 16).length)))
  const cols = [4, nameW, 5, 4] // RANK | NAME | SCORE | MOVE
  const edge = (l: string, m: string, r: string) => l + cols.map((w) => '─'.repeat(w + 2)).join(m) + r
  const line = (cells: string[]) =>
    '│ ' + cells.map((c, i) => (i === 2 ? c.padStart(cols[i]) : c.padEnd(cols[i]))).join(' │ ') + ' │'
  const body = rows.map((r) => {
    const you = meName && r.name === meName ? ' ←' : ''
    return line([String(r.rank), clip(r.name, nameW), String(r.score), move(r)]) + you
  })
  return [edge('┌', '┬', '┐'), line(['RANK', 'NAME', 'SCORE', 'MOVE']), edge('├', '┼', '┤'), ...body, edge('└', '┴', '┘')].join(
    '\n'
  )
}

const MEDALS = ['1st', '2nd', '3rd']

/** Final podium block — top three large, in flavor voice. */
export function podiumBlock(rows: LeaderRow[]): string {
  const top = rows.slice(0, 3)
  return top.map((r, i) => `  ${MEDALS[i]}  ${clip(r.name, 16).padEnd(17)} ${r.score}`).join('\n')
}
