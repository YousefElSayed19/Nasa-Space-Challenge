import React, { useEffect, useRef, useState } from 'react';
import { A } from '../state/actions.js';
import { Stars } from './InfoDot.jsx';
import { mountPreview } from '../scene/preview.js';
import { HOWTO, WHAT, prosCons, statsOf, rocketProsCons } from './explain.js';
import {
  MISSION, PARTS, PART_REAL, ROCKETS, MARGIN, partById, rocketById, totals, headroom, changeFee, isFree, missionSlots,
  pct, fmt, money,
} from '../engine/index.js';

function Preview({ spec }) {
  const ref = useRef(null);
  useEffect(() => mountPreview(ref.current, spec), [spec.kind, spec.id]);
  return <canvas ref={ref} className="pk-canvas" aria-label="3D preview, drag to turn" />;
}

const SLOT_NAMES = () => ({ instrument: 'Instruments', array: 'Solar arrays', antenna: 'Antennas', battery: 'Battery', shield: MISSION.events.includes('radiation') ? 'Radiation vault' : 'Shielding', aeroshell: 'Heat shields', parachute: 'Parachutes' });

function budgetAfter(s, T, cost, replacing) {
  if (s.mode === 'sandbox') return { text: 'Sandbox: no budget limit', over: false };
  const left = T.budget - T.cost, after = left - cost + replacing;
  return { text: `$ Budget left ${money(left)} → after this ${money(after)}`, over: after < 0 };
}

/** Full-screen chooser: one big card at a time with a live 3D model, all details, and slide animation. */
export function Picker({ s, station }) {
  const T = totals(s);
  const isRocket = station === 'board';
  const groups = isRocket ? [{ key: 'rocket', label: 'Rockets', items: ROCKETS }]
    : (station === 'payload' ? ['instrument'] : missionSlots().filter(k => k !== 'instrument')).map(k => ({ key: k, label: SLOT_NAMES()[k] || k, items: PARTS.filter(p => p.slot === k) }));
  const [g, setG] = useState(0);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState('r');
  const items = groups[g].items, item = items[Math.min(i, items.length - 1)];
  const go = d => { setDir(d > 0 ? 'r' : 'l'); setI(x => (x + d + items.length) % items.length); };
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

  const frozen = !isFree(s) && s.stage > 5;
  let body, actions, footNote;
  if (isRocket) {
    const r = item, sel = s.rocket === r.id, fits = T.wet <= r.cap, h = headroom(r.cap, T.wet);
    const pc = rocketProsCons(r, T.wet);
    const b = budgetAfter(s, T, r.cost, s.rocket ? rocketById(s.rocket).cost : 0);
    body = (
      <>
        <h2 className="pk-name">{r.name}</h2>
        <div className="pk-price">{money(r.cost)} <span>launch price{r.approx ? ' (approximate)' : ''}</span></div>
        <p className="pk-note">{r.note}</p>
        <div className="pk-sec"><b>What it does.</b> Lifts your spacecraft off Earth and sends it toward {MISSION.destination}. A rocket can only send so much mass; pick the cheapest one that still leaves margin.</div>
        <div className="stats">
          <div className="stat"><span className="k">Lift to {MISSION.destination}</span><b className="good">{r.cap} u</b><span className="r">≈ {fmt(r.cap * MISSION.u.mass)} kg</span></div>
          <div className="stat"><span className="k">Your spacecraft</span><b className={fits ? '' : 'up'}>{fmt(T.wet)} u</b><span className="r">{fits ? `headroom ${pct(h)}` : 'too heavy'}</span></div>
        </div>
        <div className="bar"><div className="fill" style={{ width: Math.min(1, T.wet / r.cap) * 100 + '%', background: !fits ? 'var(--red)' : h < MARGIN ? 'var(--amber)' : 'var(--go)' }}></div><div className="tick" style={{ left: '75%' }}></div></div>
        <div className="pc big">{pc.pros.map(x => <span key={x} className="pro">✓ {x}</span>)}{pc.cons.map(x => <span key={x} className="con">✕ {x}</span>)}</div>
        <div className="pk-sec real"><b>Real world.</b> {r.real}</div>
      </>
    );
    footNote = <span className={'tag' + (b.over ? ' fee' : '')}>{b.text}</span>;
    actions = (s.stage === 4 || isFree(s))
      ? <button className={'btn primary'} onClick={() => A.chooseRocket(r.id)} disabled={sel}>{sel ? 'Selected ✓' : 'Select this rocket'}</button>
      : <span className="tag">{s.stage < 4 ? 'Rockets are chosen at stage 4.' : 'Rocket locked.'}</span>;
  } else {
    const p = item, installed = s.installed.includes(p.id), carrying = s.carrying === p.id, fee = changeFee(s, p);
    const current = p.slot !== 'instrument' ? s.installed.map(partById).find(x => x.slot === p.slot && x.id !== p.id) : null;
    const pc = prosCons(p);
    const b = budgetAfter(s, T, p.cost + fee, current ? current.cost : 0);
    const delta = k => current ? (p[k] || 0) - (current[k] || 0) : 0;
    body = (
      <>
        <div className="pk-topline"><h2 className="pk-name">{p.name}</h2>{p.science ? <Stars n={p.science} /> : null}</div>
        <div className="pk-price">{money(p.cost)} <span>{p.approximate ? 'approximate game value' : 'based on the real mission'}</span></div>
        <p className="pk-note">{p.note}</p>
        <div className="pk-sec"><b>What it is.</b> {WHAT[p.slot]}</div>
        <div className="stats">{statsOf(p).map(([k, v, real, d]) => <div key={k} className="stat"><span className="k">{k}</span><b className={d}>{v}</b><span className="r">{real}</span></div>)}</div>
        {current && <div className="vs">Compared with your {current.name}: {['mass', 'supply', 'downlink', 'maxEntry', 'dvSave', 'cost'].filter(k => delta(k)).map(k => <span key={k} className={(['supply', 'downlink', 'maxEntry', 'dvSave'].includes(k)) === delta(k) > 0 ? 'good' : 'up'}>{delta(k) > 0 ? '+' : ''}{k === 'cost' ? money(delta(k)) : delta(k)} {k === 'supply' ? 'power' : k === 'maxEntry' ? 'entry limit' : k === 'dvSave' ? 'braking' : k}</span>)}</div>}
        <div className="pc big">{pc.pros.map(x => <span key={x} className="pro">✓ {x}</span>)}{pc.cons.map(x => <span key={x} className="con">✕ {x}</span>)}</div>
        <div className="pk-sec"><b>How to use it.</b> {HOWTO[p.slot]}</div>
        <div className="pk-sec real"><b>Real world.</b> {PART_REAL[p.slot]}</div>
      </>
    );
    footNote = <span className={'tag' + (b.over || fee ? ' fee' : '')}>{fee ? `Change request ${money(fee)} · ` : ''}{b.text}</span>;
    actions = installed ? <span className="pill ok">Installed on the spacecraft ✓</span>
      : carrying ? <span className="pill">In your hands: hold E at the cradle</span>
        : frozen ? <span className="tag">Design frozen for launch</span>
          : (
            <>
              <button className="btn" onClick={() => A.pickUp(p.id)} title="Carry it to the Assembly Cradle yourself">Carry it</button>
              <button className="btn primary" onClick={() => A.installDirect(p.id)}>{current ? 'Swap and install' : 'Install now'}</button>
            </>
          );
  }

  const stageBtn = !isFree(s) && (
    station === 'payload' && s.stage === 2 ? <button className="btn primary" disabled={!s.installed.some(id => partById(id).slot === 'instrument')} onClick={() => A.requestLock('stage', 2)}>Confirm payload ➜</button>
      : station === 'systems' && s.stage === 3 ? <button className="btn primary" disabled={!(T.has('array') && T.has('antenna'))} onClick={() => A.requestLock('stage', 3)}>Confirm systems ➜</button>
        : station === 'board' && s.stage === 4 ? <button className="btn primary" disabled={!s.rocket} onClick={() => A.requestLock('rocket')}>Confirm rocket ➜</button> : null);

  const spec = isRocket ? { kind: 'rocket', id: item.id } : { kind: 'part', id: item.id };
  const filled = k => !isRocket && k !== 'instrument' && T.has(k);
  return (
    <div className="picker-ov" onClick={() => A.close()}>
      <section className="picker glass" onClick={e => e.stopPropagation()} role="dialog" aria-label={groups[g].label}>
        <header className="pk-head">
          <div><div className="label">{station === 'payload' ? 'Payload Bay' : station === 'systems' ? 'Systems Rack' : 'Launch Vehicle Board'}</div>
            <div className="pk-count">{i + 1} of {items.length}</div></div>
          {groups.length > 1 && <nav className="pk-tabs">{groups.map((x, k) => <button key={x.key} className={k === g ? 'on' : ''} onClick={() => tab(k)}>{filled(x.key) ? '✓ ' : ''}{x.label}</button>)}</nav>}
          <button className="x" aria-label="Close" onClick={() => A.close()}>✕</button>
        </header>
        <div className="pk-body">
          <button className="pk-nav" aria-label="Previous" onClick={() => go(-1)}>‹</button>
          <div className={'pk-card in-' + dir} key={item.id}>
            <div className="pk-media">
              <Preview spec={spec} />
              <span className="pk-hint">Drag to turn</span>
            </div>
            <div className="pk-info">{body}</div>
          </div>
          <button className="pk-nav" aria-label="Next" onClick={() => go(1)}>›</button>
        </div>
        <div className="pk-dots">{items.map((x, k) => <button key={x.id} className={k === i ? 'on' : (isRocket ? s.rocket === x.id : s.installed.includes(x.id)) ? 'have' : ''} onClick={() => { setDir(k > i ? 'r' : 'l'); setI(k); }} aria-label={x.name}></button>)}</div>
        <footer className="pk-foot">
          {footNote}
          <div className="pk-actions">{actions}{stageBtn}</div>
        </footer>
        <p className="pk-keys">← → to browse · Esc to close</p>
      </section>
    </div>
  );
}
