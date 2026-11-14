import * as THREE from 'three';

export function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8;
  return t;
}
const FONT = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif';

export function label(text, accent) {
  const t = canvasTex(512, 128, g => {
    g.fillStyle = 'rgba(18,24,52,0.9)'; rr(g, 6, 6, 500, 116, 30); g.fill();
    g.strokeStyle = accent; g.lineWidth = 4; rr(g, 6, 6, 500, 116, 30); g.stroke();
    g.fillStyle = '#E8ECFF'; let fs = 44; g.font = `600 ${fs}px ${FONT}`; while (fs > 22 && g.measureText(text).width > 452) { fs -= 2; g.font = `600 ${fs}px ${FONT}`; } g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 66);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(3.6, 0.9, 1);
  return s;
}

/** Original emblem designs for the chest patch. */
export function patchTexture(kind, accent) {
  return canvasTex(128, 128, g => {
    g.fillStyle = '#121a3d'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
    g.strokeStyle = accent; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.stroke();
    g.fillStyle = '#E8ECFF'; g.strokeStyle = '#E8ECFF';
    if (kind === 'star') {
      g.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 16 : 38, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
      g.closePath(); g.fill();
    } else if (kind === 'planet') {
      g.fillStyle = accent; g.beginPath(); g.arc(64, 64, 22, 0, 7); g.fill();
      g.lineWidth = 5; g.strokeStyle = '#E8ECFF'; g.beginPath(); g.ellipse(64, 64, 40, 12, -0.4, 0, 7); g.stroke();
    } else if (kind === 'rocket') {
      g.beginPath(); g.moveTo(64, 20); g.quadraticCurveTo(84, 44, 78, 84); g.lineTo(50, 84); g.quadraticCurveTo(44, 44, 64, 20); g.fill();
      g.fillStyle = accent; g.beginPath(); g.moveTo(50, 70); g.lineTo(38, 92); g.lineTo(52, 84); g.fill(); g.beginPath(); g.moveTo(78, 70); g.lineTo(90, 92); g.lineTo(76, 84); g.fill();
      g.fillStyle = '#FFC24B'; g.beginPath(); g.moveTo(54, 86); g.lineTo(64, 108); g.lineTo(74, 86); g.fill();
      g.fillStyle = '#121a3d'; g.beginPath(); g.arc(64, 50, 7, 0, 7); g.fill();
    }
  });
}

export function nameTexture(text, accent) {
  return canvasTex(256, 64, g => {
    g.fillStyle = '#121a3d'; rr(g, 2, 2, 252, 60, 14); g.fill();
    g.strokeStyle = accent; g.lineWidth = 4; rr(g, 2, 2, 252, 60, 14); g.stroke();
    g.fillStyle = '#E8ECFF'; g.font = `700 30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText((text || 'ENGINEER').toUpperCase().slice(0, 12), 128, 34);
  });
}

export function chestPanelTexture() {
  return canvasTex(128, 96, g => {
    g.fillStyle = '#0e1533'; rr(g, 2, 2, 124, 92, 12); g.fill();
    g.fillStyle = '#1d2a66'; rr(g, 10, 10, 108, 26, 6); g.fill();
    g.fillStyle = '#6EA8FF'; g.fillRect(16, 20, 60, 6);
    [['#3EE0A0', 24], ['#FFC24B', 56], ['#FF5D6C', 88]].forEach(([c, x]) => { g.fillStyle = c; g.beginPath(); g.arc(x, 64, 10, 0, 7); g.fill(); });
  });
}
