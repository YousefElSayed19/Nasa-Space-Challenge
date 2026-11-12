// Renders a small picture of each part and rocket with the game's own lighting, for the UI cards.
import * as THREE from 'three';
import { THUMBS } from '../state/thumbs.js';
import { partMesh } from './spacecraft.js';
import { buildRocket } from './rocket.js';
import { ALL_PARTS, ALL_ROCKETS } from '../engine/index.js';
import { lin } from './materials.js';

export function renderThumbs(renderer, environment, onDone) {
  const W = 192, H = 144;
  const rt = new THREE.WebGLRenderTarget(W, H, { format: THREE.RGBAFormat });
  rt.texture.encoding = THREE.sRGBEncoding;
  const sc = new THREE.Scene(); sc.environment = environment;
  sc.add(new THREE.HemisphereLight(lin('#DDE6FF'), lin('#202850'), 1.1));
  const key = new THREE.DirectionalLight(lin('#FFFFFF'), 1.6); key.position.set(3, 5, 6); sc.add(key);
  const rim = new THREE.DirectionalLight(lin('#8FB0FF'), 0.9); rim.position.set(-5, 2, -4); sc.add(rim);
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.01, 100);
  const buf = new Uint8Array(W * H * 4);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const oldClear = renderer.getClearColor(new THREE.Color()), oldAlpha = renderer.getClearAlpha();
  renderer.setClearColor(0x000000, 0);
  const shoot = (id, obj, tilt = 0.5, spin = -0.6) => {
    sc.add(obj);
    obj.rotation.y = spin; obj.rotation.x += tilt * 0.3;
    const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2;
    const d = r / Math.sin((cam.fov * Math.PI / 180) / 2) * 0.9;
    cam.position.set(c.x + d * 0.35, c.y + d * 0.28, c.z + d * 0.9); cam.lookAt(c);
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(sc, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    ctx.putImageData(img, 0, 0);
    THUMBS[id] = canvas.toDataURL('image/png');
    sc.remove(obj);
  };
  try {
    for (const p of ALL_PARTS) shoot(p.id, partMesh(p, p.slot === 'array'));
    for (const r of ALL_ROCKETS) shoot('rocket-' + r.id, buildRocket(r, 4).group, 0, 0.3);
  } catch (e) { console.warn('Thumbnails failed', e); }
  renderer.setRenderTarget(null);
  renderer.setClearColor(oldClear, oldAlpha);
  rt.dispose();
  onDone && onDone();
}
