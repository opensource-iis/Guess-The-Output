/*
 * server.js — HTTP + WebSocket entry point for "Guess the Output".
 *
 * Responsibilities (kept deliberately thin):
 *   - Serve the built React client (client/dist) (Express).
 *   - Attach Socket.IO to the same HTTP server (the client lib is auto-served at
 *     /socket.io/socket.io.js).
 *   - Translate every PROTO.EV socket event into a call on the RoomManager engine.
 *   - Validate all client input; never trust the client.
 *   - On boot, print a LAN banner so the teacher knows the host + player URLs.
 *
 * All game logic lives in src/rooms.js. This file is just plumbing.
 */

'use strict';

const path = require('path');
const http = require('http');
const os = require('os');

const express = require('express');
const { Server } = require('socket.io');

const PROTO = require('./src/protocol.js');
const { RoomManager } = require('./src/rooms.js');
const { getMeta, getSnippets } = require('./src/snippets.js');

const { EV } = PROTO;
const PORT = Number(process.env.PORT) || 3000;

// -------------------------------------------------------------------------------------
// LAN IP detection (for the boot banner / join URLs)
// -------------------------------------------------------------------------------------

function detectLanIp() {
  const ifaces = os.networkInterfaces();
  // Prefer common LAN ranges; fall back to the first non-internal IPv4 we find.
  let fallback = null;
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      const family = typeof net.family === 'string' ? net.family : net.family === 4 ? 'IPv4' : '';
      if (family !== 'IPv4' || net.internal) continue;
      if (fallback == null) fallback = net.address;
      if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(net.address)) {
        return net.address;
      }
    }
  }
  return fallback || 'localhost';
}

// The player join URL. Prefer the host browser's own origin (so a DEPLOYED site hands out its
// real public URL / domain), falling back to the detected LAN address for local play.
function isHttpOrigin(o) {
  return typeof o === 'string' && o.length < 256 && /^https?:\/\/[^\s/]+$/i.test(o);
}
function buildJoinUrl(origin, code) {
  if (isHttpOrigin(origin)) return origin.replace(/\/+$/, '') + '/player?code=' + code;
  return 'http://' + detectLanIp() + ':' + PORT + '/player?code=' + code;
}

// -------------------------------------------------------------------------------------
// App + server
// -------------------------------------------------------------------------------------

const app = express();
app.set('trust proxy', true); // correct client info behind a deploy proxy (Render/Railway/Fly/etc.)
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Allow a separately-hosted frontend (e.g. on Vercel) to call the API cross-origin.
app.use('/api', (_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Snippet-bank metadata so the host setup screen can build its topic/difficulty filters
// and show live "N snippets match" counts without shipping the answers to the client.
app.get('/api/meta', (_req, res) => {
  res.json(getMeta());
});

// A single example snippet matching the host's current filters, for the setup preview.
// Returns the CODE only (never the output/answer), so it's safe to show before a round.
app.get('/api/sample', (req, res) => {
  const matches = getSnippets({
    content: req.query.content,
    difficulty: req.query.difficulty,
    topic: req.query.topic,
  });
  if (!matches.length) return res.json({ code: null });
  const s = matches[Math.floor(Math.random() * matches.length)];
  res.json({ code: s.code, tier: s.tier, difficulty: s.difficulty, topic: s.topic, isError: !!s.is_error });
});

// Serve the built React client (Vite output). Run `npm run build` first.
const CLIENT_DIST = path.join(__dirname, 'client', 'dist');
app.use(express.static(CLIENT_DIST));

// SPA fallback: any other GET (/, /host, /player, ...) returns index.html so the
// client-side router can take over. (/socket.io and /api are handled before this.)
app.get('*', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

// -------------------------------------------------------------------------------------
// Engine wiring
// -------------------------------------------------------------------------------------

// Emit adapter handed to the engine so it never touches `io` directly.
const ioAdapter = {
  toRoom(code) {
    return io.to('room:' + code);
  },
  toSocket(socketId) {
    return socketId ? io.to(socketId) : null;
  }
};

const manager = new RoomManager(ioAdapter);

/** Safely invoke a socket ack callback. */
function ack(cb, payload) {
  if (typeof cb === 'function') {
    try {
      cb(payload);
    } catch (_e) {
      /* client-side ack threw; nothing we can do server-side */
    }
  }
}

/** Find the room a given socket currently belongs to (host or player). */
function roomForSocket(socket) {
  const code = socket.data && socket.data.roomCode;
  if (!code) return null;
  return manager.getRoom(code);
}

io.on('connection', (socket) => {
  socket.data = socket.data || {};

  // ---- HOST: create -----------------------------------------------------------------
  socket.on(EV.HOST_CREATE, (payload, cb) => {
    const data = payload && typeof payload === 'object' ? payload : {};
    const result = manager.createRoom({
      mode: data.mode,
      teamMode: data.teamMode,
      roundCount: data.roundCount,
      content: data.content,
      difficulty: data.difficulty,
      topic: data.topic,
      answerMode: data.answerMode,
      timerSeconds: data.timerSeconds,
      hostSocketId: socket.id
    });
    if (!result.ok) {
      ack(cb, { ok: false, error: result.error || 'Could not create room.' });
      return;
    }
    const room = result.room;
    socket.data.role = 'host';
    socket.data.roomCode = room.code;
    socket.join('room:' + room.code);

    const joinUrl = buildJoinUrl(data.origin, room.code);
    room.joinUrl = joinUrl; // travels on every STATE so the lobby URL/QR survive re-renders & host reconnect
    ack(cb, {
      ok: true,
      roomCode: room.code,
      hostToken: room.hostToken,
      joinUrl
    });
    room.broadcastState();
  });

  // ---- HOST: reconnect --------------------------------------------------------------
  socket.on(EV.HOST_RECONNECT, (payload, cb) => {
    // A socket already seated as a player must not be able to promote itself to host.
    if (socket.data.role === 'player') {
      ack(cb, { ok: false, error: 'Already joined as a player.' });
      return;
    }
    const data = payload && typeof payload === 'object' ? payload : {};
    const result = manager.reconnectHost({
      roomCode: data.roomCode,
      hostToken: data.hostToken,
      socketId: socket.id
    });
    if (!result.ok) {
      ack(cb, { ok: false, error: result.error || 'Could not reconnect.' });
      return;
    }
    socket.data.role = 'host';
    socket.data.roomCode = result.room.code;
    socket.join('room:' + result.room.code);
    ack(cb, { ok: true });
    // Push current state straight back to this host socket.
    result.room.emitToSocket(socket.id, EV.STATE, result.room.buildState());
  });

  // ---- HOST: phase controls ---------------------------------------------------------
  function hostAction(fn) {
    const room = roomForSocket(socket);
    if (!room || !manager.isHost(room, socket.id)) {
      socket.emit(EV.ERROR, { message: 'Not authorized for that action.' });
      return;
    }
    fn(room);
  }

  socket.on(EV.HOST_START, () => {
    hostAction((room) => {
      if (!room.start()) {
        socket.emit(EV.ERROR, { message: 'Cannot start (need at least one player).' });
      }
    });
  });

  socket.on(EV.HOST_REVEAL, () => {
    hostAction((room) => room.reveal());
  });

  socket.on(EV.HOST_NEXT, () => {
    hostAction((room) => room.next());
  });

  socket.on(EV.HOST_CONTINUE, () => {
    hostAction((room) => room.continue());
  });

  socket.on(EV.HOST_SKIP, () => {
    hostAction((room) => room.skip());
  });

  socket.on(EV.HOST_KICK, (payload) => {
    const data = payload && typeof payload === 'object' ? payload : {};
    hostAction((room) => {
      if (data.playerId && room.kick(String(data.playerId))) {
        room.broadcastState();
      }
    });
  });

  socket.on(EV.HOST_CLOSE, () => {
    hostAction((room) => room.close('The host ended the game.'));
  });

  // ---- PLAYER: join -----------------------------------------------------------------
  socket.on(EV.PLAYER_JOIN, (payload, cb) => {
    // Lightweight per-socket throttle so a script can't flood joins and fill a room in ms.
    // A legitimate (re)join happens at most once every few seconds.
    const tNow = Date.now();
    if (tNow - (socket.data._lastJoin || 0) < 400) {
      ack(cb, { ok: false, error: 'Slow down a moment and try again.' });
      return;
    }
    socket.data._lastJoin = tNow;

    const data = payload && typeof payload === 'object' ? payload : {};
    const room = manager.getRoom(data.roomCode);
    if (!room) {
      ack(cb, { ok: false, error: 'Room not found.' });
      return;
    }
    const result = room.joinPlayer({
      name: data.name,
      token: data.token,
      avatar: data.avatar,
      socketId: socket.id
    });
    if (!result.ok) {
      ack(cb, { ok: false, error: result.error || 'Could not join.' });
      return;
    }
    socket.data.role = 'player';
    socket.data.roomCode = room.code;
    socket.data.playerId = result.player.id;
    socket.join('room:' + room.code);

    ack(cb, { ok: true, playerId: result.player.id, token: result.player.token });
    // Broadcast updated roster, and hand this player the current snapshot directly so a
    // late/reconnecting joiner lands in the correct phase immediately.
    room.broadcastState();
    room.emitToSocket(socket.id, EV.STATE, room.buildState());
  });

  // ---- PLAYER: answer ---------------------------------------------------------------
  socket.on(EV.PLAYER_ANSWER, (payload, cb) => {
    const data = payload && typeof payload === 'object' ? payload : {};
    const room = roomForSocket(socket);
    if (!room) {
      ack(cb, { ok: false, error: 'You are not in a room.' });
      return;
    }
    const result = room.submitAnswer(socket.id, data.text);
    ack(cb, result);
  });

  // ---- PLAYER: leave ----------------------------------------------------------------
  socket.on(EV.PLAYER_LEAVE, () => {
    const room = roomForSocket(socket);
    if (room && socket.data.role === 'player') {
      room.handlePlayerSocketDrop(socket.id);
      room.broadcastState();
    }
    socket.leave('room:' + (socket.data.roomCode || ''));
    socket.data.roomCode = null;
  });

  // ---- transport drop ---------------------------------------------------------------
  socket.on('disconnect', () => {
    manager.handleDisconnect(socket.id);
  });
});

// -------------------------------------------------------------------------------------
// Boot
// -------------------------------------------------------------------------------------

// Safety net: a single malformed event must never take down the server for a whole
// classroom. Log and keep serving the other 49 players rather than crashing the process.
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledRejection]', err);
});

server.listen(PORT, () => {
  const ip = detectLanIp();
  const line = '═'.repeat(60);
  /* eslint-disable no-console */
  console.log('\n' + line);
  console.log('  Guess the Output — server is live');
  console.log(line);
  console.log('  Host (projector):  http://' + ip + ':' + PORT + '/host');
  console.log('  Players join at:   http://' + ip + ':' + PORT);
  console.log('  Local (this PC):   http://localhost:' + PORT);
  console.log(line + '\n');
  /* eslint-enable no-console */
});

module.exports = { app, server, io, manager };
