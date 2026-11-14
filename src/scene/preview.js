// One shared 3D viewer for the picker. It is created once and reused, so switching cards never stutters.
// Controls: drag to orbit (both axes), wheel or buttons to zoom, double-click to reset. Turns by itself when idle.
import * as THREE from 'three';
import { partMesh } from './spacecraft.js';
import { buildRocket } from './rocket.js';
import { buildEnvironment } from './hangar.js';
import { partById, ALL_ROCKETS } from '../engine/index.js';
import { lin, glow } from './materials.js';
import { canvasTex } from './textures.js';

let V = null;

function init() {
  const canvas = document.createElement('canvas');
  canvas.className = 'pk-canvas';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  scene.environment = buildEnvironment(renderer);
  scene.add(new THREE.HemisphereLight(lin('#DDE6FF'), lin('#141A3A'), 0.9));
  const key = new THREE.DirectionalLight(lin('#FFFFFF'), 1.8); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(lin('#7FA2FF'), 1.4); rim.position.set(-5, 3, -5); scene.add(rim);
  const warm = new THREE.PointLight(lin('#FFC24B'), 0.6, 0, 2); warm.position.set(3, 1, 3); scene.add(warm);
  // display pedestal: dark disc, glowing rim and a soft contact shadow
  const stage = new THREE.Group(); scene.add(stage);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.04, 0.06, 64), new THREE.MeshStandardMaterial({ color: lin('#141B3F'), metalness: 0.6, roughness: 0.35 }));
  disc.position.y = -0.03; stage.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.008, 8, 96), glow('#6EA8FF', 0.9)); ring.rotation.x = Math.PI / 2; stage.add(ring);
  const shadowTex = canvasTex(128, 128, g => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; stage.add(shadow);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 200);
  V = { canvas, renderer, scene, stage, ring, camera, current: null, leaving: [], raf: 0, attached: null,
    yaw: 0.7, pitch: 0.32, dist: 4, fit: 4, height: 1, vel: 0.0035, idle: 0, drag: null, zoom: 1, zoomT: 1, t: 0,
    pan: new THREE.Vector3(), panT: new THREE.Vector3(), pointers: new Map(), pinch: null };

  // left drag orbits, right drag (or Shift + drag) pans, wheel or pinch zooms, double-click resets
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    V.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId); V.vel = 0; V.idle = 0;
    if (V.pointers.size === 2) { const [a, b] = [...V.pointers.values()]; V.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: V.zoomT }; V.drag = null; return; }
    V.drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey };
  });
  canvas.addEventListener('pointermove', e => {
    if (!V.pointers.has(e.pointerId)) return;
    V.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (V.pinch && V.pointers.size === 2) {
      const [a, b] = [...V.pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      V.zoomT = clampZoom(V.pinch.z * V.pinch.d / Math.max(20, d)); V.idle = 0; return;
    }
    if (!V.drag) return;
    const dx = e.clientX - V.drag.x, dy = e.clientY - V.drag.y;
    if (V.drag.pan) {
      // move the view across the screen plane, scaled to how far away the camera is
      const k = V.fit * V.zoom * 0.0016;
      const right = new THREE.Vector3(Math.cos(V.yaw), 0, -Math.sin(V.yaw));
      V.panT.addScaledVector(right, -dx * k); V.panT.y += dy * k;
      const lim = V.fit * 0.35; V.panT.clampLength(0, lim);
    } else {
      V.yaw -= dx * 0.009; V.pitch = Math.max(-0.35, Math.min(1.35, V.pitch + dy * 0.007)); V.vel = -dx * 0.009;
    }
    V.drag.x = e.clientX; V.drag.y = e.clientY; V.idle = 0;
  });
  const up = e => { V.pointers.delete(e.pointerId); if (V.pointers.size < 2) V.pinch = null; if (!V.pointers.size) V.drag = null; V.idle = 0; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  // smooth wheel: small trackpad scrolls give small steps, a mouse notch gives about 12%
  canvas.addEventListener('wheel', e => { e.preventDefault(); const d = Math.max(-120, Math.min(120, e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY)); zoomBy(Math.exp(d * 0.0011)); }, { passive: false });
  canvas.addEventListener('dblclick', resetView);
  return V;
}

const clampZoom = z => Math.max(0.16, Math.min(2.6, z)); // close enough to see small details, far enough to see the whole part
export function zoomBy(f) { if (!V) return; V.zoomT = clampZoom(V.zoomT * f); V.idle = 0; }
export function resetView() { if (!V) return; V.zoomT = 1; V.panT.set(0, 0, 0); V.pitch = 0.32; V.vel = 0.0035; V.idle = 3; }

function build(spec) {
  if (spec.kind === 'rocket') return buildRocket(ALL_ROCKETS.find(r => r.id === spec.id) || ALL_ROCKETS[0], 4).group;
  const p = partById(spec.id);
  return partMesh(p, p.slot === 'array' && !p.round);
}

function setSpec(spec) {
  const key = spec.kind + spec.id;
  if (V.current && V.current.key === key) return;
  if (V.current) V.leaving.push({ ...V.current, t: 0 });
  const obj = build(spec);
  // sit the object on the pedestal, centred
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const holder = new THREE.Group(); holder.add(obj);
  obj.position.set(-c.x, -box.min.y + 0.02, -c.z);
  const radius = Math.max(size.x, size.z) / 2, sphere = size.length() / 2;
  V.scene.add(holder);
  V.current = { key, holder, t: 0, radius };
  V.height = size.y;
  V.fit = sphere / Math.sin((V.camera.fov * Math.PI / 180) / 2) * 1.35;
  V.stageScale = Math.max(0.35, radius * 1.25);
  V.zoomT = 1; V.panT.set(0, 0, 0);
  V.renderer.compile(V.scene, V.camera);
}

function loop(now) {
  if (!V.attached) return;
  const dt = Math.min(0.05, (now - (V.last || now)) / 1000); V.last = now; V.t += dt;
  const { canvas, renderer, camera } = V;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w && h && (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio()))) {
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  // smooth controls with inertia; auto-turn after a short idle
  V.idle += dt;
  if (!V.drag) { V.yaw += V.vel; V.vel *= 0.94; if (V.idle > 2.5) V.vel += (0.0035 - V.vel) * 0.02; }
  V.zoom += (V.zoomT - V.zoom) * (1 - Math.exp(-10 * dt));
  const ease = k => 1 - Math.pow(1 - Math.min(1, k), 3);
  // new object grows in with a little spin; old ones shrink away
  const cur = V.current;
  if (cur) { cur.t += dt / 0.45; const e = ease(cur.t); cur.holder.scale.setScalar(0.001 + e); cur.holder.rotation.y = (1 - e) * -0.9; }
  V.leaving = V.leaving.filter(o => { o.t += dt / 0.25; const e = ease(o.t); o.holder.scale.setScalar(Math.max(0.001, 1 - e)); o.holder.position.y = e * 0.2; if (o.t >= 1) { V.scene.remove(o.holder); return false; } return true; });
  const ss = V.stage.scale.x + ((V.stageScale || 1) - V.stage.scale.x) * (1 - Math.exp(-8 * dt));
  V.stage.scale.set(ss, 1, ss);
  V.ring.material.opacity = 0.6 + Math.sin(V.t * 2) * 0.3;
  V.pan.lerp(V.panT, 1 - Math.exp(-12 * dt));
  const d = V.fit * V.zoom, ty = V.height * 0.45, tgt = new THREE.Vector3(V.pan.x, ty + V.pan.y, V.pan.z);
  camera.position.set(tgt.x + Math.sin(V.yaw) * Math.cos(V.pitch) * d, tgt.y + Math.sin(V.pitch) * d, tgt.z + Math.cos(V.yaw) * Math.cos(V.pitch) * d);
  camera.near = Math.max(0.002, d * 0.02); camera.updateProjectionMatrix();
  camera.lookAt(tgt);
  renderer.render(V.scene, camera);
  V.raf = requestAnimationFrame(loop);
}

/** Put the shared viewer inside `container` showing `spec`. Returns a function that detaches it. */
export function attachPreview(container, spec) {
  if (!V) { try { init(); } catch (e) { return () => {}; } }
  if (V.attached !== container) { container.appendChild(V.canvas); V.attached = container; V.last = 0; cancelAnimationFrame(V.raf); V.raf = requestAnimationFrame(loop); }
  setSpec(spec);
  return () => { if (V.attached === container) { V.attached = null; cancelAnimationFrame(V.raf); if (V.canvas.parentNode) V.canvas.parentNode.removeChild(V.canvas); } };
}
export function showInPreview(spec) { if (V && V.attached) setSpec(spec); }

/** Build the viewer ahead of time (after the game loads) so the first open is instant. */
export function warmPreview() {
  if (V) return;
  try { init(); setSpec({ kind: 'part', id: 'cam-hires' }); V.renderer.render(V.scene, V.camera); } catch (e) { /* preview unavailable */ }
}
