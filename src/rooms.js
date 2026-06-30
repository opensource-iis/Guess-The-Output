/*
 * rooms.js — the in-memory game engine for "Guess the Output".
 *
 * Holds all room state in memory (no DB). The phase machine, timing and scoring are
 * SERVER-AUTHORITATIVE: the client is never trusted for "when" an answer arrived or
 * whether it was correct.
 *
 * Phase machine (host-driven, server-enforced):
 *   LOBBY      --HOST_START----> QUESTION(round 0)
 *   QUESTION   --HOST_REVEAL or timer expiry--> REVEAL   (score everyone)
 *   QUESTION   --HOST_SKIP------> next QUESTION (or PODIUM), NO scoring this round
 *   REVEAL     --HOST_NEXT------> SCOREBOARD
 *   SCOREBOARD --HOST_CONTINUE--> next QUESTION, or PODIUM if that was the last round
 *
 * The RoomManager is given a thin `io` adapter so socket plumbing stays in server.js
 * and the engine stays unit-testable:
 *   io.toRoom(code).emit(event, payload)   -> broadcast to everyone in the room
 *   io.toSocket(socketId).emit(event, payload) -> emit to one socket (may be null)
 */

'use strict';

const PROTO = require('./protocol.js');
const { getSnippets, SNIPPETS } = require('./snippets.js');
const { grade, normalize } = require('./grading.js');
const { generateCode } = require('./codes.js');

const { PHASE, EV, MODE, CONTENT, DIFFICULTY, ANSWER_MODE, POINTS, DEFAULTS } = PROTO;

// Fallback exception-name distractors for MCQ on error snippets when a snippet has no
// authored ones. (Authored snippet.distractors take priority.)
const COMMON_EXCEPTIONS = [
  'TypeError', 'ValueError', 'KeyError', 'IndexError', 'NameError', 'AttributeError',
  'ZeroDivisionError', 'RuntimeError', 'StopIteration', 'ImportError', 'UnboundLocalError'
];

/** Sanitize a client-supplied avatar to {e,c} integer indices, or null. */
function cleanAvatar(a) {
  if (!a || typeof a !== 'object') return null;
  const e = Number(a.e);
  const c = Number(a.c);
  if (!Number.isInteger(e) || !Number.isInteger(c)) return null;
  if (e < 0 || e > 255 || c < 0 || c > 255) return null; // bounded; client mods into its own arrays
  return { e, c };
}

// How long a room survives with the host gone before it self-destructs, so a host
// who reloads / changes wifi can HOST_RECONNECT without losing the game.
const HOST_GRACE_MS = 90 * 1000;

// -------------------------------------------------------------------------------------
// small helpers
// -------------------------------------------------------------------------------------

function clamp(n, lo, hi) {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return clamp(n, 0, 1);
}

function nowMs() {
  return Date.now();
}

/** Fisher–Yates shuffle (in place). Math.random is fine — this is normal Node. */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

function normName(s) {
  return String(s == null ? '' : s).trim();
}

function makeToken() {
  // Opaque, collision-resistant enough for an in-memory game.
  return (
    't_' +
    Date.now().toString(36) +
    '_' +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}

let PLAYER_SEQ = 0;
function makePlayerId() {
  PLAYER_SEQ += 1;
  return 'p_' + PLAYER_SEQ.toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

// -------------------------------------------------------------------------------------
// Room
// -------------------------------------------------------------------------------------

class Room {
  /**
   * @param {object} opts
   * @param {string} opts.code
   * @param {string} opts.mode      MODE.QUICK | MODE.FULL
   * @param {boolean} opts.teamMode
   * @param {string} opts.content   CONTENT.ALL | CONTENT.CORE
   * @param {number} opts.timerSeconds
   * @param {number} opts.totalRounds
   * @param {Array} opts.deck
   * @param {object} opts.io        emit adapter
   * @param {function} opts.onClose called with code when the room tears itself down
   */
  constructor(opts) {
    this.code = opts.code;
    this.mode = opts.mode;
    this.teamMode = !!opts.teamMode;
    this.content = opts.content;
    this.difficulty = opts.difficulty || 'all';
    this.topic = opts.topic || 'all';
    this.answerMode = opts.answerMode === ANSWER_MODE.MCQ ? ANSWER_MODE.MCQ : ANSWER_MODE.TEXT;
    this.timerSeconds = opts.timerSeconds;
    this.totalRounds = opts.totalRounds;
    this.deck = opts.deck; // array of snippet objects, length === totalRounds

    this.io = opts.io;
    this.onClose = typeof opts.onClose === 'function' ? opts.onClose : () => {};

    this.hostSocketId = null;
    this.hostToken = makeToken();
    this.hostGraceTimer = null;

    /** @type {Map<string, object>} playerId -> player */
    this.players = new Map();

    this.roundIndex = -1;
    this.phase = PHASE.LOBBY;

    this.durationMs = 0;
    this.phaseEndsAt = null;
    this.questionTimer = null;

    // Snapshot of the leaderboard ranks from the PREVIOUS scoreboard, keyed by playerId,
    // used to compute rank movement deltas. null entries => first appearance.
    this.prevRanks = new Map();

    // The player join URL (computed by server.js once the LAN IP/port are known) so it
    // can travel on every STATE snapshot, not just the HOST_CREATE ack.
    this.joinUrl = null;
    this._reveal = null;
    this._options = null; // current MCQ options (shuffled), or null in text mode

    this.closed = false;
  }

  // ---- lifecycle -------------------------------------------------------------------

  destroy() {
    this.clearQuestionTimer();
    this.clearHostGrace();
    // Free the large state so a closed room is immediately GC-eligible.
    this.players = new Map();
    this.prevRanks = new Map();
    this.deck = [];
    this._reveal = null;
  }

  clearQuestionTimer() {
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
      this.questionTimer = null;
    }
  }

  clearHostGrace() {
    if (this.hostGraceTimer) {
      clearTimeout(this.hostGraceTimer);
      this.hostGraceTimer = null;
    }
  }

  // ---- emit helpers ----------------------------------------------------------------

  broadcast(event, payload) {
    const ch = this.io.toRoom(this.code);
    if (ch) ch.emit(event, payload);
  }

  emitToSocket(socketId, event, payload) {
    if (!socketId) return;
    const ch = this.io.toSocket(socketId);
    if (ch) ch.emit(event, payload);
  }

  emitToPlayer(player, event, payload) {
    if (player && player.connected && player.socketId) {
      this.emitToSocket(player.socketId, event, payload);
    }
  }

  // ---- player identity -------------------------------------------------------------

  findByToken(token) {
    if (!token) return null;
    for (const p of this.players.values()) {
      if (p.token === token) return p;
    }
    return null;
  }

  findByName(name) {
    const key = normName(name).toLowerCase();
    if (!key) return null;
    for (const p of this.players.values()) {
      if (p.name.trim().toLowerCase() === key) return p;
    }
    return null;
  }

  playerCount() {
    return this.players.size;
  }

  connectedPlayerCount() {
    let n = 0;
    for (const p of this.players.values()) if (p.connected) n += 1;
    return n;
  }

  /**
   * Resolve identity and (re)seat a player.
   * Order: token match (reconnect) -> name match (reconnect, restores seat+score)
   *        -> new player. A name held by a DIFFERENT still-connected player is rejected.
   * @returns {{ok:true, player:object}|{ok:false, error:string}}
   */
  joinPlayer({ name, token, socketId, avatar }) {
    if (this.closed || this.phase === PHASE.CLOSED) {
      return { ok: false, error: 'Room is closed.' };
    }
    const av = cleanAvatar(avatar);
    const cleanName = normName(name);
    if (!cleanName) return { ok: false, error: 'Please enter a name.' };
    if (cleanName.length > 24) {
      return { ok: false, error: 'Name is too long (max 24 characters).' };
    }

    // 1) token reconnect — most reliable.
    let player = this.findByToken(token);

    if (!player) {
      // 2) name-based reconnect / conflict check.
      const byName = this.findByName(cleanName);
      if (byName) {
        if (byName.connected && byName.socketId && byName.socketId !== socketId) {
          // Someone else is actively using this name right now.
          return { ok: false, error: 'That name is taken.' };
        }
        // Same name, but its owner is disconnected (or it's literally us reconnecting):
        // reclaim the seat + score.
        player = byName;
      }
    }

    if (player) {
      // A token-reconnect is allowed to fix a typo in its own name, but must NOT rename
      // itself onto a name a DIFFERENT, still-connected player is actively using.
      if (player.name.trim().toLowerCase() !== cleanName.toLowerCase()) {
        const conflict = this.findByName(cleanName);
        if (
          conflict &&
          conflict.id !== player.id &&
          conflict.connected &&
          conflict.socketId &&
          conflict.socketId !== socketId
        ) {
          return { ok: false, error: 'That name is taken.' };
        }
      }
      // Reconnect / reclaim: keep id, token, score, lastRank. Refresh identity.
      player.name = cleanName;
      if (av) player.avatar = av; // let a returning player update their chosen avatar
      player.connected = true;
      player.socketId = socketId;
      // Do NOT reset answered/currentAnswer here: if they reconnect mid-QUESTION and
      // had already answered, their lock stands. If they hadn't, they can still answer.
      return { ok: true, player };
    }

    // 3) brand-new player.
    if (this.playerCount() >= DEFAULTS.MAX_PLAYERS) {
      return { ok: false, error: 'This room is full.' };
    }
    const fresh = {
      id: makePlayerId(),
      name: cleanName,
      token: makeToken(),
      avatar: av, // {e,c} chosen by the player, or null -> client falls back to a name-derived default
      score: 0,
      connected: true,
      socketId,
      answered: false,
      currentAnswer: null,
      answeredAtFraction: 0,
      lastRank: null
    };
    this.players.set(fresh.id, fresh);
    return { ok: true, player: fresh };
  }

  /** Mark a socket's player disconnected (keeps seat + score for reconnect). */
  handlePlayerSocketDrop(socketId) {
    for (const p of this.players.values()) {
      if (p.socketId === socketId) {
        p.connected = false;
        p.socketId = null;
        return p;
      }
    }
    return null;
  }

  kick(playerId) {
    const p = this.players.get(playerId);
    if (!p) return false;
    this.players.delete(playerId);
    this.prevRanks.delete(playerId);
    this.emitToPlayer(p, EV.KICKED, { message: 'You were removed by the host.' });
    return true;
  }

  // ---- host (dis)connection --------------------------------------------------------

  attachHost(socketId) {
    this.hostSocketId = socketId;
    this.clearHostGrace();
  }

  /**
   * Host transport dropped. Don't destroy immediately — start a grace window so the
   * host can HOST_RECONNECT. If the window lapses, close the room.
   */
  handleHostSocketDrop(socketId) {
    if (this.hostSocketId !== socketId) return;
    this.hostSocketId = null;
    this.clearHostGrace();
    this.hostGraceTimer = setTimeout(() => {
      this.hostGraceTimer = null;
      if (!this.hostSocketId && !this.closed) {
        this.close('Host left the game.');
      }
    }, HOST_GRACE_MS);
  }

  // ---- phase machine ---------------------------------------------------------------

  currentSnippet() {
    if (this.roundIndex < 0 || this.roundIndex >= this.deck.length) return null;
    return this.deck[this.roundIndex];
  }

  /**
   * Build 4 shuffled MCQ options for a snippet: the correct output + 3 distractors. Prefers
   * the snippet's authored `distractors`; falls back to other snippets' outputs (or other
   * exception names for error snippets). Distractors are de-duplicated against the correct
   * answer using the same normalization grading uses, so no two options "mean the same".
   */
  buildOptions(snippet) {
    if (!snippet) return [];
    const correct = String(snippet.output);
    const seen = new Set([normalize(correct)]);
    const opts = [correct];

    const consider = (raw) => {
      if (opts.length >= 4) return;
      if (raw == null) return;
      const val = String(raw);
      if (val.trim() === '') return;
      const key = normalize(val);
      if (seen.has(key)) return;
      seen.add(key);
      opts.push(val);
    };

    if (Array.isArray(snippet.distractors)) snippet.distractors.forEach(consider);
    if (opts.length < 4) this._distractorPool(snippet).forEach(consider);

    return shuffle(opts.slice(0, 4));
  }

  /** Candidate distractors when a snippet lacks (enough) authored ones. */
  _distractorPool(snippet) {
    if (snippet.is_error) {
      const correct = String(snippet.output).toLowerCase();
      return shuffle(COMMON_EXCEPTIONS.filter((e) => e.toLowerCase() !== correct));
    }
    const correctKey = normalize(snippet.output);
    const pool = [];
    for (const s of SNIPPETS) {
      if (s.is_error) continue;
      if (s.id === snippet.id) continue;
      if (normalize(s.output) === correctKey) continue;
      pool.push(s.output);
    }
    return shuffle(pool);
  }

  start() {
    if (this.phase !== PHASE.LOBBY) return false;
    // Need at least one CONNECTED player — a roster of only dropped players is no audience.
    if (this.connectedPlayerCount() < 1) return false;
    this.roundIndex = -1;
    this.enterQuestion(0);
    return true;
  }

  enterQuestion(index) {
    this.clearQuestionTimer();
    this.roundIndex = index;
    this.phase = PHASE.QUESTION;

    // Reset per-round answer state for everyone.
    for (const p of this.players.values()) {
      p.answered = false;
      p.currentAnswer = null;
      p.answeredAtFraction = 0;
    }

    // Build the multiple-choice options for this round (mcq mode only), shuffled once so
    // everyone in the room sees the same choices in the same order.
    this._options =
      this.answerMode === ANSWER_MODE.MCQ ? this.buildOptions(this.currentSnippet()) : null;

    this.durationMs = this.timerSeconds * 1000;
    this.phaseEndsAt = nowMs() + this.durationMs;

    // Server-authoritative auto-reveal at expiry (host can reveal early -> we clear it).
    this.questionTimer = setTimeout(() => {
      this.questionTimer = null;
      if (this.phase === PHASE.QUESTION) {
        this.enterReveal();
      }
    }, this.durationMs);

    this.broadcastState();
  }

  /** Host (or timer) ends the round and scores it. */
  reveal() {
    if (this.phase !== PHASE.QUESTION) return false;
    this.enterReveal();
    return true;
  }

  enterReveal() {
    this.clearQuestionTimer();
    this.phase = PHASE.REVEAL;
    this.phaseEndsAt = null;

    const snippet = this.currentSnippet();
    let correctCount = 0;
    let answeredCount = 0;

    // Score everyone NOW (server-authoritative).
    for (const p of this.players.values()) {
      if (p.answered) answeredCount += 1;
      const isCorrect = p.answered && grade(p.currentAnswer, snippet);
      let points = 0;
      if (isCorrect) {
        correctCount += 1;
        points = Math.round(
          POINTS.MIN + (POINTS.MAX - POINTS.MIN) * clamp01(p.answeredAtFraction)
        );
        p.score += points;
      }
      // stash this round's outcome so we can emit a per-player RESULT after ranking.
      p._lastRoundCorrect = isCorrect;
      p._lastRoundPoints = points;
    }

    // Rank AFTER scoring so RESULT.rank reflects the new standings.
    const board = this.leaderboard();
    const rankById = new Map(board.map((row) => [row.id, row.rank]));

    for (const p of this.players.values()) {
      const rank = rankById.get(p.id) ?? null;
      this.emitToPlayer(p, EV.RESULT, {
        correct: !!p._lastRoundCorrect,
        points: p._lastRoundPoints || 0,
        totalScore: p.score,
        rank,
        yourAnswer: p.answered ? p.currentAnswer : null,
        correctOutput: snippet ? snippet.output : '',
        isError: snippet ? !!snippet.is_error : false
      });
    }

    this._reveal = {
      output: snippet ? snippet.output : '',
      explanation: snippet ? snippet.explanation : '',
      isError: snippet ? !!snippet.is_error : false,
      correctCount,
      answeredCount
    };

    this.broadcastState();
  }

  /** REVEAL -> SCOREBOARD. */
  next() {
    if (this.phase !== PHASE.REVEAL) return false;
    this.phase = PHASE.SCOREBOARD;
    this.phaseEndsAt = null;
    this._reveal = null;
    this.broadcastState();
    return true;
  }

  /** SCOREBOARD -> next QUESTION, or PODIUM if that was the last round. */
  continue() {
    if (this.phase !== PHASE.SCOREBOARD) return false;
    // Snapshot current ranks as "previous" before moving on, so the NEXT scoreboard
    // can show movement.
    this.snapshotRanks();
    if (this.roundIndex + 1 >= this.totalRounds) {
      this.enterPodium();
    } else {
      this.enterQuestion(this.roundIndex + 1);
    }
    return true;
  }

  /** QUESTION -> skip to next QUESTION (or PODIUM) with NO scoring for this round. */
  skip() {
    if (this.phase !== PHASE.QUESTION) return false;
    this.clearQuestionTimer();
    if (this.roundIndex + 1 >= this.totalRounds) {
      this.enterPodium();
    } else {
      this.enterQuestion(this.roundIndex + 1);
    }
    return true;
  }

  enterPodium() {
    this.clearQuestionTimer();
    this.phase = PHASE.PODIUM;
    this.phaseEndsAt = null;
    this._reveal = null;
    this.broadcastState();
  }

  close(reason) {
    if (this.closed) return;
    this.closed = true;
    this.clearQuestionTimer();
    this.clearHostGrace();
    this.phase = PHASE.CLOSED;
    this.broadcast(EV.ROOM_CLOSED, { message: reason || 'The room has closed.' });
    this.onClose(this.code); // remove from the manager Map
    this.destroy(); // clears timers (again, safely) and frees large state for GC
  }

  // ---- answers ---------------------------------------------------------------------

  /**
   * Record a player's answer with server-side timing.
   * @returns {{ok:true, locked:true}|{ok:false, error:string}}
   */
  submitAnswer(socketId, text) {
    if (this.phase !== PHASE.QUESTION) {
      return { ok: false, error: 'Answers are not open right now.' };
    }
    let player = null;
    for (const p of this.players.values()) {
      if (p.socketId === socketId) {
        player = p;
        break;
      }
    }
    if (!player) return { ok: false, error: 'You are not in this room.' };
    if (player.answered) return { ok: false, error: 'You already answered.' };

    // Validate input server-side (never rely on the client): no empty answers (a misfire
    // would otherwise lock the player out), and a hard length cap so a malicious client
    // can't DoS the room by broadcasting a giant string in the per-player RESULT.
    const raw = text == null ? '' : String(text);
    if (raw.trim() === '') return { ok: false, error: 'Type an answer first.' };
    if (raw.length > 500) return { ok: false, error: 'That answer is too long.' };

    // Fraction of the timer still remaining at the moment the answer ARRIVES.
    // Server clock only — client timing is never trusted.
    const remaining = (this.phaseEndsAt || nowMs()) - nowMs();
    const fraction = this.durationMs > 0 ? clamp01(remaining / this.durationMs) : 0;

    player.answered = true;
    player.currentAnswer = raw;
    player.answeredAtFraction = fraction;

    this.broadcastCounts();
    return { ok: true, locked: true };
  }

  counts() {
    let answered = 0;
    const total = this.players.size;
    for (const p of this.players.values()) if (p.answered) answered += 1;
    return { answered, total };
  }

  broadcastCounts() {
    this.broadcast(EV.COUNTS, this.counts());
  }

  // ---- leaderboard / ranks ---------------------------------------------------------

  /**
   * Sorted standings, rank 1-based. Tie-break: higher score, then case-insensitive
   * name, then stable id — fully deterministic. delta = prevRank - rank (positive = up).
   */
  leaderboard() {
    const rows = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      avatar: p.avatar || null
    }));
    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
    return rows.map((row, i) => {
      const rank = i + 1;
      const prevRank = this.prevRanks.has(row.id) ? this.prevRanks.get(row.id) : null;
      const delta = prevRank == null ? 0 : prevRank - rank;
      return {
        id: row.id,
        name: row.name,
        score: row.score,
        connected: row.connected,
        avatar: row.avatar || null,
        rank,
        prevRank,
        delta
      };
    });
  }

  /** Remember the current ranks so the next scoreboard can animate movement. */
  snapshotRanks() {
    const board = this.leaderboard();
    this.prevRanks = new Map(board.map((row) => [row.id, row.rank]));
    for (const row of board) {
      const p = this.players.get(row.id);
      if (p) p.lastRank = row.rank;
    }
  }

  // ---- state snapshot (matches protocol.js STATE SHAPE) ----------------------------

  questionPayload() {
    const s = this.currentSnippet();
    if (!s) return null;
    const payload = {
      id: s.id,
      tier: s.tier,
      difficulty: s.difficulty,
      code: s.code,
      isError: !!s.is_error,
      answerMode: this.answerMode
    };
    if (this.answerMode === ANSWER_MODE.MCQ) payload.options = this._options || [];
    return payload;
  }

  buildState() {
    const showQuestion =
      this.phase === PHASE.QUESTION ||
      this.phase === PHASE.REVEAL ||
      this.phase === PHASE.SCOREBOARD;

    const showLeaderboard =
      this.phase === PHASE.SCOREBOARD || this.phase === PHASE.PODIUM;

    return {
      phase: this.phase,
      joinUrl: this.joinUrl || null,
      room: {
        code: this.code,
        mode: this.mode,
        teamMode: this.teamMode,
        content: this.content,
        difficulty: this.difficulty,
        topic: this.topic,
        totalRounds: this.totalRounds
      },
      roundIndex:
        this.phase === PHASE.LOBBY || this.phase === PHASE.CLOSED
          ? -1
          : this.roundIndex,
      totalRounds: this.totalRounds,
      question: showQuestion ? this.questionPayload() : null,
      reveal: this.phase === PHASE.REVEAL ? this._reveal || null : null,
      timer: {
        phaseEndsAt: this.phase === PHASE.QUESTION ? this.phaseEndsAt : null,
        durationMs: this.durationMs,
        serverNow: nowMs()
      },
      counts: this.counts(),
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        connected: p.connected,
        answered: p.answered,
        avatar: p.avatar || null
      })),
      leaderboard: showLeaderboard ? this.leaderboard() : []
    };
  }

  broadcastState() {
    this.broadcast(EV.STATE, this.buildState());
  }
}

// -------------------------------------------------------------------------------------
// RoomManager
// -------------------------------------------------------------------------------------

class RoomManager {
  /**
   * @param {object} io emit adapter: { toRoom(code):{emit}, toSocket(id):{emit}|null }
   */
  constructor(io) {
    this.io = io;
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
  }

  activeCodes() {
    return new Set(this.rooms.keys());
  }

  getRoom(code) {
    if (!code) return null;
    return this.rooms.get(String(code).toUpperCase()) || null;
  }

  // ---- create ----------------------------------------------------------------------

  /**
   * Create a room. Returns { ok:true, room, roomCode, hostToken } for the server to
   * shape into the HOST_CREATE callback.
   * @param {object} opts {mode, teamMode, roundCount, content, timerSeconds, hostSocketId}
   */
  createRoom(opts = {}) {
    const mode = opts.mode === MODE.FULL ? MODE.FULL : MODE.QUICK;
    const content =
      opts.content === CONTENT.CORE || opts.content === CONTENT.LIBRARY
        ? opts.content
        : CONTENT.ALL;
    const difficulty =
      opts.difficulty === DIFFICULTY.EASY ||
      opts.difficulty === DIFFICULTY.MEDIUM ||
      opts.difficulty === DIFFICULTY.TRICKY
        ? opts.difficulty
        : DIFFICULTY.ALL;
    const topic = typeof opts.topic === 'string' && opts.topic ? opts.topic : 'all';
    const answerMode = opts.answerMode === ANSWER_MODE.MCQ ? ANSWER_MODE.MCQ : ANSWER_MODE.TEXT;
    const teamMode = !!opts.teamMode;

    const pool = getSnippets({ tier: content, difficulty: difficulty, topic: topic });
    if (!pool.length) {
      return { ok: false, error: 'No snippets match those filters. Loosen them and try again.' };
    }

    // Rounds + timer per mode.
    let totalRounds;
    let timerSeconds;
    if (mode === MODE.QUICK) {
      totalRounds = DEFAULTS.QUICK_ROUNDS;
      timerSeconds =
        opts.timerSeconds != null ? Number(opts.timerSeconds) : DEFAULTS.QUICK_TIMER;
    } else {
      const requested =
        opts.roundCount != null ? Math.floor(Number(opts.roundCount)) : pool.length;
      totalRounds = Number.isFinite(requested) ? requested : pool.length;
      timerSeconds =
        opts.timerSeconds != null ? Number(opts.timerSeconds) : DEFAULTS.FULL_TIMER;
    }

    // Clamp rounds to [1, pool size] and timer to [MIN_TIMER, MAX_TIMER].
    totalRounds = clamp(totalRounds, 1, pool.length);
    if (!Number.isFinite(timerSeconds)) timerSeconds = DEFAULTS.QUICK_TIMER;
    timerSeconds = clamp(
      Math.round(timerSeconds),
      DEFAULTS.MIN_TIMER,
      DEFAULTS.MAX_TIMER
    );

    // Build the deck now: shuffle the pool, take totalRounds.
    const deck = shuffle(pool.slice()).slice(0, totalRounds);

    const code = generateCode(this.activeCodes());
    const room = new Room({
      code,
      mode,
      teamMode,
      content,
      difficulty,
      topic,
      answerMode,
      timerSeconds,
      totalRounds,
      deck,
      io: this.io,
      onClose: (c) => this.rooms.delete(c)
    });
    if (opts.hostSocketId) room.attachHost(opts.hostSocketId);

    this.rooms.set(code, room);
    return { ok: true, room, roomCode: code, hostToken: room.hostToken };
  }

  // ---- host reconnect --------------------------------------------------------------

  /**
   * Reattach a host by code + token.
   * @returns {{ok:true, room:Room}|{ok:false, error:string}}
   */
  reconnectHost({ roomCode, hostToken, socketId }) {
    const room = this.getRoom(roomCode);
    if (!room || room.closed) return { ok: false, error: 'Room not found.' };
    if (!hostToken || room.hostToken !== hostToken) {
      return { ok: false, error: 'Invalid host token.' };
    }
    room.attachHost(socketId);
    return { ok: true, room };
  }

  // ---- disconnect routing ----------------------------------------------------------

  /**
   * A socket dropped. Figure out whether it was a host or a player in any room and
   * react (host -> grace timer; player -> mark disconnected + rebroadcast roster).
   */
  handleDisconnect(socketId) {
    for (const room of this.rooms.values()) {
      if (room.hostSocketId === socketId) {
        room.handleHostSocketDrop(socketId);
        // roster unchanged; no state broadcast needed for host drop.
        continue;
      }
      const dropped = room.handlePlayerSocketDrop(socketId);
      if (dropped) {
        room.broadcastState();
      }
    }
  }

  // ---- host-authority guard --------------------------------------------------------

  /** True if this socket is the acknowledged host of the room. */
  isHost(room, socketId) {
    return !!room && room.hostSocketId === socketId;
  }
}

module.exports = { RoomManager, Room, HOST_GRACE_MS };
