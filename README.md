# Guess the Output

A live, host-led multiplayer game where players read a short Python snippet and type what they
think it prints. Think Kahoot / Jackbox, but for Python. Built for a school STEM council, grades

- **Host** Runs the game
- **Players** join from their phones or laptops on the same Wi-Fi.
- Up to ~50 players per room.
  
---

## The two modes

You choose the mode on the Host screen before the game starts.

| Mode | Best for | Rounds | Default timer |
| --- | --- | --- | --- |
| **Quick opener** | A 5-minute warm-up at the start of class | 5 (fixed) | 45 seconds |
| **Full session** | A longer activity; you pick the length | You choose (1 up to the number of snippets available) | 60 seconds |

Other host options:

- **Answer mode** — **Type it** (players type the exact output) or **Multiple choice** (players tap one
  of four colour-coded options: the real output plus three plausible wrong answers, shuffled). Both are
  graded and speed-scored the same way.
- **Team mode** — players join as teams instead of individuals (they enter a team name instead of
  a nickname). Off by default.
- **Content (tier)** — **All**, **Core only** (pure Python, no imports; friendlier for younger or
  newer students), or **Library only** (snippets that use an import, for an older crew).
- **Difficulty** — **Any**, or restrict to **Easy**, **Medium**, or **Tricky**.
- **Topic** — target a single concept (e.g. *strings*, *dicts*, *functions*, *itertools*) or leave
  it on **All topics**. The dropdown is built live from the bank, and the setup screen shows how many
  snippets match your current filters.
- **Timer** (Full session) — set the per-question countdown. Allowed range is **10–300 seconds**.

The snippet bank holds **175 snippets** across two tiers — **core** (no imports, any grade) and
**library** (uses an import like `random`, `numpy`, `collections`, `itertools`, …, aimed at an older
crew) — tagged across 22 topics and three difficulty levels. **Every snippet's output was produced by
actually running it in Python** (see *Verifying content* below), not typed from memory. Your filter
choices combine, the deck is shuffled, and rounds are capped to however many snippets match — so no
two games play the same.

---

## How scoring works

- A **correct** answer is worth between **500 and 1000 points**. The faster you lock it in, the
  closer to 1000 you get — points scale with how much time was left on the clock when you answered.
- A **wrong** answer (or no answer) is worth **0** for that round.
- The leaderboard between rounds shows everyone's running total and animates rank changes so you can
  see who's climbing.

### How answers are graded

Grading is forgiving about formatting but strict about the actual result:

- **Whitespace doesn't matter.** Leading, trailing, and internal spaces/newlines are ignored, so
  `[1, 2, 3]` and `[1,2,3]` both count.
- **Quote style doesn't matter.** Single quotes, double quotes, and smart quotes are all treated the
  same — type `'a'`, `"a"`, or `‘a’` and they're equivalent.
- **Error snippets are lenient.** Some snippets intentionally crash. For those you just need to name
  the exception — your answer counts as long as it *contains* the exception name (case-insensitive).
  So `IndexError`, `index error... IndexError`, and `it throws an IndexError` all pass.

There is no partial credit and no fuzzy matching beyond the rules above. An answer is either right
or wrong.

---

## Reconnecting

If a player's phone drops Wi-Fi or they accidentally close the tab, they can rejoin the **same room
code with the same nickname** and their seat and score come back — they won't be duplicated or reset.
The host screen can likewise recover its session if the host machine's browser is reloaded.

---

## How to add a snippet

All game content lives in one data file: **`c:\Projects\Untitled\src\snippets.js`**.

It's a plain list. To add a question, append one object to the `SNIPPETS` array — nothing else needs
to change:

```js
{
  id: 176,                         // any unique number
  tier: 'core',                    // 'core' (no imports) | 'library' (uses an import)
  difficulty: 'easy',              // 'easy' | 'medium' | 'tricky'
  topic: 'numbers',                // one concept tag (lists, strings, numbers, dicts, functions, ...)
  is_error: false,                 // true if the snippet is meant to crash
  code: `print(2 ** 10)`,          // the Python the players see
  output: `1024`,                  // the EXACT printed text (the ground truth)
  explanation: `** is exponent...` // the "aha" shown on the reveal screen
}
```

A few rules so things stay correct:

- `output` must be the **exact** text the code prints. For multi-line output, join the lines with
  `\n` inside the string. **Keep outputs deterministic** — avoid anything that changes run-to-run or
  machine-to-machine (printing sets of strings, object addresses, unseeded `random`, numpy `.dtype`).
- For an **error** snippet, set `is_error: true` and put the **exception name** (e.g. `IndexError`)
  in `output` — that's what lenient grading matches against.
- Pick `tier: 'core'` if the snippet uses no imports; use `'library'` if it does. `topic` shows up in
  the host's topic filter automatically — reuse an existing tag where you can.

After editing, **verify your output is real** (requires Python on PATH):

```sh
npm run verify
```

This runs every snippet through a fresh Python interpreter under several hash seeds and fails loudly if
any stored `output` doesn't match real execution or isn't deterministic. Then restart the server
(`Ctrl+C`, then `npm start`) to pick up the change.

---

## Verifying & testing

Outputs are ground truth, so the project ships its own checks:

- `npm run verify` — re-runs all snippets in real Python and confirms every stored output matches and
  is deterministic (`tools/verify_snippets.py` + `tools/verify_all.js`).
- `npm run smoke` — boots the server and drives a full game over real sockets (create → join → answer
  → score → reconnect → podium).
- `npm run filters` — checks the tier/difficulty/topic filters, `/api/meta`, and filtered room creation.
- `npm test` — runs the smoke + filter suites together.
