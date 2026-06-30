# Guess the Output

A live, host-led multiplayer game where players read a short Python snippet and type what they
think it prints. Think Kahoot / Jackbox, but for Python. Built for a school STEM council, grades

- **Host** Runs the game
- **Players** join from their phones or laptops on the same Wi-Fi.
- Up to ~50 players per room.

---

## What you need

- A computer to run the server (this becomes the "host machine").
- [Node.js](https://nodejs.org/) **version 18 or newer** installed on that machine.
- Everyone — the host machine and all players — on the **same Wi-Fi / LAN**.

---

## Run it (3 steps)

Open a terminal in this folder (`c:\Projects\Untitled\`) and run:

```sh
npm install
npm start
```

When it boots, the server prints a banner that looks like this:

```
  Guess the Output  —  ready
  Host screen :  http://192.168.1.42:3000/host.html
  Players join:  http://192.168.1.42:3000
```

The exact IP address will be your machine's address on the local network.

1. **Host:** open the **Host screen** URL (`/host.html`) on the computer connected to the
   projector. Pick your settings and click **Host game**. A big room code, the join URL, and a
   QR code appear.
2. **Players:** on their phones, either scan the QR code or type the **Players join** URL into a
   browser. They enter the room code, a nickname, and pick an emoji avatar (remembered for next time), and they're in.
3. **Host:** once at least one player has joined, click **Start**. Play, reveal, score, repeat.

> Tip: if players can't reach the URL, double-check everyone is on the same Wi-Fi network and
> that the host machine's firewall isn't blocking port 3000. To use a different port, start with
> `PORT=8080 npm start` (Windows PowerShell: `$env:PORT=8080; npm start`).

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

---

## What's intentionally NOT in v1

To keep the game fast and classroom-proof, the first version deliberately leaves these out:

- **No accounts or history** — nothing is saved between sessions; close the server and the room is
  gone.
- **No sound** — everything works silently.
- **No partial credit / fuzzy matching** — answers are graded only by the whitespace + quote rules
  above.
- **No custom snippet upload through the UI** — add snippets by editing `src/snippets.js`.
- **No CSV / results export.**
- **No pause/resume.** Host controls are limited to: reveal (end the round early), skip a question,
  and kick a player.

These are candidates for a future v2, not bugs.

---

## Deploy it (so anyone can host from a link)

This is a "deploy once, anyone hosts" room system — **nobody installs anything**. Put the server on any
host that runs Node, then share the URL. Whoever opens it and clicks **Host a game** becomes that room's
host (they hold a private host token = elevated controls: start / reveal / skip / kick / close); everyone
else just joins with the code.

- It honors `PORT` and sits correctly behind a proxy (`trust proxy`), and builds the player join URL/QR
  from the public address it's opened on — so it works on a real domain, not just LAN.
- **Docker:** `docker build -t guess-the-output . && docker run -p 3000:3000 guess-the-output`
- **Platforms (Render/Railway/Fly/a VPS):** build `npm install`, start `npm start`. No database needed —
  rooms live in memory (a restart just clears any active rooms).

---

## Project layout (for the curious)

| Path | What it is |
| --- | --- |
| `c:\Projects\Untitled\server.js` | The Node + Express + Socket.IO server |
| `c:\Projects\Untitled\src\snippets.js` | The snippet bank (edit this to add content) |
| `c:\Projects\Untitled\src\grading.js` | Answer-grading rules |
| `c:\Projects\Untitled\public\host.html` | The host / projector screen |
| `c:\Projects\Untitled\public\index.html` | The landing page (Host a game / Join a game) |
| `c:\Projects\Untitled\public\player.html` | The player (phone) screen |
| `c:\Projects\Untitled\tools\` | Snippet verifier (`verify_snippets.py`, `verify_all.js`) |
| `c:\Projects\Untitled\test\` | Automated tests (`smoke.js`, `filters.js`) |

Run it, point a projector at the host screen, hand out the URL, and play.
