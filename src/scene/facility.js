// The mission facility: a central Assembly Hall with the spacecraft, and ten themed rooms around it (GDD 5, revised).
// Each room shows the parts it holds on display pedestals; only the current mission's parts are visible.
import * as THREE from 'three';
import { std, basic, glow, lin } from './materials.js';
import { canvasTex, label } from './textures.js';
import { partMesh, BUS_Y } from './spacecraft.js';
import { buildRocket } from './rocket.js';
import { ALL_PARTS, ALL_ROCKETS, MISSIONS, FACILITY, stationById } from '../engine/index.js';

const DOOR = 3.2, DOOR_H = 4.2, ROOM_H = 6, HALL_H = 10, T = 0.35;

export function buildWorld(scene) {
  const colliders = [], walls = [];
  const refs = { shelf: {}, rockets: {}, lamps: [], storeLiquids: [], trusses: [], walls };
  const add = (m, parent) => { (parent || scene).add(m); return m; };
  const box = (w, h, d, mat, x = 0, y = 0, z = 0, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return add(m, parent); };
  const cyl = (rt, rb, h, mat, x = 0, y = 0, z = 0, parent, seg = 28) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return add(m, parent); };
  const collider = (cx, cz, hw, hd) => colliders.push({ minX: cx - hw, maxX: cx + hw, minZ: cz - hd, maxZ: cz + hd });
  const metal = std('#3A4690', { metalness: 0.7, roughness: 0.3 });
  const trim = std('#8FA6E8', { metalness: 0.8, roughness: 0.25 });

  // ---------- lighting ----------
  scene.add(new THREE.HemisphereLight(lin('#B9C8FF'), lin('#151B3C'), 0.85));
  const key = new THREE.DirectionalLight(lin('#E6ECFF'), 1.2);
  key.position.set(-14, 30, 16); key.target.position.set(0, 0, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -30, right: 30, top: 28, bottom: -28, near: 2, far: 80 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  scene.add(key); scene.add(key.target); refs.key = key;
  const point = (c, x, y, z, i, d) => { const l = new THREE.PointLight(lin(c), i, d, 2); l.position.set(x, y, z); scene.add(l); return l; };
  refs.craftLight = point('#6EA8FF', 0, 6.5, 2, 2.6, 18);

  // ---------- textures ----------
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#1E2652'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,150,255,.18)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  const wallTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2A3264'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, h - 6, w, 6); g.fillRect(w - 4, 0, 4, h);
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(12, 12, w - 28, h - 34);
  });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  const wallMat = (len, h, tint) => {
    const t = wallTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, len / 4), h / 3.5);
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, metalness: 0.15 });
    if (tint) m.color = lin(tint).lerp(new THREE.Color(1, 1, 1), 0.82);
    return m;
  };

  // ---------- floors ----------
  const floorRect = (r, tint) => {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const t = floorTex.clone(); t.needsUpdate = true; t.repeat.set(w / 4, d / 4);
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.25, metalness: 0.5 });
    if (tint) m.color = lin(tint).lerp(new THREE.Color(1, 1, 1), 0.75);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
    f.rotation.x = -Math.PI / 2; f.position.set((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2);
    f.receiveShadow = true; f.userData.noCast = true; scene.add(f);
  };
  floorRect(FACILITY.hall);
  FACILITY.rooms.forEach(r => floorRect(r, r.color));

  // ---------- walls with door openings ----------
  // A wall from (ax,az) to (bx,bz) along x or z, with optional door gaps at positions along it.
  const wall = (ax, az, bx, bz, h, doors, tint) => {
    const alongX = az === bz, len = alongX ? Math.abs(bx - ax) : Math.abs(bz - az);
    const start = alongX ? Math.min(ax, bx) : Math.min(az, bz);
    const gaps = doors.map(d => [d - DOOR / 2, d + DOOR / 2]).sort((a, b) => a[0] - b[0]);
    let cur = start; const segs = [];
    for (const [g0, g1] of gaps) { if (g0 > cur) segs.push([cur, g0]); cur = g1; }
    if (cur < start + len) segs.push([cur, start + len]);
    const mat = wallMat(len, h, tint);
    for (const [s0, s1] of segs) {
      const L = s1 - s0, c = (s0 + s1) / 2;
      const m = alongX ? box(L, h, T, mat, c, h / 2, az) : box(T, h, L, mat, ax, h / 2, c);
      walls.push(m);
      alongX ? collider(c, az, L / 2, T / 2 + 0.05) : collider(ax, c, T / 2 + 0.05, L / 2);
    }
    // lintels above the doors, with a glowing frame
    for (const [g0, g1] of gaps) {
      const c = (g0 + g1) / 2;
      const m = alongX ? box(DOOR, h - DOOR_H, T, mat, c, DOOR_H + (h - DOOR_H) / 2, az) : box(T, h - DOOR_H, DOOR, mat, ax, DOOR_H + (h - DOOR_H) / 2, c);
      walls.push(m);
      const fm = std(tint || '#6EA8FF', { emissive: tint || '#6EA8FF', emissiveIntensity: 1.4 });
      if (alongX) { box(DOOR + 0.3, 0.1, T + 0.1, fm, c, DOOR_H, az); box(0.1, DOOR_H, T + 0.1, fm, g0, DOOR_H / 2, az); box(0.1, DOOR_H, T + 0.1, fm, g1, DOOR_H / 2, az); }
      else { box(T + 0.1, 0.1, DOOR + 0.3, fm, ax, DOOR_H, c); box(T + 0.1, DOOR_H, 0.1, fm, ax, DOOR_H / 2, g0); box(T + 0.1, DOOR_H, 0.1, fm, ax, DOOR_H / 2, g1); }
    }
  };
  const H = FACILITY.hall, R = FACILITY.rooms;
  const doorsOn = (axis, value) => R.filter(r => (axis === 'z' ? r.door[1] === value : r.door[0] === value)).map(r => (axis === 'z' ? r.door[0] : r.door[1]));
  // hall walls (shared with rooms), with every room's door
  wall(H.x0, H.z0, H.x1, H.z0, HALL_H, doorsOn('z', H.z0));
  wall(H.x0, H.z1, H.x1, H.z1, HALL_H, doorsOn('z', H.z1));
  wall(H.x0, H.z0, H.x0, H.z1, HALL_H, doorsOn('x', H.x0));
  wall(H.x1, H.z0, H.x1, H.z1, HALL_H, doorsOn('x', H.x1));
  // each room's outer walls (the side facing the hall is the hall wall above)
  for (const r of R) {
    const sides = [[r.x0, r.z0, r.x1, r.z0], [r.x0, r.z1, r.x1, r.z1], [r.x0, r.z0, r.x0, r.z1], [r.x1, r.z0, r.x1, r.z1]];
    for (const [ax, az, bx, bz] of sides) {
      const onHall = (az === bz && (az === H.z0 || az === H.z1) && ax >= H.x0 && bx <= H.x1) || (ax === bx && (ax === H.x0 || ax === H.x1) && az >= H.z0 && bz <= H.z1);
      if (onHall) continue;
      // skip walls shared with a neighbouring room that was already built
      const key = `${ax},${az},${bx},${bz}`;
      if (refs['w' + key]) continue; refs['w' + key] = true;
      wall(ax, az, bx, bz, ROOM_H, [], r.color);
    }
    // room sign over the door, on the hall side, and a soft coloured light inside
    const [dx, dz] = r.door;
    const sg = label(`${r.icon}  ${r.label}`, r.color); sg.scale.set(3.6, 0.9, 1);
    // stand the sign 1.4 m out from the wall so it never cuts into it when seen from an angle
    const off = dz === H.z0 ? 1.4 : dz === H.z1 ? -1.4 : 0, offx = dx === H.x0 ? 1.4 : dx === H.x1 ? -1.4 : 0;
    sg.position.set(dx + offx, DOOR_H + 0.7, dz + off); sg.material.depthTest = true; sg.renderOrder = 2; scene.add(sg);
    (refs.signs = refs.signs || []).push({ sprite: sg, room: r.id, x: dx + offx, z: dz + off });
    point(r.color, (r.x0 + r.x1) / 2, ROOM_H - 1, (r.z0 + r.z1) / 2, 1.8, 16);
    const strip = std(r.color, { emissive: r.color, emissiveIntensity: 1.6 });
    box(r.x1 - r.x0 - 0.8, 0.08, 0.08, strip, (r.x0 + r.x1) / 2, ROOM_H - 0.2, r.z0 + 0.3);
    box(r.x1 - r.x0 - 0.8, 0.08, 0.08, strip, (r.x0 + r.x1) / 2, ROOM_H - 0.2, r.z1 - 0.3);
  }
  // hall: ceiling trusses, strip lights, walkway ring, starfield window above the launch hall door
  for (let x = -12; x <= 12; x += 6) refs.trusses.push(box(0.3, 0.5, H.z1 - H.z0, metal, x, HALL_H - 0.3, 0));
  const hstrip = std('#AFC4FF', { emissive: '#AFC4FF', emissiveIntensity: 2 });
  box(H.x1 - H.x0 - 1, 0.1, 0.1, hstrip, 0, HALL_H - 0.8, H.z0 + 0.3); box(H.x1 - H.x0 - 1, 0.1, 0.1, hstrip, 0, HALL_H - 0.8, H.z1 - 0.3);
  const walk = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.75, 72), basic('#6EA8FF', { transparent: true, opacity: 0.6 }));
  walk.rotation.x = -Math.PI / 2; walk.position.y = 0.02; scene.add(walk);
  const stars = canvasTex(1024, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#060A22'); gr.addColorStop(1, '#151C4C'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { const a = Math.random(); g.fillStyle = `rgba(232,236,255,${0.25 + a * 0.75})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, a > 0.96 ? 1.8 : 0.9, 0, 7); g.fill(); }
  });
  for (const z of [H.z0 + 0.2, H.z1 - 0.2]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(26, 3.2), new THREE.MeshBasicMaterial({ map: stars }));
    win.position.set(0, 7.6, z); win.rotation.y = z > 0 ? Math.PI : 0; win.userData.noCast = true; scene.add(win);
  }

  // floating dust
  const N = 220, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 30; pos[i * 3 + 1] = Math.random() * 8.5; pos[i * 3 + 2] = (Math.random() - 0.5) * 22; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  refs.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: lin('#AFC4FF'), size: 0.05, transparent: true, opacity: 0.45, depthWrite: false }));
  scene.add(refs.dust);

  // ---------- display pedestals in each room ----------
  // spots along a room's walls, skipping the door side's middle
  const spotsFor = (r, n) => {
    const out = [], inset = 1.6, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    const ring = [];
    const W = r.x1 - r.x0 - inset * 2, D = r.z1 - r.z0 - inset * 2;
    const per = 2 * (W + D), step = per / Math.max(n, 6);
    for (let k = 0; k < Math.max(n, 6); k++) {
      let d = k * step + step / 2, x, z;
      if (d < W) { x = r.x0 + inset + d; z = r.z0 + inset; }
      else if ((d -= W) < D) { x = r.x1 - inset; z = r.z0 + inset + d; }
      else if ((d -= D) < W) { x = r.x1 - inset - d; z = r.z1 - inset; }
      else { d -= W; x = r.x0 + inset; z = r.z1 - inset - d; }
      // keep the door area clear
      if (Math.hypot(x - r.door[0], z - r.door[1]) < 3) continue;
      ring.push([x, z, Math.atan2(cx - x, cz - z)]);
    }
    for (let k = 0; k < n; k++) out.push(ring[k % ring.length]);
    return out;
  };
  const pedestal = (x, z, color) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.9, 32), std('#26306A', { metalness: 0.5, roughness: 0.35 })); base.position.y = 0.45; g.add(base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.06, 32), std(color, { emissive: color, emissiveIntensity: 0.9 })); top.position.y = 0.92; g.add(top);
    collider(x, z, 0.7, 0.7);
    return g;
  };
  const roomOfPart = p => (p.slot === 'instrument' ? p.lab : p.slot === 'antenna' ? 'comms' : p.slot === 'array' || p.slot === 'battery' ? 'power' : p.slot === 'engine' ? 'propulsion' : 'protection');
  const byRoomMission = {};
  for (const p of ALL_PARTS) {
    const key = roomOfPart(p) + '|' + p.missions[0];
    (byRoomMission[key] = byRoomMission[key] || []).push(p);
  }
  const pedestalAt = {};
  for (const [key, list] of Object.entries(byRoomMission)) {
    const room = R.find(r => r.id === key.split('|')[0]);
    const spots = spotsFor(room, list.length);
    list.forEach((p, i) => {
      const [x, z, rot] = spots[i];
      const pk = `${x.toFixed(2)},${z.toFixed(2)}`;
      if (!pedestalAt[pk]) pedestalAt[pk] = pedestal(x, z, room.color);
      const m = partMesh(p, p.slot === 'array' && !p.round);
      const bb = new THREE.Box3().setFromObject(m), size = bb.getSize(new THREE.Vector3());
      const sc = Math.min(1.6, 1.1 / Math.max(size.x, size.y, size.z));
      m.scale.setScalar(sc);
      const holder = new THREE.Group(); holder.add(m);
      m.position.y = -bb.min.y * sc;
      holder.position.set(x, 0.96, z); holder.rotation.y = rot; holder.userData.spin = true;
      scene.add(holder); refs.shelf[p.id] = holder;
    });
  }

  // ---------- Mission Control: briefing desk, big screen, hologram, Go/No-Go consoles ----------
  {
    const st = stationById('control'); const [x, z] = st.obj;
    box(4.2, 1.0, 1.6, std('#2C3670', { metalness: 0.55, roughness: 0.3 }), x, 0.5, z);
    box(4.4, 0.08, 1.8, std('#6EA8FF', { emissive: '#6EA8FF', emissiveIntensity: 0.7 }), x, 1.04, z);
    const scrCanvas = document.createElement('canvas'); scrCanvas.width = 512; scrCanvas.height = 256;
    const scr = new THREE.CanvasTexture(scrCanvas); scr.encoding = THREE.sRGBEncoding;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshBasicMaterial({ map: scr }));
    screen.position.set(x, 2.7, z - 1.4); screen.userData.noCast = true; scene.add(screen);
    box(4.6, 2.4, 0.1, std('#1B2250'), x, 2.7, z - 1.47);
    const planetCanvas = document.createElement('canvas'); planetCanvas.width = 512; planetCanvas.height = 256;
    const planetTex = new THREE.CanvasTexture(planetCanvas); planetTex.encoding = THREE.sRGBEncoding;
    refs.mars = new THREE.Mesh(new THREE.SphereGeometry(0.55, 40, 24), std('#FFFFFF', { map: planetTex, emissive: '#202020', emissiveIntensity: 0.5, roughness: 0.9, metalness: 0 }));
    refs.mars.position.set(x + 1.4, 1.75, z + 0.1); scene.add(refs.mars);
    const holo = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 0.6, 32, 1, true), glow('#6EA8FF', 0.12)); holo.position.set(x + 1.4, 1.35, z + 0.1); holo.userData.noCast = true; scene.add(holo);
    collider(x, z, 2.2, 0.95);
    refs.drawControl = (m) => {
      const g = scrCanvas.getContext('2d'), w = 512, h = 256;
      g.fillStyle = '#0B1230'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(110,168,255,.3)'; g.lineWidth = 1; for (let i = 0; i < w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
      g.fillStyle = '#E8ECFF'; g.font = '700 38px system-ui, Arial'; g.fillText(m.name, 26, 60);
      g.fillStyle = '#8F9BC7'; g.font = '22px system-ui, Arial'; m.screen.forEach((t, i) => g.fillText(t, 26, 106 + i * 36));
      g.strokeStyle = '#FFC24B'; g.lineWidth = 3; g.beginPath(); g.ellipse(400, 150, 80, 46, -0.2, 0, 7); g.stroke();
      g.fillStyle = m.planet.color; g.beginPath(); g.arc(400, 150, 26, 0, 7); g.fill();
      scr.needsUpdate = true;
      const p = planetCanvas.getContext('2d');
      p.fillStyle = m.planet.color; p.fillRect(0, 0, w, h);
      if (m.id === 'europa') { for (let i = 0; i < 14; i++) { p.fillStyle = i % 2 ? '#B89A78' : '#D8C8B0'; p.fillRect(0, i * 18 + Math.random() * 4, w, 12 + Math.random() * 8); } }
      else { for (let i = 0; i < 300; i++) { p.globalAlpha = 0.18 + Math.random() * 0.3; p.fillStyle = m.planet.dark; p.beginPath(); p.ellipse(Math.random() * w, Math.random() * h, 5 + Math.random() * 28, 3 + Math.random() * 12, Math.random() * 3, 0, 7); p.fill(); } p.globalAlpha = 1; }
      planetTex.needsUpdate = true;
      refs.mars.scale.setScalar(m.id === 'europa' ? 1.25 : m.id === 'moon' ? 0.8 : 1);
    };
    const rv = stationById('review'); const [rx, rz] = rv.obj;
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const desk = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.0, 0.8), std('#2C3670', { metalness: 0.55, roughness: 0.3 })); desk.position.y = 0.5; g.add(desk);
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.85), std('#3EE0A0', { emissive: '#3EE0A0', emissiveIntensity: 0.6 })); top.position.y = 1.02; g.add(top);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), std('#555A70', { emissive: '#000000' })); lamp.position.set(0, 1.2, -0.18); g.add(lamp); refs.lamps.push(lamp);
      g.position.set(rx - 1.5 + i * 1.0, 0, rz); scene.add(g);
    }
    collider(rx, rz, 2.1, 0.5);
  }

  // ---------- Assembly Hall: cradle and spacecraft ----------
  {
    // payload processing stand: stepped octagonal base, adapter ring, four clamp arms, lights and an umbilical mast
    const dark = std('#232B5C', { metalness: 0.65, roughness: 0.35 }), steel = std('#9AA6D8', { metalness: 0.9, roughness: 0.25 });
    const glowRing = std('#6EA8FF', { emissive: '#6EA8FF', emissiveIntensity: 1.5 });
    const tier = (rt, rb, h, y, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 8), mat); m.rotation.y = Math.PI / 8; m.position.y = y; scene.add(m); return m; };
    tier(1.95, 2.05, 0.18, 0.09, dark);
    tier(1.6, 1.75, 0.22, 0.29, metal);
    tier(1.15, 1.3, 0.16, 0.48, dark);
    cyl(1.98, 1.98, 0.03, glowRing, 0, 0.19, 0, undefined, 48);
    cyl(1.62, 1.62, 0.03, glowRing, 0, 0.41, 0, undefined, 48);
    // conical payload adapter the spacecraft sits on
    const adapter = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.98, 1.04, 32, 1, true), steel); adapter.position.y = 1.08; // top meets the bus floor scene.add(adapter);
    const flange = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 10, 40), steel); flange.rotation.x = Math.PI / 2; flange.position.y = 1.6; scene.add(flange);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 8), dark); bolt.position.set(Math.cos(a) * 0.62, 1.63, Math.sin(a) * 0.62); scene.add(bolt); }
    // four clamp arms with pads that hold the bus
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, cx = Math.cos(a), cz = Math.sin(a);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.5, 0.18), metal); post.position.set(cx * 1.45, 1.25, cz * 1.45); scene.add(post);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.12), steel); arm.position.set(cx * 1.27, 1.95, cz * 1.27); arm.rotation.y = -a; scene.add(arm);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.26), dark); pad.position.set(cx * 1.1, 1.95, cz * 1.1); pad.rotation.y = -a; scene.add(pad);
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 10), steel); piston.position.set(cx * 1.6, 0.85, cz * 1.6); piston.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); scene.add(piston);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), std('#FFC24B', { emissive: '#FFC24B', emissiveIntensity: 2 })); lamp.position.set(cx * 1.45, 2.05, cz * 1.45); scene.add(lamp); refs.lamps.push(lamp);
    }
    // umbilical mast with a cable to the spacecraft
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 0.2), metal); mast.position.set(-2.35, 1.6, 0.6); scene.add(mast);
    const mastTop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.2), steel); mastTop.position.set(-2.05, 3.1, 0.6); scene.add(mastTop);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-1.75, 3.05, 0.6), new THREE.Vector3(-1.4, 2.6, 0.5), new THREE.Vector3(-1.1, 2.4, 0.35)]), 16, 0.035, 8), dark); scene.add(cable);
    collider(-2.35, 0.6, 0.2, 0.2);
    const craft = new THREE.Group(); scene.add(craft); refs.craft = craft;
    const foilTex = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#C9A04A'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 26; g.fillStyle = Math.random() < 0.5 ? `rgba(255,236,170,${0.08 + Math.random() * 0.18})` : `rgba(90,60,10,${0.08 + Math.random() * 0.2})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r, y + Math.random() * r); g.lineTo(x + Math.random() * r, y + r); g.closePath(); g.fill(); }
    });
    const foil = new THREE.MeshStandardMaterial({ map: foilTex, metalness: 0.85, roughness: 0.32, emissive: lin('#2A1C00'), emissiveIntensity: 0.25 });
    const bus = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 2, 8), foil); bus.rotation.y = Math.PI / 8; bus.position.y = BUS_Y; craft.add(bus);
    const silver = std('#C9D0E6', { metalness: 0.9, roughness: 0.25 });
    for (const yy of [-1, 1]) { const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 8), silver); deck.rotation.y = Math.PI / 8; deck.position.y = BUS_Y + yy; craft.add(deck); }
    for (const a of [Math.PI / 4, -Math.PI / 4, Math.PI * 3 / 4, -Math.PI * 3 / 4]) {
      const rad = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.3, 0.03), std('#EEF1FF', { roughness: 0.4 })); rad.position.set(Math.sin(a) * 1.02, BUS_Y, Math.cos(a) * 1.02); rad.rotation.y = a; craft.add(rad);
      const pod = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 12), std('#5A5F70', { metalness: 0.9, roughness: 0.3 })); pod.position.set(Math.sin(a) * 1.05, BUS_Y - 0.92, Math.cos(a) * 1.05); pod.rotation.z = Math.PI; craft.add(pod);
    }
    const shellM = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.3 }); shellM.color = lin('#BFD4FF');
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.4, 28), shellM); shell.position.set(0, 2.5, -1.5); craft.add(shell);
    refs.craftLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.3, 28), std('#8FD3FF', { emissive: '#3D63FF', emissiveIntensity: 0.9, transparent: true, opacity: 0.9 }));
    refs.craftLiquid.position.set(0, 2.5, -1.5); refs.craftLiquid.scale.y = 0.001; craft.add(refs.craftLiquid);
    refs.craftParts = new THREE.Group(); craft.add(refs.craftParts);
    refs.flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.8, 24, 1, true), glow('#FFB04B', 0.9)); refs.flame.rotation.x = Math.PI; refs.flame.position.set(0, BUS_Y - 2.8, 0); refs.flame.visible = false; craft.add(refs.flame);
    refs.flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.6, 16, 1, true), glow('#FFFFFF', 0.9)); refs.flameCore.rotation.x = Math.PI; refs.flameCore.position.set(0, BUS_Y - 2.2, 0); refs.flameCore.visible = false; craft.add(refs.flameCore);
    refs.mountRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 10, 40), glow('#6EA8FF', 1)); refs.mountRing.visible = false; scene.add(refs.mountRing);
    collider(0, 0, 2.05, 2.05);
    const sg = label('🛠  Assembly Cradle', '#6EA8FF'); sg.position.set(0, 5.6, 0); scene.add(sg);
  }

  // ---------- Launch Vehicle Hall ----------
  {
    const st = stationById('board'); const [x, z] = st.obj;
    const boardCanvas = document.createElement('canvas'); boardCanvas.width = 1024; boardCanvas.height = 384;
    const tex = new THREE.CanvasTexture(boardCanvas); tex.encoding = THREE.sRGBEncoding;
    refs.drawBoard = (m) => {
      const g = boardCanvas.getContext('2d'), w = 1024, h = 384;
      g.fillStyle = '#0D1436'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#6EA8FF'; g.lineWidth = 4; g.setLineDash([14, 10]); g.beginPath(); g.moveTo(120, 300); g.bezierCurveTo(360, m.id === 'moon' ? 150 : 40, 700, m.id === 'moon' ? 150 : 40, 900, 220); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#6EA8FF'; g.beginPath(); g.arc(120, 300, 22, 0, 7); g.fill();
      g.fillStyle = m.planet.color; g.beginPath(); g.arc(900, 210, m.id === 'europa' ? 30 : 18, 0, 7); g.fill();
      g.fillStyle = '#E8ECFF'; g.font = '600 34px system-ui, Arial'; g.fillText(m.board, 60, 60);
      tex.needsUpdate = true;
    };
    const board = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), new THREE.MeshBasicMaterial({ map: tex }));
    board.position.set(x, 4.2, -22.7); board.userData.noCast = true; scene.add(board);
    box(9, 0.3, 3, std('#2C3670', { metalness: 0.5 }), x, 0.15, z);
    ALL_ROCKETS.forEach((r, i) => {
      const { group } = buildRocket(r, r.h * 1.0);
      group.position.set(x - 3 + i * 3, 0.3, z); scene.add(group); refs.rockets[r.id] = group;
    });
    refs.rocketRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.92, 48), glow('#6EA8FF', 1));
    refs.rocketRing.material.side = THREE.DoubleSide; refs.rocketRing.rotation.x = -Math.PI / 2; refs.rocketRing.visible = false; scene.add(refs.rocketRing);
    collider(x, z, 4.5, 1.5);
  }

  // ---------- Propulsion & Fueling ----------
  {
    const st = stationById('fuel'); const [x, z] = st.obj;
    for (const dx of [-1.6, 1.6]) {
      const sm = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.3 }); sm.color = lin('#BFD4FF');
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 4, 32), sm); sh.position.set(x + dx, 2.1, z); scene.add(sh);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 3.8, 32), std('#8FD3FF', { emissive: '#3D63FF', emissiveIntensity: 0.8, transparent: true, opacity: 0.85 }));
      liq.position.set(x + dx, 2.1, z); scene.add(liq); refs.storeLiquids.push(liq);
      cyl(0.95, 0.95, 0.12, std('#FF9A6E', { emissive: '#FF9A6E', emissiveIntensity: 0.8 }), x + dx, 4.15, z);
      cyl(0.95, 1.0, 0.2, metal, x + dx, 0.1, z);
    }
    box(1.0, 1.1, 1.0, std('#4A3C22', { metalness: 0.5 }), x, 0.55, z + 1.5);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x - 1.6, 0.4, z + 0.7), new THREE.Vector3(x - 0.8, 0.12, z + 1.6), new THREE.Vector3(x, 0.6, z + 1.5), new THREE.Vector3(x + 0.8, 0.12, z + 1.6), new THREE.Vector3(x + 1.6, 0.4, z + 0.7)]);
    refs.pipeTex = canvasTex(128, 16, (g, w, h) => { g.fillStyle = '#1B2A66'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(143,211,255,0)'); gr.addColorStop(0.5, 'rgba(143,211,255,1)'); gr.addColorStop(1, 'rgba(143,211,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    refs.pipeTex.wrapS = refs.pipeTex.wrapT = THREE.RepeatWrapping; refs.pipeTex.repeat.set(8, 1);
    refs.pipeMat = new THREE.MeshStandardMaterial({ map: refs.pipeTex, emissiveMap: refs.pipeTex, emissiveIntensity: 0.15, metalness: 0.5, roughness: 0.3 });
    refs.pipeMat.color = lin('#8090C0'); refs.pipeMat.emissive = lin('#6EA8FF');
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.09, 12), refs.pipeMat));
    collider(x, z + 0.4, 2.7, 1.6);
  }

  // ---------- guide arrow ----------
  refs.beacon = new THREE.Group();
  const arrowMat = std('#FFC24B', { emissive: '#FFB020', emissiveIntensity: 1.8, roughness: 0.3 });
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 4), arrowMat); head.rotation.x = Math.PI; head.position.y = 0.35; refs.beacon.add(head);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), arrowMat); shaft.position.y = 1.05; refs.beacon.add(shaft);
  refs.beaconRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 48), glow('#FFC24B', 0.7));
  refs.beaconRing.material.side = THREE.DoubleSide; refs.beaconRing.rotation.x = -Math.PI / 2; refs.beaconRing.userData.noCast = true; scene.add(refs.beaconRing);
  refs.beacon.traverse(o => { o.userData.noCast = true; }); scene.add(refs.beacon);

  // ---------- portal (fast travel) ----------
  const swirl = canvasTex(256, 256, g => {
    const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.35, 'rgba(143,211,255,.8)'); gr.addColorStop(0.7, 'rgba(138,91,255,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 6;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(128, 128, 30 + i * 16, i, i + 2.2); g.stroke(); }
  });
  const makePortal = () => {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.07, 12, 64), std('#8FD3FF', { emissive: '#6EA8FF', emissiveIntensity: 2.4 })); g.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.08, 48), new THREE.MeshBasicMaterial({ map: swirl, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); g.add(disc);
    g.position.y = 1.25; g.visible = false; g.userData.disc = disc; g.userData.ring = ring; scene.add(g);
    return g;
  };
  refs.portalA = makePortal(); refs.portalB = makePortal();

  refs.setMissionVisuals = (id) => { const m = MISSIONS.find(x => x.id === id) || MISSIONS[1]; refs.drawControl(m); refs.drawBoard(m); };
  refs.setMissionVisuals('mars');

  scene.traverse(o => {
    if (!o.isMesh || o.userData.noCast) return;
    const transparent = o.material.transparent;
    o.castShadow = !transparent; o.receiveShadow = !transparent;
  });
  return { colliders, refs };
}

export { buildEnvironment } from './hangar.js';
