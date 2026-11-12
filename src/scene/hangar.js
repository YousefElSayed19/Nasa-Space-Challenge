// The one hangar shared by all missions (GDD 5.1, 5.2). Only data changes between missions.
import * as THREE from 'three';
import { std, basic, glow, lin } from './materials.js';
import { canvasTex, label } from './textures.js';
import { partMesh, BUS_Y } from './spacecraft.js';
import { buildRocket } from './rocket.js';
import { ALL_PARTS, ALL_ROCKETS, MISSIONS, stationById } from '../engine/index.js';

export function buildWorld(scene) {
  const V3 = THREE.Vector3;
  const colliders = [];
  const refs = { shelf: {}, rockets: {}, lamps: [], storeLiquids: [] };
  const add = (m, parent) => { (parent || scene).add(m); return m; };
  const box = (w, h, d, mat, x = 0, y = 0, z = 0, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return add(m, parent); };
  const cyl = (rt, rb, h, mat, x = 0, y = 0, z = 0, parent, seg = 28) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return add(m, parent); };
  const collider = (cx, cz, hw, hd) => colliders.push({ minX: cx - hw, maxX: cx + hw, minZ: cz - hd, maxZ: cz + hd });
  const sign = (st) => { const l = label(st.label, st.color); l.position.set(st.obj[0], 5.2, st.obj[1]); scene.add(l); return l; };
  const metal = std('#34408A', { metalness: 0.7, roughness: 0.3 });

  // ---------- lighting ----------
  scene.add(new THREE.HemisphereLight(lin('#AFC2FF'), lin('#141A3A'), 0.9));
  const key = new THREE.DirectionalLight(lin('#E6ECFF'), 1.5);
  key.position.set(-10, 24, 12); key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -26, right: 26, top: 20, bottom: -20, near: 2, far: 70 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  scene.add(key); scene.add(key.target);
  refs.key = key;
  const accent = (c, x, y, z, i, d) => { const l = new THREE.PointLight(lin(c), i, d, 2); l.position.set(x, y, z); scene.add(l); return l; };
  refs.craftLight = accent('#6EA8FF', 0, 6.5, 2, 2.6, 18);
  accent('#FFC24B', 15, 4.5, 4, 2.2, 13);
  accent('#B48CFF', -15, 4.5, 6, 2.0, 13);
  accent('#3EE0A0', 0, 4, -10.5, 1.6, 11);
  accent('#6EA8FF', -15, 4, -9.5, 1.6, 11);
  accent('#6EA8FF', 15, 5, -11, 1.6, 13);
  accent('#8FD3FF', 9, 4, 11.5, 1.4, 10);

  // ---------- hangar shell ----------
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#1C2450'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(110,140,255,.22)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(11.5, 8.5);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(46, 34), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.22, metalness: 0.55 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.userData.noCast = true; scene.add(floor);

  const wallTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#262E5E'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, h - 6, w, 6); g.fillRect(w - 4, 0, 4, h);
    g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(10, 10, w - 24, h - 30);
  });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  const wallM = (rx) => { const t = wallTex.clone(); t.needsUpdate = true; t.repeat.set(rx, 3); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, metalness: 0.2 }); };
  box(46, 10, 0.4, wallM(12), 0, 5, -17); box(46, 10, 0.4, wallM(12), 0, 5, 17);
  box(0.4, 10, 34, wallM(9), -23, 5, 0); box(0.4, 10, 34, wallM(9), 23, 5, 0);
  // ceiling trusses
  for (let x = -18; x <= 18; x += 6) box(0.3, 0.5, 34, metal, x, 9.6, 0);
  // skirting glow
  const skirt = std('#6EA8FF', { emissive: '#6EA8FF', emissiveIntensity: 0.9 });
  box(45.4, 0.06, 0.06, skirt, 0, 0.12, -16.75); box(45.4, 0.06, 0.06, skirt, 0, 0.12, 16.75);
  box(0.06, 0.06, 33.4, skirt, -22.75, 0.12, 0); box(0.06, 0.06, 33.4, skirt, 22.75, 0.12, 0);

  // starfield window
  const stars = canvasTex(1024, 384, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#060A22'); gr.addColorStop(1, '#151C4C'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const neb = g.createRadialGradient(300, 220, 10, 300, 220, 260); neb.addColorStop(0, 'rgba(138,91,255,.35)'); neb.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = neb; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 800; i++) { const a = Math.random(); g.fillStyle = `rgba(232,236,255,${0.25 + a * 0.75})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, a > 0.96 ? 1.8 : 0.9, 0, 7); g.fill(); }
    const pg = g.createRadialGradient(820, 120, 4, 820, 120, 70); pg.addColorStop(0, '#E07B4A'); pg.addColorStop(0.7, '#9C3D1D'); pg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = pg; g.beginPath(); g.arc(820, 120, 70, 0, 7); g.fill();
  });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), new THREE.MeshBasicMaterial({ map: stars }));
  win.position.set(-9, 5.6, -16.75); win.userData.noCast = true; scene.add(win);
  box(16.4, 0.25, 0.3, metal, -9, 2.5, -16.7); box(16.4, 0.25, 0.3, metal, -9, 8.7, -16.7);
  for (let i = 0; i < 5; i++) box(0.2, 6.2, 0.3, metal, -17 + i * 4, 5.6, -16.7);

  // launch door
  box(5, 7, 0.2, std('#2A3366', { metalness: 0.5, roughness: 0.4 }), 8, 3.5, -16.75);
  for (let i = 0; i < 6; i++) box(4.6, 0.04, 0.05, std('#1A2048'), 8, 0.8 + i * 1.1, -16.62);
  box(5.4, 0.12, 0.25, std('#FFC24B', { emissive: '#FFC24B', emissiveIntensity: 2 }), 8, 7.1, -16.7);
  const dl = label('Launch pad', '#FFC24B'); dl.position.set(8, 7.8, -16.4); scene.add(dl);

  // ceiling strip lights
  const strip = std('#AFC4FF', { emissive: '#AFC4FF', emissiveIntensity: 2.2 });
  box(44, 0.12, 0.12, strip, 0, 9.2, -16.6); box(44, 0.12, 0.12, strip, 0, 9.2, 16.6);
  box(0.12, 0.12, 32, strip, -22.6, 9.2, 0); box(0.12, 0.12, 32, strip, 22.6, 9.2, 0);
  const walk = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.75, 72), basic('#6EA8FF', { transparent: true, opacity: 0.6 }));
  walk.rotation.x = -Math.PI / 2; walk.position.y = 0.02; scene.add(walk);

  // floating dust in the light
  const dustGeo = new THREE.BufferGeometry(); const N = 260; const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 40; pos[i * 3 + 1] = Math.random() * 8.5; pos[i * 3 + 2] = (Math.random() - 0.5) * 30; }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  refs.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: lin('#AFC4FF'), size: 0.05, transparent: true, opacity: 0.45, depthWrite: false }));
  scene.add(refs.dust);

  // ---------- Mission Control ----------
  {
    const st = stationById('control'); const [x, z] = st.obj;
    box(4.2, 1.0, 1.6, std('#2C3670', { metalness: 0.55, roughness: 0.3 }), x, 0.5, z);
    box(4.4, 0.08, 1.8, std('#6EA8FF', { emissive: '#6EA8FF', emissiveIntensity: 0.7 }), x, 1.04, z);
    const scrCanvas = document.createElement('canvas'); scrCanvas.width = 512; scrCanvas.height = 256;
    const scr = new THREE.CanvasTexture(scrCanvas); scr.encoding = THREE.sRGBEncoding;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), new THREE.MeshBasicMaterial({ map: scr }));
    screen.position.set(x, 2.3, z - 0.75); screen.userData.noCast = true; scene.add(screen);
    box(3.8, 2.0, 0.08, std('#1B2250'), x, 2.3, z - 0.82);
    const planetCanvas = document.createElement('canvas'); planetCanvas.width = 512; planetCanvas.height = 256;
    const planetTex = new THREE.CanvasTexture(planetCanvas); planetTex.encoding = THREE.sRGBEncoding;
    refs.mars = new THREE.Mesh(new THREE.SphereGeometry(0.55, 40, 24), std('#FFFFFF', { map: planetTex, emissive: '#202020', emissiveIntensity: 0.5, roughness: 0.9, metalness: 0 }));
    refs.mars.position.set(x + 1.4, 1.75, z + 0.1); scene.add(refs.mars);
    const holo = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 0.6, 32, 1, true), glow('#6EA8FF', 0.12));
    holo.position.set(x + 1.4, 1.35, z + 0.1); holo.userData.noCast = true; scene.add(holo);
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
      if (m.id === 'europa') {
        for (let i = 0; i < 14; i++) { p.fillStyle = i % 2 ? '#B89A78' : '#D8C8B0'; p.fillRect(0, i * 18 + Math.random() * 4, w, 12 + Math.random() * 8); }
        p.fillStyle = 'rgba(190,90,60,.8)'; p.beginPath(); p.ellipse(340, 170, 34, 18, 0, 0, 7); p.fill();
      } else {
        for (let i = 0; i < 300; i++) { p.globalAlpha = 0.18 + Math.random() * 0.3; p.fillStyle = m.planet.dark; p.beginPath(); p.ellipse(Math.random() * w, Math.random() * h, 5 + Math.random() * 28, 3 + Math.random() * 12, Math.random() * 3, 0, 7); p.fill(); }
        p.globalAlpha = 1;
        if (m.id === 'mars') { p.fillStyle = 'rgba(255,240,230,.85)'; p.fillRect(0, 0, w, 10); p.fillRect(0, h - 10, w, 10); }
      }
      p.globalAlpha = 1;
      planetTex.needsUpdate = true;
      refs.mars.scale.setScalar(m.id === 'europa' ? 1.25 : m.id === 'moon' ? 0.8 : 1);
    };
    collider(x, z, 2.2, 0.95); sign(st);
  }

  // ---------- Payload Bay ----------
  {
    const st = stationById('payload'); const [x, z] = st.obj;
    for (const dz of [-2.6, 2.6]) for (const dx of [-0.7, 0.7]) box(0.08, 3.4, 0.08, metal, x + dx, 1.7, z + dz);
    for (const y of [0.7, 1.9, 3.1]) box(1.6, 0.08, 5.4, metal, x, y, z);
    box(0.06, 0.06, 5.4, std('#B48CFF', { emissive: '#B48CFF', emissiveIntensity: 1.5 }), x + 0.8, 3.16, z);
    const instIndex = {};
    ALL_PARTS.filter(p => p.slot === 'instrument').forEach(p => {
      const i = instIndex[p.missions[0]] = (instIndex[p.missions[0]] ?? -1) + 1;
      const row = i < 3 ? 0 : 1, col = i % 3;
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.9), std('#2E3878', { metalness: 0.45, roughness: 0.4 })));
      const core = partMesh(p, true); core.scale.setScalar(0.95); core.position.set(0.25, 0.08, 0); core.rotation.y = Math.PI / 2; g.add(core);
      g.position.set(x, row ? 2.36 : 1.16, z - 1.8 + col * 1.8);
      scene.add(g); refs.shelf[p.id] = g;
    });
    collider(x, z, 0.9, 3.0); sign(st);
  }

  // ---------- Assembly Cradle and spacecraft ----------
  {
    cyl(1.7, 1.9, 0.4, metal, 0, 0.2, 0);
    cyl(1.75, 1.75, 0.05, std('#6EA8FF', { emissive: '#6EA8FF', emissiveIntensity: 1.4 }), 0, 0.42, 0);
    for (const sx of [-1, 1]) box(0.25, 1.4, 1.4, metal, sx * 0.85, 1.0, 0);
    const craft = new THREE.Group(); scene.add(craft); refs.craft = craft;
    // multilayer-insulation foil: crinkled gold, an octagonal bus like real orbiters
    const foilTex = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#C9A04A'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 26;
        g.fillStyle = Math.random() < 0.5 ? `rgba(255,236,170,${0.08 + Math.random() * 0.18})` : `rgba(90,60,10,${0.08 + Math.random() * 0.2})`;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + r, y + Math.random() * r); g.lineTo(x + Math.random() * r, y + r); g.closePath(); g.fill();
      }
      g.strokeStyle = 'rgba(80,55,10,.35)'; g.lineWidth = 3; for (let y = 64; y < h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    });
    const foil = new THREE.MeshStandardMaterial({ map: foilTex, metalness: 0.85, roughness: 0.32, emissive: lin('#2A1C00'), emissiveIntensity: 0.25 });
    const bus = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 2, 8), foil); bus.rotation.y = Math.PI / 8; bus.position.y = BUS_Y; craft.add(bus);
    const silver = std('#C9D0E6', { metalness: 0.9, roughness: 0.25 });
    for (const yy of [-1, 1]) { const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 8), silver); deck.rotation.y = Math.PI / 8; deck.position.y = BUS_Y + yy; craft.add(deck); }
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.3, 32), std('#9AA6D8', { metalness: 0.9, roughness: 0.3 })); ring.position.y = BUS_Y - 1.18; craft.add(ring);
    // white radiator panels on the diagonal faces
    for (const a of [Math.PI / 4, -Math.PI / 4, Math.PI * 3 / 4, -Math.PI * 3 / 4]) {
      const rad = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.3, 0.03), std('#EEF1FF', { roughness: 0.4 }));
      rad.position.set(Math.sin(a) * 1.02, BUS_Y, Math.cos(a) * 1.02); rad.rotation.y = a; craft.add(rad);
    }
    // attitude thruster pods and a star tracker
    for (const a of [Math.PI / 4, -Math.PI / 4, Math.PI * 3 / 4, -Math.PI * 3 / 4]) {
      const pod = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 12), std('#5A5F70', { metalness: 0.9, roughness: 0.3 }));
      pod.position.set(Math.sin(a) * 1.05, BUS_Y - 0.92, Math.cos(a) * 1.05); pod.rotation.z = Math.PI; craft.add(pod);
    }
    const tracker = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.22, 16), std('#1B2250', { metalness: 0.6 })); tracker.position.set(0.6, BUS_Y + 1.15, 0.55); tracker.rotation.x = 0.5; craft.add(tracker);
    refs.busParts = craft.children.slice();
    const shellM = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.3 }); shellM.color = lin('#BFD4FF');
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.4, 28), shellM); shell.position.set(0, 2.5, -1.5); craft.add(shell);
    const liqM = std('#8FD3FF', { emissive: '#3D63FF', emissiveIntensity: 0.9, transparent: true, opacity: 0.9 });
    refs.craftLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.3, 28), liqM);
    refs.craftLiquid.position.set(0, 2.5, -1.5); refs.craftLiquid.scale.y = 0.001; craft.add(refs.craftLiquid);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.4, 20, 1, true), std('#9AA6D8', { metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }));
    nozzle.position.set(0, BUS_Y - 1.2, 0); craft.add(nozzle);
    refs.craftParts = new THREE.Group(); craft.add(refs.craftParts);
    refs.flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.8, 24, 1, true), glow('#FFB04B', 0.9));
    refs.flame.rotation.x = Math.PI; refs.flame.position.set(0, BUS_Y - 2.8, 0); refs.flame.visible = false; craft.add(refs.flame);
    refs.flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.6, 16, 1, true), glow('#FFFFFF', 0.9));
    refs.flameCore.rotation.x = Math.PI; refs.flameCore.position.set(0, BUS_Y - 2.2, 0); refs.flameCore.visible = false; craft.add(refs.flameCore);
    refs.mountRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 10, 40), glow('#6EA8FF', 1));
    refs.mountRing.visible = false; scene.add(refs.mountRing);
    collider(0, 0, 1.9, 1.9); sign(stationById('cradle'));
  }

  // ---------- Systems Rack ----------
  {
    const st = stationById('systems'); const [x, z] = st.obj;
    box(5.4, 0.1, 1.2, metal, x, 0.9, z); box(5.4, 0.1, 1.2, metal, x, 0.05, z);
    box(5.6, 3.6, 0.1, std('#20295A'), x, 1.8, z + 0.6);
    box(5.6, 0.06, 0.06, std('#3EE0A0', { emissive: '#3EE0A0', emissiveIntensity: 1.5 }), x, 3.62, z + 0.55);
    const sysIndex = {};
    ALL_PARTS.filter(p => p.slot !== 'instrument').forEach(p => {
      const i = sysIndex[p.missions[0]] = (sysIndex[p.missions[0]] ?? -1) + 1;
      const m = partMesh(p, true); const px = x - 2.3 + i * 0.66;
      if (p.slot === 'array') { m.rotation.y = Math.PI / 2; m.rotation.z = 0.15; m.position.set(px, 1.6, z + 0.1); m.scale.setScalar(0.8 + Math.min(0.5, Math.sqrt(p.area) * 0.06)); }
      else if (p.slot === 'antenna') { m.position.set(px, 1.0, z); m.scale.setScalar(Math.min(0.85, 0.35 + p.dish * 0.15)); }
      else m.position.set(px, 1.15, z);
      scene.add(m); refs.shelf[p.id] = m;
    });
    collider(x, z, 2.8, 0.75); sign(st);
  }

  // ---------- Launch Vehicle Board ----------
  {
    const st = stationById('board'); const [x, z] = st.obj;
    const boardCanvas = document.createElement('canvas'); boardCanvas.width = 1024; boardCanvas.height = 384;
    const tex = new THREE.CanvasTexture(boardCanvas); tex.encoding = THREE.sRGBEncoding;
    refs.drawBoard = (m) => {
      const g = boardCanvas.getContext('2d'), w = 1024, h = 384;
      g.fillStyle = '#0D1436'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(110,168,255,.22)'; g.lineWidth = 1; for (let i = 0; i < w; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
      g.strokeStyle = '#6EA8FF'; g.lineWidth = 4; g.setLineDash([14, 10]); g.beginPath(); g.moveTo(120, 300);
      if (m.id === 'europa') g.bezierCurveTo(260, 60, 520, 360, 620, 200), g.bezierCurveTo(700, 80, 820, 60, 900, 200);
      else g.bezierCurveTo(360, m.id === 'moon' ? 150 : 40, 700, m.id === 'moon' ? 150 : 40, 900, 220);
      g.stroke(); g.setLineDash([]);
      g.fillStyle = '#6EA8FF'; g.beginPath(); g.arc(120, 300, 22, 0, 7); g.fill();
      g.fillStyle = m.planet.color; g.beginPath(); g.arc(900, 210, m.id === 'europa' ? 30 : 18, 0, 7); g.fill();
      g.fillStyle = '#E8ECFF'; g.font = '600 34px system-ui, Arial'; g.fillText(m.board, 60, 60);
      tex.needsUpdate = true;
    };
    const board = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.6), new THREE.MeshBasicMaterial({ map: tex }));
    board.position.set(x, 4.2, z - 0.3); board.userData.noCast = true; scene.add(board);
    box(6.6, 0.3, 2.2, std('#2C3670', { metalness: 0.5 }), x, 0.15, z + 0.9);
    ALL_ROCKETS.forEach((r, i) => {
      const { group } = buildRocket(r, r.h);
      group.position.set(x - 2.2 + i * 2.2, 0.3, z + 0.9); scene.add(group); refs.rockets[r.id] = group;
    });
    refs.rocketRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.92, 48), glow('#6EA8FF', 1));
    refs.rocketRing.material.side = THREE.DoubleSide; refs.rocketRing.rotation.x = -Math.PI / 2; refs.rocketRing.visible = false; scene.add(refs.rocketRing);
    collider(x, z + 0.6, 3.4, 1.4);
    const l = label(st.label, st.color); l.position.set(x, 6.3, z); scene.add(l);
  }

  // ---------- Fueling Station ----------
  {
    const st = stationById('fuel'); const [x, z] = st.obj;
    for (const dz of [-1.3, 1.3]) {
      const sm = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.3 }); sm.color = lin('#BFD4FF');
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 4, 32), sm); shell.position.set(x, 2.1, z + dz); scene.add(shell);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 3.8, 32), std('#8FD3FF', { emissive: '#3D63FF', emissiveIntensity: 0.8, transparent: true, opacity: 0.85 }));
      liq.position.set(x, 2.1, z + dz); scene.add(liq); refs.storeLiquids.push(liq);
      cyl(0.95, 0.95, 0.12, std('#FFC24B', { emissive: '#FFC24B', emissiveIntensity: 0.8 }), x, 4.15, z + dz);
      cyl(0.95, 1.0, 0.2, metal, x, 0.1, z + dz);
      for (const ry of [1.2, 3.0]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.03, 8, 40), metal); ring.rotation.x = Math.PI / 2; ring.position.set(x, ry, z + dz); scene.add(ring); }
    }
    box(0.9, 1.1, 1.0, std('#4A3C22', { metalness: 0.5 }), x - 1.6, 0.55, z);
    box(0.5, 0.18, 0.18, std('#FFC24B', { emissive: '#FFC24B', emissiveIntensity: 1.6 }), x - 2.1, 1.0, z);
    const curve = new THREE.CatmullRomCurve3([
      new V3(x - 2.05, 0.6, z), new V3(x - 3.6, 0.12, z - 0.4), new V3(9, 0.12, 2.2), new V3(3.2, 0.12, -0.8),
      new V3(1.6, 0.3, -2.0), new V3(0.6, 1.2, -2.0), new V3(0.35, 2.0, -1.75),
    ]);
    refs.pipeTex = canvasTex(128, 16, (g, w, h) => {
      g.fillStyle = '#1B2A66'; g.fillRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(143,211,255,0)'); gr.addColorStop(0.5, 'rgba(143,211,255,1)'); gr.addColorStop(1, 'rgba(143,211,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    refs.pipeTex.wrapS = refs.pipeTex.wrapT = THREE.RepeatWrapping; refs.pipeTex.repeat.set(24, 1);
    refs.pipeMat = new THREE.MeshStandardMaterial({ map: refs.pipeTex, emissiveMap: refs.pipeTex, emissiveIntensity: 0.15, metalness: 0.5, roughness: 0.3 });
    refs.pipeMat.color = lin('#8090C0'); refs.pipeMat.emissive = lin('#6EA8FF');
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 180, 0.09, 12), refs.pipeMat));
    collider(x - 0.6, z, 1.6, 2.4); sign(st);
  }

  // ---------- Go/No-Go console ----------
  {
    const st = stationById('review'); const [x, z] = st.obj;
    for (let i = 0; i < 4; i++) {
      const a = (i - 1.5) * 0.32; const g = new THREE.Group();
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.0, 0.9), std('#2C3670', { metalness: 0.55, roughness: 0.3 })); desk.position.y = 0.5; g.add(desk);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.95), std('#3EE0A0', { emissive: '#3EE0A0', emissiveIntensity: 0.6 })); top.position.y = 1.02; g.add(top);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), std('#555A70', { emissive: '#000000' }));
      lamp.position.set(0, 1.22, -0.2); g.add(lamp); refs.lamps.push(lamp);
      g.position.set(x + Math.sin(a) * 3.2, 0, z - (1 - Math.cos(a)) * 3.2);
      g.rotation.y = -a; scene.add(g);
    }
    collider(x, z, 2.4, 0.8); sign(st);
  }

  // beacon that floats over the next station
  // big guide arrow that floats over the current task's station
  refs.beacon = new THREE.Group();
  const arrowMat = std('#FFC24B', { emissive: '#FFB020', emissiveIntensity: 1.8, roughness: 0.3 });
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 4), arrowMat); head.rotation.x = Math.PI; head.position.y = 0.35; refs.beacon.add(head);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), arrowMat); shaft.position.y = 1.05; refs.beacon.add(shaft);
  refs.beaconRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 48), glow('#FFC24B', 0.7));
  refs.beaconRing.material.side = THREE.DoubleSide; refs.beaconRing.rotation.x = -Math.PI / 2; refs.beaconRing.userData.noCast = true; scene.add(refs.beaconRing);
  refs.beacon.traverse(o => { o.userData.noCast = true; }); scene.add(refs.beacon);

  refs.setMissionVisuals = (id) => { const m = MISSIONS.find(x => x.id === id) || MISSIONS[1]; refs.drawControl(m); refs.drawBoard(m); };
  refs.setMissionVisuals('mars');

  // shadows: solid meshes cast and receive, glass and glow do not
  scene.traverse(o => {
    if (!o.isMesh || o.userData.noCast) return;
    const transparent = o.material.transparent;
    o.castShadow = !transparent; o.receiveShadow = !transparent;
  });
  return { colliders, refs };
}

/** A soft studio environment for reflections on metal and visors. */
export function buildEnvironment(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(30, 14, 30), new THREE.MeshBasicMaterial({ side: THREE.BackSide }));
  room.material.color = lin('#1A2350'); env.add(room);
  const panel = (c, w, h, x, y, z, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    m.material.color = lin(c).multiplyScalar(3); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m);
  };
  panel('#E6ECFF', 20, 1.2, 0, 6.8, 0, 0, Math.PI / 2);
  panel('#6EA8FF', 8, 4, -14.5, 2, 0, Math.PI / 2);
  panel('#B48CFF', 8, 4, 14.5, 2, 0, -Math.PI / 2);
  panel('#FFC24B', 6, 2, 0, 2, -14.5);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.04).texture;
  pm.dispose();
  return tex;
}
