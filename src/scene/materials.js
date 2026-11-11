import * as THREE from 'three';

// Colors are authored in sRGB (like CSS) and converted to linear for correct lighting.
export const lin = c => new THREE.Color(c).convertSRGBToLinear();

export function std(color, o = {}) {
  const { emissive, ...rest } = o;
  const m = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.2, ...rest });
  m.color = lin(color);
  if (emissive !== undefined) m.emissive = lin(emissive);
  return m;
}
export function basic(color, o = {}) {
  const m = new THREE.MeshBasicMaterial(o);
  m.color = lin(color);
  return m;
}
export function glow(color, opacity = 0.8) {
  const m = new THREE.MeshBasicMaterial({ transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  m.color = lin(color);
  return m;
}
