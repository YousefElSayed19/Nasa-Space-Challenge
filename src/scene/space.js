// 3D mission view shown during the mission timeline (GDD 8.4): the path to the destination and the craft moving along it.
import * as THREE from 'three';
import { lin, glow, std } from './materials.js';
import { MISSIONS } from '../engine/index.js';

const PHASE_AT = { 'Launch': 0.04, 'Cruise': 0.55, 'Orbit insertion': 0.82, 'Science operations': 0.93, 'End of mission': 1 };

export function createSpaceView() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050816');
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 400);
  scene.add(new THREE.AmbientLight(lin('#8FA6FF'), 0.35));
  const sunLight = new THREE.PointLight(lin('#FFF1D6'), 2.2, 0, 0);
  scene.add(sunLight);

  // starfield
  const n = 1500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 120 + Math.random() * 60, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t); pos[i * 3 + 1] = r * Math.cos(p); pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: lin('#E8ECFF'), size: 0.5, sizeAttenuation: true })));

  const world = new THREE.Group(); scene.add(world);
  const craft = new THREE.Group();
  craft.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.22), std('#E8ECFF', { emissive: '#6EA8FF', emissiveIntensity: 1.2 })));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), glow('#6EA8FF', 0.35));
  craft.add(halo);
  scene.add(craft);
  const trailGeo = new THREE.BufferGeometry();
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: lin('#8FD3FF'), transparent: true, opacity: 0.9 }));
  scene.add(trail);

  let curve = null, dest = null, destR = 1, progress = 0, t = 0;

  function body(color, r, x, z, emissive) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), std(color, { roughness: 0.8, metalness: 0, ...(emissive ? { emissive: color, emissiveIntensity: 1.6 } : {}) }));
    m.position.set(x, 0, z); world.add(m); return m;
  }
  function ring(r, color = '#33407A') {
    const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: lin(color), transparent: true, opacity: 0.6 })));
  }
  function path(points) {
    curve = new THREE.CatmullRomCurve3(points);
    const g = new THREE.BufferGeometry().setFromPoints(curve.getPoints(200));
    const line = new THREE.Line(g, new THREE.LineDashedMaterial({ color: lin('#6EA8FF'), dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.7 }));
    line.computeLineDistances(); world.add(line);
  }

  function setMission(id) {
    while (world.children.length) world.remove(world.children[0]);
    const m = MISSIONS.find(x => x.id === id) || MISSIONS[1];
    const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);
    if (id === 'moon') {
      sunLight.position.set(-60, 10, 20);
      const earth = body('#3D7BFF', 1.6, 0, 0);
      ring(9);
      dest = body(m.planet.color, 0.55, 9, 0); destR = 0.95;
      path([V(1.8, 0.4), V(4, 2.6, 0.6), V(7, 2.4, 0.4), V(9 - 0.95, 0.2)]);
      earth.add(new THREE.Mesh(new THREE.SphereGeometry(1.75, 32, 20), glow('#8FD3FF', 0.12)));
    } else if (id === 'mars') {
      sunLight.position.set(0, 0, 0);
      body('#FFC24B', 1.4, 0, 0, true).add(new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 16), glow('#FFB04B', 0.18)));
      ring(6); ring(9);
      body('#3D7BFF', 0.45, -6, 0);
      dest = body(m.planet.color, 0.38, 9, 0); destR = 0.8;
      const pts = []; for (let i = 0; i <= 12; i++) { const a = Math.PI - i / 12 * Math.PI; const r = 6 + (9 - 6) * (i / 12); pts.push(V(Math.cos(a) * r, -Math.sin(a) * r * 0.95)); }
      pts[pts.length - 1] = V(9 - 0.8, 0);
      path(pts);
    } else {
      sunLight.position.set(0, 0, 0);
      body('#FFC24B', 1.2, 0, 0, true).add(new THREE.Mesh(new THREE.SphereGeometry(2, 24, 16), glow('#FFB04B', 0.18)));
      ring(4.5); ring(6.2); ring(13);
      body('#3D7BFF', 0.35, -4.5, 0); body('#B5481C', 0.28, 0, 6.2);
      dest = body('#D9B38C', 1.1, 13, 0); destR = 2.0;
      path([V(-4.5, 0.5), V(-1.5, 4.5), V(1.2, 6.0), V(3.5, 3), V(0.5, -4.6), V(-4.2, -1.2), V(-3, 4.8), V(4, 8), V(10, 4), V(13 - 2.0, 0.4)]);
      body('#E9E2D0', 0.16, 13 + 1.6, 0);
    }
    progress = 0; trailGeo.setFromPoints([curve.getPoint(0)]);
  }

  function update(dt, phase, kind) {
    t += dt;
    const target = PHASE_AT[phase] ?? 0;
    progress += (target - progress) * (1 - Math.exp(-1.6 * dt));
    let p;
    const travel = Math.min(progress / 0.82, 1);
    if (progress <= 0.82) p = curve.getPoint(travel);
    else {
      const a = t * 1.2; const c = dest.position;
      p = new THREE.Vector3(c.x + Math.cos(a) * destR, 0.15, c.z + Math.sin(a) * destR);
    }
    craft.position.copy(p);
    craft.rotation.y += dt * 2;
    const col = kind === 'fail' ? '#FF5D6C' : kind === 'warn' ? '#FFC24B' : '#6EA8FF';
    halo.material.color = lin(col);
    halo.scale.setScalar(1 + Math.sin(t * 6) * 0.15 + (kind === 'ok' ? 0 : 0.4));
    trailGeo.setFromPoints(curve.getPoints(160).slice(0, Math.max(2, Math.floor(travel * 160))));
    // camera: wide view that drifts slowly, framing the path
    const box = new THREE.Box3().setFromObject(world); const ctr = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3()).length();
    const a = -0.6 + Math.sin(t * 0.08) * 0.25;
    camera.position.set(ctr.x + Math.sin(a) * size * 0.55 + 4, size * 0.5, ctr.z + Math.cos(a) * size * 0.55);
    camera.lookAt(ctr.x + 3.5, 0, ctr.z);
  }

  function setSize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); }
  return { scene, camera, setMission, update, setSize };
}
