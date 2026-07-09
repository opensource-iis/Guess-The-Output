/**
 * Static terminal content: help/man catalog, easter-egg text, ASCII art.
 * Pure data — the controller dispatches, this file just knows what to say.
 */

export const WORDMARK = 'GUESS_THE_OUTPUT v1.0.0 — IIS DSO Tech Corner'

export const WHOAMI = `  user: dhruvin.sarkar
  role: AI & Design Thinking student — 12th grade

  grew up surrounded by computers, PCBs, and tech long before
  knowing what any of it was. dad taught me C and C++ at age 8 —
  that curiosity became an obsession with how things work.

  interests: many. (that's the advantage, not the problem.)
    web dev / game dev / hardware tinkering / PCB work / PC modding
    competitive FPS + roguelikes — mechanically demanding or nothing

  os: Linux, LOVED. Ubuntu -> Fedora -> daily-driven Arch.
      years of ricing, dotfiles, window managers, custom workflows —
      breaking the system and rebuilding it better. (btw.)

  workflow: docs-first, trial-and-error, obsessive about
            details and polish.

  offline_processes: car modding, archery, music,
                     anime / manga / manhwa

  uptime: still compiling.`

export const CREDITS = `  GUESS_THE_OUTPUT — a terminal remake

  design & build ..... dhruvin.sarkar
  council ............ Design Tech & Innovation Council
  engine ............. opensource-iis/Guess-The-Output
  snippet bank ....... 175 verified Python programs

  respect to everyone who reads code slowly.`

export const RULES = `THE RULES
  1. a Python snippet appears. you guess what it prints.
  2. one answer per round. no edits, no retries, no hints.
  3. correct = 500-1000 pts, scaled by answer speed.
     wrong or silent = 0.
  4. free-text grading forgives whitespace and quote style.
     error rounds accept the exception name, any case.
  5. between rounds: standings. after the last: the podium.

  fastest correct fingers win. read carefully anyway.`

// `fortune` draws from the Zen of Python — and `python` points here.
export const FORTUNES = [
  'Beautiful is better than ugly.',
  'Explicit is better than implicit.',
  'Simple is better than complex.',
  'Complex is better than complicated.',
  'Flat is better than nested.',
  'Sparse is better than dense.',
  'Readability counts.',
  "Special cases aren't special enough to break the rules.",
  'Although practicality beats purity.',
  'Errors should never pass silently.',
  'Unless explicitly silenced.',
  'In the face of ambiguity, refuse the temptation to guess.',
  'There should be one-- and preferably only one --obvious way to do it.',
  'Now is better than never.',
  'Although never is often better than *right* now.',
  "If the implementation is hard to explain, it's a bad idea.",
  'Namespaces are one honking great idea -- let us do more of those!',
]

export function cowsay(text: string): string {
  const msg = text.trim() || 'moo. print("moo"). same thing.'
  const words = msg.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 38) {
      lines.push(cur.trim())
      cur = w
    } else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  const width = Math.max(...lines.map((l) => l.length))
  const pad = (l: string) => l.padEnd(width)
  const body =
    lines.length === 1
      ? [`< ${pad(lines[0])} >`]
      : lines.map((l, i) => {
          const [o, c] = i === 0 ? ['/', '\\'] : i === lines.length - 1 ? ['\\', '/'] : ['|', '|']
          return `${o} ${pad(l)} ${c}`
        })
  return [
    ' ' + '_'.repeat(width + 2),
    ...body,
    ' ' + '-'.repeat(width + 2),
    '        \\   ^__^',
    '         \\  (oo)\\_______',
    '            (__)\\       )\\/\\',
    '                ||----w |',
    '                ||     ||',
  ].join('\n')
}

export function neofetch(info: {
  user: string
  uptime: string
  snippets: number | string
  room: string
  cols: string
}): string {
  const rows = [
    `${info.user}@gtos`,
    '-'.repeat(`${info.user}@gtos`.length),
    'OS: GTOS 1.0.0 (Arch-adjacent, btw)',
    'Host: IIS DSO Tech Corner CRT-1985',
    'Kernel: guess-the-output 5.14-python',
    'Shell: gto-sh 1.0.0',
    `Uptime: ${info.uptime}`,
    `Snippets: ${info.snippets} verified`,
    `Room: ${info.room}`,
    `Resolution: ${info.cols}`,
    'Theme: phosphor-green [strict monochrome]',
    'Terminal: the only interface',
  ]
  const art = [
    '        ________________       ',
    '       /               /|      ',
    '      /               / |      ',
    '     /_______________/  |      ',
    '    |  _____________ |  |      ',
    '    | |             ||  |      ',
    '    | |  > _        ||  |      ',
    '    | |             ||  |      ',
    '    | |_____________||  /      ',
    '    |________________| /       ',
    '     _|____________|_|/        ',
    '    /________________/         ',
  ]
  const height = Math.max(art.length, rows.length)
  const out: string[] = []
  for (let i = 0; i < height; i++) {
    out.push((art[i] ?? ' '.repeat(31)) + (rows[i] ?? ''))
  }
  return out.join('\n')
}

export const TOP_TABLE = `  PID  USER     %CPU  %MEM  COMMAND
    1  root      0.1   0.2  init [runlevel 5: game night]
   42  host     12.3   1.0  quizmaster --rounds=all-of-them
  175  python   88.8  13.7  snippet_bank.py --verified
  404  nobody    0.0   0.0  your_excuses.sh <defunct>
  777  gil      99.9  50.0  global_interpreter_lock
 1337  player    4.2   2.1  guess_engine --mode=panic

up and grinding. press nothing to continue.`

export const FAKE_FILES: Record<string, string> = {
  'snippets.py': '# 175 verified Python snippets. Answers redacted. Nice try.',
  'leaderboard.log': '[REDACTED] — winners are decided at runtime, not read from disk.',
  'README.md': 'Read the code. That is the whole game.',
}

export const HIDDEN_FILES: Record<string, string> = {
  '.bashrc': "alias win='answer correctly'  # works every time",
  '.flag': 'flag{ls_-a_reads_the_docs_and_so_do_you}',
}

// ---------------------------------------------------------------- man pages

export interface ManEntry {
  usage: string
  summary: string
  man: string
  egg?: boolean
}

export const MAN: Record<string, ManEntry> = {
  // game
  join: {
    usage: 'join <CODE> [nickname]',
    summary: 'take a seat in a room',
    man: 'Joins the room with the given code. Without a nickname you get one follow-up prompt. Re-typing the same code + nickname after a disconnect restores your seat and score.',
  },
  answer: {
    usage: 'answer <value>',
    summary: 'lock in your guess for the open round',
    man: 'One shot per round. Free-text mode grades whitespace- and quote-insensitively; for error rounds the exception name is enough. In MCQ mode "answer B" or just "b" works.',
  },
  question: {
    usage: 'question',
    summary: 're-print the current snippet',
    man: 'Prints the open round again — snippet, options, and timer header — in case it scrolled away or you cleared the screen mid-panic.',
  },
  leaderboard: {
    usage: 'leaderboard',
    summary: 'current standings, on demand',
    man: 'Prints the standings table without waiting for the between-round scoreboard.',
  },
  players: {
    usage: 'players',
    summary: "who's in the room",
    man: 'Lists every seat: name, score, whether they have answered this round, and connection state.',
  },
  score: {
    usage: 'score',
    summary: 'your points and rank',
    man: 'Shows your current score and rank. Hosts get room stats instead — they already know the output.',
  },
  topics: {
    usage: 'topics',
    summary: 'what the snippet bank covers',
    man: 'Lists every topic in the snippet bank with its snippet count, straight from /api/meta.',
  },
  rules: {
    usage: 'rules',
    summary: 'how the game and scoring work',
    man: 'Prints the house rules: one answer per round, 500-1000 points by speed, lenient grading, no hints.',
  },
  // host
  host: {
    usage: 'host [--flags] | host <CODE>',
    summary: 'create a room, or reclaim one',
    man: 'With no arguments: a numbered setup wizard. With flags: one-line setup (--mode=quick|full --rounds=N --answers=text|mcq --timer=S --tier=... --difficulty=... --topic=... --team=on|off). With a room code: reclaims a room this device was hosting.',
  },
  start: { usage: 'start', summary: 'open round 1 once players are in', man: 'Host only, lobby only. Needs at least one player seated.' },
  reveal: { usage: 'reveal', summary: 'end the round early, show the answer', man: 'Host only. The server reveals automatically when the timer runs out; this is for when everyone has already answered.' },
  next: { usage: 'next', summary: 'standings, after a reveal', man: 'Host only. Moves from the reveal to the between-round standings.' },
  continue: { usage: 'continue', summary: 'next round — or final results', man: 'Host only. From the standings, opens the next round, or the podium after the last one.' },
  skip: { usage: 'skip', summary: 'throw the round away, no scoring', man: 'Host only. Abandons the open round; nobody scores.' },
  kick: { usage: 'kick <name>', summary: 'remove a player', man: 'Host only. Removes the named player from the room.' },
  close: { usage: 'close', summary: 'shut the room down', man: 'Host only. Ends the session for everyone and burns the room code.' },
  // terminal
  help: { usage: 'help [command]', summary: 'the command list', man: 'Without arguments: the index. With a command name: same as man.' },
  man: { usage: 'man <command>', summary: 'read the manual', man: 'What you are doing right now. Recursion noted.' },
  clear: { usage: 'clear', summary: 'wipe the scrollback', man: 'Clears the screen. Ctrl+L does the same without the typing.' },
  history: { usage: 'history', summary: 'everything you have typed', man: 'Numbered list of this session\'s commands. UP/DOWN arrows recall them at the prompt.' },
  echo: { usage: 'echo <text>', summary: 'say it back', man: 'Prints its arguments. The terminal equivalent of testing a microphone.' },
  date: { usage: 'date', summary: 'current date and time', man: 'Prints the local date and time. The one command that never lies.' },
  neofetch: { usage: 'neofetch', summary: 'system information, with pride', man: 'ASCII rig-flex. Every terminal needs one.' },
  fortune: { usage: 'fortune', summary: 'a line of wisdom', man: 'Prints one line of the Zen of Python. Collect all 19.' },
  cowsay: { usage: 'cowsay [text]', summary: 'a cow says it', man: 'The cow is load-bearing terminal culture. Do not question the cow.' },
  uptime: { usage: 'uptime', summary: 'how long this terminal has been awake', man: 'Time since boot, plus a load average of questionable honesty.', egg: true },
  uname: { usage: 'uname [-a]', summary: 'system identity', man: 'Prints the OS identity string. -a for the full brag.', egg: true },
  pwd: { usage: 'pwd', summary: 'where you are', man: 'You are in the terminal. But sure, here is a path.', egg: true },
  id: { usage: 'id', summary: 'who the system thinks you are', man: 'uid, gid, groups. Spoiler: you are not root. See sudo.', egg: true },
  whoami: { usage: 'whoami', summary: 'who am i, really', man: 'A question for the ages. Answered in flavor font.', egg: true },
  sudo: { usage: 'sudo <anything>', summary: 'ask for power', man: 'Denied. Root is reserved for people who already know the output.', egg: true },
  ls: { usage: 'ls [-a]', summary: 'list files', man: 'Lists this terminal\'s very real filesystem. -a shows what hides.', egg: true },
  cat: { usage: 'cat <file>', summary: 'read a file', man: 'Prints a file from the very real filesystem. Try ls first.', egg: true },
  ping: { usage: 'ping [host]', summary: 'check the tubes', man: 'Sends four completely authentic packets.', egg: true },
  top: { usage: 'top', summary: 'what this machine is busy with', man: 'A live view of the process table. As live as anything here.', egg: true },
  matrix: { usage: 'matrix', summary: 'follow the white rabbit', man: 'Six seconds of falling glyphs. Reduced-motion users get a polite note instead.', egg: true },
  hack: { usage: 'hack', summary: 'breach the mainframe', man: 'Progress bar goes up. Nothing goes down. ACCESS GRANTED.', egg: true },
  reboot: { usage: 'reboot', summary: 'turn it off and on again', man: 'Replays the boot sequence. Fixes nothing, feels great.', egg: true },
  python: { usage: 'python', summary: 'summon the snake', man: 'This terminal reads Python; it does not run it. That is YOUR job.', egg: true },
  vim: { usage: 'vim', summary: 'the editor war, round 1', man: 'How do you exit vim? You do not. You live here now.', egg: true },
  credits: { usage: 'credits', summary: 'who made this', man: 'The names behind the phosphor.', egg: true },
  exit: { usage: 'exit', summary: 'try to leave', man: 'You can check out any time you like.', egg: true },
}

export const HELP_TEXT = `GAME
  join <CODE> [nick]    take a seat in a room
  answer <value>        lock in your guess (MCQ: answer B — or just B)
  question              re-print the current snippet
  leaderboard           standings on demand
  players               who's in the room
  score                 your points and rank
  topics · rules        know the bank, know the game

HOST
  host [--flags]        create a room (no flags = guided setup)
  host <CODE>           reclaim a room this device was hosting
  start                 open round 1 once players are in
  reveal / next / continue / skip
                        run the session, in that order
  kick <name> · close   room control

TERMINAL
  help [cmd] · man <cmd>   you are here
  clear                    wipe the scrollback (Ctrl+L too)
  history · echo · date    the classics
  neofetch · fortune · cowsay
                           the important ones

TAB completes. UP/DOWN recalls. Ctrl+C interrupts.
(help doesn't list everything. terminals keep secrets.)`

/** Names offered to tab-completion — everything, eggs included. */
export const COMMAND_NAMES = Object.keys(MAN).sort((a, b) => a.localeCompare(b))
