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
  /** An original, synthesised funk loop for the moonwalk. Not based on any existing song. */
  groove(on) {
    if (!on || !this.ok()) { if (this.grooveOn) { this.grooveOn = false; clearInterval(this.grooveTimer); } return; }
    if (this.grooveOn) return;
    this.grooveOn = true;
    const c = this.ctx, bpm = 112, step = 60 / bpm / 2; // eighth notes
    // bass line (Hz) and drum pattern written for this game
    const bass = [82.4, 0, 98, 82.4, 110, 0, 98, 73.4, 82.4, 0, 123.5, 110, 98, 0, 82.4, 0];
    const kick = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0], snare = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
    let i = 0, next = c.currentTime + 0.05;
    const note = (f, t, len, type, vol) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + len); o.connect(g).connect(c.destination); o.start(t); o.stop(t + len + 0.02); };
    const hit = (t, freq, len, vol) => { const n = c.createBufferSource(), b = c.createBuffer(1, c.sampleRate * len, c.sampleRate), d = b.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / d.length); n.buffer = b; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; const g = c.createGain(); g.gain.value = vol; n.connect(f).connect(g).connect(c.destination); n.start(t); };
    const schedule = () => {
      while (next < c.currentTime + 0.25) {
        const k = i % 16;
        if (bass[k]) note(bass[k], next, step * 0.9, 'square', 0.035);
        if (kick[k]) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(120, next); o.frequency.exponentialRampToValueAtTime(40, next + 0.12); g.gain.setValueAtTime(0.12, next); g.gain.exponentialRampToValueAtTime(0.001, next + 0.15); o.connect(g).connect(c.destination); o.start(next); o.stop(next + 0.16); }
        if (snare[k]) hit(next, 1800, 0.12, 0.08);
        hit(next, 7000, 0.03, 0.025); // hi-hat on every eighth
        next += step; i++;
      }
    };
    schedule(); this.grooveTimer = setInterval(schedule, 60);
  },
  jet(level) {
    if (!this.ok()) { if (this.jetNodes) { this.jetNodes.g.gain.value = 0; } return; }
    const c = this.ctx;
    if (!this.jetNodes) {
      if (level <= 0.01) return;
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const n = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
      n.buffer = buf; n.loop = true; lp.type = 'lowpass'; lp.frequency.value = 400; g.gain.value = 0;
      n.connect(lp).connect(g).connect(c.destination); n.start();
      this.jetNodes = { n, lp, g };
    }
    const { lp, g } = this.jetNodes, t = c.currentTime;
    g.gain.setTargetAtTime(level * 0.09, t, 0.08);
    lp.frequency.setTargetAtTime(300 + level * 900, t, 0.1);
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
