import React, { useEffect, useState } from 'react';
import { useHud } from './hooks.js';
import { tasksFor } from '../state/tasks.js';
import { A } from '../state/actions.js';

/** The current stage's tasks, with an arrow on the one to do now. */
export function TasksCard({ s, focus }) {
  const [open, setOpen] = useState(false);
  const t = tasksFor(s);
  const done = t.items.filter(i => i.done).length;
  return (
    <section className={'tasks glass' + (focus ? ' tut-focus' : '') + (open ? ' open' : '')} aria-label="Tasks">
      <button className="tasks-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="tasks-title">{t.title}</span><span className="tag">{done}/{t.items.length} done {open ? '▴' : '▾'}</span>
      </button>
      {!open && t.current && <div className="tasks-cur"><span className="mark">➜</span>{t.current.text}</div>}
      {open && (
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
      )}
    </section>
  );
}

/** Label over the target station, or an arrow at the screen edge pointing to it. */
export function Pointer() {
  const { ptr } = useHud();
  if (!ptr) return null;
  const c = document.querySelector('.hud-center'), t = document.querySelector('.tasks'), toast = document.querySelector('.toasts');
  const cr = c ? c.getBoundingClientRect() : { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
  const below = Math.max(t ? t.getBoundingClientRect().bottom : cr.top, toast && toast.childElementCount ? toast.getBoundingClientRect().bottom : 0);
  const minX = cr.left + 70, maxX = cr.right - 70, minY = below + 60, maxY = cr.bottom - 30;
  const inside = ptr.on && ptr.x >= minX && ptr.x <= maxX && ptr.y >= minY && ptr.y <= maxY;
  if (inside) {
    return (
      <div className="ptr-label passthru" style={{ left: ptr.x, top: ptr.y }}>
        <b>{ptr.label}</b><span>{ptr.dist} m</span>
      </div>
    );
  }
  // edge arrow, clamped to the free area so it never sits on a panel
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  let dx = ptr.x - cx, dy = ptr.y - cy;
  if (ptr.on && !dx && !dy) dy = -1;
  const k = Math.min((maxX - cx) / Math.max(1e-3, Math.abs(dx)), (maxY - cy) / Math.max(1e-3, Math.abs(dy)));
  const x = cx + dx * Math.min(1, k), y = cy + dy * Math.min(1, k);
  const a = Math.atan2(dy, dx) * 180 / Math.PI;
  return (
    <div className="ptr-edge passthru" style={{ left: x, top: y }}>
      <div className="ptr-arrow" style={{ transform: `translate(-50%,-50%) rotate(${a}deg)` }}>➜</div>
      <div className="ptr-text">{ptr.label} · {ptr.dist} m</div>
    </div>
  );
}

/** Countdown over the launch scene, synced with the 3D sequence. */
export function LaunchOverlay() {
  const [t, setT] = useState(0);
  useEffect(() => { const t0 = performance.now(); let raf; const f = n => { setT((n - t0) / 1000); raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); }, []);
  const label = t < 1.2 ? 'Rolling out to the pad' : t < 2.0 ? 'T-3' : t < 2.8 ? 'T-2' : t < 3.6 ? 'T-1' : 'Liftoff!';
  const fade = t < 0.45 ? t / 0.45 : t < 0.9 ? 1 - (t - 0.45) / 0.45 : 0; // fade to black while the rocket is rolled out
  return (
    <div className="launch-ov passthru">
      <div className="launch-fade" style={{ opacity: fade }}></div>
      {t > 0.9 && <div className={'count' + (label === 'Liftoff!' ? ' lift' : '') + (label.length > 9 ? ' small' : '')} key={label}>{label}</div>}
      <button className="btn small skipbtn" onClick={A.startMission}>Skip</button>
    </div>
  );
}
