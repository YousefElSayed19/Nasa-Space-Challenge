// The flight, mission by mission (GDD 8.4): liftoff from Earth, cruise along the path, orbit insertion, science orbits.
// A chase camera follows the spacecraft you built.
import * as THREE from 'three';
import { lin, glow, std } from './materials.js';
import { canvasTex } from './textures.js';
import { partMesh } from './spacecraft.js';
import { buildRocket } from './rocket.js';
import { partById, ALL_ROCKETS } from '../engine/index.js';

const PHASE_AT = { 'Launch': 0.07, 'Cruise': 0.55, 'Orbit insertion': 0.84, 'Science operations': 0.95, 'End of mission': 1 };
const damp = (k, dt) => 1 - Math.exp(-k * dt);

function planetTexture(kind) {
  return canvasTex(1024, 512, (g, w, h) => {
    const rnd = (a, b) => a + Math.random() * (b - a);
    if (kind === 'earth') {
      g.fillStyle = '#1E4FB8'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2E8B57';
      for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(rnd(0, w), rnd(h * 0.15, h * 0.85), rnd(30, 120), rnd(20, 70), rnd(0, 3), 0, 7); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, 0, w, 26); g.fillRect(0, h - 26, w, 26);
      g.fillStyle = 'rgba(255,255,255,.35)';
      for (let i = 0; i < 70; i++) { g.beginPath(); g.ellipse(rnd(0, w), rnd(0, h), rnd(30, 140), rnd(6, 18), rnd(-0.3, 0.3), 0, 7); g.fill(); }
    } else if (kind === 'moon') {
      g.fillStyle = '#A3A6AE'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(70,72,80,.35)'; g.beginPath(); g.ellipse(rnd(0, w), rnd(0, h), rnd(40, 110), rnd(30, 70), 0, 0, 7); g.fill(); }
      for (let i = 0; i < 260; i++) { const x = rnd(0, w), y = rnd(0, h), r = rnd(3, 16); g.strokeStyle = 'rgba(40,42,50,.45)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }
    } else if (kind === 'mars') {
      g.fillStyle = '#B5481C'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${rnd(60, 110)},${rnd(20, 40)},10,${rnd(0.15, 0.4)})`; g.beginPath(); g.ellipse(rnd(0, w), rnd(0, h), rnd(10, 60), rnd(5, 25), rnd(0, 3), 0, 7); g.fill(); }
      g.fillStyle = 'rgba(255,240,230,.9)'; g.fillRect(0, 0, w, 18); g.fillRect(0, h - 14, w, 14);
    } else if (kind === 'jupiter') {
      const cols = ['#D8C8B0', '#B89A78', '#E8DCC8', '#A57F5C', '#D2B48C', '#C9A27E'];
      for (let y = 0; y < h; y += 16) { g.fillStyle = cols[(y / 16) % cols.length | 0]; g.fillRect(0, y + rnd(-3, 3), w, 18); }
      g.fillStyle = 'rgba(190,90,60,.85)'; g.beginPath(); g.ellipse(w * 0.65, h * 0.62, 70, 34, 0, 0, 7); g.fill();
    } else if (kind === 'europa') {
      g.fillStyle = '#E9E2D0'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(150,80,50,.6)'; g.lineWidth = 3;
      for (let i = 0; i < 60; i++) { g.beginPath(); g.moveTo(rnd(0, w), rnd(0, h)); g.quadraticCurveTo(rnd(0, w), rnd(0, h), rnd(0, w), rnd(0, h)); g.stroke(); }
    } else { // sun
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#FFE08A'); gr.addColorStop(0.5, '#FFB347'); gr.addColorStop(1, '#FFE08A');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,${rnd(150, 230)},80,.25)`; g.beginPath(); g.arc(rnd(0, w), rnd(0, h), rnd(2, 10), 0, 7); g.fill(); }
    }
  });
}

export function createSpaceView() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#03050F');
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 800);
  scene.add(new THREE.AmbientLight(lin('#8FA6FF'), 0.25));
  const sun = new THREE.PointLight(lin('#FFF1D6'), 2.4, 0, 0); scene.add(sun);
  const fill = new THREE.DirectionalLight(lin('#AFC4FF'), 0.35); fill.position.set(-10, 6, 10); scene.add(fill);
  // stars
  const n = 2500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const r = 300 + Math.random() * 100, t = Math.random() * 6.283, p = Math.acos(2 * Math.random() - 1); pos.set([r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t)], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: lin('#E8ECFF'), size: 0.9 })));

  const world = new THREE.Group(); scene.add(world);
  const textures = {};
  const tex = k => textures[k] || (textures[k] = planetTexture(k));
  let curve, earth, earthR, dest, destR, orbitR, craft, rocket, engineGlow, trail, progress = 0, t = 0, missionId = 'mars';
  let capsule = null, heatGlow = null, chute = null, landSite = null, landUp = null;
  // named bodies for the educational tour, staging pieces, and the data link home
  let bodies = {}, stages = null, beams = [];
  const stageMat = (c) => std(c, { metalness: 0.4, roughness: 0.5 });
  const camPos = new THREE.Vector3(0, 10, 30), camLook = new THREE.Vector3();

  function planet(kind, r, x, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40), kind === 'sun'
      ? new THREE.MeshBasicMaterial({ map: tex('sun') })
      : new THREE.MeshStandardMaterial({ map: tex(kind), roughness: 0.9, metalness: 0 }));
    m.position.set(x, 0, z); world.add(m);
    if (kind === 'sun') m.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.6, 32, 20), glow('#FFB04B', 0.25)));
    if (opts.atmo) m.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 48, 32), glow(opts.atmo, 0.18)));
    return m;
  }
  function ring(r, cx = 0, cz = 0) {
    const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * 6.283; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r)); }
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: lin('#2E3A78'), transparent: true, opacity: 0.6 })));
  }

  function buildCraft(installed) {
    const g = new THREE.Group();
    const bus = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 2, 8), std('#D4AC52', { metalness: 0.9, roughness: 0.3 })); bus.rotation.y = Math.PI / 8; g.add(bus);
    const parts = installed.map(partById).filter(Boolean);
    let inst = 0;
    for (const p of parts) {
      if (p.slot === 'array') { const a = partMesh(p, false); g.add(a); }
      else if (p.slot === 'antenna') { const a = partMesh(p, false); a.position.set(0, 1.35, 0.2); g.add(a); }
      else if (p.slot === 'instrument') { const a = partMesh(p, true); a.scale.setScalar(0.8); a.position.set(-0.5 + (inst % 3) * 0.5, inst < 3 ? 0.45 : -0.45, 1.1); inst++; g.add(a); }
    }
    engineGlow = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 16, 1, true), glow('#8FD3FF', 0.0));
    engineGlow.rotation.x = Math.PI; engineGlow.position.y = -1.9; g.add(engineGlow);
    g.scale.setScalar(0.12);
    return g;
  }

  function setMission(id, installed = [], rocketId = 'atlas') {
    missionId = id;
    while (world.children.length) world.remove(world.children[0]);
    const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);
    let pts;
    if (id === 'moon') {
      sun.position.set(-200, 30, 80);
      earthR = 3; earth = planet('earth', earthR, 0, 0, { atmo: '#8FD3FF' });
      dest = planet('moon', 0.85, 22, 0); destR = 0.85; orbitR = 1.25;
      pts = [V(0, 3.2, 0.5), V(5, 7, 1.5), V(12, 6, 1.4), V(18, 3, 0.6), V(22 - orbitR, 0.2)];
    } else if (id === 'lander') {
      sun.position.set(0, 0, 0); planet('sun', 2.4, 0, 0);
      ring(14); ring(22);
      earthR = 0.9; earth = planet('earth', earthR, -14, 0, { atmo: '#8FD3FF' });
      dest = planet('mars', 2.2, 22, 0, { atmo: '#E0A080' }); destR = 2.2; orbitR = 3.4;
      pts = []; for (let i = 0; i <= 16; i++) { const a = Math.PI - i / 16 * Math.PI, r = 14 + 8 * (i / 16); pts.push(V(Math.cos(a) * r, -Math.sin(a) * r * 0.92, 0.6 * Math.sin(i / 16 * Math.PI))); }
      pts[0] = V(-14 + earthR * 1.05, 0.3, 0.2); pts[pts.length - 1] = V(22 - orbitR, 0.8, 0.6);
    } else if (id === 'mars') {
      sun.position.set(0, 0, 0); planet('sun', 2.4, 0, 0);
      ring(14); ring(22);
      earthR = 0.9; earth = planet('earth', earthR, -14, 0, { atmo: '#8FD3FF' });
      dest = planet('mars', 0.65, 22, 0); destR = 0.65; orbitR = 1.05;
      pts = []; for (let i = 0; i <= 16; i++) { const a = Math.PI - i / 16 * Math.PI, r = 14 + 8 * (i / 16); pts.push(V(Math.cos(a) * r, -Math.sin(a) * r * 0.92, 0.6 * Math.sin(i / 16 * Math.PI))); }
      pts[0] = V(-14 + earthR * 1.05, 0.3, 0.2); pts[pts.length - 1] = V(22 - orbitR, 0.2);
    } else {
      sun.position.set(0, 0, 0); planet('sun', 2.2, 0, 0);
      ring(9); ring(13); ring(34);
      earthR = 0.75; earth = planet('earth', earthR, -9, 0, { atmo: '#8FD3FF' });
      planet('mars', 0.5, 0, 13);
      dest = planet('jupiter', 3.2, 34, 0); destR = 3.2; orbitR = 5.2;
      const eur = planet('europa', 0.35, 34 + orbitR, 0); eur.userData.moon = true;
      ring(orbitR, 34, 0);
      pts = [V(-9 + earthR * 1.05, 0.4), V(-4, 8, 1), V(0, 12.6, 1), V(6, 6, 0.6), V(2, -8, 0.4), V(-9, -2.5, 0.4), V(-6, 9, 1), V(8, 18, 2), V(24, 12, 1.5), V(34 - orbitR, 0.6)];
    }
    bodies = { earth, dest };
    if (id !== 'moon') {
      const moonR = earthR * 0.27; const mo = planet('moon', moonR, earth.position.x + earthR * 3.2, earth.position.z + earthR * 1.2); bodies.moon = mo;
    } else bodies.moon = dest;
    if (id === 'mars' || id === 'lander') { ring(9.5); bodies.venus = planet('jupiter', 0.75, -6.7, 6.7); bodies.venus.material.color = lin('#E8C77A'); bodies.sun = world.children.find(o => o.geometry && o.geometry.parameters && o.geometry.parameters.radius === 2.4); }
    if (id === 'europa') {
      bodies.sun = world.children.find(o => o.geometry && o.geometry.parameters && o.geometry.parameters.radius === 2.2);
      bodies.mars = world.children.find(o => o.material && o.material.map === tex('mars'));
      bodies.jupiter = dest;
      const n = 900, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, r = 17 + Math.random() * 6; pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.8, Math.sin(a) * r], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const belt = new THREE.Points(g, new THREE.PointsMaterial({ color: lin('#B8A88A'), size: 0.12 })); world.add(belt);
      bodies.belt = { position: new THREE.Vector3(0, 0, 20) };
      bodies.dest = world.children.find(o => o.userData.moon) || dest;
    }
    if (id === 'moon') bodies.sun = { position: new THREE.Vector3(-30, 4, 12) };
    curve = new THREE.CatmullRomCurve3(pts);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(300)), new THREE.LineDashedMaterial({ color: lin('#6EA8FF'), dashSize: 0.5, gapSize: 0.35, transparent: true, opacity: 0.55 }));
    line.computeLineDistances(); world.add(line);
    trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: lin('#FFC24B'), transparent: true, opacity: 0.9 })); world.add(trail);
    craft = buildCraft(installed); craft.visible = false; world.add(craft);
    if (id === 'lander') {
      // cruise inside an aeroshell capsule; heat glow on entry; parachute; touchdown on the surface
      capsule = new THREE.Group();
      const shield = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.09, 32), std('#6B3E1E', { roughness: 0.8 })); shield.rotation.x = Math.PI; shield.position.y = -0.03; capsule.add(shield);
      const back = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.16, 32), std('#EEF1FF', { roughness: 0.5 })); back.position.y = 0.09; capsule.add(back);
      heatGlow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), glow('#FF8A3D', 0)); heatGlow.position.y = -0.05; capsule.add(heatGlow);
      world.add(capsule); capsule.visible = false;
      chute = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), new THREE.MeshStandardMaterial({ color: lin('#F2F4FA'), side: THREE.DoubleSide, roughness: 0.6 }));
      world.add(chute); chute.visible = false;
      landUp = new THREE.Vector3(-0.55, 0.62, 0.55).normalize();
      landSite = dest.position.clone().add(landUp.clone().multiplyScalar(destR));
    } else { capsule = chute = landSite = landUp = null; }
    const r = ALL_ROCKETS.find(x => x.id === rocketId) || ALL_ROCKETS[0];
    rocket = buildRocket(r, 1.2); rocket.flames.forEach(f => { f.visible = true; });
    world.add(rocket.group);
    stages = new THREE.Group(); world.add(stages); stages.visible = false;
    const booster = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.7, 20), stageMat(r.color || '#E07B39'));
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 20), stageMat('#EEF1FF'));
    const upFlame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 14, 1, true), glow('#8FD3FF', 0.9)); upFlame.rotation.x = Math.PI; upFlame.position.y = -0.3; upper.add(upFlame);
    const fairL = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 12, 0, Math.PI, 0, Math.PI / 2), stageMat('#FFFFFF')); fairL.scale.y = 2;
    const fairR = fairL.clone(); fairR.rotation.y = Math.PI;
    stages.add(booster, upper, fairL, fairR); stages.userData = { booster, upper, fairL, fairR, upFlame };
    beams.forEach(b => world.remove(b)); beams = [];
    progress = 0; t = 0;
    placeRocket(0);
    camPos.copy(earth.position).add(new THREE.Vector3(earthR * 1.4, earthR * 0.8, earthR * 2.6));
  }

  function placeRocket(k) {
    // stands on Earth's surface facing the start of the path, then climbs away
    const start = curve.getPoint(0), dir = start.clone().sub(earth.position).normalize();
    const base = earth.position.clone().add(dir.clone().multiplyScalar(earthR));
    const climb = k * k * earthR * 1.4;
    rocket.group.position.copy(base.add(dir.clone().multiplyScalar(climb)));
    rocket.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().lerp(curve.getTangent(0.02), k * 0.6).normalize());
  }

  let focusBody = null;
  function update(dt, phase, kind) {
    t += dt;
    const target = PHASE_AT[phase] ?? 0;
    progress += (target - progress) * damp(1.2, dt);
    const look = new THREE.Vector3(), want = new THREE.Vector3();
    world.children.forEach(o => { if (o.userData.moon) { const a = t * 0.5; o.position.set(dest.position.x + Math.cos(a) * orbitR, 0, dest.position.z + Math.sin(a) * orbitR); } });
    earth.rotation.y += dt * 0.15; dest.rotation.y += dt * 0.1;

    if (progress < 0.07) {
      const k = progress / 0.07;
      craft.visible = false;
      if (k < 0.45) {
        // liftoff on the full rocket
        rocket.group.visible = true; stages.visible = false; placeRocket(k / 0.45 * 0.6);
        rocket.flames.forEach(f => { const s = 1 + Math.random() * 0.3; f.scale.set(s, s, s); });
        look.copy(rocket.group.position);
        want.copy(rocket.group.position).add(new THREE.Vector3(1.4, 0.6, 2.4));
      } else {
        // staging: the booster drops away, the fairing splits, then the spacecraft leaves the upper stage
        rocket.group.visible = false; stages.visible = true;
        const S = stages.userData, q = rocket.group.quaternion, up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
        const base = rocket.group.position.clone().add(up.clone().multiplyScalar(0.5 + (k - 0.45) * 2));
        stages.position.set(0, 0, 0);
        const s1 = (k - 0.45) / 0.55;
        S.booster.position.copy(base).add(up.clone().multiplyScalar(-0.6 - s1 * 1.6)); S.booster.position.y -= s1 * 0.4; S.booster.quaternion.copy(q); S.booster.rotateZ(s1 * 1.2);
        S.upper.position.copy(base); S.upper.quaternion.copy(q);
        S.upFlame.visible = k < 0.85; S.upFlame.scale.setScalar(1 + Math.random() * 0.3);
        const fs = Math.max(0, (k - 0.6) / 0.4);
        const side = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
        S.fairL.position.copy(base).add(up.clone().multiplyScalar(0.26)).add(side.clone().multiplyScalar(fs * 0.9)); S.fairL.quaternion.copy(q); S.fairL.rotateZ(-fs * 1.5);
        S.fairR.position.copy(base).add(up.clone().multiplyScalar(0.26)).add(side.clone().multiplyScalar(-fs * 0.9)); S.fairR.quaternion.copy(q); S.fairR.rotateZ(fs * 1.5); S.fairR.rotateY(Math.PI);
        if (k > 0.85) {
          craft.visible = !capsule; if (capsule) capsule.visible = true;
          const cp = base.clone().add(up.clone().multiplyScalar(0.3 + (k - 0.85) * 3));
          craft.position.copy(cp); craft.quaternion.copy(q); if (capsule) { capsule.position.copy(cp); capsule.quaternion.copy(q); }
          S.upper.position.add(up.clone().multiplyScalar(-(k - 0.85) * 2));
        }
        look.copy(base);
        want.copy(base).add(new THREE.Vector3(1.2, 0.5, 2.0));
      }
    } else {
      stages.visible = false;
      rocket.group.visible = false; craft.visible = !capsule;
      if (capsule && progress >= 0.84) { landing(dt, kind, look, want); camPos.lerp(want, damp(2.2, dt)); camLook.lerp(look, damp(3, dt)); camera.position.copy(camPos); camera.lookAt(camLook); return; }
      if (capsule) { capsule.visible = true; }
      const travel = Math.min(1, (progress - 0.07) / (0.84 - 0.07));
      let p, tan;
      if (progress < 0.84) { p = curve.getPoint(travel); tan = curve.getTangent(Math.min(0.999, travel)); }
      else {
        const a = t * 0.9, c = dest.position;
        p = new THREE.Vector3(c.x + Math.cos(a) * orbitR, Math.sin(a * 0.5) * 0.15, c.z + Math.sin(a) * orbitR);
        tan = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
      }
      craft.position.copy(p);
      craft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan.clone().negate());
      if (capsule) { capsule.position.copy(p); capsule.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tan); }
      const burning = progress > 0.78 && progress < 0.88;
      engineGlow.material.opacity = burning ? 0.85 : 0;
      engineGlow.material.color = lin(kind === 'fail' ? '#FF5D6C' : '#8FD3FF');
      trail.geometry.setFromPoints(curve.getPoints(220).slice(0, Math.max(2, Math.floor(travel * 220))));
      if (progress < 0.84) {
        // chase camera behind and above the spacecraft
        const side = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
        const dist = missionId === 'moon' ? 1.6 : 2.4;
        want.copy(p).add(tan.clone().multiplyScalar(-dist)).add(new THREE.Vector3(0, dist * 0.5, 0)).add(side.multiplyScalar(dist * 0.6));
        look.copy(p).add(tan.clone().multiplyScalar(dist * 1.5));
        if (travel > 0.75) look.lerp(dest.position, (travel - 0.75) * 4);
      } else {
        const a = t * 0.12;
        want.copy(dest.position).add(new THREE.Vector3(Math.cos(a) * orbitR * 2.4, orbitR * 1.1, Math.sin(a) * orbitR * 2.4));
        look.copy(dest.position);
      }
    }
    if (focusBody && bodies[focusBody] && progress > 0.08 && progress < 0.82) look.lerp(bodies[focusBody].position, 0.45);
    if (progress > 0.95) {
      // the science comes home as radio signals
      if (beams.length < 14 && Math.random() < dt * 6) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), glow('#8FD3FF', 1)); b.userData.t = 0; world.add(b); beams.push(b);
      }
      const from = (craft.visible ? craft.position : dest.position), to = earth.position;
      beams = beams.filter(b => { b.userData.t += dt * 0.35; b.position.lerpVectors(from, to, b.userData.t); if (b.userData.t >= 1) { world.remove(b); return false; } return true; });
    }
    camPos.lerp(want, damp(2.2, dt)); camLook.lerp(look, damp(3, dt));
    camera.position.copy(camPos); camera.lookAt(camLook);
  }

  function landing(dt, kind, look, want) {
    // 0.84 → 0.95: entry (glowing heat shield), parachute, powered descent, touchdown
    const k = Math.min(1, (progress - 0.84) / 0.11);
    const start = curve.getPoint(1);
    const top = landSite.clone().add(landUp.clone().multiplyScalar(0.9));
    let p;
    if (k < 0.45) p = start.clone().lerp(top, k / 0.45);
    else p = top.clone().lerp(landSite.clone().add(landUp.clone().multiplyScalar(0.035)), Math.min(1, (k - 0.45) / 0.55) ** 0.7);
    const entry = k < 0.45, chuteOn = k >= 0.4 && k < 0.8, powered = k >= 0.75 && k < 1, down = k >= 1;
    capsule.visible = k < 0.55;
    capsule.position.copy(p); capsule.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), landUp.clone().negate());
    heatGlow.material.opacity = entry ? 0.35 + 0.4 * Math.sin(k / 0.45 * Math.PI) + Math.random() * 0.1 : 0;
    chute.visible = chuteOn && kind !== 'fail';
    chute.position.copy(p).add(landUp.clone().multiplyScalar(0.45)); chute.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), landUp);
    craft.visible = k >= 0.5 && !(kind === 'fail' && k > 0.98);
    craft.position.copy(p); craft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), landUp);
    craft.scale.setScalar(0.035);
    engineGlow.material.opacity = powered && kind !== 'fail' ? 0.9 : 0;
    engineGlow.material.color = lin('#FFB04B');
    if (down) { const a = t * 0.15; want.copy(landSite).add(landUp.clone().multiplyScalar(0.35)).add(new THREE.Vector3(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45)); look.copy(landSite); }
    else { want.copy(p).add(landUp.clone().multiplyScalar(0.5)).add(new THREE.Vector3(0.6, 0.1, 0.6)); look.copy(p); }
  }

  function setSize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); }
  return { scene, camera, setMission, update, setSize, getProgress: () => progress, setFocus: b => { focusBody = b; } };
}
