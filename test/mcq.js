/*
 * test/mcq.js — verifies MCQ answer mode and player-chosen avatars end-to-end over Socket.IO.
 * Exit 0 on success, non-zero on the first failed assertion.
 */
'use strict';

process.env.PORT = process.env.PORT || '3941';
const PORT = Number(process.env.PORT);
const URL = 'http://localhost:' + PORT;

const PROTO = require('../src/protocol.js');
const { SNIPPETS } = require('../src/snippets.js');
const { io } = require('socket.io-client');
const { EV, PHASE } = PROTO;
const byId = new Map(SNIPPETS.map((s) => [s.id, s]));

let passed = 0;
function ok(cond, msg) {
  if (!cond) { console.error('  ✗ FAIL: ' + msg); throw new Error('Assertion failed: ' + msg); }
  passed += 1;
  console.log('  ✓ ' + msg);
}
function connect() { return io(URL, { transports: ['websocket'], forceNew: true, reconnection: false }); }
function emitAck(s, ev, p, t = 3000) {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('ack timeout ' + ev)), t);
    s.emit(ev, p, (r) => { clearTimeout(to); resolve(r); });
  });
}
function waitFor(s, ev, pred, t = 4000) {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('timeout ' + ev)), t);
    function h(p) { if (!pred || pred(p)) { clearTimeout(to); s.off(ev, h); resolve(p); } }
    s.on(ev, h);
  });
}
function waitUntil(get, pred, t = 4000, i = 25) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function c() {
      const v = get();
      if (v && pred(v)) return resolve(v);
      if (Date.now() - start > t) return reject(new Error('waitUntil timeout'));
      setTimeout(c, i);
    })();
  });
}

async function main() {
  require('../server.js');
  await new Promise((r) => setTimeout(r, 300));

  // ---------- MCQ + avatar ----------
  const host = connect();
  await waitFor(host, 'connect', null);
  const hs = { state: null };
  host.on(EV.STATE, (s) => (hs.state = s));

  const created = await emitAck(host, EV.HOST_CREATE, {
    mode: PROTO.MODE.FULL, roundCount: 3, content: 'all', answerMode: 'mcq', timerSeconds: 20,
  });
  ok(created.ok, 'can create an MCQ room');

  const ada = connect();
  await waitFor(ada, 'connect', null);
  const chosen = { e: 2, c: 4 };
  const join = await emitAck(ada, EV.PLAYER_JOIN, { roomCode: created.roomCode, name: 'Ada', avatar: chosen });
  ok(join.ok, 'player joins with a chosen avatar');

  await waitUntil(() => hs.state, (s) => s.players.length === 1);
  ok(JSON.stringify(hs.state.players[0].avatar) === JSON.stringify(chosen), 'chosen avatar propagates into room state');

  host.emit(EV.HOST_START);
  const q = await waitUntil(() => hs.state, (s) => s.phase === PHASE.QUESTION);
  ok(q.question.answerMode === 'mcq', 'question advertises answerMode=mcq');
  ok(Array.isArray(q.question.options) && q.question.options.length === 4, 'exactly 4 options are served');
  const correct = byId.get(q.question.id).output;
  ok(q.question.options.includes(correct), 'the correct output is one of the options');
  const norm = (x) => String(x).replace(/\s+/g, '').replace(/"/g, "'");
  ok(new Set(q.question.options.map(norm)).size === 4, 'all 4 options are distinct');

  // player picks the correct option
  const res = await emitAck(ada, EV.PLAYER_ANSWER, { text: correct });
  ok(res.ok && res.locked, 'player can submit a chosen MCQ option');
  const resultP = waitFor(ada, EV.RESULT, null);
  host.emit(EV.HOST_REVEAL);
  const result = await resultP;
  ok(result.correct === true, 'picking the correct option scores correct');
  await waitUntil(() => hs.state, (s) => s.phase === PHASE.REVEAL);

  host.emit(EV.HOST_NEXT);
  const sb = await waitUntil(() => hs.state, (s) => s.phase === PHASE.SCOREBOARD);
  ok(JSON.stringify(sb.leaderboard[0].avatar) === JSON.stringify(chosen), 'avatar also rides along on the leaderboard');
  host.emit(EV.HOST_CLOSE);

  // ---------- text mode still has no options ----------
  const host2 = connect();
  await waitFor(host2, 'connect', null);
  const hs2 = { state: null };
  host2.on(EV.STATE, (s) => (hs2.state = s));
  const c2 = await emitAck(host2, EV.HOST_CREATE, { mode: PROTO.MODE.QUICK, content: 'all', answerMode: 'text' });
  ok(c2.ok, 'can create a text-mode room');
  const p2 = connect();
  await waitFor(p2, 'connect', null);
  await emitAck(p2, EV.PLAYER_JOIN, { roomCode: c2.roomCode, name: 'Bo' });
  host2.emit(EV.HOST_START);
  const q2 = await waitUntil(() => hs2.state, (s) => s.phase === PHASE.QUESTION);
  ok(q2.question.answerMode === 'text', 'text mode reports answerMode=text');
  ok(q2.question.options === undefined, 'text mode serves no options');
  host2.emit(EV.HOST_CLOSE);

  [host, ada, host2, p2].forEach((s) => s.close());
  console.log('\n' + passed + ' MCQ/avatar assertions passed.\n');
  setTimeout(() => process.exit(0), 150);
}

main().catch((e) => { console.error('\nMCQ TEST FAILED:', e.message); process.exit(1); });
