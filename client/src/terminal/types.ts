/**
 * The scrollback line model. The shell knows how to RENDER kinds; it has
 * no idea what the lines mean — game logic composes them (CLAUDE.md,
 * separation of concerns).
 *
 * `kind` picks layout + (in the visual pass) the reveal treatment.
 * `tone` picks the phosphor brightness — state is never tone-alone, the
 * text itself always carries ✓/✗/words (DESIGN.md).
 */

export type LineKind =
  | 'out' // ordinary output — wraps, preserves spacing
  | 'echo' // the player's own command, echoed like a real shell
  | 'snippet' // Python code / ASCII tables — white-space: pre, never wrapped
  | 'banner' // flavor-font block (boot wordmark, easter eggs, room code)
  | 'decrypt' // DecryptedText reveal — snippet, round header, CORRECT/WRONG
  | 'scramble' // ScrambledText body copy (help, explanations, boot log)
  | 'blank' // spacer

export type LineTone = 'green' | 'bright' | 'dim'

export interface TermLine {
  id: number
  kind: LineKind
  text: string
  tone?: LineTone // default: bright for echo, green otherwise
}

export interface StatusSegments {
  left: string
  right: string
  /** Brightens the whole bar (e.g. final countdown seconds). */
  urgent?: boolean
}
