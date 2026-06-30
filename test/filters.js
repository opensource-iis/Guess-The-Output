/*
 * test/filters.js — verifies the snippet filters (tier / difficulty / topic), the
 * getMeta() metadata, the /api/meta endpoint, and a filtered room create over Socket.IO.
 * Exit 0 on success, non-zero on the first failed assertion.
 */
'use strict';

process.env.PORT = process.env.PORT || '3940';
const PORT = Number(process.env.PORT);
const URL = 'http://localhost:' + PORT;

const http = require('http');
const PROTO = require('../src/protocol.js');
const { SNIPPETS, getSnippets, getMeta } = require('../src/snippets.js');
const { io } = require('socket.io-client');
const { EV, PHASE } = PROTO;

const byId = new Map(SNIPPETS.map((s) => [s.id, s]));
let passed = 0;
function ok(cond, msg) {
  if (!cond) { console.error('  ✗ FAIL: ' + msg); throw new Error('Assertion failed: ' + msg); }
  passed += 1;
  console.log('  ✓ ' + msg);
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get(URL + path, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
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

async function main() {
  // ---------- unit: getSnippets / getMeta ----------
  console.log('Filters — unit:');
  ok(getSnippets('core').every((s) => s.tier === 'core'), 'getSnippets("core") returns only core (legacy string form)');
  ok(getSnippets({ tier: 'library' }).every((s) => s.tier === 'library'), 'tier:library filter is pure');
  ok(getSnippets({ difficulty: 'easy' }).every((s) => s.difficulty === 'easy'), 'difficulty:easy filter is pure');
  ok(getSnippets({ topic: 'strings' }).every((s) => s.topic === 'strings') && getSnippets({ topic: 'strings' }).length > 0, 'topic:strings filter is pure and non-empty');
  ok(getSnippets({ tier: 'core', difficulty: 'tricky' }).every((s) => s.tier === 'core' && s.difficulty === 'tricky'), 'combined tier+difficulty filter is pure');
  const impossible = getSnippets({ tier: 'library', topic: 'lists' });
  ok(impossible.length === 0, 'an impossible combo (library + lists) yields 0 snippets');

  const meta = getMeta();
  ok(meta.total === SNIPPETS.length, 'getMeta().total == bank size (' + meta.total + ')');
  ok(meta.tags.length === SNIPPETS.length, 'getMeta().tags has one entry per snippet');
  ok(meta.topics.reduce((a, t) => a + t.count, 0) === SNIPPETS.length, 'topic counts sum to the bank size');

  // ---------- integration ----------
  console.log('Filters — integration:');
  require('../server.js');
  await new Promise((r) => setTimeout(r, 300));

  const apiMeta = await getJson('/api/meta');
  ok(apiMeta && apiMeta.tags && apiMeta.tags.length === SNIPPETS.length, '/api/meta serves tags for every snippet');
  ok(Array.isArray(apiMeta.topics) && apiMeta.topics.length > 5, '/api/meta serves the topic list');

  const host = connect();
  await waitFor(host, 'connect', null);
  const hs = { state: null };
  host.on(EV.STATE, (s) => (hs.state = s));

  // core + easy room: every served question must be core & easy
  const created = await emitAck(host, EV.HOST_CREATE, {
    mode: PROTO.MODE.FULL, roundCount: 5, content: 'core', difficulty: 'easy', topic: 'all', timerSeconds: 20,
  });
  ok(created.ok, 'can create a core+easy room');
  const aPlayer = connect();
  await waitFor(aPlayer, 'connect', null);
  await emitAck(aPlayer, EV.PLAYER_JOIN, { roomCode: created.roomCode, name: 'Tester' });
  host.emit(EV.HOST_START);
  const q = await waitFor(host, EV.STATE, (s) => s.phase === PHASE.QUESTION);
  ok(q.question.tier === 'core' && q.question.difficulty === 'easy', 'served question respects core+easy filter');
  ok(q.room.difficulty === 'easy' && q.room.content === 'core', 'room state reflects the chosen filters');
  host.emit(EV.HOST_CLOSE);

  // topic filter: every served question maps to the chosen topic
  const host2 = connect();
  await waitFor(host2, 'connect', null);
  const hs2 = { state: null };
  host2.on(EV.STATE, (s) => (hs2.state = s));
  const c2 = await emitAck(host2, EV.HOST_CREATE, { mode: PROTO.MODE.FULL, roundCount: 4, content: 'all', difficulty: 'all', topic: 'strings', timerSeconds: 20 });
  ok(c2.ok, 'can create a topic-filtered (strings) room');
  const p2 = connect();
  await waitFor(p2, 'connect', null);
  await emitAck(p2, EV.PLAYER_JOIN, { roomCode: c2.roomCode, name: 'T2' });
  host2.emit(EV.HOST_START);
  const q2 = await waitFor(host2, EV.STATE, (s) => s.phase === PHASE.QUESTION);
  ok(byId.get(q2.question.id).topic === 'strings', 'served question belongs to the chosen topic (strings)');
  host2.emit(EV.HOST_CLOSE);

  // impossible combo is rejected gracefully
  const host3 = connect();
  await waitFor(host3, 'connect', null);
  const c3 = await emitAck(host3, EV.HOST_CREATE, { mode: PROTO.MODE.QUICK, content: 'library', topic: 'lists' });
  ok(!c3.ok && /no snippets/i.test(c3.error || ''), 'impossible filter combo is rejected with a clear error');

  [host, host2, host3, aPlayer, p2].forEach((s) => s.close());
  console.log('\n' + passed + ' filter assertions passed.\n');
  setTimeout(() => process.exit(0), 150);
}

main().catch((e) => { console.error('\nFILTER TEST FAILED:', e.message); process.exit(1); });
