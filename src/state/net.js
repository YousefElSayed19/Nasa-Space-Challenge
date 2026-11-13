// Online multiplayer (peer-to-peer). The host's browser runs the real game; guests send their actions to it
// and receive the shared design state back. A free PeerJS broker introduces the browsers to each other.
import { store } from './store.js';
import { bus } from './bus.js';
import { setMission } from '../engine/index.js';

const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'missionforge-room-';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no look-alike letters
// STUN finds the route; the free TURN relay is a backup if a direct connection is blocked
const ICE = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
] };
/** Design state that every player shares (everything else, like the open panel, stays local). */
export const SHARED_KEYS = ['missionId', 'mode', 'team', 'stage', 'locked', 'installed', 'rocket', 'propLoaded', 'log', 'changeFees', 'changeCount',
  'checks', 'verdicts', 'signoff', 'objections', 'overruled', 'loan', 'changeMode', 'topUp', 'result', 'screen'];

export const net = { role: 'solo', code: null, peer: null, conns: [], host: null, players: [], myId: null, myRole: 0, status: '', listeners: new Set() };
const emit = () => net.listeners.forEach(f => f({ ...net }));
export const onNet = f => { net.listeners.add(f); return () => net.listeners.delete(f); };
const setStatus = s => { net.status = s; emit(); };

function loadPeer() {
  if (window.Peer) return Promise.resolve(window.Peer);
  return new Promise((res, rej) => {
    const sc = document.createElement('script'); sc.src = PEERJS_URL; sc.async = true;
    sc.onload = () => (window.Peer ? res(window.Peer) : rej(new Error('PeerJS did not load')));
    sc.onerror = () => rej(new Error('Could not load the multiplayer library. Check the internet connection.'));
    document.head.appendChild(sc);
  });
}
const newCode = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
export const inviteLink = code => `${location.origin}${location.pathname}?room=${code}`;

function pickShared(s) { const o = {}; SHARED_KEYS.forEach(k => { o[k] = s[k]; }); return o; }

// ---------- staying connected ----------
const explain = t => ({
  network: 'Lost the connection to the free PeerJS server. Reconnecting… If this keeps happening, this network may block 0.peerjs.com: try a phone hotspot.',
  'server-error': 'The free PeerJS server had a problem. Reconnecting…',
  'socket-error': 'Lost the connection to the free PeerJS server. Reconnecting…',
  'socket-closed': 'Lost the connection to the free PeerJS server. Reconnecting…',
  'browser-incompatible': 'This browser does not support online play. Use Chrome or Edge.',
}[t] || 'Connection problem: ' + t);
/** Re-register with the broker after a drop, so the room code keeps working. Already-connected players stay connected. */
function keepAlive(peer) {
  let tries = 0;
  const retry = () => { if (peer.destroyed || !peer.disconnected) return; tries++; try { peer.reconnect(); } catch (e) {} if (tries < 30) setTimeout(retry, Math.min(8000, 1500 * tries)); };
  peer.on('disconnected', () => { setStatus(explain('network')); setTimeout(retry, 1000); });
  peer.on('open', () => { tries = 0; if (net.role === 'host') setStatus('Room ready'); });
  peer.on('error', e => { setStatus(explain(e.type || e.message)); if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type)) setTimeout(retry, 1500); });
}

// ---------- host ----------
let unsub = null, sendTimer = null;
export async function hostRoom(name, profile) {
  const Peer = await loadPeer();
  leaveRoom();
  setStatus('Creating room…');
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = newCode();
    try {
      const peer = await new Promise((res, rej) => {
        const p = new Peer(PREFIX + code, { config: ICE });
        p.on('open', () => res(p)); p.on('error', e => rej(e));
      });
      Object.assign(net, { role: 'host', code, peer, conns: [], myId: peer.id, myRole: 0, players: [{ id: peer.id, name, role: 0, profile }] });
      peer.on('connection', conn => acceptGuest(conn));
      keepAlive(peer);
      // share the design whenever it changes (throttled)
      unsub = store.sub(() => { if (!sendTimer) sendTimer = setTimeout(() => { sendTimer = null; broadcast({ t: 'state', s: pickShared(store.get()) }); }, 90); });
      setStatus('Room ready'); return code;
    } catch (e) { if (e.type !== 'unavailable-id') { setStatus('Could not create the room: ' + (e.type || e.message)); throw e; } }
  }
  throw new Error('No free room code');
}
function acceptGuest(conn) {
  conn.on('open', () => {});
  conn.on('data', msg => {
    if (msg.t === 'hello') {
      if (net.players.length >= 4) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
      const used = new Set(net.players.map(p => p.role));
      const role = [0, 1, 2, 3].find(r => !used.has(r));
      net.players.push({ id: conn.peer, name: msg.name || 'Engineer', role, profile: msg.profile });
      net.conns.push(conn);
      conn.send({ t: 'welcome', role, code: net.code });
      sendPlayers(); conn.send({ t: 'state', s: pickShared(store.get()) });
      bus.emit('net-toast', `${msg.name || 'An engineer'} joined the room.`);
    } else if (msg.t === 'act') {
      bus.emit('net-act', msg);
    } else if (msg.t === 'pos') {
      bus.emit('net-pos', { ...msg, id: conn.peer });
      broadcast({ ...msg, id: conn.peer }, conn);
    }
  });
  conn.on('close', () => dropPeer(conn.peer));
  conn.on('error', () => dropPeer(conn.peer));
}
function dropPeer(id) {
  const p = net.players.find(x => x.id === id);
  net.players = net.players.filter(x => x.id !== id); net.conns = net.conns.filter(c => c.peer !== id);
  if (p) bus.emit('net-toast', `${p.name} left the room.`);
  bus.emit('net-left', id); sendPlayers();
}
function sendPlayers() { broadcast({ t: 'players', players: net.players }); emit(); }
export function broadcast(msg, except) { net.conns.forEach(c => { if (c !== except && c.open) c.send(msg); }); }
export function startGame(settings) { broadcast({ t: 'start', ...settings }); }

// ---------- guest ----------
export async function joinRoom(code, name, profile) {
  code = (code || '').toUpperCase().trim();
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { return await joinOnce(code, name, profile, attempt); }
    catch (e) { lastErr = e; if (e && (e.message === 'full')) break; setStatus(`Trying room ${code} again (${attempt}/3)…`); await new Promise(r => setTimeout(r, 2500)); }
  }
  setStatus(lastErr && lastErr.type === 'peer-unavailable' ? `Room ${code} was not found. Check the code, and that the host’s room page is still open.` : 'Could not join. ' + (lastErr ? explain(lastErr.type || lastErr.message) : ''));
  throw lastErr;
}
async function joinOnce(code, name, profile, attempt) {
  const Peer = await loadPeer();
  leaveRoom();
  setStatus('Connecting to room ' + code + '…' + (attempt > 1 ? ` (try ${attempt})` : ''));
  const peer = await new Promise((res, rej) => { const p = new Peer(undefined, { config: ICE }); p.on('open', () => res(p)); p.on('error', rej); });
  return new Promise((res, rej) => {
    const conn = peer.connect(PREFIX + code, { reliable: true });
    const fail = setTimeout(() => { try { peer.destroy(); } catch (e) {} rej(Object.assign(new Error('timeout'), { type: 'timeout' })); }, 12000);
    peer.on('error', e => { clearTimeout(fail); try { peer.destroy(); } catch (x) {} rej(e); });
    conn.on('open', () => { Object.assign(net, { role: 'guest', code, peer, host: conn, myId: peer.id, conns: [conn] }); conn.send({ t: 'hello', name, profile }); });
    conn.on('data', msg => {
      if (msg.t === 'welcome') { clearTimeout(fail); net.myRole = msg.role; setStatus('Joined room ' + code); keepAlive(peer); res(msg); }
      else if (msg.t === 'full') { clearTimeout(fail); setStatus('That room is full (4 players).'); rej(new Error('full')); }
      else if (msg.t === 'players') { net.players = msg.players; emit(); }
      else if (msg.t === 'state') applyState(msg.s);
      else if (msg.t === 'start') bus.emit('net-start', msg);
      else if (msg.t === 'pos') bus.emit('net-pos', msg);
    });
    conn.on('close', () => { if (net.role === 'guest') { bus.emit('net-toast', 'The host left. The room is closed.'); leaveRoom(); } });
  });
}
function applyState(sh) {
  const s = store.get();
  if (sh.missionId && sh.missionId !== s.missionId) { setMission(sh.missionId); bus.emit('mission', sh.missionId); }
  const launching = sh.screen === 'launching' && s.screen !== 'launching';
  // a guest only follows the host into the shared screens; menus stay local
  const patch = { ...sh };
  if (!['game', 'launching', 'mission', 'report'].includes(sh.screen) || ['start', 'intro'].includes(s.screen)) delete patch.screen;
  store.set(patch);
  if (launching) bus.emit('launch');
}
export function sendAct(name, args) { if (net.host && net.host.open) net.host.send({ t: 'act', name, args }); }
export function sendPos(p) { if (net.role === 'host') broadcast({ t: 'pos', id: net.myId, ...p }); else if (net.host && net.host.open) net.host.send({ t: 'pos', ...p }); }

export function leaveRoom() {
  if (unsub) { unsub(); unsub = null; }
  try { net.conns.forEach(c => c.close()); } catch (e) {}
  try { net.peer && net.peer.destroy(); } catch (e) {}
  Object.assign(net, { role: 'solo', code: null, peer: null, conns: [], host: null, players: [], myId: null, myRole: 0 });
  bus.emit('net-left', '*'); emit();
}
