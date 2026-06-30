/*
 * protocol.js — the single source of truth for the host<->player real-time contract.
 *
 * UMD wrapper so the SAME file is consumed by:
 *   - the Node server:  const PROTO = require('./public/js/protocol.js')
 *   - the browser:      <script src="/js/protocol.js"></script>  then use window.PROTO
 *
 * Never define an event name or phase as a string literal anywhere else. Import from here.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PROTO = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    // Game phases. The server is the only thing that changes `phase`.
    PHASE: {
      LOBBY: 'lobby',          // room open, players joining, snippet not shown yet
      QUESTION: 'question',    // snippet shown, answers open, timer running
      REVEAL: 'reveal',        // answers locked, real output + explanation shown
      SCOREBOARD: 'scoreboard',// ranked leaderboard between rounds
      PODIUM: 'podium',        // final results after the last round
      CLOSED: 'closed'         // host left / room expired
    },

    EV: {
      // ---- client -> server ----
      HOST_CREATE: 'host:create',         // {mode, teamMode, roundCount, content, difficulty, topic, answerMode, timerSeconds, origin} -> cb {ok, roomCode, hostToken, joinUrl}
      HOST_RECONNECT: 'host:reconnect',   // {roomCode, hostToken} -> cb {ok}
      HOST_START: 'host:start',           // lobby -> question (round 0)
      HOST_REVEAL: 'host:reveal',         // question -> reveal (also serves "end round early")
      HOST_NEXT: 'host:next',             // reveal -> scoreboard
      HOST_CONTINUE: 'host:continue',     // scoreboard -> next question OR podium
      HOST_SKIP: 'host:skip',             // question -> next question, no scoring for this round
      HOST_KICK: 'host:kick',             // {playerId}
      HOST_CLOSE: 'host:close',           // tear down room

      PLAYER_JOIN: 'player:join',         // {roomCode, name, token?, avatar?:{e,c}} -> cb {ok, playerId, token} | {ok:false, error}
      PLAYER_ANSWER: 'player:answer',     // {text} -> cb {ok, locked} | {ok:false, error}
      PLAYER_LEAVE: 'player:leave',

      // ---- server -> client ----
      STATE: 'state',       // full snapshot (see STATE SHAPE below). Sent on every phase change & join.
      COUNTS: 'counts',     // {answered, total} lightweight tick during QUESTION
      RESULT: 'result',     // per-player, at REVEAL: {correct, points, totalScore, rank, yourAnswer, correctOutput, isError}
      KICKED: 'kicked',     // sent to a player the host removed
      ROOM_CLOSED: 'roomClosed',
      ERROR: 'errorMsg'     // {message}
    },

    MODE: { QUICK: 'quick', FULL: 'full' },
    // Snippet filters the host can set at create time. content = tier filter.
    CONTENT: { ALL: 'all', CORE: 'core', LIBRARY: 'library' },
    DIFFICULTY: { ALL: 'all', EASY: 'easy', MEDIUM: 'medium', TRICKY: 'tricky' },
    // How players answer: free TEXT (type the output) or MCQ (pick one of 4 choices).
    ANSWER_MODE: { TEXT: 'text', MCQ: 'mcq' },

    // Scoring: correct = MIN + (MAX-MIN) * (timeRemaining / duration); wrong = 0.
    POINTS: { MAX: 1000, MIN: 500 },

    DEFAULTS: {
      QUICK_ROUNDS: 5,
      QUICK_TIMER: 45,   // seconds
      FULL_TIMER: 60,
      MIN_TIMER: 10,
      MAX_TIMER: 300,
      MAX_PLAYERS: 50
    }

    /*
     * STATE SHAPE (server -> client `state` event). Every field below is authoritative.
     * {
     *   phase: one of PHASE.*,
     *   room: { code, mode, teamMode:bool, content, totalRounds:int },
     *   roundIndex: int,            // 0-based; -1 in lobby/closed
     *   totalRounds: int,
     *   question: {                 // present in QUESTION, REVEAL, SCOREBOARD; null in LOBBY
     *     id, tier, difficulty, code:string, isError:bool,
     *     answerMode:'text'|'mcq', options?:string[]   // options present only in MCQ mode
     *   } | null,
     *   reveal: {                   // present in REVEAL only; null otherwise
     *     output:string, explanation:string, isError:bool,
     *     correctCount:int, answeredCount:int
     *   } | null,
     *   timer: { phaseEndsAt:int|null, durationMs:int, serverNow:int },  // ms epoch; client uses (phaseEndsAt - serverNow) as remaining
     *   counts: { answered:int, total:int },
     *   players: [ { id, name, score:int, connected:bool, answered:bool, avatar:{e,c}|null } ],
     *   leaderboard: [ { id, name, score:int, rank:int, prevRank:int|null, delta:int, avatar:{e,c}|null } ]
     * }
     */
  };
});
