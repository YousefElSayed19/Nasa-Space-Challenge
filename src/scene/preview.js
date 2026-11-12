// A small live 3D view of one part or rocket for the picker: it turns slowly and can be dragged.
import * as THREE from 'three';
import { partMesh } from './spacecraft.js';
import { buildRocket } from './rocket.js';
import { buildEnvironment } from './hangar.js';
import { partById, ALL_ROCKETS } from '../engine/index.js';
import { lin } from './materials.js';

export function mountPreview(canvas, spec) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return () => {}; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  scene.environment = buildEnvironment(renderer);
  scene.add(new THREE.HemisphereLight(lin('#DDE6FF'), lin('#1A2350'), 1.0));
  const key = new THREE.DirectionalLight(lin('#FFFFFF'), 1.6); key.position.set(3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(lin('#8FB0FF'), 1.1); rim.position.set(-5, 3, -4); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
  let obj;
  if (spec.kind === 'rocket') obj = buildRocket(ALL_ROCKETS.find(r => r.id === spec.id) || ALL_ROCKETS[0], 4).group;
  else { const p = partById(spec.id); obj = partMesh(p, p.slot === 'array' && !p.round ? true : false); }
  const pivot = new THREE.Group(); pivot.add(obj); scene.add(pivot);
  const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3());
  obj.position.sub(c);
  const r = box.getSize(new THREE.Vector3()).length() / 2;
  const d = r / Math.sin((camera.fov * Math.PI / 180) / 2) * 0.8;
  camera.position.set(0, d * 0.25, d); camera.lookAt(0, 0, 0);
  let spin = 0.6, vel = 0.004, drag = null, raf = 0, alive = true, t0 = performance.now();
  const resize = () => {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 220;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const down = e => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); };
  const move = e => { if (drag == null) return; vel = (e.clientX - drag) * 0.01; spin += vel; drag = e.clientX; };
  const up = () => { drag = null; vel = Math.sign(vel || 1) * 0.004; };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  const loop = (now) => {
    if (!alive) return;
    resize();
    const intro = Math.min(1, (now - t0) / 500), e = 1 - Math.pow(1 - intro, 3);
    if (drag == null) spin += vel;
    pivot.rotation.y = spin; pivot.rotation.x = 0.18;
    pivot.scale.setScalar(0.6 + 0.4 * e);
    pivot.position.y = Math.sin(now / 900) * r * 0.03;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    alive = false; cancelAnimationFrame(raf);
    canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
    renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
  };
}
