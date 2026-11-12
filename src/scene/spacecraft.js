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
  if (p.slot === 'instrument') {
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
