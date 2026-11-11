// All sounds are generated with the Web Audio API: no files, no licences (GDD 7.3).
import { store } from '../state/store.js';

export const Sound = {
  ctx: null, humNodes: null,
  init() { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } },
  ok() { return this.ctx && !store.get().muted; },
  tone(f, d = 0.12, type = 'sine', v = 0.07, slideTo) {
    if (!this.ok()) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02);
  },
  noise(d, freq, v, q = 1) {
    if (!this.ok()) return;
    const c = this.ctx, len = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, len, c.sampleRate), x = buf.getChannelData(0);
    for (let i = 0; i < len; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q; g.gain.value = v;
    src.connect(bp).connect(g).connect(c.destination); src.start();
  },
  click() { this.tone(1500, 0.04, 'square', 0.022); },
  chime() { this.tone(660, 0.14); setTimeout(() => this.tone(990, 0.22), 90); },
  warn() { this.tone(560, 0.15, 'triangle', 0.08); setTimeout(() => this.tone(420, 0.2, 'triangle', 0.08), 170); },
  clunk() { this.tone(140, 0.2, 'square', 0.07, 55); this.noise(0.08, 2400, 0.08, 2); },
  ratchet() { this.noise(0.03, 3200 + Math.random() * 800, 0.06, 6); },
  step() { this.noise(0.06, 500 + Math.random() * 200, 0.05, 1.5); },
  good() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.22), i * 110)); },
  bad() { [440, 349, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.26, 'triangle'), i * 140)); },
  rumble() {
    if (!this.ok()) return;
    const c = this.ctx, len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    src.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 160;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
    src.connect(lp).connect(g).connect(c.destination); src.start(t);
  },
  hum(on) {
    if (on && !this.humNodes && this.ok()) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      const len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const n = c.createBufferSource(), bp = c.createBiquadFilter(), og = c.createGain();
      n.buffer = buf; n.loop = true; bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.8;
      o.type = 'sawtooth'; o.frequency.value = 72; og.gain.value = 0.25;
      g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 0.15);
      o.connect(og).connect(g); n.connect(bp).connect(g); g.connect(c.destination);
      o.start(); n.start();
      this.humNodes = { o, n, g };
    } else if (!on && this.humNodes) {
      const { o, n, g } = this.humNodes, t = this.ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.stop(t + 0.15); n.stop(t + 0.15);
      this.humNodes = null;
    }
  },
};
