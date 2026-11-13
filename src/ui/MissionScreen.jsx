import React, { useEffect, useRef, useState } from 'react';
import { useHud } from './hooks.js';
import { bus } from '../state/bus.js';
import { totals as totalsOf, MISSION as MISSION_, partById as partOf } from '../engine/index.js';
import TOURS from '../data/tours.json';
import { A } from '../state/actions.js';
import { Sound } from '../audio/sound.js';
import { MISSION } from '../engine/index.js';
import { hud } from '../state/store.js';

const PHASES = ['Launch', 'Cruise', 'Orbit insertion', 'Science operations', 'End of mission'];

export function MissionScreen({ s }) {
  const r = s.result;
  const [shown, setShown] = useState(1);
  const hh = useHud();
  const feedRef = useRef(null);
  useEffect(() => { const el = feedRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, [shown]);
  useEffect(() => {
    if (shown >= r.timeline.length || hh.tourHold) return; // wait while the player reads the current stop
    const t = setTimeout(() => {
      const k = r.timeline[shown].kind;
      if (k === 'warn') Sound.warn(); else if (k === 'fail') Sound.tone(220, 0.4, 'sawtooth', 0.06); else Sound.click();
      setShown(n => n + 1);
    }, 1500);
    return () => clearTimeout(t);
  }, [shown, r, hh.tourHold]);
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


/** Educational card for each stop on the way. The flight waits at every stop until you press Continue
 * (or the reading time runs out, if Auto is on), and you can click any passed stop to read it again. */

const G0 = 9.80665, G_MARS = 3.71;
function Equations({ s, kind }) {
  const T = totalsOf(s), u = MISSION_.u;
  if (kind === 'entry') {
    const m = T.wet * u.mass, ke = 0.5 * m * 5500 * 5500 / 1e9;
    return (
      <div className="tour-eq"><b>Energy at entry</b>
        <code>KE = ½·m·v² = ½ × {Math.round(m)} kg × (5,500 m/s)² ≈ {ke.toFixed(1)} GJ</code>
        <span>The heat shield turns almost all of this into heat. InSight’s real entry mass was about 608 kg.</span></div>
    );
  }
  if (kind === 'descent') {
    const shell = s.installed.map(partOf).filter(p => p.slot === 'aeroshell' || p.slot === 'parachute').reduce((a, p) => a + p.mass, 0);
    const mLander = (T.dry - shell) * u.mass, dv = (60 - 2.24) + G_MARS * 45;
    const prop = mLander * (1 - Math.exp(-dv / (T.isp * G0))), loaded = s.propLoaded * u.prop;
    return (
      <div className="tour-eq"><b>Rocket equation for the last 1 km</b>
        <code>Δv ≈ (60 − 2.24) m/s + 3.71 m/s² × 45 s ≈ {Math.round(dv)} m/s</code>
        <code>m_prop = m·(1 − e^(−Δv / (Isp·g₀))) = {Math.round(mLander)} kg × (1 − e^(−{Math.round(dv)} / ({T.isp} × 9.81))) ≈ {Math.round(prop)} kg</code>
        <span>You loaded about {Math.round(loaded)} kg (part of it is for the cruise). Real InSight: a 358 kg lander with 67 kg of propellant and pressurant at launch.</span></div>
    );
  }
  if (kind === 'insertion') {
    const mf = T.dry * u.mass, dv = MISSION_.dvMOI, prop = mf * (Math.exp(dv / (T.isp * G0)) - 1);
    return (
      <div className="tour-eq"><b>Rocket equation for the capture burn</b>
        <code>m_prop = m_dry·(e^(Δv / (Isp·g₀)) − 1) = {Math.round(mf)} kg × (e^({dv} / ({T.isp} × 9.81)) − 1) ≈ {Math.round(prop)} kg</code>
        <span>Every kilogram you added at the racks shows up here as extra propellant.</span></div>
    );
  }
  return null;
}

function EdlReadout({ s, fp }) {
  const pts = (TOURS._edl || {})[s.missionId]; if (!pts || fp < 0.84 || fp > 0.955) return null;
  const k = Math.min(1, Math.max(0, (fp - 0.84) / 0.11));
  let i = 0; while (i < pts.length - 2 && k > pts[i + 1][0]) i++;
  const [k0, a0, v0] = pts[i], [k1, a1, v1] = pts[i + 1], f = Math.min(1, Math.max(0, (k - k0) / (k1 - k0)));
  const lg = (x, y) => Math.exp(Math.log(Math.max(x, 0.001)) + (Math.log(Math.max(y, 0.001)) - Math.log(Math.max(x, 0.001))) * f);
  const alt = k >= 1 ? 0 : lg(a0, a1), v = lg(v0, v1);
  return (
    <div className="edl-read">
      <div><span>Altitude</span><b>{alt >= 1 ? alt.toFixed(1) + ' km' : Math.round(alt * 1000) + ' m'}</b></div>
      <div><span>Speed</span><b>{v >= 100 ? Math.round(v) : v.toFixed(1)} m/s</b></div>
      <em>NASA points; values in between are interpolated</em>
    </div>
  );
}

export function TourCard({ s }) {
  const h = useHud();
  const tour = TOURS[s.missionId] || [];
  const [auto, setAuto] = useState(true);
  const [left, setLeft] = useState(0);
  const cur = h.tourStop;
  const live = h.tourView == null;
  const words = cur ? cur.facts.join(' ').split(/\s+/).length : 0;
  const readTime = Math.max(6, words / 3 + 4 + (cur && cur.eq ? 6 : 0));
  useEffect(() => { setLeft(readTime); }, [cur && cur.name, h.tourHold]);
  useEffect(() => {
    if (!h.tourHold || !auto || !live) return;
    const t = setInterval(() => setLeft(x => { if (x <= 0.1) { clearInterval(t); bus.emit('tourNext'); return 0; } return x - 0.1; }), 100);
    return () => clearInterval(t);
  }, [h.tourHold, auto, live, cur && cur.name]);
  if (!cur || !tour.length) return null;
  return (
    <section className="tour glass" aria-live="polite">
      <div className="tour-route">
        {tour.map((t, i) => {
          const passed = i <= (h.tourIdx || 0);
          return <button key={i} className={'tr-stop' + (t.name === cur.name ? ' on' : passed ? ' done' : '')} title={t.name}
            disabled={!passed} onClick={() => bus.emit('tourView', i)}>{t.icon}</button>;
        })}
      </div>
      <div className="tour-body" key={cur.name}>
        <div className="tour-head"><span className="tour-icon">{cur.icon}</span><div><b>{cur.name}</b><span className="tour-role">{cur.role}</span></div></div>
        <ul>{cur.facts.map(f => <li key={f}>{f}</li>)}</ul>
        {cur.eq && <Equations s={s} kind={cur.eq} />}
        {live && <EdlReadout s={s} fp={h.flightP || 0} />}
        {cur.source && <div className="tour-src">Source: {cur.source}</div>}
      </div>
      <div className="tour-foot">
        {!live ? <button className="btn small primary" onClick={() => bus.emit('tourView', null)}>Back to the flight ▶</button>
          : h.tourHold ? <>
            <label className="tour-auto"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> Auto {auto && `(${Math.ceil(left)} s)`}</label>
            <button className="btn small primary" onClick={() => bus.emit('tourNext')}>Continue ▶</button>
          </> : <span className="tag">Flying to the next stop…</span>}
      </div>
    </section>
  );
}
