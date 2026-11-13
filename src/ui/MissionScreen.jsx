import React, { useEffect, useRef, useState } from 'react';
import { useHud } from './hooks.js';
import TOURS from '../data/tours.json';
import { A } from '../state/actions.js';
import { Sound } from '../audio/sound.js';
import { MISSION } from '../engine/index.js';
import { hud } from '../state/store.js';

const PHASES = ['Launch', 'Cruise', 'Orbit insertion', 'Science operations', 'End of mission'];

export function MissionScreen({ s }) {
  const r = s.result;
  const [shown, setShown] = useState(1);
  const feedRef = useRef(null);
  useEffect(() => { const el = feedRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, [shown]);
  useEffect(() => {
    if (shown >= r.timeline.length) return;
    const t = setTimeout(() => {
      const k = r.timeline[shown].kind;
      if (k === 'warn') Sound.warn(); else if (k === 'fail') Sound.tone(220, 0.4, 'sawtooth', 0.06); else Sound.click();
      setShown(n => n + 1);
    }, 1500);
    return () => clearTimeout(t);
  }, [shown, r]);
  useEffect(() => { const e = r.timeline[Math.min(shown, r.timeline.length) - 1]; hud.set({ missionPhase: e.phase, missionKind: e.kind }); }, [shown, r]);
  const reached = new Set(r.timeline.slice(0, shown).map(e => e.phase));
  const done = shown >= r.timeline.length;
  return (
    <div className="overlay mission-ov">
      <section className="mission glass" aria-live="polite">
        <div className="label">Mission timeline</div>
        <h2 style={{ margin: '2px 0 0', fontSize: 24 }}>{MISSION.name} in flight</h2>
        <div className="phases">{PHASES.map(p => <div key={p} className={'phase' + (reached.has(p) ? ' on' : '')}><div className="pb"><i></i></div>{p === 'Orbit insertion' ? MISSION.insertionLabel : p}</div>)}</div>
        <div className="feed" ref={feedRef}>
          {r.timeline.slice(0, shown).map((e, i) => (
            <div key={i} className={'ev ' + e.kind}>
              <span className="ic">{e.kind === 'ok' ? '✓' : e.kind === 'warn' ? '!' : '✕'}</span>
              <div><div className="ph">{e.phase === 'Orbit insertion' ? MISSION.insertionLabel : e.phase}</div>{e.text}</div>
            </div>
          ))}
        </div>
        <div className="foot">
          <button className="btn" onClick={() => setShown(r.timeline.length)} disabled={done}>Skip</button>
          <button className="btn primary" disabled={!done} onClick={A.openReport}>Open debrief</button>
        </div>
      </section>
    </div>
  );
}


/** Educational card for the body or event the spacecraft is passing right now, with the whole route as a strip. */
export function TourCard({ s }) {
  const h = useHud();
  const tour = TOURS[s.missionId] || [];
  const cur = h.tourStop;
  if (!cur || !tour.length) return null;
  return (
    <section className="tour glass" aria-live="polite">
      <div className="tour-route">
        {tour.map((t, i) => <span key={i} className={'tr-stop' + (t === cur || t.name === cur.name ? ' on' : (h.flightP || 0) > t.at ? ' done' : '')} title={t.name}>{t.icon}</span>)}
      </div>
      <div className="tour-body" key={cur.name}>
        <div className="tour-head"><span className="tour-icon">{cur.icon}</span><div><b>{cur.name}</b><span className="tour-role">{cur.role}</span></div></div>
        <ul>{cur.facts.map(f => <li key={f}>{f}</li>)}</ul>
        {cur.source && <div className="tour-src">Source: {cur.source}</div>}
      </div>
    </section>
  );
}
