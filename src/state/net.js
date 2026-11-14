// Online multiplayer through a public MQTT message server (WebSocket over HTTPS), so it works on any network:
// same hotspot, different hotspots, or any Wi-Fi. No direct device-to-device connection is needed.
// The host's browser runs the real game; guests send their actions to it and receive the shared design back.
import { store } from './store.js';
import { bus } from './bus.js';
import { setMission } from '../engine/index.js';

const MQTT_URL = 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js';
// free public brokers, tried in order
const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
const TOPIC = code => `missionforge/v1/room/${code}`;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Design state that every player shares (everything else, like the open panel, stays local). */
export const SHARED_KEYS = ['missionId', 'mode', 'team', 'stage', 'locked', 'installed', 'rocket', 'propLoaded', 'log', 'changeFees', 'changeCount',
  'checks', 'verdicts', 'signoff', 'objections', 'overruled', 'loan', 'changeMode', 'topUp', 'result', 'screen', 'emerg', 'emergPlan'];

export const net = { role: 'solo', code: null, client: null, players: [], myId: null, myRole: 0, status: '', listeners: new Set() };
const emit = () => net.listeners.forEach(f => f({ ...net }));
export const onNet = f => { net.listeners.add(f); return () => net.listeners.delete(f); };
const setStatus = s => { net.status = s; emit(); };
const newCode = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
const newId = () => Math.random().toString(36).slice(2, 10);
export const inviteLink = code => `${location.origin}${location.pathname}?room=${code}`;
function pickShared(s) { const o = {}; SHARED_KEYS.forEach(k => { o[k] = s[k]; }); return o; }

function loadMqtt() {
  if (window.mqtt) return Promise.resolve(window.mqtt);
  return new Promise((res, rej) => {
    const sc = document.createElement('script'); sc.src = MQTT_URL; sc.async = true;
    sc.onload = () => (window.mqtt ? res(window.mqtt) : rej(new Error('lib')));
    sc.onerror = () => rej(new Error('Could not load the multiplayer library. Check the internet connection.'));
    document.head.appendChild(sc);
  });
}
/** Connect to the first broker that answers. The "will" message tells the others if we vanish. */
async function connect(id, will) {
  const mqtt = await loadMqtt();
  for (const url of BROKERS) {
    try {
      const client = await new Promise((res, rej) => {
        const c = mqtt.connect(url, { clientId: 'mf_' + id, clean: true, connectTimeout: 8000, reconnectPeriod: 2000, keepalive: 20, will });
        const t = setTimeout(() => { c.end(true); rej(new Error('timeout')); }, 9000);
        c.once('connect', () => { clearTimeout(t); res(c); });
        c.once('error', e => { clearTimeout(t); c.end(true); rej(e); });
      });
      client.on('reconnect', () => setStatus('Reconnecting to the message server…'));
      client.on('connect', () => { if (net.role !== 'solo') setStatus(net.role === 'host' ? 'Room ready' : 'Joined room ' + net.code); });
      client.on('offline', () => setStatus('Offline: waiting for the internet connection…'));
      return client;
    } catch (e) { /* try the next broker */ }
  }
  throw new Error('Could not reach a message server. Check the internet connection.');
}
const pub = (sub, msg) => { if (net.client && net.code) net.client.publish(`${TOPIC(net.code)}/${sub}`, JSON.stringify(msg), { qos: 0 }); };

// ---------- host ----------
let unsub = null, sendTimer = null;
export async function hostRoom(name, profile) {
  leaveRoom();
  setStatus('Creating room…');
  const code = newCode(), id = newId();
  const client = await connect(id, { topic: `${TOPIC(code)}/down`, payload: JSON.stringify({ t: 'hostgone' }), qos: 0 });
  Object.assign(net, { role: 'host', code, client, myId: id, myRole: 0, players: [{ id, name, role: 0, profile }] });
  client.subscribe(`${TOPIC(code)}/up`);
  client.on('message', (topic, buf) => { if (!topic.endsWith('/up')) return; let m; try { m = JSON.parse(buf.toString()); } catch (e) { return; } hostHandle(m); });
  unsub = store.sub(() => { if (!sendTimer) sendTimer = setTimeout(() => { sendTimer = null; pub('down', { t: 'state', s: pickShared(store.get()) }); }, 120); });
  setStatus('Room ready'); emit();
  return code;
}
function hostHandle(m) {
  if (m.t === 'hello') {
    if (net.players.some(p => p.id === m.from)) { pub('down', { t: 'welcome', to: m.from, role: net.players.find(p => p.id === m.from).role }); return; }
    if (net.players.length >= 4) { pub('down', { t: 'full', to: m.from }); return; }
    const used = new Set(net.players.map(p => p.role));
    const role = [0, 1, 2, 3].find(r => !used.has(r));
    net.players.push({ id: m.from, name: m.name || 'Engineer', role, profile: m.profile });
    pub('down', { t: 'welcome', to: m.from, role });
    sendPlayers(); pub('down', { t: 'state', s: pickShared(store.get()) });
    bus.emit('net-toast', `${m.name || 'An engineer'} joined the room.`);
  } else if (m.t === 'act') bus.emit('net-act', m);
  else if (m.t === 'pos') { bus.emit('net-pos', { ...m, id: m.from }); pub('down', { ...m, t: 'pos', id: m.from }); }
  else if (m.t === 'bye') dropPeer(m.from);
}
function dropPeer(id) {
  const p = net.players.find(x => x.id === id);
  if (!p) return;
  net.players = net.players.filter(x => x.id !== id);
  bus.emit('net-toast', `${p.name} left the room.`); bus.emit('net-left', id); sendPlayers();
}
function sendPlayers() { pub('down', { t: 'players', players: net.players }); emit(); }
export function broadcast(msg) { pub('down', msg); }
export function startGame(settings) { pub('down', { t: 'start', ...settings }); }

// ---------- guest ----------
export async function joinRoom(code, name, profile) {
  leaveRoom();
  code = (code || '').toUpperCase().trim();
  setStatus('Connecting to room ' + code + '…');
  const id = newId();
  const client = await connect(id, { topic: `${TOPIC(code)}/up`, payload: JSON.stringify({ t: 'bye', from: id }), qos: 0 });
  Object.assign(net, { code, client, myId: id });
  return new Promise((res, rej) => {
    let joined = false;
    client.subscribe(`${TOPIC(code)}/down`, () => {
      // say hello a few times in case the first message is missed
      let n = 0; const hello = () => { if (joined || n++ > 4) return; pub('up', { t: 'hello', from: id, name, profile }); setTimeout(hello, 1500); }; hello();
    });
    const fail = setTimeout(() => { if (!joined) { setStatus(`Room ${code} was not found. Check the code, and that the host’s room page is still open.`); leaveRoom(); rej(new Error('notfound')); } }, 9000);
    client.on('message', (topic, buf) => {
      let m; try { m = JSON.parse(buf.toString()); } catch (e) { return; }
      if (m.to && m.to !== id) return;
      if (m.t === 'welcome') { if (!joined) { joined = true; clearTimeout(fail); net.role = 'guest'; net.myRole = m.role; setStatus('Joined room ' + code); emit(); res(m); } }
      else if (m.t === 'full') { clearTimeout(fail); setStatus('That room is full (4 players).'); leaveRoom(); rej(new Error('full')); }
      else if (!joined) return;
      else if (m.t === 'players') { net.players = m.players; emit(); }
      else if (m.t === 'state') applyState(m.s);
      else if (m.t === 'start') bus.emit('net-start', m);
      else if (m.t === 'pos') { if (m.id !== id) bus.emit('net-pos', m); }
      else if (m.t === 'hostgone') { bus.emit('net-toast', 'The host left. The room is closed.'); leaveRoom(); }
    });
  });
}
function applyState(sh) {
  const s = store.get();
  if (sh.missionId && sh.missionId !== s.missionId) { setMission(sh.missionId); bus.emit('mission', sh.missionId); }
  const launching = sh.screen === 'launching' && s.screen !== 'launching';
  const patch = { ...sh };
  // a guest only follows the host into the shared screens; menus and the intro stay local
  if (!['game', 'launching', 'mission', 'report'].includes(sh.screen) || ['start', 'intro'].includes(s.screen)) delete patch.screen;
  store.set(patch);
  if (launching) bus.emit('launch');
}
export function sendAct(name, args) { pub('up', { t: 'act', from: net.myId, name, args }); }
export function sendPos(p) { if (net.role === 'host') pub('down', { t: 'pos', id: net.myId, ...p }); else if (net.role === 'guest') pub('up', { t: 'pos', from: net.myId, ...p }); }

export function leaveRoom() {
  if (unsub) { unsub(); unsub = null; }
  try { if (net.client) { pub(net.role === 'host' ? 'down' : 'up', net.role === 'host' ? { t: 'hostgone' } : { t: 'bye', from: net.myId }); net.client.end(false); } } catch (e) {}
  Object.assign(net, { role: 'solo', code: null, client: null, players: [], myId: null, myRole: 0 });
  bus.emit('net-left', '*'); emit();
}
if (typeof window !== 'undefined') window.addEventListener('beforeunload', () => { try { leaveRoom(); } catch (e) {} });
