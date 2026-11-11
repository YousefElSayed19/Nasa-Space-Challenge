// Original low-poly engineer (GDD 5.3). Built from simple shapes in code: no outside model, no licence needed.
import * as THREE from 'three';
import { std, glow, lin } from './materials.js';
import { patchTexture, nameTexture, chestPanelTexture } from './textures.js';
import OPTIONS from '../data/character.json';

const BODY = { slim: { w: 0.88, l: 0.86 }, standard: { w: 1, l: 1 }, sturdy: { w: 1.16, l: 1.14 } };
const HEIGHT = { short: 0.93, medium: 1, tall: 1.07 };
const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));
const lerp = (a, b, t) => a + (b - a) * t;

const sphere = (r, ws = 20, hs = 14) => new THREE.SphereGeometry(r, ws, hs);
const cyl = (rt, rb, h, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg);
const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}

export function createCharacter(profile) {
  const root = new THREE.Group();
  const carryHolder = new THREE.Group();
  root.add(carryHolder);
  const st = { phase: 0, t: 0, lastStep: 1, w: { walk: 0, run: 0, carry: 0, crouch: 0, pump: 0, wave: 0 } };
  let rig = build(profile);
  root.add(rig.body);

  function build(p) {
    const b = BODY[p.body] || BODY.standard;
    const hs = HEIGHT[p.height] || 1;
    const visorHex = (OPTIONS.visor.find(v => v.id === p.visor) || OPTIONS.visor[0]).color;

    const suit = std(p.suit, { roughness: 0.68, metalness: 0.04 });
    const suitDark = std(new THREE.Color(p.suit).multiplyScalar(0.5).getStyle(), { roughness: 0.75 });
    const accent = std(p.accent, { roughness: 0.4, metalness: 0.3 });
    const accentGlow = std(p.accent, { emissive: p.accent, emissiveIntensity: 1.3, roughness: 0.4 });
    const shell = std('#EEF1FF', { roughness: 0.28, metalness: 0.12 });
    const dark = std('#1B2250', { roughness: 0.6, metalness: 0.35 });
    const metal = std('#9AA6D8', { roughness: 0.3, metalness: 0.85 });
    const hand = p.gloves === 'accent' ? accent : p.gloves === 'white' ? shell : dark;
    const visorM = new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.05, envMapIntensity: 2.2 });
    visorM.color = lin(visorHex); visorM.emissive = lin(visorHex); visorM.emissiveIntensity = 0.08;

    const lights = [], jets = [];
    const body = new THREE.Group(); body.scale.setScalar(hs);
    const hips = new THREE.Group(); hips.position.y = 0.92; body.add(hips);

    // pelvis and belt
    const pelvis = mesh(sphere(0.27), suit, hips); pelvis.scale.set(1.05 * b.w, 0.62, 0.8 * b.w);
    const belt = mesh(new THREE.TorusGeometry(0.26 * b.w, 0.035, 8, 32), dark, hips, 0, 0.09, 0);
    belt.rotation.x = Math.PI / 2; belt.scale.set(1.02, 0.8, 1);
    mesh(boxG(0.12, 0.08, 0.04), accent, hips, 0, 0.09, 0.215 * b.w);
    mesh(boxG(0.09, 0.11, 0.06), dark, hips, 0.2 * b.w, 0.04, 0.1); // utility pouch

    // legs: hip pivot > thigh > knee pivot > shin > boot
    function leg(side) {
      const hip = new THREE.Group(); hip.position.set(side * 0.13 * b.w, -0.02, 0); hips.add(hip);
      mesh(cyl(0.1 * b.l, 0.085 * b.l, 0.42), suit, hip, 0, -0.21, 0);
      const knee = new THREE.Group(); knee.position.y = -0.42; hip.add(knee);
      const pad = mesh(sphere(0.078 * b.l, 14, 10), accent, knee, 0, 0, 0.055); pad.scale.set(1, 1.15, 0.7);
      mesh(cyl(0.085 * b.l, 0.072 * b.l, 0.38), suit, knee, 0, -0.19, 0);
      const boot = new THREE.Group(); boot.position.y = -0.4; knee.add(boot);
      mesh(cyl(0.095 * b.l, 0.1 * b.l, 0.15), hand, boot, 0, 0.03, 0);
      const toe = mesh(sphere(0.1, 14, 10), hand, boot, 0, -0.03, 0.09); toe.scale.set(0.95, 0.6, 1.25);
      mesh(boxG(0.18 * b.l, 0.05, 0.32), dark, boot, 0, -0.07, 0.05);
      return { hip, knee };
    }
    const legL = leg(1), legR = leg(-1);

    // torso
    const spine = new THREE.Group(); spine.position.y = 0.06; hips.add(spine);
    const torso = mesh(cyl(0.3 * b.w, 0.26 * b.w, 0.6, 28), suit, spine, 0, 0.33, 0); torso.scale.z = 0.82;
    const front = 0.82 * 0.29 * b.w;
    const waist = mesh(new THREE.TorusGeometry(0.265 * b.w, 0.022, 8, 32), accent, spine, 0, 0.1, 0); waist.rotation.x = Math.PI / 2; waist.scale.set(1, 0.82, 1);
    // chest panel with lights
    const panelTex = chestPanelTexture();
    const panelM = new THREE.MeshStandardMaterial({ map: panelTex, emissiveMap: panelTex, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.55, roughness: 0.4 });
    const panel = mesh(boxG(0.2 * b.w, 0.15, 0.04), panelM, spine, -0.09 * b.w, 0.42, front + 0.01);
    panel.rotation.x = -0.08;
    // emblem patch
    if (p.patch !== 'none') {
      const pm = new THREE.MeshStandardMaterial({ map: patchTexture(p.patch, p.accent), roughness: 0.7, transparent: true });
      const patch = mesh(new THREE.CircleGeometry(0.065, 24), pm, spine, 0.13 * b.w, 0.47, front + 0.012);
      patch.rotation.y = 0.28;
    }
    // accent stripes down the torso sides
    for (const side of [1, -1]) {
      const s = mesh(boxG(0.03, 0.5, 0.05), accent, spine, side * 0.29 * b.w, 0.33, 0); s.rotation.z = side * -0.06;
    }
    // shoulder pads and neck ring
    for (const side of [1, -1]) { const sp = mesh(sphere(0.135, 18, 12), accent, spine, side * 0.33 * b.w, 0.58, 0); sp.scale.set(1.1, 0.68, 1); }
    const neck = mesh(new THREE.TorusGeometry(0.17, 0.045, 10, 28), shell, spine, 0, 0.66, 0); neck.rotation.x = Math.PI / 2;

    // head and helmet
    const head = new THREE.Group(); head.position.y = 0.87; spine.add(head);
    if (p.helmet === 'angular') {
      const h = mesh(cyl(0.27, 0.3, 0.46, 6), shell, head); h.rotation.y = Math.PI / 6;
      const top = mesh(cyl(0.18, 0.27, 0.1, 6), shell, head, 0, 0.28, 0); top.rotation.y = Math.PI / 6;
      const v = mesh(boxG(0.36, 0.19, 0.05), visorM, head, 0, 0.03, 0.245); v.rotation.x = -0.12;
      mesh(boxG(0.4, 0.035, 0.06), accent, head, 0, 0.145, 0.24);
      mesh(boxG(0.06, 0.2, 0.06), accent, head, 0.29, 0.02, 0);
      mesh(boxG(0.06, 0.2, 0.06), accent, head, -0.29, 0.02, 0);
    } else {
      mesh(sphere(0.29, 32, 22), shell, head);
      const v = mesh(new THREE.SphereGeometry(0.297, 32, 16, Math.PI / 2 - 0.78, 1.56, 0.95, 0.95), visorM, head);
      v.rotation.y = 0;
      const crest = mesh(boxG(0.05, 0.05, 0.42), accent, head, 0, 0.27, -0.04); crest.rotation.x = 0.12;
      if (p.helmet === 'halo') {
        const ring = mesh(new THREE.TorusGeometry(0.38, 0.022, 10, 48), accentGlow, head, 0, 0.08, 0);
        ring.rotation.x = Math.PI / 2 - 0.25;
        for (const side of [1, -1]) {
          const ant = mesh(cyl(0.012, 0.012, 0.28, 6), metal, head, side * 0.14, 0.38, -0.05); ant.rotation.z = side * -0.25;
          mesh(sphere(0.03, 10, 8), accentGlow, head, side * 0.175, 0.51, -0.05);
        }
      }
    }
    // helmet lamp
    const lampBody = mesh(cyl(0.045, 0.045, 0.1, 12), dark, head, 0.29, 0.05, 0.06); lampBody.rotation.x = Math.PI / 2;
    const lampLens = mesh(new THREE.CircleGeometry(0.035, 12), std('#FFFFFF', { emissive: '#DDE6FF', emissiveIntensity: 2 }), head, 0.29, 0.05, 0.112);
    lights.push(lampLens);

    // arms: shoulder pivot > upper arm > elbow pivot > forearm > glove
    function arm(side) {
      const sh = new THREE.Group(); sh.position.set(side * 0.37 * b.w, 0.56, 0); spine.add(sh);
      mesh(cyl(0.078 * b.l, 0.068 * b.l, 0.3), suit, sh, 0, -0.15, 0);
      const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
      mesh(sphere(0.07 * b.l, 12, 10), suitDark, el);
      mesh(cyl(0.068 * b.l, 0.06 * b.l, 0.26), suit, el, 0, -0.13, 0);
      mesh(cyl(0.078 * b.l, 0.078 * b.l, 0.06), accent, el, 0, -0.25, 0);
      const g = mesh(sphere(0.072 * b.l, 14, 10), hand, el, 0, -0.32, 0.01); g.scale.set(0.95, 1.2, 0.85);
      const thumb = mesh(sphere(0.03, 8, 6), hand, el, side * -0.05, -0.3, 0.05); thumb.scale.set(1, 1.4, 1);
      return { sh, el };
    }
    const armL = arm(1), armR = arm(-1);

    // backpack
    const pack = new THREE.Group(); pack.position.set(0, 0.38, -0.25 * b.w); spine.add(pack);
    const hose = (side) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.15, 0.28, -0.25 * b.w), new THREE.Vector3(side * 0.27, 0.74, -0.2), new THREE.Vector3(side * 0.22, 0.84, -0.06),
      ]);
      mesh(new THREE.TubeGeometry(curve, 16, 0.022, 6), dark, spine);
    };
    if (p.pack === 'tool') {
      mesh(boxG(0.4, 0.5, 0.1), dark, pack, 0, 0, -0.03);
      mesh(boxG(0.36, 0.17, 0.18), accent, pack, 0, -0.2, -0.1);
      for (const side of [1, -1]) { const t = mesh(cyl(0.025, 0.025, 0.5, 8), metal, pack, side * 0.08, 0.06, -0.12); t.rotation.z = side * 0.5; }
      mesh(boxG(0.12, 0.1, 0.08), shell, pack, 0.12, 0.17, -0.12);
      const l = mesh(sphere(0.025, 8, 6), std(p.accent, { emissive: p.accent, emissiveIntensity: 1.5 }), pack, -0.14, 0.2, -0.1); lights.push(l);
    } else if (p.pack === 'jet') {
      mesh(boxG(0.34, 0.42, 0.18), shell, pack, 0, 0.02, -0.06);
      mesh(boxG(0.36, 0.05, 0.2), accent, pack, 0, 0.14, -0.06);
      for (const side of [1, -1]) {
        mesh(cyl(0.08, 0.09, 0.44, 16), dark, pack, side * 0.2, -0.02, -0.1);
        mesh(cyl(0.085, 0.085, 0.04, 16), accent, pack, side * 0.2, 0.16, -0.1);
        mesh(cyl(0.06, 0.09, 0.08, 16), metal, pack, side * 0.2, -0.28, -0.1);
        const flame = mesh(new THREE.ConeGeometry(0.06, 0.32, 14, 1, true), glow('#8FD3FF', 0.5), pack, side * 0.2, -0.48, -0.1);
        flame.rotation.x = Math.PI; jets.push(flame);
      }
      hose(1); hose(-1);
    } else {
      mesh(boxG(0.46, 0.56, 0.2), shell, pack, 0, 0, -0.04);
      mesh(boxG(0.48, 0.06, 0.22), accent, pack, 0, 0.19, -0.04);
      for (const side of [1, -1]) mesh(cyl(0.07, 0.07, 0.5, 14), dark, pack, side * 0.26, -0.02, -0.04);
      ['#3EE0A0', '#FFC24B', '#6EA8FF'].forEach((c, i) => { const l = mesh(sphere(0.022, 8, 6), std(c, { emissive: c, emissiveIntensity: 1.5 }), pack, -0.12 + i * 0.06, 0.1, -0.146); lights.push(l); });
      const nm = new THREE.MeshStandardMaterial({ map: nameTexture(p.nick, p.accent), roughness: 0.6 });
      const plate = mesh(new THREE.PlaneGeometry(0.3, 0.075), nm, pack, 0, -0.08, -0.146); plate.rotation.y = Math.PI;
      hose(1); hose(-1);
    }

    body.traverse(o => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = false; } });
    return { body, hips, spine, head, legL, legR, armL, armR, lights, jets, hs };
  }

  function disposeRig(r) {
    r.body.traverse(o => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      const m = o.material; if (m.map) m.map.dispose(); m.dispose();
    });
  }

  /** inp: { speed, run, carrying, crouch, pump, wave } */
  function update(dt, inp) {
    const W = st.w, r = rig;
    st.t += dt;
    W.walk = damp(W.walk, Math.min(1, inp.speed / 4.6), 10, dt);
    W.run = damp(W.run, inp.run && inp.speed > 0.5 ? 1 : 0, 6, dt);
    W.carry = damp(W.carry, inp.carrying ? 1 : 0, 9, dt);
    W.crouch = damp(W.crouch, inp.crouch ? 1 : 0, 8, dt);
    W.pump = damp(W.pump, inp.pump ? 1 : 0, 8, dt);
    W.wave = damp(W.wave, inp.wave ? 1 : 0, 5, dt);
    st.phase += dt * inp.speed * 1.75;
    const ph = st.phase, t = st.t, idle = 1 - W.walk;
    const a = W.walk * (0.55 + 0.3 * W.run);

    // legs
    const swing = s => -Math.sin(ph + s) * a;
    const bend = s => a * (0.15 + 1.05 * Math.max(0, Math.sin(ph + s + 1.3)));
    r.legL.hip.rotation.x = lerp(swing(0), -0.95, W.crouch);
    r.legL.knee.rotation.x = lerp(bend(0), 1.55, W.crouch);
    r.legR.hip.rotation.x = lerp(swing(Math.PI), -0.35, W.crouch);
    r.legR.knee.rotation.x = lerp(bend(Math.PI), 1.05, W.crouch);

    // body bob, lean and breathing
    const bob = Math.abs(Math.sin(ph)) * 0.05 * W.walk * (1 + W.run * 0.7);
    r.body.position.y = bob - 0.26 * W.crouch * r.hs;
    r.spine.rotation.x = 0.06 * W.walk + 0.16 * W.run * W.walk + 0.32 * W.crouch + Math.sin(t * 1.7) * 0.012 * idle;
    r.spine.rotation.y = Math.sin(ph) * 0.09 * W.walk;
    r.spine.scale.set(1, 1 + Math.sin(t * 1.7) * 0.008 * idle, 1);
    r.head.rotation.y = Math.sin(t * 0.37) * 0.4 * idle * (1 - W.crouch) * (1 - W.wave);
    r.head.rotation.x = -0.1 * W.walk * W.run + 0.25 * W.crouch - 0.2 * W.wave;

    // arms
    const armSwing = s => Math.sin(ph + s) * a * 0.95;
    let lx = armSwing(0), rx = armSwing(Math.PI);
    let le = -0.22 - 0.6 * W.run * W.walk, re = le;
    let lz = 0.1, rz = -0.1;
    lx = lerp(lx, -1.15, W.carry); rx = lerp(rx, -1.15, W.carry);
    le = lerp(le, -0.6, W.carry); re = lerp(re, -0.6, W.carry);
    lz = lerp(lz, -0.08, W.carry); rz = lerp(rz, 0.08, W.carry);
    const tw = Math.sin(t * 14) * 0.13; // tightening motion while installing
    lx = lerp(lx, -1.35 + tw, W.crouch); rx = lerp(rx, -1.35 - tw, W.crouch);
    rx = lerp(rx, -0.8 + Math.sin(t * 6) * 0.28, W.pump); re = lerp(re, -0.95, W.pump);
    rz = lerp(rz, -2.7, W.wave); rx = lerp(rx, -0.15, W.wave);
    r.armL.sh.rotation.set(lx, 0, lz);
    r.armR.sh.rotation.set(rx, 0, rz);
    r.armL.el.rotation.set(le, 0, 0);
    r.armR.el.rotation.set(lerp(re, -0.35, W.wave), 0, Math.sin(t * 9) * 0.5 * W.wave);

    // effects
    r.jets.forEach(j => {
      j.scale.y = 0.5 + W.walk * W.run * 1.2 + Math.random() * 0.2;
      j.material.opacity = 0.15 + 0.6 * W.run * W.walk;
    });
    r.lights.forEach((l, i) => { l.material.emissiveIntensity = 1 + Math.sin(t * 3 + i * 2.1) * 0.6; });

    // carried part follows the hands
    carryHolder.position.set(0, (1.2 - 0.26 * W.crouch) * r.hs, (0.55 + 0.12 * W.crouch) * r.hs);

    // footstep event for the sound layer
    const sgn = Math.sin(ph) >= 0 ? 1 : -1;
    if (W.walk > 0.35 && sgn !== st.lastStep) { st.lastStep = sgn; return 'step'; }
    st.lastStep = sgn;
    return null;
  }

  return {
    root, carryHolder, update,
    setProfile(p) { root.remove(rig.body); disposeRig(rig); rig = build(p); root.add(rig.body); },
    setVisible(v) { rig.body.visible = v; },
  };
}
