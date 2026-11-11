import React, { useEffect } from 'react';
import { InfoDot, Stars } from './InfoDot.jsx';
import { useHud } from './hooks.js';
import { A } from '../state/actions.js';
import { hud } from '../state/store.js';
import { Sound } from '../audio/sound.js';
import {
  MISSION, PARTS, PART_REAL, ROCKETS, STAGE_NAMES, MARGIN, partById, rocketById, stationById,
  totals, headroom, changeFee, reviewVerdicts, pct, fmt,
} from '../engine/index.js';

const lvl = (v, max) => { if (!v) return ''; const r = v / max; return r <= 0.34 ? '▲' : r <= 0.67 ? '▲▲' : '▲▲▲'; };

function PanelShell({ title, sub, children }) {
  return (
    <section className="panel glass" aria-label={title}>
      <div className="panel-head">
        <div><h2>{title}</h2>{sub && <p className="sub">{sub}</p>}</div>
        <button className="x" aria-label="Close panel" onClick={() => A.close()}>✕</button>
      </div>
      {children}
    </section>
  );
}

function PartCard({ p, s }) {
  const installed = s.installed.includes(p.id);
  const carrying = s.carrying === p.id;
  const fee = changeFee(s, p);
  const frozen = s.stage > 5;
  const occupied = p.slot !== 'instrument' && !installed && s.installed.some(id => partById(id).slot === p.slot);
  const info = {
    what: p.note,
    why: p.slot === 'instrument' ? 'Instruments are why the mission exists, but each one costs mass, power, data and money.' : 'Spacecraft systems keep the instruments alive and talking to Earth.',
    real: PART_REAL[p.slot],
  };
  return (
    <div className={'card' + (installed || carrying ? ' sel' : '')}>
      <div className="card-top">
        <span className="card-name">{p.name}<InfoDot left title={p.name} info={info} /></span>
        {p.science ? <Stars n={p.science} /> : null}
      </div>
      <div className="card-note">{p.note}</div>
      <div className="arrows">
        {p.supply ? <span>Power supply <span className="good">{lvl(p.supply, 140)}</span></span> : null}
        {p.downlink ? <span>Downlink <span className="good">{lvl(p.downlink, 100)}</span></span> : null}
        <span>Mass <span className="up">{lvl(p.mass, 14)}</span></span>
        {p.power ? <span>Power <span className="up">{lvl(p.power, 20)}</span></span> : null}
        {p.data ? <span>Data <span className="up">{lvl(p.data, 40)}</span></span> : null}
        <span>Cost <span className="up">{lvl(p.cost, 55)}</span></span>
      </div>
      <div className="card-act">
        <span className={'tag' + (fee ? ' fee' : '')}>
          {installed ? 'Installed on the spacecraft' : carrying ? 'In your hands' : fee ? `Change request: ${fee}` : occupied ? 'Replaces the current one' : ''}
        </span>
        {!installed && !carrying && !frozen && <button className="btn small" onClick={() => A.pickUp(p.id)}>Pick up</button>}
      </div>
    </div>
  );
}

function Briefing({ s }) {
  return (
    <PanelShell title="Mission briefing" sub={'Inspired by NASA’s ' + MISSION.inspired}>
      <p style={{ marginTop: 0 }}>{MISSION.goal}</p>
      <div className="label">Objectives</div>
      <ul className="objlist">{MISSION.objectives.map(o => <li key={o}>{o}</li>)}</ul>
      <div className="kv">
        <span>Budget</span><span>{MISSION.budget} (operations {MISSION.opsCost} and spacecraft bus {MISSION.busCost} already committed)</span>
        <span>Trip</span><span>About 5 to 7 months to Mars</span>
        <span>Sunlight at Mars</span><span>About 43% of Earth’s</span>
      </div>
      <div className="note-box">The real orbiter carried about 139 kg of science instruments out of 2,180 kg at launch. Every gram of camera needed propellant to carry it. (JPL MRO press kit)</div>
      <div className="foot">
        <span className="tag">{s.stage > 1 ? 'Briefing accepted' : 'Read, then accept to unlock the Payload Bay.'}</span>
        {s.stage === 1 && <button className="btn primary" onClick={A.acceptBriefing}>Accept mission</button>}
      </div>
    </PanelShell>
  );
}

function Payload({ s, T }) {
  const n = s.installed.filter(x => partById(x).slot === 'instrument').length;
  return (
    <PanelShell title="Payload Bay" sub="Pick up an instrument, then carry it to the Assembly Cradle.">
      <div className="cards">{PARTS.filter(p => p.slot === 'instrument').map(p => <PartCard key={p.id} p={p} s={s} />)}</div>
      <div className="foot">
        <span className="tag">{n} instrument{n === 1 ? '' : 's'} installed. Science {'★'.repeat(Math.min(5, Math.round(T.sci / 3.4)))}</span>
        {s.stage === 2 && <button className="btn primary" disabled={n === 0} onClick={() => A.confirmStage(2)}>Confirm payload</button>}
      </div>
    </PanelShell>
  );
}

function Systems({ s, T }) {
  const groups = [['array', 'Solar array'], ['antenna', 'High-gain antenna'], ['battery', 'Battery'], ['shield', 'Shielding']];
  const ready = T.has('array') && T.has('antenna');
  return (
    <PanelShell title="Systems Rack" sub="Power, communication and protection. One of each.">
      {groups.map(([slot, name]) => (
        <div key={slot}>
          <div className="label group-t">{name}</div>
          <div className="cards">{PARTS.filter(p => p.slot === slot).map(p => <PartCard key={p.id} p={p} s={s} />)}</div>
        </div>
      ))}
      <div className="foot">
        <span className="tag">{ready ? 'Array and antenna fitted.' : 'An array and an antenna are required.'}</span>
        {s.stage === 3 && <button className="btn primary" disabled={!ready} onClick={() => A.confirmStage(3)}>Confirm systems</button>}
      </div>
    </PanelShell>
  );
}

function Cradle({ s, T }) {
  return (
    <PanelShell title="Your spacecraft" sub={`Dry mass ${fmt(T.dry)} units, about ${fmt(T.dry * MISSION.u.mass)} kg`}>
      {s.installed.length === 0 && <div className="lockmsg">Nothing installed yet. Bring parts from the Payload Bay and the Systems Rack.</div>}
      <div className="cards">
        {s.installed.map(pid => {
          const p = partById(pid), fee = changeFee(s, p);
          return (
            <div className="card" key={pid}>
              <div className="card-top"><span className="card-name">{p.name}</span>
                {s.stage <= 5 && <button className={'btn small' + (fee ? ' danger' : '')} onClick={() => A.remove(pid)}>{fee ? `Remove (change request ${fee})` : 'Remove'}</button>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="note-box">Removing a part from a locked stage files a change request. The fee grows the further back the decision is, like NASA change control after a design baseline. Fee sizes are a game-balance choice.</div>
    </PanelShell>
  );
}

function Board({ s, T }) {
  return (
    <PanelShell title="Launch Vehicle Board" sub={`Your spacecraft: about ${fmt(T.wet)} units with propellant`}>
      <div className="cards">
        {ROCKETS.map(r => {
          const sel = s.rocket === r.id, fits = T.wet <= r.cap, h = headroom(r.cap, T.wet);
          return (
            <div key={r.id} className={'card' + (sel ? ' sel' : '')}>
              <div className="card-top">
                <span className="card-name">{r.name}<InfoDot left title={r.name} info={{ what: r.note, why: 'A bigger rocket lifts more mass toward Mars, but costs more.', real: r.real }} /></span>
                <span className="tag">Cost {r.cost}{r.approx ? '*' : ''}</span>
              </div>
              <div className="card-note">{r.note}</div>
              <div className="bar"><div className="fill" style={{ width: Math.min(1, T.wet / r.cap) * 100 + '%', background: !fits ? 'var(--red)' : h < MARGIN ? 'var(--amber)' : 'var(--go)' }}></div><div className="tick" style={{ left: '75%' }}></div></div>
              <div className="card-act">
                <span className="tag">{fits ? `Headroom ${pct(h)} of ${r.cap} units to Mars` : `Too heavy: limit ${r.cap} units`}</span>
                {s.stage === 4 && <button className="btn small" onClick={() => A.chooseRocket(r.id)}>{sel ? 'Selected' : 'Select'}</button>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="approx">* Simplified game value. NASA’s fact sheet lists capacity to Earth orbit, not to Mars.</p>
      <div className="foot">
        <span className="tag">{s.rocket ? `Chosen: ${rocketById(s.rocket).name}` : 'Pick one rocket.'}</span>
        {s.stage === 4 && <button className="btn primary" disabled={!s.rocket} onClick={A.confirmRocket}>Confirm rocket</button>}
      </div>
    </PanelShell>
  );
}

function Fuel({ s, T }) {
  const h = useHud();
  const cap = MISSION.tankCap;
  const y = v => Math.min(100, (v / cap) * 100) + '%';
  const press = dir => e => { e.preventDefault(); Sound.init(); hud.set({ uiPump: dir }); };
  const release = () => hud.set({ uiPump: 0 });
  useEffect(() => () => hud.set({ uiPump: 0 }), []);
  const diff = s.propLoaded - T.need;
  const state = s.propLoaded < T.need * 0.98 ? ['Under target', 'warn'] : s.propLoaded > T.need * 1.15 ? ['Overfilled', 'warn'] : ['On target', 'ok'];
  const active = s.stage === 5;
  const holdBtn = (dir, text, cls) => (
    <button className={cls} onPointerDown={press(dir)} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}>{text}</button>
  );
  return (
    <PanelShell title="Fueling Station" sub="Hydrazine propellant, pumped into the spacecraft tank.">
      <div className="fuelwrap">
        <div className="gauge" aria-label={`Tank ${fmt(s.propLoaded)} of ${cap} units`}>
          <div className="band" style={{ bottom: y(T.need * 0.98), height: `calc(${y(T.need * 1.15)} - ${y(T.need * 0.98)})` }}></div>
          <div className={'liquid' + (h.pumping ? ' flowing' : '')} style={{ height: y(s.propLoaded) }}></div>
          <div className="target" style={{ bottom: y(T.need) }}></div>
        </div>
        <div className="fuelinfo">
          <div>
            <div className="label">Loaded</div>
            <div className="big">{fmt(s.propLoaded)} <span style={{ fontSize: 14, color: 'var(--muted)' }}>/ {cap} units</span></div>
            <div className="tag">About {fmt(s.propLoaded * MISSION.u.prop)} kg</div>
          </div>
          <div>
            <div className="label">Needed for orbit insertion<InfoDot left title="Rocket equation" info={{
              what: 'Propellant needed = dry mass × (e^(Δv / (Isp·g₀)) − 1), plus 5% for attitude control.',
              why: 'Every extra kilogram of spacecraft needs propellant, and that propellant must itself be carried.',
              real: 'Δv ≈ 1,000 m/s for Mars orbit insertion (JPL MRO press kit) plus 400 m/s for other burns (game assumption); Isp 220 s is approximate for hydrazine. A NASA source for the rocket equation is still to be cited.',
            }} /></div>
            <div className="big" style={{ fontSize: 20 }}>{fmt(T.need)} units</div>
            <span className={'st ' + state[1]}>{state[0]}</span> <span className="tag">{diff >= 0 ? '+' : ''}{fmt(diff)}</span>
          </div>
          {active ? (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {holdBtn(1, 'Hold to pump', 'btn primary pumpbtn' + (h.pumping ? ' on' : ''))}
                {holdBtn(-1, 'Hold to drain', 'btn pumpbtn')}
              </div>
              <div className="tag">Or hold E while standing here.</div>
            </>
          ) : <div className="tag">{s.stage < 5 ? 'Fueling opens after the rocket is confirmed.' : 'Fueling complete.'}</div>}
        </div>
      </div>
      <div className="note-box">It is propellant, not gasoline. The real orbiter carried hydrazine in a 1,220 kg tank and used about 70% of it to enter Mars orbit. (JPL MRO press kit)</div>
      {active && (
        <div className="foot">
          <span className="tag">Underfill and you fly past Mars. Overfill and you carry dead weight.</span>
          <button className="btn primary" disabled={s.propLoaded <= 0} onClick={A.finishFueling}>Finish fueling</button>
        </div>
      )}
    </PanelShell>
  );
}

function Review({ s }) {
  const v = reviewVerdicts(s);
  const nogo = v.filter(x => !x.go).length;
  return (
    <PanelShell title="Go/No-Go review" sub="Each role checks the margins before launch. The call is yours.">
      {v.map(r => (
        <div className="role" key={r.role}>
          <span className="rn">{r.role}</span><span className={'verdict ' + (r.go ? 'go' : 'nogo')}>{r.go ? 'GO' : 'NO-GO'}</span>
          <span className="rr">{r.reason}</span><span className="risk">Risk: {r.risk}</span>
        </div>
      ))}
      <div className="note-box">NASA polls each team for “go” at readiness reviews before launch. This review warns but does not block you. The debrief will show whether listening would have saved the mission.</div>
      <div className="foot">
        <span className="tag">{nogo ? `${nogo} No-Go call${nogo > 1 ? 's' : ''}.` : 'All roles are GO.'}</span>
        {s.stage === 6 && <button className={'btn ' + (nogo ? 'danger' : 'primary')} onClick={A.goLaunch}>{nogo ? 'Launch anyway' : 'GO for launch'}</button>}
      </div>
    </PanelShell>
  );
}

export function StationPanel({ s }) {
  const id = s.panel; if (!id) return null;
  const st = stationById(id);
  if (st.stage > s.stage) {
    return (
      <PanelShell title={st.label}>
        <div className="lockmsg">This station opens at stage {st.stage}, {STAGE_NAMES[st.stage - 1]}. Finish {STAGE_NAMES[s.stage - 1].toLowerCase()} first.</div>
      </PanelShell>
    );
  }
  const T = totals(s);
  const map = { control: Briefing, payload: Payload, systems: Systems, cradle: Cradle, board: Board, fuel: Fuel, review: Review };
  const C = map[id];
  return C ? <C key={id} s={s} T={T} /> : null;
}
