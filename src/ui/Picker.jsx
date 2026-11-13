import React, { useEffect, useRef, useState } from 'react';
import { A } from '../state/actions.js';
import { Stars } from './InfoDot.jsx';
import { THUMBS } from '../state/thumbs.js';
import SOURCES from '../data/sources.json';
import { attachPreview, showInPreview, zoomBy, resetView } from '../scene/preview.js';
import { HOWTO, WHAT, prosCons, statsOf, rocketProsCons } from './explain.js';
import { MISSION, PARTS, PART_REAL, ROCKETS, MARGIN, partById, rocketById, stationById, totals, headroom, changeFee, isFree, missionSlots, pct, fmt, money } from '../engine/index.js';

const SLOT_NAMES = () => ({ instrument: 'Instruments', array: 'Solar arrays', antenna: 'Antennas', battery: 'Battery', shield: MISSION.events.includes('radiation') ? 'Radiation vault' : 'Shielding', aeroshell: 'Heat shields', parachute: 'Parachutes', engine: 'Engines' });
const STAT_KEY = { 'Mass': 'mass', 'Power use': 'power', 'Power made': 'supply', 'Data': 'data', 'Downlink': 'downlink', 'Cost': 'cost', 'Entry mass limit': 'maxEntry', 'Braking': 'dvSave', 'Efficiency (Isp)': 'isp' };

/** The shared 3D viewer stays mounted while the picker is open; only the object inside changes. */
function Viewer({ spec, label }) {
  const ref = useRef(null);
  useEffect(() => attachPreview(ref.current, spec), []);
  useEffect(() => { showInPreview(spec); }, [spec.kind, spec.id]);
  return (
    <div className="pk-media">
      <div className="pk-canvas-host" ref={ref}></div>
      <span className="pk-chip">{label}</span>
      <div className="pk-zoom">
        <button onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom in">+</button>
        <button onClick={() => zoomBy(1.2)} aria-label="Zoom out">−</button>
        <button onClick={resetView} aria-label="Reset view">⟲</button>
      </div>
      <span className="pk-hint">Drag to orbit · Scroll to zoom · Double-click to reset</span>
    </div>
  );
}

function BudgetMeter({ s, T, cost }) {
  if (s.mode === 'sandbox') return <div className="pk-meter"><span className="tag">Sandbox: no budget limit</span></div>;
  const B = T.budget, spent = Math.min(T.cost, B), add = Math.max(0, Math.min(cost, B - spent));
  const after = B - T.cost - cost, over = after < 0;
  return (
    <div className="pk-meter" title="Your mission budget">
      <div className="pk-meter-top"><span>$ Budget</span><b className={over ? 'bad' : ''}>{money(B - T.cost)} left → {money(after)} after</b></div>
      <div className="pk-meter-bar">
        <i className="spent" style={{ width: (spent / B) * 100 + '%' }}></i>
        <i className={'add' + (over ? ' over' : '')} style={{ left: (spent / B) * 100 + '%', width: (over ? (B - spent) / B : add / B) * 100 + '%' }}></i>
        <i className="tick" style={{ left: '75%' }}></i>
      </div>
    </div>
  );
}

/** Score each option for the current design; the highest is shown first and marked Recommended. */
function recommend(items, s, T, isRocket) {
  if (!items.length) return { order: items, best: null, why: '' };
  const left = T.budget - T.cost;
  const score = new Map(); let why = {};
  for (const x of items) {
    let v = 0, w = '';
    if (isRocket) {
      const h = (x.cap - T.wet) / x.cap;
      v = h >= 0.25 ? 100 - x.cost / 10 : h >= 0 ? 40 - x.cost / 10 : -100;
      w = h >= 0.25 ? 'Cheapest rocket that still leaves a 25% mass margin' : h >= 0 ? 'Fits, but with little margin' : 'Too small for your spacecraft';
    } else if (x.slot === 'instrument') {
      const inst = s.installed.includes(x.id);
      v = (x.science || 0) * 10 / (1 + (x.cost || 0) / 20 + (x.mass || 0) / 4 + (x.power || 0) / 8) - (x.cost > left ? 50 : 0) - (inst ? 30 : 0);
      w = x.cost > left ? 'Over your remaining budget' : 'Most science for its cost, mass and power';
    } else if (x.slot === 'array') {
      const demand = T.demand, h = (x.supply - demand) / x.supply;
      v = h >= 0.25 ? 100 - x.mass * 3 : h >= 0 ? 40 : -100; w = h >= 0.25 ? 'Lightest array that keeps a 25% power margin' : 'Leaves too little power margin';
    } else if (x.slot === 'antenna') {
      const h = (x.downlink - T.prod) / x.downlink;
      v = h >= 0.25 ? 100 - x.mass * 3 : h >= 0 ? 40 : -100; w = h >= 0.25 ? 'Lightest antenna with a 25% data margin' : 'Leaves too little data margin';
    } else if (x.slot === 'aeroshell') {
      v = x.maxEntry >= T.wet * 1.1 ? 100 - x.mass : -50; w = x.maxEntry >= T.wet * 1.1 ? 'Lightest shield that protects your entry mass with margin' : 'Too light for your spacecraft';
    } else if (x.slot === 'parachute') { v = x.dvSave; w = 'Brakes the most, so less descent propellant'; }
    else if (x.slot === 'engine') {
      v = 50; w = 'Worth it when propellant is your tightest margin';
    } else { v = 100 - (x.mass || 0); w = 'Needed for this mission'; }
    score.set(x.id, v); why[x.id] = w;
  }
  const order = items.slice().sort((a, b) => score.get(b.id) - score.get(a.id));
  return { order, best: order[0].id, why };
}

export function Picker({ s, station }) {
  const T = totals(s);
  const isRocket = station === 'board';
  const def = stationById(station);
  const groups = isRocket ? [{ key: 'rocket', label: 'Rockets', items: ROCKETS }]
    : def.lab ? [{ key: 'instrument', label: def.label, items: PARTS.filter(p => p.slot === 'instrument' && p.lab === def.lab) }]
      : (def.slots || []).filter(k => missionSlots().includes(k)).map(k => ({ key: k, label: SLOT_NAMES()[k] || k, items: PARTS.filter(p => p.slot === k) }));
  if (!groups.length || !groups[0].items.length) {
    return (
      <div className="picker-ov" onClick={() => A.close()}><section className="picker small glass" onClick={e => e.stopPropagation()}>
        <h2>{def.label}</h2><p className="sub">This mission has nothing to choose in this room. The {MISSION.name} uses instruments from the other labs.</p>
        <div className="foot"><span></span><button className="btn" onClick={() => A.close()}>OK</button></div>
      </section></div>
    );
  }
  const [g, setG] = useState(0);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState('r');
  const [showReal, setShowReal] = useState(false);
  const rec = s.showRecs ? recommend(groups[g].items, s, T, isRocket) : { order: groups[g].items, best: null, why: {} };
  const items = rec.order, idx = Math.min(i, items.length - 1), item = items[idx];
  const go = d => { setDir(d > 0 ? 'r' : 'l'); setI(x => (x + d + items.length) % items.length); };
  const pick = k => { setDir(k > idx ? 'r' : 'l'); setI(k); };
  const tab = k => { setDir('r'); setG(k); setI(0); };
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'Escape') A.close();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const frozen = !isFree(s) && s.stage > 5 && !s.changeMode;
  let info, actions, cost = 0;
  if (isRocket) {
    const r = item, sel = s.rocket === r.id, fits = T.wet <= r.cap, h = headroom(r.cap, T.wet), pc = rocketProsCons(r, T.wet);
    const maxCap = Math.max(...ROCKETS.map(x => x.cap)), maxCost = Math.max(...ROCKETS.map(x => x.cost));
    cost = r.cost - (s.rocket ? rocketById(s.rocket).cost : 0);
    info = (
      <>
        <div className="pk-cat">Launch vehicle{rec.best === r.id && <span className="pk-rec">★ Recommended</span>}</div>
        {rec.best === r.id && <div className="pk-rec-why">{rec.why[r.id]}</div>}
        <h2 className="pk-name">{r.name}</h2>
        <div className="pk-price">{money(r.cost)}<span>launch price{r.approx ? ' · approximate' : ''}</span></div>
        <p className="pk-note">{r.note}</p>
        <div className="pk-bars">
          <Bar k={`Lift to ${MISSION.destination}`} v={`${r.cap} u`} sub={`≈ ${fmt(r.cap * MISSION.u.mass)} kg`} ratio={r.cap / maxCap} good i={0} />
          <Bar k="Price" v={money(r.cost)} sub="from your budget" ratio={r.cost / maxCost} i={1} />
          <Bar k="Your spacecraft" v={`${fmt(T.wet)} u`} sub={fits ? `headroom ${pct(h)}` : 'too heavy for this rocket'} ratio={Math.min(1, T.wet / r.cap)} warn={!fits || h < MARGIN} i={2} />
        </div>
        <div className="pk-chips">{pc.pros.map(x => <span key={x} className="pro">✓ {x}</span>)}{pc.cons.map(x => <span key={x} className="con">✕ {x}</span>)}</div>
        <p className="pk-sec"><b>What it does.</b> Lifts your spacecraft off Earth and sends it toward {MISSION.destination}. Pick the cheapest rocket that still leaves mass margin.</p>
        <button className="pk-acc" onClick={() => setShowReal(v => !v)}>{showReal ? '▾' : '▸'} Real world</button>
        {showReal && <p className="pk-sec real">{r.real}</p>}
      </>
    );
    actions = (s.stage === 4 || isFree(s) || (s.changeMode && s.changeMode.stage === 4))
      ? <button className="btn primary big" onClick={() => A.chooseRocket(r.id)} disabled={sel}>{sel ? 'Selected ✓' : 'Select this rocket'}</button>
      : s.stage < 4 ? <span className="tag">Rockets are chosen at stage 4.</span>
        : <button className="btn primary" onClick={() => A.askReopen(4)}>↩ Go back to Launch vehicle to change it ({money(A.reopenFee(4))})</button>;
  } else {
    const p = item, installed = s.installed.includes(p.id), carrying = s.carrying === p.id, fee = changeFee(s, p);
    const current = p.slot !== 'instrument' ? s.installed.map(partById).find(x => x.slot === p.slot && x.id !== p.id) : null;
    const pc = prosCons(p), peers = PARTS.filter(x => x.slot === p.slot);
    const maxOf = k => Math.max(1, ...peers.map(x => x[k] || 0));
    cost = installed ? 0 : p.cost + fee - (current ? current.cost : 0);
    info = (
      <>
        <div className="pk-cat">{SLOT_NAMES()[p.slot]}{installed && <span className="pk-badge">Installed</span>}{rec.best === p.id && <span className="pk-rec">★ Recommended</span>}</div>
        {rec.best === p.id && <div className="pk-rec-why">{rec.why[p.id]}</div>}
        <div className="pk-topline"><h2 className="pk-name">{p.name}</h2>{p.science ? <Stars n={p.science} /> : null}</div>
        <div className="pk-price">{money(p.cost)}<span>{p.approximate ? 'approximate game value' : 'based on the real mission'}</span></div>
        <p className="pk-note">{p.note}</p>
        <div className="pk-bars">
          {statsOf(p).filter(([k]) => k !== 'Cost').map(([k, v, real, d], n) => {
            const key = STAT_KEY[k];
            return <Bar key={k} k={k} v={v} sub={real} ratio={(p[key] || 0) / maxOf(key)} good={d === 'good'} i={n} delta={current ? +((p[key] || 0) - (current[key] || 0)).toFixed(2) : null} />;
          })}
        </div>
        <div className="pk-chips">{pc.pros.map(x => <span key={x} className="pro">✓ {x}</span>)}{pc.cons.map(x => <span key={x} className="con">✕ {x}</span>)}</div>
        {p.specs && p.specs.length > 0 && (
          <table className="pk-specs"><tbody>{p.specs.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
        )}
        {(() => { const src = SOURCES.find(x => x.id === p.source); return src ? (
          <p className="pk-src">{p.sourced && (p.sourced.mass || p.sourced.power) ? <span className="nasa">NASA figures</span> : <span className="approx">Approximate values</span>} Source: <a href={src.url} target="_blank" rel="noopener noreferrer">{src.title}</a></p>
        ) : <p className="pk-src"><span className="approx">Approximate values</span> No NASA figure was found for this part; it is marked approximate.</p>; })()}
        <p className="pk-sec"><b>What it is.</b> {WHAT[p.slot]} <b>How to use it.</b> {HOWTO[p.slot]}</p>
        <button className="pk-acc" onClick={() => setShowReal(v => !v)}>{showReal ? '▾' : '▸'} Real world and sources</button>
        {showReal && <p className="pk-sec real">{PART_REAL[p.slot]}</p>}
      </>
    );
    actions = installed ? <span className="pill ok">Installed on the spacecraft ✓</span>
      : carrying ? <span className="pill">In your hands: hold E at the cradle</span>
        : frozen ? (
            <span className="pk-frozen">
              <span className="tag">The design is locked for launch.</span>
              <button className="btn primary" onClick={() => A.askReopen(p.slot === 'instrument' ? 2 : 3)}>↩ Go back to {p.slot === 'instrument' ? 'Payload' : 'Systems'} to change it ({money(A.reopenFee(p.slot === 'instrument' ? 2 : 3))})</button>
            </span>
          )
          : (
            <>
              <button className="btn" onClick={() => A.pickUp(p.id)} title="Carry it to the Assembly Cradle yourself">Carry it</button>
              <button className="btn primary big" onClick={() => A.installDirect(p.id)}>{current ? 'Swap and install' : 'Install now'}{fee ? ` (+${money(fee)} change)` : ''}</button>
            </>
          );
  }

  const stageBtn = !isFree(s) && (
    def.lab && s.stage === 2 ? <button className="btn ghost-go" disabled={!s.installed.some(id => partById(id).slot === 'instrument')} onClick={() => A.requestLock('stage', 2)}>Confirm payload ➜</button>
      : def.slots && s.stage === 3 ? <button className="btn ghost-go" disabled={!(T.has('array') && T.has('antenna'))} onClick={() => A.requestLock('stage', 3)}>Confirm systems ➜</button>
        : station === 'board' && s.stage === 4 ? <button className="btn ghost-go" disabled={!s.rocket} onClick={() => A.requestLock('rocket')}>Confirm rocket ➜</button> : null);

  const spec = isRocket ? { kind: 'rocket', id: item.id } : { kind: 'part', id: item.id };
  const has = x => (isRocket ? s.rocket === x.id : s.installed.includes(x.id));
  return (
    <div className="picker-ov" onClick={() => A.close()}>
      <section className="picker glass" onClick={e => e.stopPropagation()} role="dialog" aria-label={groups[g].label}>
        <header className="pk-head">
          <div className="pk-title"><div className="label">{def.label}</div>
            <b>{groups[g].label}</b></div>
          {groups.length > 1 && <nav className="pk-tabs">{groups.map((x, k) => <button key={x.key} className={k === g ? 'on' : ''} onClick={() => tab(k)}>{!isRocket && x.key !== 'instrument' && T.has(x.key) ? <span className="ok">✓</span> : null}{x.label}</button>)}</nav>}
          <button className="x" aria-label="Close" onClick={() => A.close()}>✕</button>
        </header>
        <div className="pk-body">
          <div className="pk-left">
            <Viewer spec={spec} label={`${idx + 1} / ${items.length}`} />
            <button className="pk-nav prev" aria-label="Previous" onClick={() => go(-1)}>‹</button>
            <button className="pk-nav next" aria-label="Next" onClick={() => go(1)}>›</button>
          </div>
          <div className={'pk-info in-' + dir} key={item.id}>{info}</div>
        </div>
        <div className="pk-strip" role="listbox" aria-label="All options">
          {items.map((x, k) => {
            const th = THUMBS[isRocket ? 'rocket-' + x.id : x.id];
            return (
              <button key={x.id} role="option" aria-selected={k === idx} className={'pk-thumb' + (k === idx ? ' on' : '') + (has(x) ? ' have' : '')} onClick={() => pick(k)}>
                {th ? <img src={th} alt="" /> : <span className="thumb-wait" />}
                <span className="pk-thumb-name">{x.name}</span>
                <span className="pk-thumb-price">{money(x.cost)}</span>
                {has(x) && <span className="pk-thumb-ok">✓</span>}
                {rec.best === x.id && <span className="pk-thumb-rec">★</span>}
              </button>
            );
          })}
        </div>
        <footer className="pk-foot">
          <BudgetMeter s={s} T={T} cost={cost} />
          <div className="pk-actions">{actions}{stageBtn}</div>
        </footer>
      </section>
    </div>
  );
}

function Bar({ k, v, sub, ratio, good, warn, i, delta }) {
  return (
    <div className="pk-bar" style={{ animationDelay: i * 60 + 'ms' }}>
      <div className="pk-bar-top"><span>{k}</span><b className={good ? 'good' : warn ? 'bad' : ''}>{v}</b></div>
      <div className="pk-bar-track"><i className={good ? 'good' : warn ? 'bad' : ''} style={{ width: Math.max(4, Math.min(1, ratio) * 100) + '%' }}></i></div>
      <div className="pk-bar-sub">{sub}{delta ? <em className={(delta > 0) === !!good ? 'good' : 'bad'}> {delta > 0 ? '+' : ''}{delta} vs current</em> : null}</div>
    </div>
  );
}
