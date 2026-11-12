import React, { useState } from 'react';
import { A } from '../state/actions.js';
import { tasksFor } from '../state/tasks.js';
import { STAGE_NAMES } from '../engine/index.js';

/** Shown when a station is not open yet: animated lock, the stage path, and what is left to do. */
export function LockedStation({ s, station }) {
  const [out, setOut] = useState(false);
  const close = () => { setOut(true); setTimeout(A.close, 220); };
  const left = tasksFor(s).items.filter(i => !i.done && !i.optional).slice(0, 3);
  return (
    <div className={'lock-ov' + (out ? ' out' : '')} onClick={close}>
      <section className="lock-card glass" onClick={e => e.stopPropagation()} role="dialog" aria-label={`${station.label} is locked`}>
        <div className="lock-icon" aria-hidden="true">
          <svg viewBox="0 0 64 64"><path className="shackle" d="M20 28 V20 a12 12 0 0 1 24 0 V28" /><rect className="lbody" x="14" y="28" width="36" height="28" rx="7" /><circle className="keyhole" cx="32" cy="41" r="4" /><rect className="keyhole" x="30.5" y="43" width="3" height="7" rx="1.5" /></svg>
          <span className="lock-pulse"></span>
        </div>
        <h2>{station.label} is locked</h2>
        <p className="lock-sub">It opens at stage {station.stage}, <b>{STAGE_NAMES[station.stage - 1]}</b>. You are on stage {s.stage}, <b>{STAGE_NAMES[s.stage - 1]}</b>.</p>
        <div className="lock-path">
          {STAGE_NAMES.slice(0, 6).map((n, i) => {
            const k = i + 1, cls = k < s.stage ? 'done' : k === s.stage ? 'cur' : k === station.stage ? 'target' : '';
            return (
              <React.Fragment key={n}>
                {i > 0 && <span className={'lock-link' + (k <= s.stage ? ' done' : '')} style={{ animationDelay: 0.15 + i * 0.07 + 's' }}></span>}
                <span className={'lock-step ' + cls} style={{ animationDelay: 0.1 + i * 0.07 + 's' }} title={n}>{k < s.stage ? '✓' : k === station.stage ? '🔒' : k}</span>
              </React.Fragment>
            );
          })}
        </div>
        {left.length > 0 && (
          <div className="lock-todo">
            <div className="label">To unlock it, finish:</div>
            <ol>{left.map((it, i) => <li key={it.text} style={{ animationDelay: 0.35 + i * 0.08 + 's' }}><span>➜</span>{it.text}</li>)}</ol>
          </div>
        )}
        <div className="lock-foot">
          <span className="tag">The gold arrow points to your next task.</span>
          <button className="btn primary" onClick={close} autoFocus>Got it</button>
        </div>
      </section>
    </div>
  );
}
