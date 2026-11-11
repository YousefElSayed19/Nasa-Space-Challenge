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
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.32), std(p.color, { emissive: p.color, emissiveIntensity: 0.25, metalness: 0.4, roughness: 0.35 })));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.18, 20), std('#111111', { metalness: 0.9, roughness: 0.15 }));
    lens.rotation.x = Math.PI / 2; lens.position.z = 0.24; g.add(lens);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.085, 20), std('#2a63ff', { metalness: 1, roughness: 0.05, emissive: '#2a63ff', emissiveIntensity: 0.4 }));
    glass.position.z = 0.335; g.add(glass);
  } else if (p.slot === 'array') {
    const w = forHands ? 1.0 : 1.6 + p.area * 0.12;
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
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, r * 0.9, 6), std('#9AA6D8')); feed.position.y = r * 0.5; g.add(feed);
    if (!forHands) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), std('#9AA6D8', { metalness: 0.8 })); mast.position.y = -0.2; g.add(mast);
      g.rotation.x = -0.45;
    }
  } else if (p.slot === 'battery') {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.42), std('#1F6B55', { emissive: '#3EE0A0', emissiveIntensity: 0.2 })));
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.02), std('#3EE0A0', { emissive: '#3EE0A0', emissiveIntensity: 1.5 })); s.position.set(0, 0.06, 0.22); g.add(s);
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
