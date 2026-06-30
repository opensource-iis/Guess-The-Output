/*
 * test/smoke.js — headless end-to-end proof of the real-time layer.
 *
 * Boots the REAL server and drives a full 2-round game with two socket.io clients:
 * create -> join -> start -> answer -> reveal -> score -> reconnect -> scoreboard ->
 * podium. Exits 0 on success, non-zero (with the failed assertion) on any failure.
 *
 * Run:  npm run smoke      (or: node test/smoke.js)
 */
'use strict';

process.env.PORT = process.env.PORT || '3939';
const PORT = Number(process.env.PORT);
const URL = 'http://localhost:' + PORT;

const PROTO = require('../src/protocol.js');
const { SNIPPETS } = require('../src/snippets.js');
const { io } = require('socket.io-client');

const { EV, PHASE } = PROTO;
const byId = new Map(SNIPPETS.map((s) => [s.id, s]));

let passed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error('  ✗ FAIL: ' + msg);
    throw new Error('Assertion failed: ' + msg);
  }
  passed += 1;
  console.log('  ✓ ' + msg);
}

function connect() {
  return io(URL, { transports: ['websocket'], forceNew: true, reconnection: false });
}

function emitAck(sock, event, payload, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('ack timeout for ' + event)), timeout);
    sock.emit(event, payload, (res) => {
      clearTimeout(t);
      resolve(res);
    });
  });
}

function waitFor(sock, event, predicate, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout waiting for ' + event)), timeout);
    function handler(payload) {
      if (!predicate || predicate(payload)) {
        clearTimeout(t);
        sock.off(event, handler);
        resolve(payload);
      }
    }
    sock.on(event, handler);
  });
}

// Poll a getter (e.g. the latest tracked STATE) — race-free for state that may have
// already arrived before we started looking.
function waitUntil(getter, predicate, timeout = 4000, interval = 25) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      const v = getter();
      if (v && predicate(v)) return resolve(v);
      if (Date.now() - start > timeout) return reject(new Error('waitUntil timeout'));
      setTimeout(check, interval);
    })();
  });
}

// Track the latest STATE on a socket.
function trackState(sock) {
  const box = { state: null };
  sock.on(EV.STATE, (s) => { box.state = s; });
  return box;
}

const correctAnswerFor = (qid) => byId.get(qid).output; // grade() normalizes both sides

async function main() {
  // Boot the real server (server.js calls server.listen on require).
  require('../server.js');
  await new Promise((r) => setTimeout(r, 300));

  const host = connect();
  await waitFor(host, 'connect', null);
  const hostState = trackState(host);

  // ---- CREATE (full session, 2 rounds, short timer) ----
  const created = await emitAck(host, EV.HOST_CREATE, {
    mode: PROTO.MODE.FULL, teamMode: false, roundCount: 2, content: PROTO.CONTENT.ALL, timerSeconds: 30
  });
  ok(created && created.ok, 'host can create a room');
  ok(/^[A-HJ-NP-Z2-9]{4}$/.test(created.roomCode), 'room code is 4 chars, unambiguous charset: ' + created.roomCode);
  ok(created.joinUrl && created.joinUrl.includes('code=' + created.roomCode), 'create ack returns a joinUrl with the code');
  const code = created.roomCode;

  // ---- JOIN two players ----
  const alice = connect();
  const bob = connect();
  await Promise.all([waitFor(alice, 'connect', null), waitFor(bob, 'connect', null)]);

  const aJoin = await emitAck(alice, EV.PLAYER_JOIN, { roomCode: code, name: 'Alice' });
  ok(aJoin.ok && aJoin.token, 'Alice joins and gets a token');
  const bJoin = await emitAck(bob, EV.PLAYER_JOIN, { roomCode: code, name: 'Bob' });
  ok(bJoin.ok, 'Bob joins');
  const aliceToken = aJoin.token;
  const aliceId = aJoin.playerId;

  // name-taken rejection while connected
  const dup = await emitAck(connect(), EV.PLAYER_JOIN, { roomCode: code, name: 'alice' });
  ok(!dup.ok, 'a second connected client cannot steal the name "alice"');

  // host sees both players in lobby + joinUrl on STATE (the bug we fixed)
  await waitUntil(() => hostState.state, (s) => s.phase === PHASE.LOBBY && s.players.length === 2);
  ok(hostState.state.joinUrl && hostState.state.joinUrl.includes('code=' + code), 'joinUrl is present on the LOBBY STATE snapshot (regression fix)');

  // ---- START round 0 ----
  host.emit(EV.HOST_START);
  const q0 = await waitUntil(() => hostState.state, (s) => s.phase === PHASE.QUESTION);
  ok(q0.question && typeof q0.question.code === 'string', 'round 0 question has snippet code');
  ok(q0.timer && q0.timer.phaseEndsAt > q0.timer.serverNow, 'timer.phaseEndsAt is in the (server) future');
  const qid0 = q0.question.id;

  // empty answer is rejected server-side (no self-lockout)
  const empty = await emitAck(alice, EV.PLAYER_ANSWER, { text: '   ' });
  ok(!empty.ok, 'empty answer is rejected server-side');

  // Alice answers correctly, Bob answers wrong
  const aAns = await emitAck(alice, EV.PLAYER_ANSWER, { text: correctAnswerFor(qid0) });
  ok(aAns.ok && aAns.locked, 'Alice locks in a (correct) answer');
  const aAgain = await emitAck(alice, EV.PLAYER_ANSWER, { text: 'changed my mind' });
  ok(!aAgain.ok, 'Alice cannot answer twice');
  await emitAck(bob, EV.PLAYER_ANSWER, { text: 'definitely-wrong-xyz' });

  // host sees the answered count climb
  await waitFor(host, EV.COUNTS, (c) => c.answered === 2, 4000).catch(() => {});

  // ---- REVEAL round 0 (host ends early) ----
  const aliceResult = waitFor(alice, EV.RESULT, null);
  const bobResult = waitFor(bob, EV.RESULT, null);
  host.emit(EV.HOST_REVEAL);
  const [aR, bR] = await Promise.all([aliceResult, bobResult]);
  ok(aR.correct === true, 'Alice is graded correct');
  ok(aR.points >= PROTO.POINTS.MIN && aR.points <= PROTO.POINTS.MAX, 'Alice earns 500–1000 points (speed-scaled): ' + aR.points);
  ok(bR.correct === false && bR.points === 0, 'Bob is graded wrong for 0 points');
  const revealState = await waitUntil(() => hostState.state, (s) => s.phase === PHASE.REVEAL);
  ok(revealState.reveal && revealState.reveal.output === byId.get(qid0).output, 'reveal STATE carries the real output');
  ok(revealState.reveal.correctCount === 1, 'reveal reports exactly 1 correct');

  // ---- RECONNECTION: drop Alice mid-game, rejoin with her token ----
  const aliceScore = aR.totalScore;
  alice.close();
  await new Promise((r) => setTimeout(r, 200));
  const alice2 = connect();
  await waitFor(alice2, 'connect', null);
  const reAlice = await emitAck(alice2, EV.PLAYER_JOIN, { roomCode: code, name: 'Alice', token: aliceToken });
  ok(reAlice.ok && reAlice.playerId === aliceId, 'Alice reconnects to the SAME seat (same playerId)');
  const afterReconnect = await waitUntil(
    () => hostState.state,
    (s) => s.players.length === 2 && s.players.some((p) => p.id === aliceId && p.connected)
  );
  ok(afterReconnect.players.length === 2, 'no duplicate player after reconnect (still 2 players)');
  const aliceRow = afterReconnect.players.find((p) => p.id === aliceId);
  ok(aliceRow && aliceRow.score === aliceScore, 'Alice keeps her score (' + aliceScore + ') across the reconnect');

  // ---- SCOREBOARD ----
  host.emit(EV.HOST_NEXT);
  const sb = await waitUntil(() => hostState.state, (s) => s.phase === PHASE.SCOREBOARD);
  ok(sb.leaderboard.length === 2 && sb.leaderboard[0].id === aliceId, 'scoreboard ranks Alice #1');

  // ---- round 1 -> podium ----
  host.emit(EV.HOST_CONTINUE);
  const q1 = await waitUntil(() => hostState.state, (s) => s.phase === PHASE.QUESTION && s.roundIndex === 1);
  ok(q1.roundIndex === 1, 'advanced to round 1');
  await emitAck(alice2, EV.PLAYER_ANSWER, { text: correctAnswerFor(q1.question.id) });
  host.emit(EV.HOST_REVEAL);
  await waitUntil(() => hostState.state, (s) => s.phase === PHASE.REVEAL);
  host.emit(EV.HOST_NEXT);
  await waitUntil(() => hostState.state, (s) => s.phase === PHASE.SCOREBOARD);
  host.emit(EV.HOST_CONTINUE);
  const podium = await waitUntil(() => hostState.state, (s) => s.phase === PHASE.PODIUM);
  ok(podium.leaderboard.length === 2 && podium.leaderboard[0].id === aliceId, 'final podium: Alice wins');

  // ---- close ----
  const closedSeen = waitFor(bob, EV.ROOM_CLOSED, null, 4000);
  host.emit(EV.HOST_CLOSE);
  await closedSeen;
  ok(true, 'players are notified when the host closes the room');

  [host, bob, alice2].forEach((s) => s.close());
  console.log('\n' + passed + ' assertions passed. Real-time layer verified end-to-end.\n');
  setTimeout(() => process.exit(0), 150);
}

main().catch((err) => {
  console.error('\nSMOKE TEST FAILED:', err.message);
  process.exit(1);
});
