// Launch vehicles built from lathed profiles: nose fairing, stages, interstage, engine bells, boosters.
import * as THREE from 'three';
import { std, glow } from './materials.js';
import { canvasTex } from './textures.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const texCache = {};
function skin(base, line, key) {
  if (texCache[key]) return texCache[key];
  const t = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // panel seams and a subtle vertical light falloff
    const sh = g.createLinearGradient(0, 0, w, 0);
    sh.addColorStop(0, 'rgba(0,0,0,.12)'); sh.addColorStop(0.5, 'rgba(255,255,255,.05)'); sh.addColorStop(1, 'rgba(0,0,0,.12)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.strokeStyle = line; g.lineWidth = 2;
    for (let y = 40; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x < w; x += 64) { g.globalAlpha = 0.35; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.globalAlpha = 1; }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(120, 0, 10, h); // cable raceway
  });
  texCache[key] = t; return t;
}

function bell(mat, scale = 1) {
  const pts = [V2(0.02, 0.2), V2(0.045, 0.19), V2(0.05, 0.15), V2(0.07, 0.09), V2(0.1, 0.02), V2(0.115, 0)].map(p => V2(p.x * scale, p.y * scale));
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mat); // throat on top, nozzle exit flaring at the bottom
}

/** h = total height in metres of the model; r = rocket record (id, cores, body colour). Returns { group, nozzleY, flames }. */
export function buildRocket(r, h) {
  const g = new THREE.Group();
  const R = 0.28 * (h / 4.6);
  const white = std('#F2F4FA', { roughness: 0.35, metalness: 0.05 });
  const dark = std('#1B1D24', { roughness: 0.6, metalness: 0.2 });
  const metal = std('#9AA6D8', { roughness: 0.25, metalness: 0.9 });
  const engineMat = std('#5A5F70', { roughness: 0.3, metalness: 0.95, side: THREE.DoubleSide });
  const bodyCol = r.id === 'atlas' ? '#C9783A' : r.id === 'vulcan' ? '#E39A4F' : '#F2F4FA';
  const bodyMat = new THREE.MeshStandardMaterial({ map: skin(bodyCol, 'rgba(0,0,0,.25)', r.id), roughness: 0.45, metalness: 0.1 });
  const flames = [];

  const engineH = h * 0.06, s1 = h * 0.5, inter = h * 0.05, s2 = h * 0.14, fair = h * 0.25;
  let y = engineH;
  const nEngines = r.id === 'fh' ? 5 : 2;
  const coreAt = (cx, height, withNose) => {
    const c = new THREE.Group(); c.position.x = cx; g.add(c);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.08, engineH * 0.6, 40), dark); skirt.position.y = engineH * 0.7; c.add(skirt);
    for (let i = 0; i < nEngines; i++) {
      const a = (i / nEngines) * Math.PI * 2, rr = nEngines > 2 && i === 0 ? 0 : R * 0.45;
      const b = bell(engineMat, R * 2.3); b.position.x = nEngines > 2 && i === 0 ? 0 : Math.cos(a) * rr; b.position.z = nEngines > 2 && i === 0 ? 0 : Math.sin(a) * rr;
      if (nEngines === 2) { b.position.set(i ? R * 0.36 : -R * 0.36, b.position.y, 0); }
      b.position.y = engineH * 0.15; c.add(b);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(R * 0.9, h * 0.5, 24, 1, true), glow('#FFB04B', 0.85));
    flame.rotation.x = Math.PI; flame.position.y = -h * 0.25 + engineH * 0.2; flame.visible = false; c.add(flame);
    const core = new THREE.Mesh(new THREE.ConeGeometry(R * 0.45, h * 0.28, 16, 1, true), glow('#FFFFFF', 0.9));
    core.rotation.x = Math.PI; core.position.y = -h * 0.14 + engineH * 0.2; core.visible = false; c.add(core);
    flames.push(flame, core);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, height, 48), bodyMat); body.position.y = engineH + height / 2; c.add(body);
    // stripes and markings
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.005, R * 1.005, height * 0.04, 48), dark); band.position.y = engineH + height * 0.12; c.add(band);
    const raceway = new THREE.Mesh(new THREE.BoxGeometry(R * 0.12, height * 0.95, R * 0.12), r.id === 'fh' ? std('#D7DBE6') : dark);
    raceway.position.set(0, engineH + height / 2, R * 0.98); c.add(raceway);
    if (withNose) {
      const nose = new THREE.Mesh(new THREE.LatheGeometry([V2(R, 0), V2(R * 0.92, R * 0.9), V2(R * 0.65, R * 1.8), V2(R * 0.25, R * 2.5), V2(0, R * 2.7)], 40), white);
      nose.position.y = engineH + height; c.add(nose);
      // grid fins and folded landing legs (reusable side boosters)
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + Math.PI / 4;
        const fin = new THREE.Mesh(new THREE.BoxGeometry(R * 0.55, R * 0.45, R * 0.06), dark);
        fin.position.set(Math.cos(a) * R * 1.15, engineH + height * 0.96, Math.sin(a) * R * 1.15); fin.rotation.y = -a + Math.PI / 2; c.add(fin);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(R * 0.18, height * 0.22, R * 0.1), dark);
        leg.position.set(Math.cos(a) * R * 1.02, engineH + height * 0.12, Math.sin(a) * R * 1.02); leg.rotation.y = -a + Math.PI / 2; c.add(leg);
      }
    }
    return c;
  };

  coreAt(0, s1, false);
  if (r.cores === 3) { coreAt(-R * 2.15, s1 + inter + s2 * 0.4, true); coreAt(R * 2.15, s1 + inter + s2 * 0.4, true); }
  y = engineH + s1;
  // interstage and upper stage
  const is = new THREE.Mesh(new THREE.CylinderGeometry(R, R, inter, 48), r.id === 'fh' ? dark : std('#2A2E3A', { roughness: 0.5 })); is.position.y = y + inter / 2; g.add(is); y += inter;
  const up = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.98, R, s2, 48), white); up.position.y = y + s2 / 2; g.add(up); y += s2;
  // payload fairing: boat-tail, barrel, ogive nose
  const F = r.id === 'fh' ? R * 1.0 : R * 1.22;
  const fairPts = [V2(R * 0.98, 0), V2(F, fair * 0.1), V2(F, fair * 0.55), V2(F * 0.88, fair * 0.72), V2(F * 0.6, fair * 0.87), V2(F * 0.25, fair * 0.97), V2(0, fair)];
  const fairing = new THREE.Mesh(new THREE.LatheGeometry(fairPts, 56), white); fairing.position.y = y; g.add(fairing);
  const seam = new THREE.Mesh(new THREE.BoxGeometry(F * 2.02, fair * 0.55, R * 0.02), std('#D7DBE6')); seam.position.y = y + fair * 0.33; g.add(seam);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(R * 0.06, 12, 8), metal); tip.position.y = y + fair; g.add(tip);

  g.traverse(o => { if (o.isMesh) o.castShadow = !o.material.transparent; });
  return { group: g, flames, height: h };
}

/** A soft puff texture for exhaust smoke. */
let puff = null;
export function smokeMaterial() {
  if (!puff) puff = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(220,225,240,0.45)'); gr.addColorStop(1, 'rgba(200,205,220,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  return new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false, opacity: 0 });
}
