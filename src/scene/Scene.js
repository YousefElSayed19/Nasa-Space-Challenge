// The 3D layer. It only reads and changes the store (GDD 12.1); game rules live in /engine.
import * as THREE from 'three';
import { store, hud } from '../state/store.js';
import { bus } from '../state/bus.js';
import { A } from '../state/actions.js';
import { Sound } from '../audio/sound.js';
import { MISSION, PARTS, STATIONS, partById, rocketById, homeOf, stationById, reviewVerdicts, isFree } from '../engine/index.js';
import { buildWorld, buildEnvironment } from './hangar.js';
import { partMesh, slotPos, rebuildCraft } from './spacecraft.js';
import { createCharacter } from './character.js';
import { createPostFX } from './postfx.js';
import { createSpaceView } from './space.js';
import { buildRocket, smokeMaterial } from './rocket.js';
import { tasksFor } from '../state/tasks.js';
import { stepOf } from '../state/tutorial.js';
import { lin } from './materials.js';
import { renderThumbs } from './thumbs.js';

const V3 = THREE.Vector3;
const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));
const START_POS = new V3(0, 0, 11);

let renderer, scene, camera, clock, fx = null, world, refs, colliders, hero, space;
let launchRocket = null, smoke = [], guideTarget = null, lastPtr = '';
let time = 0, holdT = 0, ratchetT = 0, pumpAcc = 0, launchT = -1, launched = false;
const keys = {};
const player = { pos: START_POS.clone(), vel: new V3(), facing: Math.PI, speed: 0, spin: 0, y: 0, vy: 0, air: false, land: 0 };
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
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 220);
  clock = new THREE.Clock();

  scene.environment = buildEnvironment(renderer);
  world = buildWorld(scene); refs = world.refs; colliders = world.colliders;
  hero = createCharacter(store.get().profile);
  scene.add(hero.root);
  space = createSpaceView();
  space.setMission(store.get().missionId);
  setTimeout(() => renderThumbs(renderer, scene.environment, () => store.set(s => ({ thumbsTick: (s.thumbsTick || 0) + 1 }))), 300);

  applyGraphics(store.get().graphics);
  bindInput();
  bus.on('graphics', applyGraphics);
  bus.on('launch', () => {
    hud.set({ missionPhase: 'Launch', missionKind: 'ok' });
    const s = store.get();
    space.setMission(s.missionId, s.installed, s.rocket);
    if (launchRocket) scene.remove(launchRocket.group);
    launchRocket = buildRocket(rocketById(s.rocket) || rocketById('atlas'), 10);
    launchRocket.group.position.set(0, -10, 0); scene.add(launchRocket.group);
    if (!smoke.length) for (let i = 0; i < 90; i++) { const sp = new THREE.Sprite(smokeMaterial()); sp.visible = false; scene.add(sp); smoke.push({ sp, life: 0, v: new V3() }); }
    launchT = 0; launched = false;
    // step back to a safe viewing spot and wave the spacecraft off
    player.pos.set(3.4, 0, 5.6); player.vel.set(0, 0, 0); player.facing = Math.atan2(-3.4, -5.6);
  });
  bus.on('reset', reset);
  bus.on('enter', () => { player.pos.copy(START_POS); player.facing = Math.PI; cam.yaw = 0; cam.pitch = 0.38; });
  bus.on('installed', () => { refs.craftLight.intensity = 6; });
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
  smoke.forEach(p => { p.sp.visible = false; p.life = 0; });
  player.pos.copy(START_POS); player.vel.set(0, 0, 0); player.facing = Math.PI; cam.yaw = 0; cam.pitch = 0.38;
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
    if (!lp || Object.keys(p).some(k => k !== 'nick' && p[k] !== lp[k])) hero.setProfile(p);
    else { clearTimeout(onStore.nickT); onStore.nickT = setTimeout(() => hero.setProfile(store.get().profile), 400); }
  }
  const here = new Set(PARTS.map(p => p.id));
  for (const id in refs.shelf) refs.shelf[id].visible = here.has(id) && !s.installed.includes(id) && s.carrying !== id;
  if (s.rocket) { const m = refs.rockets[s.rocket]; refs.rocketRing.position.set(m.position.x, 0.32, m.position.z); refs.rocketRing.visible = true; }
  else refs.rocketRing.visible = false;
  if (s.stage !== last.stage || s.installed !== last.installed || s.propLoaded !== last.propLoaded || s.verdicts !== last.verdicts) {
    const v = s.stage >= 6 ? (s.verdicts || reviewVerdicts(s)) : null;
    refs.lamps.forEach((l, i) => {
      const c = !v ? '#555A70' : v[i].go ? '#3EE0A0' : '#FF5D6C';
      l.material.color = lin(c); l.material.emissive = lin(v ? c : '#000000'); l.material.emissiveIntensity = v ? 2 : 0;
    });
  }
  const tut = stepOf(s);
  const tid = s.screen === 'game' ? ((tut && tut.target) || (s.tutorial != null && tut && !tut.target ? null : tasksFor(s).target)) : null;
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
    else { cam.yaw -= dx * 0.0055; cam.pitch = Math.max(0.05, Math.min(1.2, cam.pitch + dy * 0.004)); if (Math.abs(dx) + Math.abs(dy) > 2) bus.emit('looked'); }
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
  else if (e.code === 'KeyV') store.set(st => ({ firstPerson: !st.firstPerson }));
  else if (e.code === 'KeyL') store.set(st => ({ showLog: !st.showLog }));
  else if (e.code === 'KeyX') A.putBack();
  else if (e.code === 'Escape') A.close();
  else if (e.code === 'Space') jump(s);
}
function jump(s) {
  if (player.air) return;
  const heavy = s.carrying ? Math.min(0.4, partById(s.carrying).mass * 0.04) : 0;
  player.vy = 5.6 * (1 - heavy) * (s.profile.pack === 'jet' ? 1.15 : 1);
  player.air = true;
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
  p.x = Math.max(-22.3, Math.min(22.3, p.x)); p.z = Math.max(-16.3, Math.min(16.3, p.z));
}
function updatePlayer(dt, s) {
  const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const r = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const fwd = new V3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)), right = new V3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
  const dir = fwd.multiplyScalar(f).add(right.multiplyScalar(r));
  const running = keys.ShiftLeft || keys.ShiftRight;
  let sp = running ? 8.2 : 4.6;
  if (s.carrying) sp *= 1 - Math.min(0.35, partById(s.carrying).mass * 0.035); // heavy parts slow you (teaches mass)
  const target = dir.lengthSq() > 0 ? dir.normalize().multiplyScalar(sp) : new V3();
  // smooth acceleration and braking
  const k = target.lengthSq() > 0 ? 9 : 12;
  player.vel.x = damp(player.vel.x, target.x, k, dt);
  player.vel.z = damp(player.vel.z, target.z, k, dt);
  player.pos.addScaledVector(player.vel, dt);
  player.walked = (player.walked || 0) + player.vel.length() * dt;
  if (player.walked > 3 && !player.movedSent) { player.movedSent = true; bus.emit('moved'); }
  collide(player.pos);
  player.speed = Math.hypot(player.vel.x, player.vel.z);
  player.running = running;
  if (player.speed > 0.3) {
    const want = Math.atan2(player.vel.x, player.vel.z);
    let d = want - player.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
    player.facing += d * (1 - Math.exp(-14 * dt));
  }
  if (player.air) {
    player.vy -= 15 * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) {
      player.y = 0; player.air = false;
      player.land = Math.min(1, Math.abs(player.vy) / 7);
      player.vy = 0;
      Sound.noise(0.09, 300, 0.07 * player.land + 0.02, 1);
    }
  }
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
  refs.dust.rotation.y += dt * 0.01;
  refs.craftLight.intensity = damp(refs.craftLight.intensity, 2.6, 3, dt);
  const bst = guideTarget;
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
    if (launchT < 1.2) { const k = launchT / 1.2, e = 1 - Math.pow(1 - k, 3); rk.position.y = -10 + e * 10.42; refs.craft.visible = k < 0.6; }
    else { refs.craft.visible = false; }
    const lift = Math.max(0, launchT - 3.6);
    if (launchT >= 1.2) rk.position.y = 0.42 + lift * lift * 2.6;
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
function updateCamera(dt, s) {
  let desired, look, fov = 60;
  const target = new V3(player.pos.x, 1.6 + player.y * 0.6, player.pos.z);
  if (s.screen === 'intro') {
    const K = [
      [[Math.sin(time * 0.06) * 18, 11, Math.cos(time * 0.06) * 16], [0, 1.5, 0]],
      [[-10.5, 3.2, -5.5], [-14.2, 1.9, -12.2]],
      [[4.5, 3.6, 6.5], [0, 2.4, 0]],
      [[3.5, 7, 9], [0, 2.4, 0]],
      [[3, 3.4, -5], [0, 1, -12.4]],
      [[1.6, 2.1, 15.2], [0, 1.3, 11]],
    ][Math.min(s.introBeat || 0, 5)];
    desired = new V3(...K[0]); look = new V3(...K[1]); fov = 50;
  } else if (s.screen === 'start' && s.startStep === 'look') {
    // close-up turntable for the character creator; character sits right of centre
    desired = new V3(START_POS.x - 1.25, 1.55, START_POS.z + 4.1); look = new V3(START_POS.x - 0.95, 1.15, START_POS.z); fov = 42;
  } else if (s.screen === 'start') {
    const a = time * 0.07; desired = new V3(Math.sin(a) * 15, 7.5, Math.cos(a) * 12); look = new V3(0, 2.2, 0);
  } else if (s.screen === 'launching') {
    const ry = launchRocket ? launchRocket.group.position.y : 0;
    look = new V3(0, 4.5 + Math.max(0, ry) * 0.85, 0); desired = new V3(9, 3.5, 15); fov = 55;
  } else if (s.firstPerson) {
    desired = new V3(player.pos.x, 1.72 + player.y, player.pos.z);
    const a = cam.pitch - 0.38;
    look = desired.clone().add(new V3(-Math.sin(cam.yaw) * Math.cos(a), -Math.sin(a), -Math.cos(cam.yaw) * Math.cos(a)));
    fov = 70;
  } else {
    const d = 7.2;
    desired = target.clone().add(new V3(Math.sin(cam.yaw) * Math.cos(cam.pitch) * d, Math.sin(cam.pitch) * d, Math.cos(cam.yaw) * Math.cos(cam.pitch) * d));
    desired.x = Math.max(-22, Math.min(22, desired.x)); desired.z = Math.max(-16.2, Math.min(16.2, desired.z)); desired.y = Math.min(9.2, Math.max(0.6, desired.y));
    look = target;
    fov = 60 + (player.running && player.speed > 5 ? 6 : 0);
  }
  const k = s.screen === 'start' ? 3 : s.screen === 'intro' ? 1.6 : s.firstPerson ? 18 : 8;
  cam.pos.lerp(desired, 1 - Math.exp(-k * dt)); cam.look.lerp(look, 1 - Math.exp(-(k + 2) * dt));
  cam.fov = damp(cam.fov, fov, 5, dt);
  if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  camera.position.copy(cam.pos); camera.lookAt(cam.look);
}

// ---------- screen pointer: label over the target, or an arrow at the screen edge when it is off screen ----------
function updatePointer(s) {
  let ptr = null;
  if (guideTarget && s.screen === 'game') {
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

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05); time += dt;
  const s = store.get();
  if (s.screen === 'game') updatePlayer(dt, s);
  else { player.vel.set(0, 0, 0); player.speed = 0; player.y = 0; player.vy = 0; player.air = false; }
  const acts = updateInteract(dt, s);
  if (s.screen === 'start' || s.screen === 'intro') {
    player.pos.copy(START_POS);
    player.facing = damp(player.facing, 0.35 + player.spin + Math.sin(time * 0.3) * 0.25, 4, dt);
  }
  hero.root.position.set(player.pos.x, player.y, player.pos.z);
  hero.root.rotation.y = s.firstPerson && s.screen === 'game' ? cam.yaw + Math.PI : player.facing;
  hero.setVisible(!(s.firstPerson && s.screen === 'game'));
  const ev = hero.update(dt, {
    speed: player.speed, run: player.running, carrying: !!s.carrying,
    crouch: acts.installing || player.land > 0.15, pump: acts.pumping, wave: s.screen === 'launching' || (s.screen === 'intro' && (s.introBeat === 0 || s.introBeat === 5)), air: player.air, vy: player.vy,
  });
  if (ev === 'step') Sound.step();
  updateWorld(dt, s, acts);
  updateCamera(dt, s);
  updatePointer(s);
  adapt(dt, s);
  if (s.screen === 'mission') {
    const h = hud.get();
    space.update(dt, h.missionPhase || 'Launch', h.missionKind || 'ok');
    renderer.render(space.scene, space.camera);
    return;
  }
  if (fx) fx.render(); else renderer.render(scene, camera);
}
