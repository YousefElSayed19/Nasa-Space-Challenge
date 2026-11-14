// The 3D layer. It only reads and changes the store (GDD 12.1); game rules live in /engine.
import * as THREE from 'three';
import { store, hud } from '../state/store.js';
import { bus } from '../state/bus.js';
import { A } from '../state/actions.js';
import { Sound } from '../audio/sound.js';
import { MISSION, PARTS, STATIONS, FACILITY, partById, rocketById, homeOf, stationById, reviewVerdicts, isFree, isPickerStation, roomAt, roomById } from '../engine/index.js';
import { buildWorld, buildEnvironment } from './facility.js';
import { partMesh, slotPos, rebuildCraft } from './spacecraft.js';
let flying = null;
import { createCharacter, createHands } from './character.js';
import { createPostFX } from './postfx.js';
import { createSpaceView } from './space.js';
import { buildRocket, smokeMaterial } from './rocket.js';
import { tasksFor } from '../state/tasks.js';
import { stepOf } from '../state/tutorial.js';
import { lin } from './materials.js';
import { renderThumbs } from './thumbs.js';
import { ROLES } from '../engine/index.js';
const REVIEW_LOOK = [
  { suit: '#6EA8FF', accent: '#FFC24B', helmet: 'dome', body: 'standard', height: 'medium', pack: 'life', patch: 'star', gloves: 'dark', visor: 'gold' },
  { suit: '#B48CFF', accent: '#3EE0A0', helmet: 'halo', body: 'slim', height: 'short', pack: 'tool', patch: 'none', gloves: 'white', visor: 'blue' },
  { suit: '#FF9A6E', accent: '#6EA8FF', helmet: 'angular', body: 'sturdy', height: 'tall', pack: 'jet', patch: 'none', gloves: 'accent', visor: 'silver' },
  { suit: '#3EE0A0', accent: '#FF9A6E', helmet: 'dome', body: 'standard', height: 'medium', pack: 'life', patch: 'none', gloves: 'dark', visor: 'gold' },
];
let reviewers = [], lastBubbleKey = '';
import { net, sendPos } from '../state/net.js';
import { label as nameLabel } from './textures.js';
const remotes = {}; let posT = 0;
import TOURS from '../data/tours.json';
let flightT = 0, tourReleased = -1, tourView = null;
import { warmPreview } from './preview.js';

const V3 = THREE.Vector3;
const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));
const START_POS = new V3(0, 0, 7);

let renderer, scene, camera, clock, fx = null, world, refs, colliders, hero, space, hands;
let introShot = -1, introClock = 0;
let traveling = null, meT = 0, guideRoomLast = null;
const ray = new THREE.Raycaster();
let launchRocket = null, smoke = [], dust = [], guideTarget = null, lastPtr = '';
let time = 0, holdT = 0, ratchetT = 0, pumpAcc = 0, launchT = -1, launched = false;
const keys = {};
const player = { pos: START_POS.clone(), vel: new V3(), facing: Math.PI, speed: 0, spin: 0, y: 0, vy: 0, air: false, land: 0, airT: 0, boosted: false, thrust: 0, flyMode: false, cruise: 2.2 };
let trail = [];
const FLY_MAX = 2.4; // metres above the floor: a low hover, never up into the roof
let inputYaw = null, lastDrag = -1e9;
const cam = { yaw: 0, pitch: 0.38, pos: new V3(0, 7, 22), look: new V3(0, 2, 0), fov: 60 };
const perf = { ema: 1 / 60, timer: 0, pr: 1, maxPr: 1 };
let bgRaw, bgLin;

export function initScene(container) {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  perf.maxPr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  bgRaw = new THREE.Color('#050816'); bgLin = bgRaw.clone().convertSRGBToLinear();
  scene.fog = new THREE.Fog(bgLin, 36, 80);
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 220);
  clock = new THREE.Clock();

  scene.environment = buildEnvironment(renderer);
  world = buildWorld(scene); refs = world.refs; colliders = world.colliders;
  hero = createCharacter(store.get().profile);
  scene.add(hero.root);
  // the Go/No-Go review board: one reviewer per role, seated behind each console
  reviewers = (refs.reviewSeats || []).map((seat, i) => {
    const c = createCharacter({ ...store.get().profile, ...REVIEW_LOOK[i], nick: ROLES[i] });
    c.root.position.set(seat.x, 0, seat.z); c.root.rotation.y = 0; scene.add(c.root);
    const tag = nameLabel(ROLES[i], REVIEW_LOOK[i].accent); tag.scale.set(1.15, 0.29, 1); tag.position.y = 2.05; c.root.add(tag);
    return { c, seat, tag, verdict: null, t: Math.random() * 6, pose: 0, last: null };
  });
  // first-person hands ride on the camera
  hands = createHands(store.get().profile);
  camera.add(hands.group); scene.add(camera); hands.group.visible = false;
  space = createSpaceView();
  space.setMission(store.get().missionId);
  setTimeout(() => renderThumbs(renderer, scene.environment, () => { store.set(s => ({ thumbsTick: (s.thumbsTick || 0) + 1 })); setTimeout(warmPreview, 400); }), 300);

  applyGraphics(store.get().graphics);
  bindInput();
  bus.on('graphics', applyGraphics);
  bus.on('launch', () => {
    hud.set({ missionPhase: 'Launch', missionKind: 'ok' });
    const s = store.get();
    space.setMission(s.missionId, s.installed, s.rocket);
    tourReleased = -1; tourView = null; space.setHold(0.002);
    if (launchRocket) scene.remove(launchRocket.group);
    launchRocket = buildRocket(rocketById(s.rocket) || rocketById('atlas'), 10);
    launchRocket.group.position.set(0, 0.42, 0); launchRocket.group.visible = false; scene.add(launchRocket.group);
    if (!smoke.length) for (let i = 0; i < 90; i++) { const sp = new THREE.Sprite(smokeMaterial()); sp.visible = false; scene.add(sp); smoke.push({ sp, life: 0, v: new V3() }); }
    launchT = 0; launched = false;
    // step back to a safe viewing spot and wave the spacecraft off
    player.pos.set(3.4, 0, 5.6); player.vel.set(0, 0, 0); player.facing = player.heading = Math.atan2(-3.4, -5.6);
  });
  bus.on('reset', reset);
  bus.on('enter', () => { player.pos.copy(START_POS); player.facing = Math.PI; player.heading = Math.PI; player.turnVel = 0; cam.yaw = 0; cam.pitch = 0.38; });
  bus.on('installed', () => { refs.craftLight.intensity = 6; });
  // other players' engineers
  bus.on('net-pos', m => {
    if (!m.id || m.id === net.myId) return;
    let r = remotes[m.id];
    if (!r) {
      const pl = net.players.find(p => p.id === m.id) || {};
      const hero2 = createCharacter({ ...store.get().profile, ...(pl.profile || {}), nick: pl.name || 'Engineer' });
      const tag = nameLabel(pl.name || 'Engineer', (pl.profile && pl.profile.accent) || '#FFC24B'); tag.scale.set(2.2, 0.55, 1); tag.position.y = 2.6; hero2.root.add(tag);
      scene.add(hero2.root); r = remotes[m.id] = { hero: hero2, x: m.x, z: m.z, y: 0, f: m.f, tx: m.x, tz: m.z, ty: 0, tf: m.f, sp: 0 };
    }
    Object.assign(r, { tx: m.x, tz: m.z, ty: m.y || 0, tf: m.f, sp: m.sp || 0 });
  });
  bus.on('net-left', id => { for (const k in remotes) if (id === '*' || k === id) { scene.remove(remotes[k].hero.root); delete remotes[k]; } });
  bus.on('teleport', (x, z, f) => { player.pos.set(x, 0, z); player.vel.set(0, 0, 0); if (f != null) { player.facing = player.heading = f; cam.yaw = f + Math.PI; } }); // used by automated tests
  bus.on('tourNext', () => { tourReleased += 1; tourView = null; });
  bus.on('tourView', i => { tourView = i; });
  bus.on('travel', roomId => {
    const s = store.get();
    if (traveling || s.screen !== 'game') return;
    const room = roomById(roomId); if (!room) return;
    let dest;
    if (room.id === 'hall') dest = new V3(0, 0, 6.5);
    else { const H = FACILITY.hall, cx = (room.x0 + room.x1) / 2, cz = (room.z0 + room.z1) / 2; const d = new V3(cx - room.door[0], 0, cz - room.door[1]).normalize(); dest = new V3(room.door[0] + d.x * 2.6, 0, room.door[1] + d.z * 2.6); }
    const f = player.facing, ahead = new V3(player.pos.x + Math.sin(f) * 1.8, 0, player.pos.z + Math.cos(f) * 1.8);
    traveling = { t: 0, from: player.pos.clone(), ahead, dest, done: false, faceOut: Math.atan2(dest.x - (room.id === 'hall' ? 0 : room.door[0]), dest.z - (room.id === 'hall' ? 0 : room.door[1])) };
    A.close(); store.set({ carrying: s.carrying });
    refs.portalA.position.set(ahead.x, 1.25, ahead.z); refs.portalA.rotation.y = f; refs.portalA.visible = true; refs.portalA.scale.setScalar(0.01);
    Sound.tone(220, 0.9, 'sine', 0.06, 880);
  });
  bus.on('fly', id => {
    const p = partById(id), from = refs.shelf[id] ? refs.shelf[id].getWorldPosition(new V3()) : new V3(0, 3, 6);
    const kids = refs.craftParts.children, target = kids[kids.length - 1];
    if (!target) return;
    const to = target.position.clone();
    target.visible = false;
    const m = partMesh(p, p.slot === 'array' && !p.round); m.position.copy(from); scene.add(m);
    if (flying) { scene.remove(flying.m); flying.target.visible = true; }
    flying = { m, from, to, target, t: 0 };
    Sound.tone(500, 0.35, 'sine', 0.04, 1100);
  });
  bus.on('mission', id => { refs.setMissionVisuals(id); last.installed = null; onStore(); });
  store.sub(onStore); onStore();
  window.addEventListener('resize', onResize);
  tick();
}

function applyGraphics(mode) {
  const high = mode !== 'low';
  perf.pr = high ? perf.maxPr : 1;
  renderer.setPixelRatio(perf.pr);
  renderer.shadowMap.enabled = high;
  refs.key.castShadow = high;
  scene.traverse(o => { if (o.isMesh) o.material.needsUpdate = true; });
  fx = high ? (fx || createPostFX(renderer, scene, camera)) : null;
  if (fx) { fx.setPixelRatio(perf.pr); fx.setSize(window.innerWidth, window.innerHeight); }
  scene.background = fx ? bgLin : bgRaw; // the composer re-encodes, direct rendering does not
  document.body.classList.toggle('low', !high);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (fx) fx.setSize(window.innerWidth, window.innerHeight);
  if (space) space.setSize();
}

function reset() {
  launchT = -1; launched = false;
  refs.craft.position.set(0, 0, 0); refs.flame.visible = refs.flameCore.visible = false; refs.craft.visible = true;
  if (launchRocket) { scene.remove(launchRocket.group); launchRocket = null; }
  refs.trusses.forEach(tr => { tr.visible = true; });
  smoke.forEach(p => { p.sp.visible = false; p.life = 0; });
  player.pos.copy(START_POS); player.vel.set(0, 0, 0); player.facing = Math.PI; player.heading = Math.PI; player.turnVel = 0; cam.yaw = 0; cam.pitch = 0.38;
  player.y = 0; player.vy = 0; player.air = false; player.flyMode = false; player.boosted = false; player.thrust = 0; hud.set({ flying: false });
}

// ---------- store sync ----------
let last = {};
function onStore() {
  const s = store.get();
  if (s.installed !== last.installed) rebuildCraft(refs.craftParts, s.installed);
  if (s.carrying !== last.carrying) {
    const h = hero.carryHolder;
    while (h.children.length) h.remove(h.children[0]);
    if (s.carrying) h.add(partMesh(partById(s.carrying), true));
  }
  if (s.profile !== last.profile) {
    const p = s.profile, lp = last.profile;
    // nickname only changes the pack name plate; rebuild after typing pauses
    if (!lp || Object.keys(p).some(k => k !== 'nick' && p[k] !== lp[k])) { hero.setProfile(p); hands.setProfile(p); }
    else { clearTimeout(onStore.nickT); onStore.nickT = setTimeout(() => hero.setProfile(store.get().profile), 400); }
  }
  const here = new Set(PARTS.map(p => p.id));
  for (const id in refs.shelf) refs.shelf[id].visible = here.has(id) && !s.installed.includes(id) && s.carrying !== id;
  if (s.rocket) { const m = refs.rockets[s.rocket]; refs.rocketRing.position.set(m.position.x, 0.32, m.position.z); refs.rocketRing.visible = true; }
  else refs.rocketRing.visible = false;
  if (s.stage !== last.stage || s.installed !== last.installed || s.propLoaded !== last.propLoaded || s.verdicts !== last.verdicts) {
    const v = s.stage >= 6 ? (s.verdicts || reviewVerdicts(s)) : null;
    refs.lamps.forEach((l, i) => {
      if (!v || !v[i]) { l.material.color = lin('#555A70'); l.material.emissive = lin('#000000'); l.material.emissiveIntensity = 0; return; }
      const c = v[i].go ? '#3EE0A0' : '#FF5D6C';
      l.material.color = lin(c); l.material.emissive = lin(c); l.material.emissiveIntensity = 2;
    });
    reviewers.forEach((r, i) => { const nv = v && v[i] ? v[i] : null; if (nv && (!r.verdict || r.verdict.go !== nv.go)) r.pose = 1; r.verdict = nv; });
  }
  const tut = stepOf(s);
  const tid = s.screen === 'game' ? ((tut && tut.target) || tasksFor(s).target) : null;
  guideTarget = tid ? stationById(tid) : null;
  last = { installed: s.installed, carrying: s.carrying, profile: s.profile, stage: s.stage, propLoaded: s.propLoaded, verdicts: s.verdicts };
}

// ---------- input ----------
function nearStation() {
  let best = null, bd = 1e9;
  for (const st of STATIONS) {
    const d = Math.hypot(player.pos.x - st.pos[0], player.pos.z - st.pos[1]);
    if (d < st.r && d < bd) { bd = d; best = st; }
  }
  return best;
}
function bindInput() {
  const el = renderer.domElement;
  let drag = null;
  el.addEventListener('pointerdown', e => { Sound.init(); drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (store.get().screen === 'start') player.spin += dx * 0.012;
    else { cam.yaw -= dx * 0.0055; cam.pitch = Math.max(0.05, Math.min(1.2, cam.pitch + dy * 0.004)); lastDrag = performance.now(); if (Math.abs(dx) + Math.abs(dy) > 2) bus.emit('looked'); }
    drag = { x: e.clientX, y: e.clientY };
  });
  const end = () => { drag = null; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', e => {
    keys[e.code] = false;
    const tag = (e.target && e.target.tagName) || '';
    if (e.code === 'Space' && tag !== 'INPUT' && store.get().screen === 'game') e.preventDefault();
  });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  bus.on('vkey', (code, down) => {
    Sound.init();
    if (!down) { keys[code] = false; return; }
    if (code === 'ShiftLeft') { keys[code] = true; return; }
    onKeyDown({ code, target: document.body, repeat: false, preventDefault() {} });
  });
}
function onKeyDown(e) {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  Sound.init();
  const s = store.get();
  if (s.screen !== 'game') return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  // Space jumps; make sure it never presses a button that still has focus
  if (e.code === 'Space' && document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
  keys[e.code] = true;
  if (e.repeat) return;
  if (e.code === 'KeyE') interact();
  else if (e.code === 'KeyV') A.cycleView();
  else if (e.code === 'KeyC') A.toggleCamera();
  else if (e.code === 'KeyF') toggleFlight();
  else if (e.code === 'KeyM') A.toggleMap();
  else if (e.code === 'KeyX') A.putBack();
  else if (e.code === 'Escape') A.close();
  else if (e.code === 'Space') jump(s);
}
function toggleFlight() {
  const s = store.get();
  if (isPickerStation(s.panel)) return;
  if (s.firstPerson) { A.toast('✈ Flight works in third-person view. Press V to switch.', 'warn'); return; }
  player.flyMode = !player.flyMode;
  if (player.flyMode) { player.cruise = Math.min(FLY_MAX, Math.max(1.5, player.y)); if (!player.air) { player.air = true; player.vy = 3.5; player.airT = 0; } }
  else player.boosted = true; // glide down gently
  hud.set({ flying: player.flyMode });
  Sound.tone(player.flyMode ? 300 : 500, 0.25, 'sine', 0.05, player.flyMode ? 700 : 220);
  bus.emit('jumped');
}
function jump(s) {
  if (player.air || isPickerStation(s.panel) || traveling) return;
  const heavy = s.carrying ? Math.min(0.4, partById(s.carrying).mass * 0.04) : 0;
  player.vy = 5.6 * (1 - heavy) * (s.profile.pack === 'jet' ? 1.15 : 1);
  player.air = true; player.airT = 0; player.boosted = false;
  bus.emit('jumped');
  Sound.tone(260, 0.16, 'sine', 0.05, 520);
}
let farToastAt = 0;
function interact() {
  const s = store.get(); const near = nearStation();
  if (!near) {
    if (performance.now() - farToastAt < 2500) return;
    farToastAt = performance.now();
    if (guideTarget) {
      const d = Math.round(Math.hypot(player.pos.x - guideTarget.pos[0], player.pos.z - guideTarget.pos[1]));
      A.toast(`Nothing to use here. ${guideTarget.label} is ${d} m away: follow the gold arrow, then press E when the prompt appears.`, 'warn');
    } else A.toast('Nothing to use here. Walk up to a station until the E prompt appears.', 'warn');
    Sound.tone(220, 0.12, 'triangle', 0.05);
    return;
  }
  if (s.carrying) { if (near.id === homeOf(partById(s.carrying))) A.putBack(); return; }
  if (s.panel === near.id) { if (near.id !== 'fuel') A.close(); return; }
  A.open(near.id);
}

// ---------- movement ----------
function collide(p) {
  const r = 0.45;
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(p.x, c.maxX)), cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
    const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d < r) {
      if (d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
      else {
        const opts = [[c.minX - r - p.x, 0], [c.maxX + r - p.x, 0], [0, c.minZ - r - p.z], [0, c.maxZ + r - p.z]];
        opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1])); p.x += opts[0][0]; p.z += opts[0][1];
      }
    }
  }
  p.x = Math.max(-26.6, Math.min(26.6, p.x)); p.z = Math.max(-22.6, Math.min(22.6, p.z));
}
function updatePlayer(dt, s) {
  // while the full-screen picker is open, arrow keys browse cards instead of walking
  const picking = isPickerStation(s.panel) || !!traveling;
  const tj = hud.get().touch;
  const f = picking ? 0 : (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - (tj ? tj.y : 0);
  const r = picking ? 0 : (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + (tj ? tj.x : 0);
  const auto = s.camMode === 'auto';
  const running = keys.ShiftLeft || keys.ShiftRight;
  let sp = running ? 8.2 : 4.6;
  if (player.air && (player.boosted || player.flyMode)) sp *= 1.45; // flying is faster
  if (s.carrying) sp *= 1 - Math.min(0.35, partById(s.carrying).mass * 0.035); // heavy parts slow you (teaches mass)
  if (player.heading === undefined) player.heading = player.facing;
  let target;
  if (auto) {
    // Auto: steering controls. Hold A/D to keep turning smoothly; W/S move forward and back along the heading.
    const turnTarget = -r * (running ? 2.9 : 2.4);
    player.turnVel = damp(player.turnVel || 0, turnTarget, Math.abs(turnTarget) > 0.01 ? 9 : 14, dt);
    if (s.firstPerson) { cam.yaw += player.turnVel * dt; player.heading = cam.yaw + Math.PI; } // the view is the heading; dragging also steers
    else player.heading += player.turnVel * dt;
    const back = f < 0;
    // backwards is a moonwalk glide: a little quicker with Shift, never a sprint (and never airborne-looking)
    const backSpeed = (running ? 3.2 : 2.1) * (s.carrying ? 0.8 : 1);
    const mag = Math.min(1, Math.abs(f));
    const dir = new V3(Math.sin(player.heading), 0, Math.cos(player.heading)).multiplyScalar(Math.sign(f) * (back ? backSpeed : sp) * mag);
    target = Math.abs(f) > 0.02 ? dir : new V3();
    player.backward = back && Math.abs(f) > 0.02;
  } else {
    // Free: walk relative to the camera; the engineer turns to face the way it walks
    const fwd = new V3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)), right = new V3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
    const dir = fwd.multiplyScalar(f).add(right.multiplyScalar(r));
    const stick = tj ? Math.min(1, Math.hypot(tj.x, tj.y)) : 1;
    target = dir.lengthSq() > 0.0004 ? dir.normalize().multiplyScalar(sp * (tj ? Math.max(0.35, stick) : 1)) : new V3();
    player.turnVel = 0; player.backward = false;
  }
  // smooth acceleration and braking
  const k = target.lengthSq() > 0 ? 9 : 12;
  player.vel.x = damp(player.vel.x, target.x, k, dt);
  player.vel.z = damp(player.vel.z, target.z, k, dt);
  player.pos.addScaledVector(player.vel, dt);
  player.walked = (player.walked || 0) + player.vel.length() * dt;
  if (player.walked - (player.movedAt || 0) > 2.5 || (Math.abs(player.turnVel || 0) > 1 && time - (player.turnSig || 0) > 0.5)) { player.movedAt = player.walked; player.turnSig = time; bus.emit('moved'); }
  collide(player.pos); // at hover height the engineer still goes around desks, racks and tanks
  player.speed = Math.hypot(player.vel.x, player.vel.z);
  player.running = running;
  if (auto) {
    // body faces the heading (walking backward keeps facing forward)
    let d = player.heading - player.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
    player.facing += d * (1 - Math.exp(-16 * dt));
    // third person: the camera swings in behind while moving or turning, unless the player just looked around
    if (!s.firstPerson && (player.speed > 0.4 || Math.abs(player.turnVel) > 0.2) && performance.now() - lastDrag > 900) {
      let dy = player.heading + Math.PI - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      cam.yaw += dy * (1 - Math.exp(-(Math.abs(player.turnVel) > 0.2 ? 7 : 3.2) * dt));
    }
  } else {
    if (player.speed > 0.3) {
      const want = Math.atan2(player.vel.x, player.vel.z);
      let d = want - player.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
      player.facing += d * (1 - Math.exp(-14 * dt));
    }
    player.heading = player.facing;
  }
  // flight: hold Space in the air to fire the thrusters; F keeps you airborne; Q descends
  const canFly = !s.firstPerson; // flight is a third-person feature: it cannot be seen from the visor
  if (!canFly && player.flyMode) { player.flyMode = false; player.boosted = true; hud.set({ flying: false }); }
  const holdUp = !!keys.Space && !picking && canFly, holdDown = !!keys.KeyQ && !picking;
  if (player.air) {
    player.airT += dt;
    let thrust = 0;
    if (player.flyMode) {
      if (holdUp) player.cruise = Math.min(FLY_MAX, player.cruise + dt * 2);
      if (holdDown) player.cruise = Math.max(0.8, player.cruise - dt * 2);
      const want = (player.cruise + Math.sin(time * 2.2) * 0.12 - player.y) * 3.2;
      player.vy += (want - player.vy) * (1 - Math.exp(-4 * dt));
      thrust = 0.55 + (holdUp ? 0.45 : 0) - (holdDown ? 0.3 : 0);
    } else if (holdUp && player.airT > 0.16) {
      player.boosted = true;
      player.vy = Math.min(3.2, player.vy + 22 * dt - 15 * dt);
      if (player.y > FLY_MAX) player.vy = Math.min(player.vy, (FLY_MAX - player.y) * 4); // soft ceiling, well below the roof
      thrust = 1;
    } else {
      // after boosting, fall slowly like a glide; a plain jump uses normal gravity
      player.vy -= (player.boosted ? 7 : 15) * dt;
      if (player.boosted) { player.vy = Math.max(player.vy, holdDown ? -6 : -2.6); thrust = 0.35; }
    }
    player.thrust = thrust;
    player.y += player.vy * dt;
    if (player.y <= 0 && !player.flyMode) {
      player.y = 0; player.air = false; player.boosted = false; player.thrust = 0;
      player.land = Math.min(1, Math.abs(player.vy) / 7);
      player.vy = 0;
      Sound.noise(0.09, 300, 0.07 * player.land + 0.02, 1);
    } else if (player.y < 0.4 && player.flyMode) { player.y = 0.4; player.vy = Math.max(0, player.vy); }
  } else player.thrust = 0;
  Sound.jet(player.air ? player.thrust : 0);
  player.land = Math.max(0, player.land - dt * 5);
}

// ---------- interaction ----------
function updateInteract(dt, s) {
  const near = s.screen === 'game' ? nearStation() : null;
  if (s.panel) { const st = stationById(s.panel); if (Math.hypot(player.pos.x - st.pos[0], player.pos.z - st.pos[1]) > st.r + 1.2) A.close(); }
  let prompt = null;
  if (near) {
    if (s.carrying) {
      const p = partById(s.carrying);
      if (near.id === 'cradle') prompt = { key: 'Hold E', text: `Install ${p.name}` };
      else if (near.id === homeOf(p)) prompt = { key: 'E', text: 'Put it back' };
    } else if (near.id === 'fuel' && s.panel === 'fuel' && s.stage === 5) prompt = { key: 'Hold E', text: 'Pump propellant' };
    else if (s.panel !== near.id) prompt = { key: 'E', text: near.label };
  }
  const installing = !!(s.carrying && near && near.id === 'cradle' && keys.KeyE);
  if (installing) {
    holdT += dt; ratchetT += dt;
    if (ratchetT > 0.11) { ratchetT = 0; Sound.ratchet(); }
    if (holdT >= 0.9) { holdT = 0; A.install(); }
  } else holdT = 0;
  const h = hud.get();
  const pumpDir = s.panel === 'fuel' && s.stage === 5 ? (keys.KeyE || h.uiPump > 0 ? 1 : h.uiPump < 0 ? -1 : 0) : 0;
  if (pumpDir) { pumpAcc += pumpDir * dt * 11; if (Math.abs(pumpAcc) > 0.25) { A.pump(pumpAcc); pumpAcc = 0; } } else pumpAcc = 0;
  const pumping = pumpDir > 0 && store.get().propLoaded < MISSION.tankCap;
  Sound.hum(pumpDir !== 0);
  const holdV = holdT / 0.9;
  const pk = prompt ? prompt.key + prompt.text : '', hk = h.prompt ? h.prompt.key + h.prompt.text : '';
  if (pk !== hk || Math.abs(holdV - h.hold) > 0.01 || h.pumping !== pumping || (near && near.id) !== h.near) hud.set({ prompt, hold: holdV, pumping, near: near && near.id });
  return { installing, pumping: pumpDir !== 0 };
}

// ---------- world animation ----------
function updateWorld(dt, s, acts) {
  refs.mars.rotation.y += dt * 0.25;
  for (const id in refs.shelf) { const h = refs.shelf[id]; if (h.visible && h.userData.spin) h.rotation.y += dt * 0.35; }
  // door signs: show the ones close to you, and always the room of the next task; fade in and out
  const nextRoom = guideTarget ? guideTarget.room : null, inHall = roomAt(player.pos.x, player.pos.z).id === 'hall';
  (refs.signs || []).forEach(g => {
    const d = Math.hypot(player.pos.x - g.x, player.pos.z - g.z);
    const want = s.screen !== 'game' || g.room === nextRoom || (inHall && d < 11) ? 1 : 0;
    const m = g.sprite.material; m.opacity += (want - m.opacity) * (1 - Math.exp(-6 * dt)); g.sprite.visible = m.opacity > 0.02;
  });
  // portal sequence: open, step in, flash, step out of the second portal, both close
  if (traveling) {
    const T = traveling; T.t += dt;
    const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
    const A1 = refs.portalA, B1 = refs.portalB;
    [A1, B1].forEach(p => { if (p.visible) { p.userData.disc.rotation.z -= dt * 3; p.userData.ring.material.emissiveIntensity = 2 + Math.sin(time * 8) * 0.6; } });
    A1.scale.setScalar(Math.max(0.01, ease(T.t / 0.4) * (T.t > 1.5 ? 1 - ease((T.t - 1.5) / 0.35) : 1)));
    if (T.t > 0.35 && T.t < 0.9) { player.pos.lerpVectors(T.from, T.ahead, ease((T.t - 0.35) / 0.55)); player.vel.set(0, 0, 0); }
    if (T.t > 0.75 && !T.flash) { T.flash = true; hud.set({ warp: true }); setTimeout(() => hud.set({ warp: false }), 650); }
    if (T.t > 0.95 && !T.done) {
      T.done = true;
      const out = new V3(T.dest.x - Math.sin(T.faceOut) * 1.4, 0, T.dest.z - Math.cos(T.faceOut) * 1.4);
      B1.position.set(out.x, 1.25, out.z); B1.rotation.y = T.faceOut; B1.visible = true; B1.scale.setScalar(1);
      T.outFrom = out; player.pos.copy(out); player.facing = player.heading = T.faceOut; cam.yaw = T.faceOut + Math.PI;
      const tgt = new V3(player.pos.x, 1.6, player.pos.z); cam.pos.copy(tgt).add(new V3(Math.sin(cam.yaw) * 4, 2.6, Math.cos(cam.yaw) * 4)); cam.look.copy(tgt);
      Sound.tone(880, 0.6, 'sine', 0.05, 330);
    }
    if (T.done && T.t < 1.5) player.pos.lerpVectors(T.outFrom, T.dest, ease((T.t - 0.95) / 0.55));
    if (T.done) B1.scale.setScalar(Math.max(0.01, T.t > 1.5 ? 1 - ease((T.t - 1.5) / 0.35) : 1));
    if (T.t > 1.9) { A1.visible = B1.visible = false; traveling = null; }
  }
  // online: send my position ten times a second, and move the other engineers smoothly
  if (net.role !== 'solo' && s.screen === 'game') { posT += dt; if (posT > 0.1) { posT = 0; sendPos({ x: +player.pos.x.toFixed(2), z: +player.pos.z.toFixed(2), y: +player.y.toFixed(2), f: +player.facing.toFixed(2), sp: +player.speed.toFixed(1) }); } }
  for (const k in remotes) {
    const r = remotes[k], kk = 1 - Math.exp(-10 * dt);
    r.x += (r.tx - r.x) * kk; r.z += (r.tz - r.z) * kk; r.y += (r.ty - r.y) * kk;
    let df = r.tf - r.f; df = Math.atan2(Math.sin(df), Math.cos(df)); r.f += df * kk;
    r.hero.root.position.set(r.x, r.y, r.z); r.hero.root.rotation.y = r.f; r.hero.root.visible = s.screen === 'game';
    r.hero.update(dt, { speed: r.sp, air: r.y > 0.05 });
  }
  // review board
  const inReview = s.screen === 'game' && s.panel === 'review';
  const near = Math.hypot(player.pos.x - (refs.reviewSeats ? refs.reviewSeats[1].x + 0.5 : 0), player.pos.z - (refs.reviewSeats ? refs.reviewSeats[0].z : 0)) < 6;
  const bubbles = [];
  reviewers.forEach((r, i) => {
    r.t += dt; r.pose = Math.max(0, r.pose - dt * 0.4);
    const toYou = Math.atan2(player.pos.x - r.seat.x, player.pos.z - r.seat.z);
    const face = inReview || (near && r.verdict) ? Math.max(-0.5, Math.min(0.5, toYou)) : 0;
    r.base = r.base || 0;
    let d = face - r.base; d = Math.atan2(Math.sin(d), Math.cos(d)); r.base += d * (1 - Math.exp(-4 * dt));
    const go = r.verdict && r.verdict.go, nogo = r.verdict && !r.verdict.go;
    // NO-GO: a slow head-and-shoulders shake toward you; idle: glances at the screen now and then
    const shake = inReview && nogo ? Math.sin(r.t * 6) * 0.1 * (0.4 + Math.min(1, r.pose * 3)) : (!inReview ? Math.sin(r.t * 0.4 + i) * 0.08 : 0);
    r.c.root.rotation.y = r.base + shake;
    r.c.update(dt, { speed: 0, sit: true, wave: inReview && go && Math.sin(r.t * 1.3 + i) > 0.2, carrying: false });
    r.tag.visible = inReview || near;
    r.tag.material.color = lin(!r.verdict ? '#FFFFFF' : go ? '#BDF3DA' : '#FFB3BA');
    if ((inReview || near) && r.verdict && s.screen === 'game') {
      const v3 = new V3(r.seat.x, 2.35, r.seat.z).project(camera);
      if (v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05) bubbles.push({ i, x: Math.round((v3.x + 1) / 2 * window.innerWidth), y: Math.round((1 - v3.y) / 2 * window.innerHeight), go, role: ROLES[i], text: r.verdict.reason, risk: r.verdict.risk });
    }
  });
  const bkey = bubbles.map(b => b.i + ':' + b.go + ':' + Math.round(b.x / 8) + ':' + Math.round(b.y / 8)).join('|');
  if (bkey !== lastBubbleKey) { lastBubbleKey = bkey; hud.set({ reviewBubbles: bubbles }); }

  // tell the map where the player is (a few times a second)
  meT += dt;
  if (meT > 0.12 && s.screen === 'game') {
    meT = 0;
    const here = roomAt(player.pos.x, player.pos.z), there = guideTarget ? (roomById(guideTarget.room) || FACILITY.hall) : null;
    hud.set({ me: { x: player.pos.x, z: player.pos.z, f: player.facing, room: here.id }, guideRoom: there ? there.id : null });
  }
  if (flying) {
    flying.t += dt / 0.9;
    const k = Math.min(1, flying.t), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    flying.m.position.lerpVectors(flying.from, flying.to, e);
    flying.m.position.y += Math.sin(k * Math.PI) * 3;
    flying.m.rotation.y = k * Math.PI * 2;
    if (k >= 1) { scene.remove(flying.m); flying.target.visible = true; Sound.clunk(); flying = null; }
  }
  refs.dust.rotation.y += dt * 0.01;
  refs.craftLight.intensity = damp(refs.craftLight.intensity, 2.6, 3, dt);
  const bst = waypoint(); 
  refs.beacon.visible = refs.beaconRing.visible = !!bst && s.screen === 'game';
  if (bst) {
    const near = Math.hypot(player.pos.x - bst.pos[0], player.pos.z - bst.pos[1]) < bst.r;
    refs.beacon.position.set(bst.pos[0], 3.4 + Math.sin(time * 3) * 0.25, bst.pos[1]);
    refs.beacon.rotation.y += dt * 1.8;
    refs.beacon.scale.setScalar(near ? 0.7 : 1);
    refs.beaconRing.position.set(bst.pos[0], 0.03, bst.pos[1]);
    refs.beaconRing.scale.setScalar(1 + ((time * 0.8) % 1) * 0.6);
    refs.beaconRing.material.opacity = 0.7 * (1 - ((time * 0.8) % 1));
  }
  if (s.carrying && s.screen === 'game') {
    const p = partById(s.carrying);
    refs.mountRing.visible = true; refs.mountRing.position.copy(slotPos(p, s.installed));
    if (p.slot === 'array') refs.mountRing.rotation.set(0, Math.PI / 2, 0);
    else if (p.slot === 'instrument') refs.mountRing.rotation.set(0, 0, 0);
    else refs.mountRing.rotation.set(Math.PI / 2, 0, 0);
    refs.mountRing.scale.setScalar(1 + Math.sin(time * 5) * 0.12 + (acts.installing ? holdT * 0.4 : 0));
  } else refs.mountRing.visible = false;
  // fuel: displayed level eases toward the real value so it never jumps
  const fill = Math.max(0.001, s.propLoaded / MISSION.tankCap);
  const lv = refs.craftLiquid.scale.y = damp(refs.craftLiquid.scale.y, fill, 8, dt);
  refs.craftLiquid.position.y = 2.5 - 0.65 + 0.65 * lv;
  const sf = 1 - s.propLoaded / 130;
  refs.storeLiquids.forEach(l => { l.scale.y = damp(l.scale.y, sf, 8, dt); l.position.y = 0.2 + 1.9 * l.scale.y; });
  const flowing = hud.get().pumping;
  if (flowing) refs.pipeTex.offset.x -= dt * 2.6;
  refs.pipeMat.emissiveIntensity = damp(refs.pipeMat.emissiveIntensity, flowing ? 2.2 : 0.15, 8, dt);
  if (s.screen === 'launching' && launchRocket) {
    if (launchT < 0) launchT = 0;
    launchT += dt;
    const rk = launchRocket.group;
    // 0–1.2 s: the rocket rises out of the floor around the spacecraft; 3.0 s ignition; 3.6 s liftoff
    // 0–0.45 s screen fades to black; the rocket is placed on the pad and the roof opens; 3.0 s ignition; 3.6 s liftoff
    const placed = launchT >= 0.45;
    rk.visible = placed; refs.craft.visible = !placed;
    refs.trusses.forEach(tr => { tr.visible = !placed; });
    refs.beacon.visible = refs.beaconRing.visible = false;
    const lift = Math.max(0, launchT - 3.6);
    rk.position.y = 0.42 + lift * lift * 2.6;
    rk.position.x = launchT > 3 && lift < 0.6 ? Math.sin(launchT * 50) * 0.03 : 0;
    const on = launchT > 3.0;
    launchRocket.flames.forEach((f, i) => { f.visible = on; const k = 1 + Math.random() * 0.25; f.scale.set(k, 0.9 + Math.random() * 0.35 + Math.min(1, lift) * 0.4, k); });
    refs.craftLight.intensity = on ? 9 + Math.random() * 4 : 2.6;
    refs.craftLight.color = lin(on ? '#FFB04B' : '#6EA8FF');
    refs.craftLight.position.set(0, Math.max(1.5, rk.position.y), 2);
    if (on) for (let n = 0; n < 3; n++) {
      const p = smoke.find(q => q.life <= 0); if (!p) break;
      p.life = 1; p.sp.visible = true;
      p.sp.position.set((Math.random() - 0.5) * 0.6, rk.position.y + 0.1, (Math.random() - 0.5) * 0.6);
      const a = Math.random() * Math.PI * 2, sp = lift < 0.3 ? 4 + Math.random() * 3 : 1 + Math.random();
      p.v.set(Math.cos(a) * sp, lift < 0.3 ? 0.4 : -0.5, Math.sin(a) * sp);
    }
    if (launchT > 7.0 && !launched) { launched = true; A.startMission(); }
  }
  smoke.forEach(p => {
    if (p.life <= 0) return;
    p.life -= dt * 0.35;
    p.sp.position.addScaledVector(p.v, dt); p.v.multiplyScalar(1 - dt * 0.8);
    if (p.sp.position.y < 0.3) { p.sp.position.y = 0.3; p.v.y = 0.3; }
    const sc = 1.2 + (1 - p.life) * 5; p.sp.scale.set(sc, sc, 1);
    p.sp.material.opacity = Math.max(0, p.life) * 0.55;
    if (p.life <= 0) p.sp.visible = false;
  });
  if (s.screen !== 'launching' && launchT < 0) refs.craftLight.position.set(0, 6.5, 2);
  if (s.screen !== 'launching' && launchT < 0) refs.craftLight.color = lin('#6EA8FF');
}

// ---------- camera ----------
/** Where the guide arrow should point now: the station if you are in its room, otherwise the next door on the way. */
function waypoint() {
  if (!guideTarget) return null;
  const here = roomAt(player.pos.x, player.pos.z), there = roomById(guideTarget.room) || FACILITY.hall;
  if (here.id === there.id) return guideTarget;
  if (here.id !== 'hall') return { pos: here.door, label: 'Exit to the Assembly Hall', r: 1.6, room: here.id };
  return { pos: there.door, label: `${there.icon} ${there.label}`, r: 1.6, room: 'hall' };
}

function updateCamera(dt, s) {
  let desired, look, fov = 60;
  const target = new V3(player.pos.x, 1.6 + player.y * 0.85, player.pos.z);
  if (s.screen === 'intro') {
    // cinematic shots through the real facility: each shot dollies from one point to another
    const SH = [
      [[16, 9, 9], [-16, 8, 9], [0, 1.5, 0]],
      [[-6, 3.2, -12.6], [-10, 2.8, -13.2], [-12.5, 1.9, -21]],
      [[-17, 3, -1.5], [-24, 2.6, -2.5], [-21, 1.1, -7.5]],
      [[-6.5, 3, 13], [-13.5, 2.6, 13.5], [-10, 1.2, 19.5]],
      [[5.5, 3.6, 7], [-5.5, 3.9, 6], [0, 2.4, 0]],
      [[4, 2, -12.4], [-3.5, 6.5, -13], [0, 3.5, -21]],
      [[-7, 3, -12.6], [-6, 2.6, -14], [-7.5, 1.2, -18.5]],
      [[1.8, 2.3, 10.4], [0.7, 1.9, 9.7], [0, 1.3, START_POS.z]],
    ];
    const i = Math.min(s.introBeat || 0, SH.length - 1);
    if (introShot !== i) { introShot = i; introClock = 0; }
    introClock += dt;
    const k = Math.min(1, introClock / (s.introDur || 7)), e = k * k * (3 - 2 * k); // the dolly lasts as long as the shot
    desired = new V3(...SH[i][0]).lerp(new V3(...SH[i][1]), e); look = new V3(...SH[i][2]); fov = 52;
    if (introClock < dt * 1.5) { cam.pos.copy(desired); cam.look.copy(look); }
  } else if (s.screen === 'start' && s.startStep === 'look') {
    // close-up turntable for the character creator; character sits right of centre
    desired = new V3(START_POS.x - 1.25, 1.55, START_POS.z + 3.4); look = new V3(START_POS.x - 0.95, 1.15, START_POS.z); fov = 42;
  } else if (s.screen === 'start') {
    const a = time * 0.07; desired = new V3(Math.sin(a) * 15, 7.5, Math.cos(a) * 12); look = new V3(0, 2.2, 0);
  } else if (s.screen === 'launching') {
    const ry = launchRocket ? launchRocket.group.position.y : 0;
    look = new V3(0, 4.6 + Math.max(0, ry - 0.42) * 0.9, 0); desired = new V3(-7.5, 1.9, 9.5); fov = 58;
    if (launchT < 0.45) { cam.pos.copy(desired); cam.look.copy(look); }
  } else if (s.firstPerson) {
    // first person and hands view: camera at the eyes (the hands are drawn on the camera itself)
    desired = new V3(player.pos.x, 1.72 + player.y, player.pos.z);
    const a = cam.pitch - 0.38;
    look = desired.clone().add(new V3(-Math.sin(cam.yaw) * Math.cos(a), -Math.sin(a), -Math.cos(cam.yaw) * Math.cos(a)));
    fov = 70;
  } else {
    const d = 7.2;
    desired = target.clone().add(new V3(Math.sin(cam.yaw) * Math.cos(cam.pitch) * d, Math.sin(cam.pitch) * d, Math.cos(cam.yaw) * Math.cos(cam.pitch) * d));
    desired.y = Math.min(9.2, Math.max(0.6, desired.y));
    // keep the camera on the player's side of walls: pull it in front of any wall in between
    const dir = desired.clone().sub(target), dist = dir.length();
    ray.set(target, dir.normalize()); ray.far = dist;
    const hit = ray.intersectObjects(refs.walls, false)[0];
    if (hit) desired.copy(target).addScaledVector(dir, Math.max(0.6, hit.distance - 0.35));
    look = target;
    fov = 60 + (player.running && player.speed > 5 ? 6 : 0);
  }
  const k = s.screen === 'start' ? 3 : s.screen === 'intro' ? 6 : s.firstPerson ? 18 : 8;
  cam.pos.lerp(desired, 1 - Math.exp(-k * dt)); cam.look.lerp(look, 1 - Math.exp(-(k + 2) * dt));
  cam.fov = damp(cam.fov, fov, 5, dt);
  if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  camera.position.copy(cam.pos); camera.lookAt(cam.look);
}

// ---------- screen pointer: label over the target, or an arrow at the screen edge when it is off screen ----------
function updatePointer(s) {
  let ptr = null;
  const wp = waypoint();
  if (wp && s.screen === 'game') {
    const guideTarget = wp;
    const W = window.innerWidth, H = window.innerHeight;
    const v = new V3(guideTarget.pos[0], 4.6, guideTarget.pos[1]).project(camera);
    let x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
    const behind = v.z > 1;
    if (behind) { x = W - x; y = H - y; }
    const m = 70, top = 130, on = !behind && x > m && x < W - m && y > top && y < H - m;
    const dist = Math.round(Math.hypot(player.pos.x - guideTarget.pos[0], player.pos.z - guideTarget.pos[1]));
    if (on) ptr = { on: true, x: Math.round(x), y: Math.round(y), label: guideTarget.label, dist };
    else {
      const cx = W / 2, cy = H / 2, dx = x - cx, dy = y - cy;
      const k = Math.min((W / 2 - m) / Math.abs(dx || 1e-3), (H / 2 - m) / Math.abs(dy || 1e-3));
      ptr = { on: false, x: Math.round(cx + dx * k), y: Math.round(Math.max(top, cy + dy * k)), a: Math.round(Math.atan2(dy, dx) * 180 / Math.PI), label: guideTarget.label, dist };
    }
  }
  const key = ptr ? `${ptr.on}${Math.round(ptr.x / 3)}${Math.round(ptr.y / 3)}${ptr.a}${ptr.dist}${ptr.label}` : '';
  if (key !== lastPtr) { lastPtr = key; hud.set({ ptr }); }
}

// ---------- adaptive resolution keeps frame rate smooth on weaker laptops ----------
function adapt(dt, s) {
  perf.ema = perf.ema * 0.95 + dt * 0.05;
  perf.timer += dt;
  if (perf.timer < 2 || s.graphics === 'low') return;
  perf.timer = 0;
  let pr = perf.pr;
  if (perf.ema > 1 / 45 && pr > 1) pr = Math.max(1, pr - 0.25);
  else if (perf.ema < 1 / 58 && pr < perf.maxPr) pr = Math.min(perf.maxPr, pr + 0.25);
  if (pr !== perf.pr) { perf.pr = pr; renderer.setPixelRatio(pr); if (fx) { fx.setPixelRatio(pr); fx.setSize(window.innerWidth, window.innerHeight); } }
}

let skip = 0;
function tick() {
  requestAnimationFrame(tick);
  const s0 = store.get();
  if (s0.screen === 'game' && isPickerStation(s0.panel) && !flying && (skip++ % 15) !== 0) { clock.getDelta(); return; }
  const dt = Math.min(clock.getDelta(), 0.05); time += dt;
  const s = store.get();
  if (s.screen === 'game') updatePlayer(dt, s);
  else { player.vel.set(0, 0, 0); player.speed = 0; player.y = 0; player.vy = 0; player.air = false; player.flyMode = false; player.boosted = false; player.thrust = 0; Sound.jet(0); if (hud.get().flying) hud.set({ flying: false }); }
  const acts = updateInteract(dt, s);
  if (s.screen === 'start' || s.screen === 'intro') {
    player.pos.copy(START_POS);
    player.facing = damp(player.facing, 0.35 + player.spin + Math.sin(time * 0.3) * 0.25, 4, dt);
  }
  hero.root.position.set(player.pos.x, player.y, player.pos.z);
  hero.root.rotation.y = s.firstPerson && s.screen === 'game' ? cam.yaw + Math.PI : player.facing;
  const fp = s.screen === 'game' && (s.view === 'first' || s.view === 'hands');
  hero.setView(fp ? 'none' : 'full');
  hands.group.visible = s.screen === 'game' && s.view === 'hands';
  // walking backwards with the Auto camera turns into a moonwalk, with an original funk groove
  const moonwalking = s.screen === 'game' && s.camMode === 'auto' && !s.firstPerson && !!player.backward && player.speed > 0.4 && !player.air;
  Sound.groove(moonwalking);
  const ev = hero.update(dt, {
    speed: player.speed, turn: s.screen === "game" ? Math.abs(player.turnVel || 0) : 0, moon: moonwalking, run: player.running, carrying: !!s.carrying,
    fly: player.air && (player.boosted || player.flyMode), thrust: player.air ? player.thrust : 0,
    back: !!player.backward,
    crouch: acts.installing || player.land > 0.15, pump: acts.pumping, wave: s.screen === 'launching' || (s.screen === 'intro' && (s.introBeat === 0 || s.introBeat === 5)), air: player.air, vy: player.vy,
  });
  if (player.air && player.thrust > 0.2 && s.screen === 'game') {
    if (!trail.length) for (let i = 0; i < 60; i++) { const m = new THREE.Sprite(smokeMaterial()); m.material.blending = THREE.AdditiveBlending; m.visible = false; scene.add(m); trail.push({ sp: m, life: 0, c: 0 }); }
    for (let n = 0; n < 2; n++) {
      const q = trail.find(x => x.life <= 0); if (!q) break;
      q.life = 1; q.sp.visible = true; q.c = (time * 0.6 + n * 0.5) % 1;
      q.sp.position.set(player.pos.x + (Math.random() - 0.5) * 0.25, player.y + 0.05 + Math.random() * 0.1, player.pos.z + (Math.random() - 0.5) * 0.25);
      q.sp.material.color = lin(q.c < 0.5 ? (s.profile.accent || '#FFC24B') : '#6EA8FF');
    }
  }
  trail.forEach(q => {
    if (q.life <= 0) return;
    q.life -= dt * 1.6; q.sp.position.y -= dt * 0.9;
    const k = 1 - Math.max(0, q.life), sc = 0.18 + k * 0.5;
    q.sp.scale.set(sc, sc, 1); q.sp.material.opacity = Math.max(0, q.life) * 0.55 * Math.min(1, 0.3 + player.thrust);
    if (q.life <= 0) q.sp.visible = false;
  });
  if (ev && ev.startsWith('step')) {
    Sound.step();
    // a small puff of dust under the foot that just landed
    if (!dust.length) for (let i = 0; i < 16; i++) { const sp = new THREE.Sprite(smokeMaterial()); sp.visible = false; scene.add(sp); dust.push({ sp, life: 0 }); }
    const d = dust.find(q => q.life <= 0);
    if (d && player.speed > 1.2) {
      const side = ev === 'stepR' ? -1 : 1, f = player.facing;
      d.life = 1; d.sp.visible = true;
      d.sp.position.set(player.pos.x + Math.cos(f) * 0.15 * side, 0.06, player.pos.z - Math.sin(f) * 0.15 * side);
      d.sp.material.color = lin(s.profile.accent || '#8FD3FF');
    }
  }
  dust.forEach(d => {
    if (d.life <= 0) return;
    d.life -= dt * 1.8;
    const k = 1 - Math.max(0, d.life), sc = 0.25 + k * 0.6;
    d.sp.scale.set(sc, sc * 0.6, 1); d.sp.position.y = 0.06 + k * 0.12;
    d.sp.material.opacity = Math.max(0, d.life) * 0.35;
    if (d.life <= 0) d.sp.visible = false;
  });
  updateWorld(dt, s, acts);
  updateCamera(dt, s);
  if (hands.group.visible) hands.update(dt, { speed: player.speed, carrying: !!s.carrying, crouch: acts.installing, pump: acts.pumping, fly: player.air && (player.boosted || player.flyMode) }, cam.yaw);
  updatePointer(s);
  adapt(dt, s);
  if (s.screen === 'mission') {
    const h = hud.get();
    space.update(dt, h.missionPhase || 'Launch', h.missionKind || 'ok');
    flightT += dt; if (flightT > 0.12) {
      flightT = 0;
      const fp = space.getProgress(), tour = TOURS[store.get().missionId] || [];
      let reached = -1; tour.forEach((t, i) => { if (fp >= t.at) reached = i; });
      const next = tour[tourReleased + 1];
      space.setHold(next ? next.at + 0.002 : null);
      const holding = reached > tourReleased;
      const shown = tourView != null ? tour[tourView] : tour[Math.max(0, reached)];
      space.setFocus(shown && shown.body);
      hud.set({ flightP: fp, tourStop: shown || null, tourIdx: Math.max(0, reached), tourHold: holding, tourView });
    }
    renderer.render(space.scene, space.camera);
    return;
  }
  if (fx) fx.render(); else renderer.render(scene, camera);
}
