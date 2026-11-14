import React, { useEffect, useRef, useState } from 'react';
import { useHud } from './hooks.js';
import { bus } from '../state/bus.js';
import { totals as totalsOf, MISSION as MISSION_, partById as partOf } from '../engine/index.js';
import TOURS from '../data/tours.json';
import EMERG from '../data/emergencies.json';
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
    // arrival events wait until the spacecraft actually arrives in the flight view
    if (PHASES.indexOf(r.timeline[shown].phase) >= 2 && (hh.flightP || 0) < 0.82) return;
    const t = setTimeout(() => {
      const k = r.timeline[shown].kind;
      if (k === 'warn') Sound.warn(); else if (k === 'fail') Sound.tone(220, 0.4, 'sawtooth', 0.06); else Sound.click();
      setShown(n => n + 1);
    }, 1500);
    return () => clearTimeout(t);
  }, [shown, r, hh.tourHold, (hh.flightP || 0) >= 0.82]);
  useEffect(() => { hud.set({ tlShown: Math.min(shown, r.timeline.length) }); }, [shown, r]);
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
  if (kind === 'hohmann') return <Hohmann />;
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

// Real constants: NASA Planetary Fact Sheets (nssdc.gsfc.nasa.gov/planetary/factsheet)
const MU_SUN = 1.32712e20, MU_EARTH = 3.986004e14, AU = 1.495979e11;
const HOH = {
  mars: { mu: MU_SUN, r1: 1.0 * AU, r2: 1.5237 * AU, from: 'Earth (1.000 AU)', to: 'Mars (1.524 AU)', around: 'Sun', muTxt: '1.327×10²⁰', real: 'MRO took 210 days and InSight 205 days: launch windows open every 26 months, when the planets line up for this path.' },
  lander: { mu: MU_SUN, r1: 1.0 * AU, r2: 1.5237 * AU, from: 'Earth (1.000 AU)', to: 'Mars (1.524 AU)', around: 'Sun', muTxt: '1.327×10²⁰', real: 'InSight launched 5 May 2018 and landed 26 Nov 2018, 205 days later.' },
  moon: { mu: MU_EARTH, r1: 6578e3, r2: 384400e3, from: 'a 200 km Earth orbit (6,578 km)', to: 'the Moon (384,400 km)', around: 'Earth', muTxt: '3.986×10¹⁴', real: 'LRO took about 4.5 days to reach the Moon in 2009.' },
  europa: { mu: MU_SUN, r1: 1.0 * AU, r2: 5.2029 * AU, from: 'Earth (1.000 AU)', to: 'Jupiter (5.203 AU)', around: 'Sun', muTxt: '1.327×10²⁰', real: 'A direct path needs a very big rocket. Europa Clipper instead flies past Mars (2025) and Earth (2026) for free speed and arrives in 2030, after 5.5 years.' },
};
function Hohmann() {
  const h = HOH[MISSION_.id]; if (!h) return null;
  const { mu, r1, r2 } = h, a = (r1 + r2) / 2;
  const v1 = Math.sqrt(mu / r1), v2 = Math.sqrt(mu / r2);
  const vp = Math.sqrt(mu * (2 / r1 - 1 / a)), va = Math.sqrt(mu * (2 / r2 - 1 / a));
  const t = Math.PI * Math.sqrt(a ** 3 / mu), days = t / 86400;
  const k = x => (x / 1000).toFixed(2);
  return (
    <div className="tour-eq"><b>Transfer orbit (Hohmann) from {h.from} to {h.to}</b>
      <code>Circular speed v = √(μ/r): {k(v1)} km/s at the start, {k(v2)} km/s at the end (μ {h.around} = {h.muTxt} m³/s²)</code>
      <code>Vis-viva v = √(μ·(2/r − 1/a)), a = (r₁+r₂)/2 → {k(vp)} km/s leaving, {k(va)} km/s arriving</code>
      <code>Δv₁ = {k(vp - v1)} km/s · Δv₂ = {k(v2 - va)} km/s</code>
      <code>Time = π·√(a³/μ) = {days > 60 ? Math.round(days) + ' days' : days.toFixed(1) + ' days'}{days > 400 ? ` (${(days / 365.25).toFixed(1)} years)` : ''}</code>
      <span>{h.real}</span></div>
  );
}

function EmEquation({ s, kind }) {
  const T = totalsOf(s), u = MISSION_.u;
  if (kind === 'fuel') {
    const mf = T.dry * u.mass, mp = Math.max(0, s.propLoaded * u.prop), dv = T.isp * G0 * Math.log((mf + mp) / Math.max(1, mf));
    return <div className="tour-eq"><b>How much Δv does your propellant give? (rocket equation)</b>
      <code>Δv = Isp·g₀·ln(m₀/m_f) = {T.isp} s × 9.81 × ln({Math.round(mf + mp)} / {Math.round(mf)}) ≈ {Math.round(dv)} m/s</code>
      <span>If the burn stops half-way you only get part of this, and the planet’s gravity does not capture you. A wider orbit needs less Δv, which is why Juno stayed in its 53-day orbit.</span></div>;
  }
  if (kind === 'dodge') return <div className="tour-eq"><b>Why moving early is cheap</b>
    <code>Miss distance ≈ Δv × t = 0.05 m/s × 86,400 s (24 h) ≈ 4.3 km</code>
    <code>One hour before: Δv = 4,300 m ÷ 3,600 s ≈ 1.2 m/s, about 24 times more propellant</code></div>;
  if (kind === 'kepler') {
    const a = (3389.5 + 290) * 1e3, P = 2 * Math.PI * Math.sqrt(a ** 3 / 4.2828e13) / 60;
    return <div className="tour-eq"><b>Kepler’s third law: timing an orbit</b>
      <code>Period T = 2π·√(a³/μ) = 2π·√(({Math.round(a / 1e3).toLocaleString()} km)³ / 4.283×10¹³ m³/s²) ≈ {Math.round(P)} min</code>
      <span>MRO circles Mars about every 112 minutes. A small burn weeks earlier changes the period a little, so that at the dust peak the spacecraft is on the far side of Mars.</span></div>;
  }
  if (kind === 'belt') {
    const v = Math.sqrt(MU_SUN / (2.8 * AU)), dv = 2 * v * Math.sin(5 * Math.PI / 180);
    return <div className="tour-eq"><b>Leaving the plane of the planets</b>
      <code>Orbital speed at 2.8 AU: v = √(μ/r) ≈ {(v / 1000).toFixed(1)} km/s</code>
      <code>Tilting the path by 10°: Δv = 2·v·sin(10°/2) ≈ {(dv / 1000).toFixed(1)} km/s</code>
      <span>That is more than the whole capture burn at Jupiter.</span></div>;
  }
  if (kind === 'battery') return <div className="tour-eq"><b>Why safe mode points at the Sun</b>
    <code>Battery time t = E / P: e.g. 1,200 W·h ÷ 300 W = 4 h</code>
    <span>A battery alone lasts hours, not days. Pointing the arrays at the Sun keeps heaters and radio running for as long as the team needs to fix the problem.</span></div>;
  return null;
}

export function emergencyAt(s, stopName) { const id = ((EMERG.place[s.missionId] || {})[stopName]); return id ? { id, ...EMERG.list[id] } : null; }

function EmergencyCard({ s, em }) {
  const ans = (s.emerg || {})[em.id];
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: ans ? 'end' : 'start' }), 60); }, [em.id, !!ans]);
  return (
    <div ref={ref} className={'emerg' + (ans ? ' ' + ans.result : '')}>
      <div className="em-head"><span className="em-ic">{em.icon}</span><div><span className="em-tag">Flight emergency</span><b>{em.title}</b></div></div>
      <p>{em.situation}</p>
      <p className="em-q">{em.question}</p>
      <div className="em-opts">
        {em.options.map((o, i) => {
          const picked = ans && ans.pick === i, cls = ans ? (o.result === 'ok' ? ' right' : picked ? ' wrong' : ' dim') : '';
          return <button key={i} className={'em-opt' + cls} disabled={!!ans} onClick={() => A.emergency(em.id, i)}><span className="em-l">{'ABC'[i]}</span>{o.text}</button>;
        })}
      </div>
      {ans && <div className="em-res">
        <b>{ans.result === 'ok' ? '✅ The spacecraft is safe' : ans.result === 'partial' ? '⚠ The spacecraft survived, with damage' : '💥 The spacecraft was lost'}</b>
        <p>{em.options[ans.pick].why}</p>
        {ans.result !== 'ok' && <p className="em-best">What NASA did: {em.options.find(o => o.result === 'ok').why.replace(/^Right\. /, '')}</p>}
        <EmEquation s={s} kind={em.eq} />
        <div className="tour-src">Source: {em.source}</div>
      </div>}
    </div>
  );
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
    const e0 = cur && emergencyAt(s, cur.name);
    if (!h.tourHold || !auto || !live || e0) return;
    const t = setInterval(() => setLeft(x => { if (x <= 0.1) { clearInterval(t); bus.emit('tourNext'); return 0; } return x - 0.1; }), 100);
    return () => clearInterval(t);
  }, [h.tourHold, auto, live, cur && cur.name, s.emerg]);
  if (!cur || !tour.length) return null;
  const em = emergencyAt(s, cur.name), emAns = em && (s.emerg || {})[em.id];
  const lost = s.result && s.result.fail && s.result.fail.res === 'emergency';
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
        {em && (h.tourHold || emAns || !live) && <EmergencyCard s={s} em={em} />}
      </div>
      <div className="tour-foot">
        {lost && live ? <button className="btn small primary" onClick={A.openReport}>Open debrief</button>
          : !live ? <button className="btn small primary" onClick={() => bus.emit('tourView', null)}>Back to the flight ▶</button>
          : h.tourHold && em && !emAns ? <span className="tag">Choose A, B or C to continue</span>
          : h.tourHold ? <>
            <label className="tour-auto"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> Auto {auto && !em && `(${Math.ceil(left)} s)`}</label>
            <button className="btn small primary" onClick={() => bus.emit('tourNext')}>Continue ▶</button>
          </> : <span className="tag">Flying to the next stop…</span>}
      </div>
    </section>
  );
}
