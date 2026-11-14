// Original engineer character, built in code from smooth turned (lathed) shapes so the body reads as one figure,
// not separate blocks. Joints are hidden by matching radii; suit lines glow and flow with each step.
import * as THREE from 'three';
import { std, glow, lin } from './materials.js';
import { patchTexture, nameTexture, chestPanelTexture, canvasTex } from './textures.js';
import OPTIONS from '../data/character.json';

const BODY = { slim: { w: 0.9, l: 0.88 }, standard: { w: 1, l: 1 }, sturdy: { w: 1.14, l: 1.12 } };
const HEIGHT = { short: 0.93, medium: 1, tall: 1.07 };
const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));
const lerp = (a, b, t) => a + (b - a) * t;
const V2 = (x, y) => new THREE.Vector2(x, y);

/** A smooth capsule from r1 (top) to r2 (bottom), length L between the sphere centres, hanging down from y=0. */
function capsule(r1, r2, L, seg = 20) {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); pts.push(V2(Math.cos(a) * r2, -L + Math.sin(a) * r2)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(V2(Math.cos(a) * r1, Math.sin(a) * r1)); }
  return new THREE.LatheGeometry(pts, seg);
}
function lathe(points, seg = 32) { return new THREE.LatheGeometry(points.map(([x, y]) => V2(x, y)), seg); }
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }

/** Dashed light that scrolls along suit lines: the "flowing" glow when walking. */
function stripTexture(color) {
  const t = canvasTex(128, 8, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.35, color); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(0.65, color); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function createCharacter(profile) {
  const root = new THREE.Group();
  const carryHolder = new THREE.Group(); root.add(carryHolder);
  const st = { phase: 0, t: 0, lastStep: 1, w: { walk: 0, run: 0, carry: 0, crouch: 0, pump: 0, wave: 0, air: 0, fly: 0, thrust: 0, hands: 0, turn: 0, moon: 0, sit: 0 }, look: 0 };
  let viewMode = 'full';
  let rig = build(profile);
  root.add(rig.body);

  function build(p) {
    const b = BODY[p.body] || BODY.standard, hs = HEIGHT[p.height] || 1;
    const visorHex = (OPTIONS.visor.find(v => v.id === p.visor) || OPTIONS.visor[0]).color;
    const suit = std(p.suit, { roughness: 0.62, metalness: 0.05 });
    const suitSoft = std(new THREE.Color(p.suit).lerp(new THREE.Color('#ffffff'), 0.18).getStyle(), { roughness: 0.7 });
    const suitDark = std(new THREE.Color(p.suit).multiplyScalar(0.45).getStyle(), { roughness: 0.75 });
    const accent = std(p.accent, { roughness: 0.38, metalness: 0.3 });
    const shell = std('#F1F4FF', { roughness: 0.22, metalness: 0.1 });
    const dark = std('#1A2048', { roughness: 0.55, metalness: 0.35 });
    const metal = std('#A8B2DC', { roughness: 0.25, metalness: 0.9 });
    const hand = p.gloves === 'accent' ? accent : p.gloves === 'white' ? shell : dark;
    const visorM = new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.04, envMapIntensity: 2.4 });
    visorM.color = lin(visorHex); visorM.emissive = lin(visorHex); visorM.emissiveIntensity = 0.1;
    const stripTex = stripTexture(p.accent);
    const stripM = new THREE.MeshBasicMaterial({ map: stripTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    stripM.color = lin(p.accent);
    const strips = [], lights = [], jets = [], thrusters = [];

    const body = new THREE.Group(); body.scale.setScalar(hs);
    const hips = new THREE.Group(); hips.position.y = 0.93; body.add(hips);
    // pelvis: one smooth turned shape with a belt
    const pelvis = mesh(lathe([[0, -0.14], [0.15, -0.13], [0.24, -0.06], [0.27, 0.03], [0.26, 0.1], [0, 0.1]]), suit, hips);
    pelvis.scale.set(b.w, 1, 0.82 * b.w);
    const belt = mesh(new THREE.TorusGeometry(0.265, 0.03, 10, 40), dark, hips, 0, 0.06, 0); belt.rotation.x = Math.PI / 2; belt.scale.set(b.w, 0.82 * b.w, 1);
    mesh(new THREE.BoxGeometry(0.13, 0.08, 0.035), accent, hips, 0, 0.06, 0.225 * b.w);

    function leg(side) {
      const hip = new THREE.Group(); hip.position.set(side * 0.13 * b.w, -0.04, 0); hips.add(hip);
      mesh(capsule(0.105 * b.l, 0.088 * b.l, 0.42), suit, hip);
      const strip = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.34, 6), stripM, hip, side * 0.095 * b.l, -0.2, 0.02); strips.push(strip);
      const knee = new THREE.Group(); knee.position.y = -0.42; hip.add(knee);
      const pad = mesh(new THREE.SphereGeometry(0.083 * b.l, 18, 12), accent, knee, 0, 0, 0.05); pad.scale.set(1, 1.1, 0.7);
      mesh(capsule(0.088 * b.l, 0.075 * b.l, 0.38), suitSoft, knee);
      const ankle = new THREE.Group(); ankle.position.y = -0.38; knee.add(ankle);
      // boot: cuff, rounded upper and a thicker sole that rolls with the ankle
      mesh(lathe([[0.075 * b.l, 0.1], [0.098 * b.l, 0.06], [0.1 * b.l, -0.02], [0, -0.03]], 24), hand, ankle);
      const upper = mesh(new THREE.SphereGeometry(0.1, 20, 14), hand, ankle, 0, -0.05, 0.07); upper.scale.set(0.95 * b.l, 0.62, 1.55);
      const sole = mesh(new THREE.BoxGeometry(0.19 * b.l, 0.045, 0.34), dark, ankle, 0, -0.1, 0.07);
      // boot thruster: hidden until the engineer flies
      const bf = mesh(new THREE.ConeGeometry(0.07, 0.42, 16, 1, true), glow('#8FD3FF', 0), ankle, 0, -0.33, 0.04); bf.rotation.x = Math.PI;
      const bc = mesh(new THREE.ConeGeometry(0.035, 0.24, 12, 1, true), glow('#FFFFFF', 0), ankle, 0, -0.24, 0.04); bc.rotation.x = Math.PI;
      thrusters.push(bf, bc);
      sole.geometry.translate(0, 0, 0);
      return { hip, knee, ankle };
    }
    const legL = leg(1), legR = leg(-1);

    // torso: one turned shape with a waist, chest and shoulders
    const spine = new THREE.Group(); spine.position.y = 0.08; hips.add(spine);
    const torso = mesh(lathe([[0.25, 0], [0.27, 0.07], [0.3, 0.2], [0.33, 0.36], [0.33, 0.47], [0.29, 0.56], [0.18, 0.63], [0.0, 0.64]], 40), suit, spine);
    torso.scale.set(b.w, 1, 0.8 * b.w);
    const front = 0.8 * 0.33 * b.w;
    const chestPlate = mesh(new THREE.SphereGeometry(0.3, 28, 16, -Math.PI / 2.6, Math.PI / 1.3, 0.6, 0.9), shell, spine, 0, 0.36, 0.02);
    chestPlate.scale.set(b.w * 1.03, 0.9, 0.85 * b.w);
    const panelTex = chestPanelTexture();
    const panelM = new THREE.MeshStandardMaterial({ map: panelTex, emissiveMap: panelTex, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.6, roughness: 0.4 });
    const panel = mesh(new THREE.PlaneGeometry(0.16 * b.w, 0.12), panelM, spine, -0.08 * b.w, 0.4, front + 0.02); panel.rotation.y = -0.2; lights.push(panel);
    if (p.patch !== 'none') {
      const pm = new THREE.MeshStandardMaterial({ map: patchTexture(p.patch, p.accent), roughness: 0.7, transparent: true });
      const patch = mesh(new THREE.CircleGeometry(0.06, 28), pm, spine, 0.13 * b.w, 0.43, front + 0.02); patch.rotation.y = 0.32;
    }
    // glowing suit lines down the chest sides
    for (const side of [1, -1]) {
      const s = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), stripM, spine, side * 0.25 * b.w, 0.3, front * 0.72); s.rotation.z = side * 0.12; s.rotation.x = -0.12; strips.push(s);
    }
    const waist = mesh(new THREE.TorusGeometry(0.255, 0.02, 8, 40), accent, spine, 0, 0.08, 0); waist.rotation.x = Math.PI / 2; waist.scale.set(b.w, 0.8 * b.w, 1);
    // shoulders: rounded pads that hide the arm joint
    for (const side of [1, -1]) { const sp = mesh(new THREE.SphereGeometry(0.14, 22, 16, 0, Math.PI * 2, 0, Math.PI / 1.8), accent, spine, side * 0.33 * b.w, 0.53, 0); sp.scale.set(1.05, 0.75, 1); }
    // neck seal and helmet
    const seal = mesh(new THREE.TorusGeometry(0.17, 0.05, 12, 36), shell, spine, 0, 0.66, 0); seal.rotation.x = Math.PI / 2;
    mesh(new THREE.TorusGeometry(0.175, 0.012, 6, 36), accent, spine, 0, 0.69, 0).rotation.x = Math.PI / 2;
    const head = new THREE.Group(); head.position.y = 0.88; spine.add(head);
    if (p.helmet === 'angular') {
      const h = mesh(lathe([[0, -0.24], [0.27, -0.22], [0.3, 0.02], [0.27, 0.2], [0.16, 0.29], [0, 0.3]], 6), shell, head); h.rotation.y = Math.PI / 6;
      const v = mesh(new THREE.BoxGeometry(0.38, 0.2, 0.05), visorM, head, 0, 0.03, 0.25); v.rotation.x = -0.1;
      mesh(new THREE.BoxGeometry(0.42, 0.03, 0.06), accent, head, 0, 0.145, 0.245);
    } else {
      mesh(new THREE.SphereGeometry(0.29, 40, 28), shell, head);
      mesh(new THREE.SphereGeometry(0.297, 40, 20, Math.PI / 2 - 0.8, 1.6, 0.95, 0.95), visorM, head);
      const frame = mesh(new THREE.TorusGeometry(0.3, 0.016, 8, 48, Math.PI * 0.95), accent, head, 0, 0.02, 0); frame.rotation.set(0, Math.PI / 2 - 0.05, Math.PI / 2 + 0.03);
      mesh(new THREE.BoxGeometry(0.045, 0.05, 0.42), accent, head, 0, 0.27, -0.04).rotation.x = 0.12;
      if (p.helmet === 'halo') {
        const ring = mesh(new THREE.TorusGeometry(0.38, 0.022, 10, 56), glow(p.accent, 0.9), head, 0, 0.08, 0); ring.rotation.x = Math.PI / 2 - 0.25; lights.push(ring);
        for (const side of [1, -1]) {
          const ant = mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.28, 6), metal, head, side * 0.14, 0.38, -0.05); ant.rotation.z = side * -0.25;
          const tip = mesh(new THREE.SphereGeometry(0.03, 10, 8), std(p.accent, { emissive: p.accent, emissiveIntensity: 1.5 }), head, side * 0.175, 0.51, -0.05); lights.push(tip);
        }
      }
    }
    const lamp = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 16), dark, head, 0.29, 0.05, 0.05); lamp.rotation.x = Math.PI / 2;
    const lens = mesh(new THREE.CircleGeometry(0.035, 16), std('#FFFFFF', { emissive: '#DDE6FF', emissiveIntensity: 2 }), head, 0.29, 0.05, 0.102); lights.push(lens);

    function arm(side) {
      const sh = new THREE.Group(); sh.position.set(side * 0.37 * b.w, 0.52, 0); spine.add(sh);
      mesh(capsule(0.082 * b.l, 0.07 * b.l, 0.3), suit, sh);
      const strip = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.24, 6), stripM, sh, side * 0.075 * b.l, -0.15, 0); strips.push(strip);
      const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
      mesh(capsule(0.07 * b.l, 0.062 * b.l, 0.26), suitSoft, el);
      mesh(new THREE.TorusGeometry(0.068 * b.l, 0.018, 8, 24), accent, el, 0, -0.24, 0).rotation.x = Math.PI / 2;
      // glove: palm, fingers block and thumb
      const palm = mesh(new THREE.SphereGeometry(0.068 * b.l, 18, 14), hand, el, 0, -0.33, 0.005); palm.scale.set(0.9, 1.15, 0.75);
      const fingers = mesh(capsule(0.045, 0.04, 0.05, 14), hand, el, 0, -0.37, 0.012); fingers.scale.set(1.1, 1, 0.75);
      const thumb = mesh(capsule(0.024, 0.02, 0.05, 10), hand, el, side * -0.05, -0.32, 0.04); thumb.rotation.z = side * 0.6;
      return { sh, el };
    }
    const armL = arm(1), armR = arm(-1);

    // backpack with rounded edges built from a lathe
    const pack = new THREE.Group(); pack.position.set(0, 0.36, -0.26 * b.w); spine.add(pack);
    const rounded = (w, h, d, mat) => { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(w - 0.06, h, d), mat, g); mesh(new THREE.BoxGeometry(w, h - 0.06, d), mat, g); for (const sx of [-1, 1]) for (const sy of [-1, 1]) mesh(new THREE.CylinderGeometry(0.03, 0.03, d, 12), mat, g, sx * (w / 2 - 0.03), sy * (h / 2 - 0.03), 0).rotation.x = Math.PI / 2; return g; };
    const hose = side => {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(side * 0.15, 0.62, -0.28 * b.w), new THREE.Vector3(side * 0.27, 0.72, -0.2), new THREE.Vector3(side * 0.2, 0.8, -0.06)]);
      mesh(new THREE.TubeGeometry(curve, 20, 0.022, 8), dark, spine);
    };
    if (p.pack === 'tool') {
      pack.add(rounded(0.4, 0.5, 0.1, dark));
      const box = rounded(0.36, 0.17, 0.16, accent); box.position.set(0, -0.2, -0.08); pack.add(box);
      for (const side of [1, -1]) { const t = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 10), metal, pack, side * 0.08, 0.06, -0.1); t.rotation.z = side * 0.5; }
      const l = mesh(new THREE.SphereGeometry(0.025, 10, 8), std(p.accent, { emissive: p.accent, emissiveIntensity: 1.6 }), pack, -0.14, 0.2, -0.07); lights.push(l);
    } else if (p.pack === 'jet') {
      const core = rounded(0.34, 0.42, 0.18, shell); core.position.z = -0.04; pack.add(core);
      for (const side of [1, -1]) {
        mesh(lathe([[0.07, -0.24], [0.09, -0.18], [0.09, 0.16], [0.07, 0.22], [0, 0.23]], 20), dark, pack, side * 0.2, 0, -0.1);
        mesh(lathe([[0.04, 0], [0.06, -0.05], [0.085, -0.11], [0.08, -0.12]], 20), metal, pack, side * 0.2, -0.24, -0.1);
        const flame = mesh(new THREE.ConeGeometry(0.06, 0.34, 14, 1, true), glow('#8FD3FF', 0.5), pack, side * 0.2, -0.53, -0.1);
        flame.rotation.x = Math.PI; jets.push(flame);
      }
      hose(1); hose(-1);
    } else {
      const core = rounded(0.46, 0.56, 0.2, shell); core.position.z = -0.03; pack.add(core);
      mesh(new THREE.BoxGeometry(0.48, 0.05, 0.22), accent, pack, 0, 0.19, -0.03);
      for (const side of [1, -1]) mesh(lathe([[0.065, -0.25], [0.07, -0.22], [0.07, 0.22], [0.065, 0.25], [0, 0.26]], 18), dark, pack, side * 0.26, -0.01, -0.03);
      ['#3EE0A0', '#FFC24B', '#6EA8FF'].forEach((c, i) => { const l = mesh(new THREE.SphereGeometry(0.022, 10, 8), std(c, { emissive: c, emissiveIntensity: 1.6 }), pack, -0.12 + i * 0.06, 0.1, -0.135); lights.push(l); });
      const plate = mesh(new THREE.PlaneGeometry(0.3, 0.075), new THREE.MeshStandardMaterial({ map: nameTexture(p.nick, p.accent), roughness: 0.6 }), pack, 0, -0.08, -0.135); plate.rotation.y = Math.PI;
      hose(1); hose(-1);
    }

    if (p.pack !== 'jet') {
      // every pack gets two small nozzles underneath for flight
      for (const side of [1, -1]) {
        mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.07, 14), metal, pack, side * 0.12, -0.31, -0.06);
        const f = mesh(new THREE.ConeGeometry(0.05, 0.36, 14, 1, true), glow('#8FD3FF', 0), pack, side * 0.12, -0.52, -0.06); f.rotation.x = Math.PI; thrusters.push(f);
      }
    }
    body.traverse(o => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = false; } });
    return { body, hips, spine, head, legL, legR, armL, armR, lights, jets, thrusters, strips, stripTex, stripM, hs, b };
  }

  function applyView() {
    const r = rig;
    r.body.visible = viewMode !== 'none';
    const armSet = new Set();
    for (const a of [r.armL.sh, r.armR.sh]) a.traverse(o => armSet.add(o));
    r.body.traverse(o => { if (o.isMesh) o.visible = viewMode === 'full' || (viewMode === 'hands' && armSet.has(o)); });
  }

  function disposeRig(r) {
    r.body.traverse(o => { if (!o.isMesh) return; o.geometry.dispose(); const m = o.material; if (m.map) m.map.dispose(); m.dispose(); });
  }

  /** inp: { speed, run, carrying, crouch, pump, wave, air, vy } */
  function update(dt, inp) {
    const W = st.w, r = rig;
    st.t += dt;
    W.walk = damp(W.walk, Math.min(1, inp.speed / 4.4), 9, dt);
    W.run = damp(W.run, inp.run && inp.speed > 0.5 ? 1 : 0, 5, dt);
    W.carry = damp(W.carry, inp.carrying ? 1 : 0, 9, dt);
    W.crouch = damp(W.crouch, inp.crouch ? 1 : 0, 9, dt);
    W.pump = damp(W.pump, inp.pump ? 1 : 0, 8, dt);
    W.wave = damp(W.wave, inp.wave ? 1 : 0, 5, dt);
    W.air = damp(W.air, inp.air ? 1 : 0, 14, dt);
    W.fly = damp(W.fly, inp.fly ? 1 : 0, 4, dt);
    W.moon = damp(W.moon, inp.moon && inp.speed > 0.4 ? 1 : 0, 8, dt);
    W.sit = inp.sit ? 1 : 0;
    // turning on the spot: small stepping feet, only when not already walking
    W.turn = damp(W.turn, Math.min(1, (inp.turn || 0) / 1.6) * (1 - Math.min(1, inp.speed / 1.2)), 10, dt);
    W.hands = damp(W.hands, viewMode === 'hands' ? 1 : 0, 10, dt);
    W.thrust = damp(W.thrust, inp.thrust || 0, 10, dt);
    st.phase += dt * (inp.speed * (1.55 + W.run * 0.25)) * (inp.back ? -1 : 1) + dt * W.turn * 9;
    const ph = st.phase, t = st.t, idle = 1 - W.walk, ground = 1 - W.air;
    const a = Math.max(W.walk * (0.56 + 0.3 * W.run), W.turn * 0.2) * ground;

    // legs: swing, knee bend in the swing phase, a small bend on contact, and the foot rolls with the ankle
    const legPose = (L, s) => {
      const sw = Math.sin(ph + s);
      let hip = -sw * a;
      let knee = a * (0.18 + 1.15 * Math.max(0, Math.sin(ph + s + 1.7))) + W.walk * 0.06 + W.turn * 0.55 * Math.max(0, Math.sin(ph + s));
      hip = lerp(hip, s ? -0.38 : -0.95, W.crouch); knee = lerp(knee, s ? 1.05 : 1.6, W.crouch);
      const rising = inp.vy > 0 ? 1 : 0;
      hip = lerp(hip, rising ? (s ? -0.35 : -0.75) : (s ? -0.15 : -0.3), W.air);
      knee = lerp(knee, rising ? (s ? 0.95 : 1.25) : (s ? 0.35 : 0.5), W.air);
      L.hip.rotation.x = hip; L.knee.rotation.x = knee;
      const toeOff = Math.max(0, -Math.cos(ph + s)) * 0.35 * a;
      L.ankle.rotation.x = -(hip + knee) * 0.85 + toeOff;
    };
    legPose(r.legL, 0); legPose(r.legR, Math.PI);

    // body: double-frequency bob, side sway, pelvis twist and roll, spine counter-twist, breathing and weight shift
    const bob = (Math.abs(Math.sin(ph)) - 0.35) * 0.07 * Math.max(W.walk * (1 + W.run * 0.6), W.turn * 0.6) * ground;
    r.body.position.y = bob - 0.26 * W.crouch * r.hs;
    r.body.position.x = Math.sin(ph) * 0.025 * W.walk * ground;
    r.hips.rotation.y = Math.sin(ph) * 0.19 * W.walk + Math.sin(ph) * 0.12 * W.turn;
    r.hips.rotation.z = Math.sin(ph) * 0.045 * W.walk + Math.sin(t * 0.55) * 0.025 * idle;
    r.spine.rotation.y = -Math.sin(ph) * 0.3 * W.walk;
    r.spine.rotation.x = 0.05 * W.walk + 0.17 * W.run * W.walk + 0.32 * W.crouch + Math.sin(t * 1.6) * 0.014 * idle - 0.08 * W.air;
    r.spine.rotation.z = -Math.sin(ph) * 0.03 * W.walk;
    r.spine.scale.set(1, 1 + Math.sin(t * 1.6) * 0.01 * idle, 1);
    // head stays steady, looks around when idle
    st.look = damp(st.look, idle > 0.8 ? Math.sin(t * 0.33) * 0.45 : 0, 3, dt);
    r.head.rotation.y = st.look * (1 - W.crouch) * (1 - W.wave) - r.spine.rotation.y * 0.6;
    r.head.rotation.x = -bob * 1.2 - 0.06 * W.run * W.walk + 0.25 * W.crouch - 0.2 * W.wave;

    // arms: opposite swing with elbow bend; pump when running; carry, install, fuel and wave poses blend on top
    // relaxed arm swing opposite the legs, a little behind the legs in time like a real walk
    const swing = s => Math.sin(ph + s - 0.25) * a * (1.35 + 0.35 * W.run);
    let lx = swing(0), rx = swing(Math.PI);
    let le = -0.28 - 0.22 * W.walk - 0.85 * W.run * W.walk - Math.max(0, -Math.sin(ph - 0.25)) * 0.5 * W.walk; // elbow bends as the arm comes forward
    let re = -0.28 - 0.22 * W.walk - 0.85 * W.run * W.walk - Math.max(0, Math.sin(ph - 0.25)) * 0.5 * W.walk;
    let lz = 0.12 + 0.05 * W.walk, rz = -0.12 - 0.05 * W.walk; // arms a little away from the body while walking
    lx = lerp(lx, -1.15, W.carry); rx = lerp(rx, -1.15, W.carry); le = lerp(le, -0.6, W.carry); re = lerp(re, -0.6, W.carry);
    lz = lerp(lz, -0.08, W.carry); rz = lerp(rz, 0.08, W.carry);
    const tw = Math.sin(t * 14) * 0.13;
    lx = lerp(lx, -1.35 + tw, W.crouch); rx = lerp(rx, -1.35 - tw, W.crouch);
    rx = lerp(rx, -0.8 + Math.sin(t * 6) * 0.28, W.pump); re = lerp(re, -0.95, W.pump);
    if (!inp.carrying) { lx = lerp(lx, -0.45, W.air); rx = lerp(rx, -0.45, W.air); lz = lerp(lz, 0.8, W.air); rz = lerp(rz, -0.8, W.air); }
    rz = lerp(rz, -2.7, W.wave); rx = lerp(rx, -0.15, W.wave);
    // flying: legs together and trailing, body leaning into the direction of travel, arms back and slightly out
    const F = W.fly, sp = Math.min(1, inp.speed / 7);
    if (F > 0.01) {
      const flutter = Math.sin(t * 7) * 0.05;
      for (const [L, k] of [[r.legL, 1], [r.legR, -1]]) {
        L.hip.rotation.x = lerp(L.hip.rotation.x, 0.15 + sp * 0.35 + flutter * k, F);
        L.knee.rotation.x = lerp(L.knee.rotation.x, 0.25 + sp * 0.25, F);
        L.ankle.rotation.x = lerp(L.ankle.rotation.x, 0.55, F);
      }
      r.spine.rotation.x = lerp(r.spine.rotation.x, 0.1 + sp * 0.55, F);
      r.head.rotation.x = lerp(r.head.rotation.x, -0.15 - sp * 0.45, F);
      r.body.position.y = lerp(r.body.position.y, Math.sin(t * 2.4) * 0.04, F);
      if (!inp.carrying) {
        lx = lerp(lx, 0.35 + sp * 0.5, F); rx = lerp(rx, 0.35 + sp * 0.5, F);
        lz = lerp(lz, 0.35, F); rz = lerp(rz, -0.35, F);
        le = lerp(le, -0.3, F); re = lerp(re, -0.3, F);
      }
    }
    // hands view: both arms forward in front of the camera, with a gentle sway as you walk
    if (W.hands > 0.01) {
      const sw = Math.sin(ph) * 0.06 * W.walk, br = Math.sin(t * 1.6) * 0.015;
      const fx = inp.carrying ? -1.2 : -0.95;
      lx = lerp(lx, fx + sw + br, W.hands); rx = lerp(rx, fx - sw + br, W.hands);
      lz = lerp(lz, -0.32, W.hands); rz = lerp(rz, 0.32, W.hands);
      le = lerp(le, -0.75, W.hands); re = lerp(re, -0.75, W.hands);
    }
    // moonwalk: one foot flat and sliding back while the other bends with the heel up, switching in rhythm
    if (W.moon > 0.01) {
      const M = W.moon; st.moonBeat = (st.moonBeat || 0) + dt * (2.4 + inp.speed * 0.75); const beat = st.moonBeat;
      const side = (Math.sin(beat) + 1) / 2; // 0..1 which leg is on its toes
      const legs = [[r.legL, side], [r.legR, 1 - side]];
      for (const [L, toe] of legs) {
        L.hip.rotation.x = lerp(L.hip.rotation.x, -0.22 * toe + 0.08 * (1 - toe), M);
        L.knee.rotation.x = lerp(L.knee.rotation.x, 0.62 * toe + 0.03, M);
        L.ankle.rotation.x = lerp(L.ankle.rotation.x, 0.75 * toe - 0.05, M);
      }
      r.body.position.y = lerp(r.body.position.y, -0.02 + Math.abs(Math.sin(beat)) * 0.015, M);
      r.hips.rotation.y = lerp(r.hips.rotation.y, 0, M); r.spine.rotation.y = lerp(r.spine.rotation.y, 0, M);
      r.spine.rotation.x = lerp(r.spine.rotation.x, 0.06, M);
      r.spine.rotation.z = lerp(r.spine.rotation.z, 0, M); r.body.position.x = lerp(r.body.position.x, 0, M);
      r.head.rotation.x = lerp(r.head.rotation.x, -0.05 + Math.sin(beat * 2) * 0.06, M);
      if (!inp.carrying) {
        lx = lerp(lx, -0.15 + Math.sin(beat) * 0.15, M); rx = lerp(rx, -0.15 - Math.sin(beat) * 0.15, M);
        le = lerp(le, -0.9, M); re = lerp(re, -0.9, M); lz = lerp(lz, 0.2, M); rz = lerp(rz, -0.2, M);
      }
    }
    // seated: thighs level on the chair, shins straight down, upright back, forearms resting on the desk
    if (W.sit) {
      for (const L of [r.legL, r.legR]) { L.hip.rotation.x = -1.5; L.knee.rotation.x = 1.5; L.ankle.rotation.x = 0; }
      r.body.position.y = -0.4 * r.hs; r.body.position.x = 0;
      r.hips.rotation.set(0, 0, 0); r.spine.rotation.set(-0.05 + Math.sin(t * 1.6) * 0.01, 0, 0);
      if (!inp.wave) { lx = -0.75 + Math.sin(t * 1.1) * 0.03; rx = -0.75 - Math.sin(t * 1.3) * 0.03; le = -0.9; re = -0.9; lz = 0.12; rz = -0.12; }
      else { lx = -0.75; le = -0.9; lz = 0.12; }
    }
    r.armL.sh.rotation.set(lx, 0, lz); r.armR.sh.rotation.set(rx, 0, rz);
    r.armL.el.rotation.set(le, 0, 0);
    r.armR.el.rotation.set(lerp(re, -0.35, W.wave), 0, Math.sin(t * 9) * 0.5 * W.wave);

    // light: suit lines brighten and flow with each step, LEDs blink, jets flare when running or airborne
    r.stripTex.offset.x -= dt * (0.4 + inp.speed * 0.45);
    r.stripM.opacity = 0.35 + 0.65 * Math.min(1, W.walk * (0.7 + 0.5 * Math.abs(Math.sin(ph))) + W.air + W.fly + 0.15);
    if (W.fly > 0.1) r.stripTex.offset.x -= dt * 2.5 * W.fly;
    r.lights.forEach((l, i) => { if (l.material.emissiveIntensity !== undefined) l.material.emissiveIntensity = 1 + Math.sin(t * 3 + i * 2.1) * 0.6; });
    r.jets.forEach(j => { const f = Math.max(W.walk * W.run * (1 - W.moon), W.air, W.thrust); j.scale.y = 0.5 + f * 1.8 + Math.random() * 0.25; j.material.opacity = 0.12 + 0.8 * f; });
    const th = Math.max(W.thrust, W.fly * 0.45);
    r.thrusters.forEach((j, i) => { const fl = 0.85 + Math.random() * 0.3; j.scale.set(1, (0.4 + th * 1.4) * fl, 1); j.material.opacity = th * (i % 2 ? 0.95 : 0.7); });

    carryHolder.position.set(0, (1.2 - 0.26 * W.crouch) * r.hs + bob, (0.55 + 0.12 * W.crouch) * r.hs);

    const sgn = Math.sin(ph) >= 0 ? 1 : -1;
    if ((W.walk > 0.35 || W.turn > 0.4) && ground > 0.5 && sgn !== st.lastStep) { st.lastStep = sgn; return sgn > 0 ? 'stepR' : 'stepL'; }
    st.lastStep = sgn;
    return null;
  }

  return {
    root, carryHolder, update,
    setProfile(p) { root.remove(rig.body); disposeRig(rig); rig = build(p); root.add(rig.body); applyView(); },
    setVisible(v) { viewMode = v ? 'full' : 'none'; applyView(); },
    /** 'full' shows the whole engineer, 'none' hides it, 'hands' shows only the arms and gloves. */
    setView(mode) { if (mode !== viewMode) { viewMode = mode; applyView(); } },
  };
}

/**
 * First-person hands, attached to the camera like in most first-person games: two forearms and gloves in the
 * lower corners, sized for the screen, with walk bob, turn sway, and poses for carrying, installing and pumping.
 */
export function createHands(profile) {
  const group = new THREE.Group();
  let parts = build(profile);
  const st = { t: 0, phase: 0, sway: 0, swayY: 0, lastYaw: null, carry: 0, crouch: 0, pump: 0, fly: 0, walk: 0 };

  function build(p) {
    const suit = std(new THREE.Color(p.suit).multiplyScalar(0.82).getStyle(), { roughness: 0.78, metalness: 0 });
    const accent = std(p.accent, { roughness: 0.5, metalness: 0.2 });
    const glove = p.gloves === 'accent' ? std(p.accent, { roughness: 0.6 }) : p.gloves === 'white' ? std('#D9DEEE', { roughness: 0.6 }) : std('#1A2048', { roughness: 0.6, metalness: 0.2 });
    const stripM = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }); stripM.color = lin(p.accent);
    const make = side => {
      const arm = new THREE.Group();
      // forearm along -z (into the screen), cuff ring, glove with fingers and thumb
      const fore = new THREE.Mesh(capsule(0.05, 0.043, 0.34, 18), suit); fore.rotation.x = Math.PI / 2; arm.add(fore);
      const strip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6), stripM); strip.rotation.x = Math.PI / 2; strip.position.set(side * 0.046, 0.012, -0.17); arm.add(strip);
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.012, 8, 24), accent); cuff.position.z = -0.31; arm.add(cuff);
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.056, 16, 12), suit); elbow.position.z = 0.02; arm.add(elbow);
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), accent); pad.rotation.x = -Math.PI / 2; pad.position.set(side * 0.02, 0, 0.04); pad.scale.set(1, 1, 0.6); arm.add(pad);
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.052, 18, 14), glove); palm.scale.set(1, 0.75, 1.25); palm.position.z = -0.39; arm.add(palm);
      const fingers = new THREE.Mesh(capsule(0.034, 0.03, 0.05, 12), glove); fingers.rotation.x = Math.PI / 2 - 0.35; fingers.scale.set(1.25, 1, 0.8); fingers.position.set(0, -0.012, -0.44); arm.add(fingers);
      const thumb = new THREE.Mesh(capsule(0.018, 0.015, 0.04, 10), glove); thumb.rotation.set(Math.PI / 2, 0, side * 0.9); thumb.position.set(-side * 0.045, 0.01, -0.39); arm.add(thumb);
      arm.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 10; } });
      group.add(arm);
      return arm;
    };
    return { L: make(1), R: make(-1), mats: [suit, accent, glove, stripM] };
  }

  function update(dt, inp, camYaw) {
    st.t += dt;
    const d = (a, b, k) => a + (b - a) * (1 - Math.exp(-k * dt));
    st.walk = d(st.walk, Math.min(1, inp.speed / 4.4), 8);
    st.carry = d(st.carry, inp.carrying ? 1 : 0, 9); st.crouch = d(st.crouch, inp.crouch ? 1 : 0, 9);
    st.pump = d(st.pump, inp.pump ? 1 : 0, 8); st.fly = d(st.fly, inp.fly ? 1 : 0, 5);
    st.phase += dt * inp.speed * 1.75;
    // sway: the hands lag a little when you turn
    if (st.lastYaw !== null) { let dy = camYaw - st.lastYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); st.sway = d(st.sway, Math.max(-0.08, Math.min(0.08, -dy * 1.6)), 10); }
    st.lastYaw = camYaw;
    st.sway = d(st.sway, 0, 4);
    const bx = Math.sin(st.phase) * 0.014 * st.walk, by = Math.abs(Math.cos(st.phase)) * 0.016 * st.walk + Math.sin(st.t * 1.6) * 0.003;
    group.position.set(bx + st.sway * 0.4, -by - st.fly * 0.02, 0);
    group.rotation.set(0, st.sway, 0);
    const tw = Math.sin(st.t * 14) * 0.02, pumpY = Math.sin(st.t * 6) * 0.03;
    for (const [arm, side] of [[parts.L, 1], [parts.R, -1]]) {
      // rest: low in the corners, angled slightly inward
      let x = side * 0.25, y = -0.27, z = -0.42, rx = 0.18, ry = side * 0.16, rz = side * -0.1;
      // walking: the hands swing gently opposite each other
      z += Math.sin(st.phase + (side > 0 ? 0 : Math.PI)) * 0.025 * st.walk;
      // carrying: both hands come in and up to hold the part
      x = x + (side * 0.15 - x) * st.carry; y = y + (-0.2 - y) * st.carry; ry = ry + (side * 0.5 - ry) * st.carry; rz = rz + (side * -0.6 - rz) * st.carry;
      // installing: reach forward and tighten
      z -= 0.08 * st.crouch; y += (0.03 + (side > 0 ? tw : -tw)) * st.crouch;
      // pumping: the right hand works the handle
      if (side < 0) { y += pumpY * st.pump; rx += 0.3 * st.pump; }
      // flying: hands drop and tilt back a little
      y -= 0.04 * st.fly; rx -= 0.25 * st.fly;
      arm.position.set(x, y, z); arm.rotation.set(rx, ry, rz);
    }
  }

  return {
    group, update,
    setProfile(p) { group.remove(parts.L, parts.R); parts.mats.forEach(m => m.dispose()); parts = build(p); },
  };
}
