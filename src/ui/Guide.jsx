import React, { useEffect, useState } from 'react';
import { useHud } from './hooks.js';
import { tasksFor } from '../state/tasks.js';
import { A } from '../state/actions.js';

/** The current stage's tasks, with an arrow on the one to do now. */
export function TasksCard({ s, focus }) {
  const t = tasksFor(s);
  return (
    <section className={'tasks glass' + (focus ? ' tut-focus' : '')} aria-label="Tasks">
      <div className="tasks-title">{t.title}</div>
      <ol>
        {t.items.map((it, k) => {
          const cur = it === t.current;
          return (
            <li key={k} className={it.done ? 'done' : cur ? 'cur' : ''}>
              <span className="mark" aria-hidden="true">{it.done ? '✓' : cur ? '➜' : '○'}</span>
              <span>{it.text}{it.optional && <em> optional</em>}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Label over the target station, or an arrow at the screen edge pointing to it. */
export function Pointer() {
  const { ptr } = useHud();
  if (!ptr) return null;
  if (ptr.on) {
    return (
      <div className="ptr-label passthru" style={{ left: ptr.x, top: ptr.y }}>
        <b>{ptr.label}</b><span>{ptr.dist} m</span>
      </div>
    );
  }
  return (
    <div className="ptr-edge passthru" style={{ left: ptr.x, top: ptr.y }}>
      <div className="ptr-arrow" style={{ transform: `translate(-50%,-50%) rotate(${ptr.a}deg)` }}>➜</div>
      <div className="ptr-text">{ptr.label} · {ptr.dist} m</div>
    </div>
  );
}

/** Countdown over the launch scene, synced with the 3D sequence. */
export function LaunchOverlay() {
  const [t, setT] = useState(0);
  useEffect(() => { const t0 = performance.now(); let raf; const f = n => { setT((n - t0) / 1000); raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); }, []);
  const label = t < 1.2 ? 'Rolling out' : t < 2.0 ? 'T-3' : t < 2.8 ? 'T-2' : t < 3.6 ? 'T-1' : 'Liftoff!';
  return (
    <div className="launch-ov passthru">
      <div className={'count' + (label === 'Liftoff!' ? ' lift' : '')} key={label}>{label}</div>
      <button className="btn small skipbtn" onClick={A.startMission}>Skip</button>
    </div>
  );
}
