import React, { useRef, useState } from 'react';
import { bus } from '../state/bus.js';
import { hud } from '../state/store.js';
import { useHud } from './hooks.js';

export const isTouch = typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);

/** On-screen joystick (left) and action buttons (right) for phones and tablets in landscape. */
export function TouchControls({ s }) {
  const h = useHud();
  const base = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, on: false });
  const [run, setRun] = useState(false);
  const R = 46;
  const move = e => {
    const b = base.current.getBoundingClientRect();
    let x = e.clientX - (b.left + b.width / 2), y = e.clientY - (b.top + b.height / 2);
    const d = Math.hypot(x, y); if (d > R) { x = x / d * R; y = y / d * R; }
    setKnob({ x, y, on: true });
    hud.set({ touch: { x: x / R, y: y / R } });
  };
  const end = () => { setKnob({ x: 0, y: 0, on: false }); hud.set({ touch: null }); };
  const key = code => ({
    onPointerDown: e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); bus.emit('vkey', code, true); },
    onPointerUp: () => bus.emit('vkey', code, false),
    onPointerCancel: () => bus.emit('vkey', code, false),
  });
  const holdE = h.prompt && h.prompt.key === 'Hold E';
  return (
    <div className="touch">
      <div className={'joy' + (knob.on ? ' on' : '')} ref={base}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }} onPointerMove={e => knob.on && move(e)} onPointerUp={end} onPointerCancel={end}>
        <div className="joy-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}></div>
      </div>
      <div className="tbtns">
        <button className={'tbtn big' + (h.prompt ? ' ready' : '')} {...key('KeyE')} aria-label="Use">{holdE ? 'Hold' : 'Use'}<small>E</small></button>
        <button className="tbtn" {...key('Space')} aria-label="Jump">⤒<small>Jump</small></button>
        <button className={'tbtn' + (run ? ' on' : '')} onPointerDown={e => { e.preventDefault(); const v = !run; setRun(v); bus.emit('vkey', 'ShiftLeft', v); }} aria-label="Run">»<small>Run</small></button>
        <button className="tbtn small" {...key('KeyV')} aria-label="Camera">◎<small>View</small></button>
        {s.carrying && <button className="tbtn small" {...key('KeyX')} aria-label="Put back">↩<small>Back</small></button>}
      </div>
    </div>
  );
}

export function RotateNotice() {
  return (
    <div className="rotate" role="alert">
      <div className="rotate-phone" aria-hidden="true"><span></span></div>
      <h2>Rotate your device</h2>
      <p>MissionForge plays in landscape. Turn your phone or tablet sideways to continue.</p>
    </div>
  );
}

export async function goFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
  } catch (e) { /* not supported on this browser */ }
}
