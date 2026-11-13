// Spacecraft parts as meshes, and where each one mounts on the bus.
import * as THREE from 'three';
import { std, lin } from './materials.js';
import { canvasTex } from './textures.js';
import { partById } from '../engine/index.js';

export const BUS_Y = 2.6;
export const INST_SLOTS = [[-0.55, 0.45], [0, 0.45], [0.55, 0.45], [-0.55, -0.45], [0, -0.45], [0.55, -0.45]];

let cellTex = null;
function cells() {
  if (cellTex) return cellTex;
  cellTex = canvasTex(128, 64, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#102470'); g.addColorStop(1, '#1d3aa0');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(170,200,255,.6)'; c.lineWidth = 2;
    for (let i = 0; i <= W; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, H); c.stroke(); }
    for (let j = 0; j <= H; j += 16) { c.beginPath(); c.moveTo(0, j); c.lineTo(W, j); c.stroke(); }
  });
  cellTex.wrapS = cellTex.wrapT = THREE.RepeatWrapping;
  return cellTex;
}

export function partMesh(p, forHands) {
  const g = new THREE.Group();
  if (p.slot === 'instrument' && p.shape && SHAPES[p.shape]) {
    SHAPES[p.shape](g, p, shapeMats(p));
  } else if (p.slot === 'engine') {
    const m = shapeMats(p);
    const bell = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.09, 0.2), new THREE.Vector2(0.12, 0.08), new THREE.Vector2(0.2, -0.15), new THREE.Vector2(0.32, -0.42), new THREE.Vector2(0.34, -0.45)], 32), m.dark); g.add(bell);
    const inner = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.08, 0.18), new THREE.Vector2(0.18, -0.15), new THREE.Vector2(0.31, -0.43)], 32), std('#FF9A6E', { emissive: '#FF6A2A', emissiveIntensity: 0.6, side: THREE.BackSide })); g.add(inner);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.22, 24), m.alu); head.position.y = 0.32; g.add(head);
    for (const sx of [-1, 1]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 10), m.gold); v.position.set(sx * 0.2, 0.36, 0); v.rotation.z = sx * 0.6; g.add(v); }
  } else if (p.slot === 'instrument') {
    // shape follows what the instrument does, so each one looks different
    const n = p.name.toLowerCase();
    const kind = /radar/.test(n) ? 'radar' : /magnet/.test(n) ? 'mag' : /camera|imag|imaging system/.test(n) && !/spectro|thermal|ultraviolet/.test(n) ? 'camera'
      : /spectro|mapper|ultraviolet/.test(n) ? 'spectro' : /altimeter|laser/.test(n) ? 'laser' : /sounder|radiometer|thermal/.test(n) ? 'radiometer' : 'detector';
    const body = std(p.color, { emissive: p.color, emissiveIntensity: 0.12, metalness: 0.35, roughness: 0.45 });
    const black = std('#15171F', { metalness: 0.8, roughness: 0.25 });
    const alu = std('#C9D0E6', { metalness: 0.9, roughness: 0.3 });
    const lensGlass = std('#2A63FF', { metalness: 1, roughness: 0.05, emissive: '#2A63FF', emissiveIntensity: 0.4 });
    const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
    add(new THREE.BoxGeometry(0.42, 0.36, 0.3), body);
    add(new THREE.BoxGeometry(0.44, 0.04, 0.32), alu, 0, 0.19, 0);
    if (kind === 'camera') {
      add(new THREE.CylinderGeometry(0.14, 0.14, 0.42, 28), alu, 0, 0.02, 0.3, Math.PI / 2);
      add(new THREE.CylinderGeometry(0.17, 0.15, 0.1, 28, 1, true), black, 0, 0.02, 0.53, Math.PI / 2);
      add(new THREE.CircleGeometry(0.12, 24), lensGlass, 0, 0.02, 0.515);
    } else if (kind === 'radar') {
      add(new THREE.BoxGeometry(0.2, 0.12, 0.12), black, 0, 0, 0.2);
      add(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 8), alu, 0, 0.0, 0.24, 0, 0, Math.PI / 2);
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 8), alu, 0, -0.06, 0.24, 0, 0, Math.PI / 2);
    } else if (kind === 'mag') {
      add(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 8), alu, 0, 0.1, 0.55, Math.PI / 2);
      add(new THREE.BoxGeometry(0.1, 0.1, 0.1), black, 0, 0.1, 1.0);
    } else if (kind === 'spectro') {
      add(new THREE.BoxGeometry(0.3, 0.06, 0.04), black, 0, 0.06, 0.17);
      add(new THREE.BoxGeometry(0.3, 0.22, 0.02), std('#EEF1FF', { roughness: 0.4 }), 0, 0, -0.17);
      add(new THREE.BoxGeometry(0.18, 0.14, 0.12), alu, 0, -0.04, 0.2);
    } else if (kind === 'laser') {
      for (const [x, y] of [[-0.09, 0.05], [0.09, 0.05], [0, -0.08]]) {
        add(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 18), alu, x, y, 0.22, Math.PI / 2);
        add(new THREE.CircleGeometry(0.04, 16), std('#3EE0A0', { emissive: '#3EE0A0', emissiveIntensity: 1.2 }), x, y, 0.305);
      }
    } else if (kind === 'radiometer') {
      add(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 24), alu, 0, 0.26, 0.05);
      add(new THREE.BoxGeometry(0.12, 0.06, 0.08), black, 0, 0.26, 0.15);
    } else {
      add(new THREE.CylinderGeometry(0.1, 0.12, 0.22, 24), alu, 0, 0, 0.26, Math.PI / 2);
      add(new THREE.CircleGeometry(0.08, 18), black, 0, 0, 0.375);
    }
    for (const x of [-0.16, 0.16]) add(new THREE.BoxGeometry(0.03, 0.05, 0.2), black, x, -0.2, 0);
  } else if (p.slot === 'array' && p.round) {
    // round, fan-folded arrays like InSight's (10-sided)
    const r = forHands ? 0.45 : 0.5 + Math.sqrt(p.area) * 0.32;
    const tex = cells().clone(); tex.needsUpdate = true; tex.repeat.set(3, 3);
    const pm = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.6, roughness: 0.25, emissive: lin('#0a1a55'), emissiveIntensity: 0.6, side: THREE.DoubleSide });
    const disk = (x) => { const d = new THREE.Mesh(new THREE.CircleGeometry(r, 10), pm); d.rotation.x = -Math.PI / 2; d.position.set(x, 0, 0); g.add(d);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.02, 6, 10), std('#9AA6D8', { metalness: 0.8 })); rim.rotation.x = Math.PI / 2; rim.position.set(x, 0, 0); g.add(rim); };
    if (forHands) disk(0); else { disk(1.15 + r); disk(-1.15 - r); }
  } else if (p.slot === 'array') {
    const w = forHands ? 1.0 : 0.8 + Math.sqrt(p.area) * 0.6;
    const tex = cells().clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(1, Math.round(w)), 1);
    const pm = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.6, roughness: 0.25, emissive: lin('#0a1a55'), emissiveIntensity: 0.6 });
    if (forHands) g.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, 0.05), pm));
    else for (const sx of [-1, 1]) {
      const pnl = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, 0.05), pm); pnl.position.set(sx * (1.15 + w / 2), 0, 0); g.add(pnl);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 1.46, 0.03), std('#9AA6D8', { metalness: 0.8, roughness: 0.3 }));
      frame.position.set(sx * (1.15 + w / 2), 0, -0.03); g.add(frame);
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), std('#9AA6D8', { metalness: 0.8 }));
      boom.rotation.z = Math.PI / 2; boom.position.set(sx * 1.08, 0, 0); g.add(boom);
    }
  } else if (p.slot === 'antenna') {
    const r = forHands ? 0.45 : p.dish * 0.27;
    const dish = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.32), std('#E8ECFF', { side: THREE.DoubleSide, metalness: 0.35, roughness: 0.35 }));
    dish.rotation.x = Math.PI; dish.position.y = r * 0.95; g.add(dish);
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI * 2 / 3, strut = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, r * 0.95, 6), std('#9AA6D8', { metalness: 0.8 }));
      strut.position.set(Math.cos(a) * r * 0.32, r * 0.55, Math.sin(a) * r * 0.32); strut.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); g.add(strut);
    }
    const horn = new THREE.Mesh(new THREE.ConeGeometry(r * 0.09, r * 0.18, 16), std('#C9D0E6', { metalness: 0.9, roughness: 0.3 })); horn.position.y = r * 0.98; horn.rotation.x = Math.PI; g.add(horn);
    if (!forHands) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), std('#9AA6D8', { metalness: 0.8 })); mast.position.y = -0.2; g.add(mast);
      g.rotation.x = -0.45;
    }
  } else if (p.slot === 'battery') {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.42), std('#1F3A4F', { metalness: 0.5, roughness: 0.4 })));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 16), std('#3EE0A0', { metalness: 0.7, roughness: 0.3 }));
      cell.position.set(-0.18 + i * 0.12, 0.2, -0.12 + j * 0.12); g.add(cell);
    }
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.02), std('#3EE0A0', { emissive: '#3EE0A0', emissiveIntensity: 1.5 })); s.position.set(0, 0.06, 0.22); g.add(s);
  } else if (p.slot === 'aeroshell') {
    const thick = p.maxEntry > 200;
    const shield = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0.42), new THREE.Vector2(0.5, 0.2), new THREE.Vector2(1.25, 0), new THREE.Vector2(1.3, thick ? 0.12 : 0.07), new THREE.Vector2(0, thick ? 0.55 : 0.48)].reverse(), 40),
      std(thick ? '#6B3E1E' : '#8A5A30', { roughness: 0.85, metalness: 0.1, side: THREE.DoubleSide }));
    shield.rotation.x = Math.PI; g.add(shield);
    if (forHands) g.scale.setScalar(0.45);
  } else if (p.slot === 'parachute') {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, p.dvSave > 400 ? 0.34 : 0.26, 24), std('#EEF1FF', { roughness: 0.4 }));
    g.add(can);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.06, 24), std('#FF7A3D', { roughness: 0.5 })); g.add(band);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.06, 24), std('#9AA6D8', { metalness: 0.8 })); lid.position.y = 0.2; g.add(lid);
  } else if (p.id === 'eu-vault') {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.34, 0.8), std('#8A93B8', { metalness: 0.9, roughness: 0.35 }));
    g.add(v);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.05, 0.84), std('#B48CFF', { emissive: '#5A3AA0', emissiveIntensity: 0.6, metalness: 0.7 }));
    lid.position.y = 0.19; g.add(lid);
  } else {
    const m = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.65, metalness: 0.6, roughness: 0.2, emissiveIntensity: 0.4 });
    m.color = lin('#B48CFF'); m.emissive = lin('#5A3AA0');
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.62), m));
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = !o.material.transparent; });
  return g;
}

function placeOn(p, i) {
  if (p.slot === 'instrument') { const sl = INST_SLOTS[Math.min(i, 5)]; return [sl[0], BUS_Y + sl[1], 1.15]; }
  if (p.slot === 'array') return [0, BUS_Y, 0];
  if (p.slot === 'antenna') return [0, BUS_Y + 1.35, 0.2];
  if (p.slot === 'battery') return [-0.55, BUS_Y + 1.16, -0.5];
  if (p.slot === 'aeroshell') return [0, BUS_Y - 1.32, 0];
  if (p.slot === 'engine') return [0, BUS_Y - 1.3, 0];
  if (p.slot === 'parachute') return [0, BUS_Y + 1.2, -0.45];
  return [0.55, BUS_Y + 1.08, -0.5];
}

/** Where the part being carried will go: used for the glowing mount marker. */
export function slotPos(p, installed) {
  const n = installed.filter(id => partById(id).slot === 'instrument').length;
  const [x, y, z] = placeOn(p, n);
  if (p.slot === 'array') return new THREE.Vector3(1.6, y, 0);
  return new THREE.Vector3(x, y, z);
}

export function rebuildCraft(group, installed) {
  while (group.children.length) group.remove(group.children[0]);
  let n = 0;
  for (const id of installed) {
    const p = partById(id); const m = partMesh(p, false);
    m.position.set(...placeOn(p, p.slot === 'instrument' ? n++ : 0));
    group.add(m);
  }
}


// ---------- detailed instrument models, one per instrument type ----------
function shapeMats(p) {
  return {
    body: std(p.color || '#6EA8FF', { emissive: p.color || '#6EA8FF', emissiveIntensity: 0.1, metalness: 0.35, roughness: 0.45 }),
    alu: std('#C9D0E6', { metalness: 0.9, roughness: 0.28 }),
    dark: std('#15171F', { metalness: 0.8, roughness: 0.3 }),
    gold: std('#D4AC52', { metalness: 0.95, roughness: 0.3 }),
    white: std('#EEF1FF', { roughness: 0.45 }),
    lens: std('#2A63FF', { metalness: 1, roughness: 0.05, emissive: '#2A63FF', emissiveIntensity: 0.4 }),
    led: std('#3EE0A0', { emissive: '#3EE0A0', emissiveIntensity: 1.4 }),
  };
}
const M3 = (g, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
const ribs = (g, mat, r, len, n, z0) => { for (let i = 0; i < n; i++) M3(g, new THREE.TorusGeometry(r, 0.012, 6, 28), mat, 0, 0, z0 + (i / (n - 1)) * len); };
const SHAPES = {
  // big telescope: long barrel with sunshade, ribs and electronics boxes (HiRISE, LROC, EIS)
  telescope(g, p, m) {
    M3(g, new THREE.CylinderGeometry(0.2, 0.2, 0.9, 32), m.white, 0, 0.12, 0.05, Math.PI / 2);
    M3(g, new THREE.CylinderGeometry(0.23, 0.2, 0.22, 32, 1, true), m.dark, 0, 0.12, 0.6, Math.PI / 2);
    M3(g, new THREE.CircleGeometry(0.17, 28), m.lens, 0, 0.12, 0.5);
    ribs(g, m.gold, 0.205, 0.7, 4, -0.3);
    M3(g, new THREE.BoxGeometry(0.36, 0.2, 0.3), m.body, 0, -0.12, -0.32);
    M3(g, new THREE.BoxGeometry(0.2, 0.14, 0.2), m.gold, 0.22, -0.16, -0.05);
  },
  // spectrometer on a two-axis gimbal (CRISM, MISE)
  'gimbal-spectro'(g, p, m) {
    M3(g, new THREE.CylinderGeometry(0.22, 0.26, 0.08, 28), m.alu, 0, -0.26, 0);
    for (const sx of [-1, 1]) M3(g, new THREE.BoxGeometry(0.05, 0.34, 0.12), m.alu, sx * 0.24, -0.08, 0);
    const head = new THREE.Group(); head.rotation.x = -0.35; g.add(head);
    M3(head, new THREE.BoxGeometry(0.4, 0.26, 0.32), m.body);
    M3(head, new THREE.CylinderGeometry(0.09, 0.11, 0.22, 24), m.dark, 0, 0, 0.26, Math.PI / 2);
    M3(head, new THREE.CircleGeometry(0.07, 20), m.lens, 0, 0, 0.375);
    M3(head, new THREE.BoxGeometry(0.42, 0.02, 0.34), m.gold, 0, 0.14, 0);
    M3(g, new THREE.BoxGeometry(0.3, 0.12, 0.2), m.white, 0, -0.38, -0.12);
  },
  // long dipole radar with electronics box (SHARAD, REASON)
  dipole(g, p, m) {
    M3(g, new THREE.BoxGeometry(0.34, 0.2, 0.26), m.body);
    M3(g, new THREE.BoxGeometry(0.36, 0.03, 0.28), m.gold, 0, 0.115, 0);
    for (const sx of [-1, 1]) {
      M3(g, new THREE.CylinderGeometry(0.018, 0.018, 1.0, 10), m.white, sx * 0.67, 0.02, 0, 0, 0, Math.PI / 2);
      for (let i = 1; i <= 3; i++) M3(g, new THREE.CylinderGeometry(0.024, 0.024, 0.03, 10), m.alu, sx * (0.17 + i * 0.25), 0.02, 0, 0, 0, Math.PI / 2);
    }
  },
  // compact line-scan camera (CTX, E-THEMIS)
  camera(g, p, m) {
    M3(g, new THREE.BoxGeometry(0.3, 0.26, 0.34), m.body);
    M3(g, new THREE.CylinderGeometry(0.1, 0.1, 0.3, 24), m.alu, 0, 0.02, 0.3, Math.PI / 2);
    M3(g, new THREE.CylinderGeometry(0.12, 0.1, 0.07, 24, 1, true), m.dark, 0, 0.02, 0.47, Math.PI / 2);
    M3(g, new THREE.CircleGeometry(0.085, 20), m.lens, 0, 0.02, 0.455);
    M3(g, new THREE.BoxGeometry(0.32, 0.02, 0.36), m.gold, 0, 0.14, 0);
  },
  // twin telescopes on a scanning yoke (MCS, Diviner)
  yoke(g, p, m) {
    M3(g, new THREE.CylinderGeometry(0.2, 0.22, 0.08, 24), m.alu, 0, -0.26, 0);
    for (const sx of [-1, 1]) M3(g, new THREE.BoxGeometry(0.04, 0.38, 0.1), m.alu, sx * 0.25, -0.05, 0);
    const drum = M3(g, new THREE.CylinderGeometry(0.17, 0.17, 0.44, 28), m.body, 0, 0.05, 0, 0, 0, Math.PI / 2);
    for (const sx of [-0.09, 0.09]) { M3(g, new THREE.CylinderGeometry(0.05, 0.05, 0.08, 16), m.dark, sx, 0.05, 0.18, Math.PI / 2); M3(g, new THREE.CircleGeometry(0.04, 16), m.lens, sx, 0.05, 0.221); }
    return drum;
  },
  // tiny fisheye weather camera (MARCI)
  fisheye(g, p, m) {
    M3(g, new THREE.BoxGeometry(0.18, 0.14, 0.24), m.body);
    M3(g, new THREE.SphereGeometry(0.09, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.lens, 0, 0.07, 0.04);
    M3(g, new THREE.TorusGeometry(0.09, 0.012, 8, 24), m.alu, 0, 0.07, 0.04, Math.PI / 2);
  },
  // five-beam laser altimeter with a receiver telescope (LOLA)
  laser(g, p, m) {
    M3(g, new THREE.BoxGeometry(0.36, 0.26, 0.3), m.body);
    M3(g, new THREE.CylinderGeometry(0.12, 0.12, 0.18, 28), m.alu, -0.06, 0, 0.22, Math.PI / 2);
    M3(g, new THREE.CircleGeometry(0.1, 24), m.lens, -0.06, 0, 0.312);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; M3(g, new THREE.CircleGeometry(0.018, 10), m.led, 0.14 + Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0.152); }
  },
  // ultraviolet spectrograph with a long baffle (LAMP, Europa-UVS)
  uv(g, p, m) {
    M3(g, new THREE.BoxGeometry(0.42, 0.18, 0.24), m.body);
    M3(g, new THREE.BoxGeometry(0.12, 0.12, 0.3), m.dark, 0.12, 0.02, 0.25);
    M3(g, new THREE.PlaneGeometry(0.09, 0.09), std('#B48CFF', { emissive: '#8A5BFF', emissiveIntensity: 1 }), 0.12, 0.02, 0.401);
  },
  // heavy neutron detector with collimator (LEND)
  neutron(g, p, m) {
    M3(g, new THREE.CylinderGeometry(0.22, 0.22, 0.34, 32), m.white);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; M3(g, new THREE.CylinderGeometry(0.05, 0.05, 0.36, 16), m.gold, Math.cos(a) * 0.15, 0.02, Math.sin(a) * 0.15); }
    M3(g, new THREE.BoxGeometry(0.3, 0.1, 0.3), m.body, 0, -0.22, 0);
  },
  // stacked-detector radiation telescope (CRaTER)
  cosmic(g, p, m) {
    M3(g, new THREE.BoxGeometry(0.24, 0.24, 0.3), m.body);
    M3(g, new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16), m.alu, 0, 0, 0.05, Math.PI / 2);
    for (const z of [-0.18, 0.25]) M3(g, new THREE.CircleGeometry(0.05, 16), m.lens, 0, 0, z, z < 0 ? Math.PI : 0);
  },
  // flat synthetic-aperture radar panel (Mini-RF)
  sar(g, p, m) {
    M3(g, new THREE.BoxGeometry(0.7, 0.04, 0.4), m.white, 0, 0.1, 0);
    for (let i = 0; i < 6; i++) M3(g, new THREE.BoxGeometry(0.08, 0.01, 0.34), m.gold, -0.28 + i * 0.11, 0.125, 0);
    M3(g, new THREE.BoxGeometry(0.24, 0.16, 0.2), m.body, 0, -0.03, 0);
  },
  // seismometer under its domed wind and thermal shield (SEIS)
  dome(g, p, m) {
    M3(g, new THREE.SphereGeometry(0.32, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.white, 0, -0.15, 0);
    M3(g, new THREE.TorusGeometry(0.32, 0.03, 10, 40), m.alu, 0, -0.15, 0, Math.PI / 2);
    M3(g, new THREE.CylinderGeometry(0.33, 0.36, 0.06, 32), m.dark, 0, -0.18, 0);
    M3(g, new THREE.CylinderGeometry(0.03, 0.03, 0.1, 10), m.gold, 0, 0.2, 0);
  },
  // heat-flow mole and its support structure (HP3)
  mole(g, p, m) {
    M3(g, new THREE.CylinderGeometry(0.16, 0.18, 0.4, 24), m.body, 0, 0, 0);
    M3(g, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16), m.alu, 0, -0.05, 0);
    M3(g, new THREE.ConeGeometry(0.05, 0.12, 16), m.alu, 0, -0.36, 0, Math.PI);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; M3(g, new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8), m.dark, Math.cos(a) * 0.2, -0.1, Math.sin(a) * 0.2, 0, 0, 0.15); }
  },
  // two horn antennas for radio science (RISE)
  'twin-horn'(g, p, m) {
    M3(g, new THREE.BoxGeometry(0.3, 0.14, 0.2), m.body, 0, -0.1, 0);
    for (const sx of [-1, 1]) { M3(g, new THREE.ConeGeometry(0.11, 0.28, 4, 1, true), m.alu, sx * 0.17, 0.1, 0, 0, Math.PI / 4, 0); }
  },
  // robotic arm with grapple and camera (InSight IDA)
  arm(g, p, m) {
    M3(g, new THREE.CylinderGeometry(0.08, 0.1, 0.12, 20), m.alu, 0, -0.25, 0);
    M3(g, new THREE.CylinderGeometry(0.035, 0.035, 0.5, 12), m.white, 0.12, 0, 0, 0, 0, -0.5);
    M3(g, new THREE.CylinderGeometry(0.03, 0.03, 0.42, 12), m.white, 0.32, 0.2, 0.1, 0.3, 0, 0.9);
    M3(g, new THREE.BoxGeometry(0.1, 0.08, 0.08), m.body, 0.46, 0.1, 0.2);
    M3(g, new THREE.CircleGeometry(0.025, 12), m.lens, 0.46, 0.1, 0.242);
  },
  // weather mast with wind booms (TWINS)
  mast(g, p, m) {
    M3(g, new THREE.CylinderGeometry(0.025, 0.03, 0.6, 10), m.alu);
    for (const sx of [-1, 1]) { M3(g, new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8), m.white, sx * 0.15, 0.22, 0, 0, 0, Math.PI / 2); M3(g, new THREE.BoxGeometry(0.08, 0.05, 0.05), m.body, sx * 0.3, 0.22, 0); }
  },
  // magnetometer boom with sensor heads (ECM, InSight)
  mag(g, p, m) {
    M3(g, new THREE.BoxGeometry(0.16, 0.12, 0.16), m.body, 0, 0, -0.2);
    M3(g, new THREE.CylinderGeometry(0.015, 0.015, 0.9, 8), m.alu, 0, 0.02, 0.25, Math.PI / 2);
    for (const z of [0.25, 0.55, 0.7]) M3(g, new THREE.BoxGeometry(0.07, 0.07, 0.07), m.dark, 0, 0.02, z);
  },
  // mass spectrometer with a gas inlet (MASPEX)
  massspec(g, p, m) {
    M3(g, new THREE.BoxGeometry(0.36, 0.24, 0.34), m.body);
    M3(g, new THREE.CylinderGeometry(0.05, 0.07, 0.2, 16), m.alu, 0, 0.2, 0.08);
    M3(g, new THREE.TorusGeometry(0.06, 0.012, 8, 20), m.gold, 0, 0.3, 0.08, Math.PI / 2);
  },
  // Faraday cups looking in two directions (PIMS)
  cups(g, p, m) {
    M3(g, new THREE.BoxGeometry(0.3, 0.16, 0.24), m.body);
    for (const [x, rz] of [[-0.09, 0.4], [0.09, -0.4]]) { const c = M3(g, new THREE.CylinderGeometry(0.07, 0.05, 0.14, 20, 1, true), m.gold, x, 0.14, 0, 0, 0, rz); c.material.side = THREE.DoubleSide; }
  },
  // dust analyzer drum with an open aperture (SUDA)
  drum(g, p, m) {
    M3(g, new THREE.CylinderGeometry(0.2, 0.2, 0.26, 32), m.gold, 0, 0, 0, Math.PI / 2);
    M3(g, new THREE.CircleGeometry(0.17, 28), m.dark, 0, 0, 0.131);
    M3(g, new THREE.TorusGeometry(0.17, 0.015, 8, 32), m.alu, 0, 0, 0.13);
    M3(g, new THREE.BoxGeometry(0.24, 0.12, 0.2), m.body, 0, -0.2, -0.04);
  },
};
