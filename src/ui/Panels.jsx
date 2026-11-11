import React, { useEffect, useRef, useState } from 'react';
import { InfoDot, Stars } from './InfoDot.jsx';
import { useHud } from './hooks.js';
import { A, roleOwner } from '../state/actions.js';
import { hud } from '../state/store.js';
import { Sound } from '../audio/sound.js';
import {
  MISSION, PARTS, PART_REAL, ROCKETS, ROLES, STAGE_NAMES, MARGIN, CHECKS, partById, rocketById, stationById,
  totals, headroom, changeFee, reviewVerdicts, stageChecks, isFree, pct, fmt,
} from '../engine/index.js';

const lvl = (v, max) => { if (!v) return ''; const r = v / max; return r <= 0.34 ? '▲' : r <= 0.67 ? '▲▲' : '▲▲▲'; };
const maxOf = (slot, key) => Math.max(1, ...PARTS.filter(p => !slot || p.slot === slot).map(p => p[key] || 0));

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

/** Press and hold to complete: used for maintenance checks. */
function HoldButton({ ms = 1200, onDone, children, disabled }) {
  const [p, setP] = useState(0);
  const r = useRef({ raf: 0, t0: 0 });
  const stop = () => { cancelAnimationFrame(r.current.raf); setP(0); };
  const start = e => {
    e.preventDefault(); if (disabled) return; Sound.init();
    r.current.t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - r.current.t0) / ms); setP(k);
      if (Math.random() < 0.25) Sound.ratchet();
      if (k >= 1) { onDone(); setP(0); return; }
      r.current.raf = requestAnimationFrame(step);
    };
    r.current.raf = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(r.current.raf), []);
  return (
    <button className="btn small holdbtn" disabled={disabled} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}>
      <i style={{ width: p * 100 + '%' }}></i><span>{children}</span>
    </button>
  );
}

function PartCard({ p, s }) {
  const installed = s.installed.includes(p.id);
  const carrying = s.carrying === p.id;
  const fee = changeFee(s, p);
  const frozen = !isFree(s) && s.stage > 5;
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
        {p.supply ? <span>Power supply <span className="good">{lvl(p.supply, maxOf('array', 'supply'))}</span></span> : null}
        {p.downlink ? <span>Downlink <span className="good">{lvl(p.downlink, maxOf('antenna', 'downlink'))}</span></span> : null}
        <span>Mass <span className="up">{lvl(p.mass, maxOf(null, 'mass'))}</span></span>
        {p.power ? <span>Power <span className="up">{lvl(p.power, maxOf('instrument', 'power'))}</span></span> : null}
        {p.data ? <span>Data <span className="up">{lvl(p.data, maxOf('instrument', 'data'))}</span></span> : null}
        <span>Cost <span className="up">{lvl(p.cost, maxOf(null, 'cost'))}</span></span>
      </div>
      <div className="card-act">
        <span className={'tag' + (fee ? ' fee' : '')}>
          {installed ? 'Installed on the spacecraft' : carrying ? 'In your hands' : fee ? `Change request: ${fee}` : occupied ? 'Replaces the current one' : p.approximate ? 'Approximate values' : ''}
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
        <span>Budget</span><span>{s.mode === 'sandbox' ? 'Unlimited (sandbox)' : `${MISSION.budget} units (operations ${MISSION.opsCost} and spacecraft bus ${MISSION.busCost} already committed)`}</span>
        <span>Trip</span><span>{MISSION.trip}</span>
        <span>Sunlight there</span><span>{MISSION.sunlight}</span>
      </div>
      <div className="note-box">{MISSION.brief}</div>
      {s.team.length > 1 && (
        <div className="kv">{ROLES.map((r, i) => <React.Fragment key={r}><span>{r}</span><span>{roleOwner(s, i)}</span></React.Fragment>)}</div>
      )}
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
        <span className="tag">{n} instrument{n === 1 ? '' : 's'} installed. Science value {T.sci} of target {MISSION.sciTarget}.</span>
        {s.stage === 2 && !isFree(s) && <button className="btn primary" disabled={n === 0} onClick={() => A.requestLock('stage', 2)}>Confirm payload</button>}
      </div>
    </PanelShell>
  );
}

function Systems({ s, T }) {
  const groups = [['array', 'Solar array'], ['antenna', 'Antenna'], ['battery', 'Battery'], ['shield', MISSION.events.includes('radiation') ? 'Radiation protection' : 'Shielding']];
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
        {s.stage === 3 && !isFree(s) && <button className="btn primary" disabled={!ready} onClick={() => A.requestLock('stage', 3)}>Confirm systems</button>}
      </div>
    </PanelShell>
  );
}

function Checks({ s }) {
  const open = isFree(s) || (s.stage >= 2 && s.stage <= 6);
  return (
    <>
      <div className="label group-t">Pre-launch checks<InfoDot left title="Maintenance" info={{
        what: 'Short hands-on tasks before launch. Hold each button until it fills.',
        why: 'Skipping saves time but raises the chance of a fault in flight, and the debrief will name the skipped check.',
        real: 'Interfaces, mechanisms, instruments and propellant systems are all verified before real launches. Fault chances here are game values.',
      }} /></div>
      <div className="checks">
        {CHECKS.map(c => {
          const ok = s.checks[c.id], can = c.needs(s);
          return (
            <div key={c.id} className={'check' + (ok ? ' done' : '')}>
              <div><b>{c.name}</b><div className="tag">{ok ? 'Done' : can ? c.what : c.id === 'leak' ? 'Available after fueling.' : 'Install parts first.'}</div></div>
              {ok ? <span className="st ok">Done</span> : <HoldButton disabled={!can || !open} onDone={() => A.runCheck(c.id)}>Hold</HoldButton>}
            </div>
          );
        })}
      </div>
      <p className="approx">Changing any part resets the checks.</p>
    </>
  );
}

function Cradle({ s, T }) {
  const canEdit = isFree(s) || s.stage <= 5;
  return (
    <PanelShell title="Your spacecraft" sub={`Dry mass ${fmt(T.dry)} units, about ${fmt(T.dry * MISSION.u.mass)} kg`}>
      {s.installed.length === 0 && <div className="lockmsg">Nothing installed yet. Bring parts from the Payload Bay and the Systems Rack.</div>}
      <div className="cards">
        {s.installed.map(pid => {
          const p = partById(pid), fee = changeFee(s, p);
          return (
            <div className="card" key={pid}>
              <div className="card-top"><span className="card-name">{p.name}</span>
                {canEdit && <button className={'btn small' + (fee ? ' danger' : '')} onClick={() => A.remove(pid)}>{fee ? `Remove (change request ${fee})` : 'Remove'}</button>}
              </div>
            </div>
          );
        })}
      </div>
      {s.installed.length > 0 && <Checks s={s} />}
      {!isFree(s) && <div className="note-box">Removing a part from a locked stage files a change request. The fee grows the further back the decision is, like NASA change control after a design baseline. Fee sizes are a game-balance choice.</div>}
    </PanelShell>
  );
}

function Board({ s, T }) {
  const canPick = s.stage === 4 || isFree(s);
  return (
    <PanelShell title="Launch Vehicle Board" sub={`Your spacecraft: about ${fmt(T.wet)} units with propellant`}>
      <div className="cards">
        {ROCKETS.map(r => {
          const sel = s.rocket === r.id, fits = T.wet <= r.cap, h = headroom(r.cap, T.wet);
          return (
            <div key={r.id} className={'card' + (sel ? ' sel' : '')}>
              <div className="card-top">
                <span className="card-name">{r.name}<InfoDot left title={r.name} info={{ what: r.note, why: `A bigger rocket lifts more mass toward ${MISSION.destination}, but costs more.`, real: r.real }} /></span>
                <span className="tag">Cost {r.cost}{r.approx ? '*' : ''}</span>
              </div>
              <div className="card-note">{r.note}</div>
              <div className="bar"><div className="fill" style={{ width: Math.min(1, T.wet / r.cap) * 100 + '%', background: !fits ? 'var(--red)' : h < MARGIN ? 'var(--amber)' : 'var(--go)' }}></div><div className="tick" style={{ left: '75%' }}></div></div>
              <div className="card-act">
                <span className="tag">{fits ? `Headroom ${pct(h)} of ${r.cap} units to ${MISSION.destination}` : `Too heavy: limit ${r.cap} units`}</span>
                {canPick && <button className="btn small" onClick={() => A.chooseRocket(r.id)}>{sel ? 'Selected' : 'Select'}</button>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="approx">* Simplified game value. NASA’s fact sheet lists capacity to Earth orbit, not to other destinations.</p>
      <div className="foot">
        <span className="tag">{s.rocket ? `Chosen: ${rocketById(s.rocket).name}` : 'Pick one rocket.'}</span>
        {s.stage === 4 && !isFree(s) && <button className="btn primary" disabled={!s.rocket} onClick={() => A.requestLock('rocket')}>Confirm rocket</button>}
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
  const active = s.stage === 5 || isFree(s);
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
              real: `${MISSION.dvNote} Rocket equation: NASA Glenn, Ideal Rocket Equation. Isp ${MISSION.isp} s for hydrazine (NTRS 19970010493).`,
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
      <div className="note-box">{MISSION.fuelNote}</div>
      {s.stage === 5 && !isFree(s) && (
        <div className="foot">
          <span className="tag">Underfill and you fly past the target. Overfill and you carry dead weight.</span>
          <button className="btn primary" disabled={s.propLoaded <= 0} onClick={() => A.requestLock('fuel')}>Finish fueling</button>
        </div>
      )}
    </PanelShell>
  );
}

function Review({ s }) {
  const v = reviewVerdicts(s);
  const nogo = v.filter(x => !x.go).length;
  const can = A.canLaunch(s);
  return (
    <PanelShell title="Go/No-Go review" sub="Each role checks the margins before launch. The call is yours.">
      {v.map((r, i) => (
        <div className="role" key={r.role}>
          <span className="rn">{r.role}{s.team.length > 1 && <span className="owner"> {roleOwner(s, i)}</span>}</span>
          <span className={'verdict ' + (r.go ? 'go' : 'nogo')}>{r.go ? 'GO' : 'NO-GO'}</span>
          <span className="rr">{r.reason}</span><span className="risk">Risk: {r.risk}</span>
        </div>
      ))}
      <div className="note-box">NASA polls each team for “go” at readiness reviews before launch. This review warns but does not block you. The debrief will show whether listening would have saved the mission.</div>
      <div className="foot">
        <span className="tag">{!can && isFree(s) ? 'Choose a rocket and load propellant first.' : nogo ? `${nogo} No-Go call${nogo > 1 ? 's' : ''}.` : 'All roles are GO.'}</span>
        {can && <button className={'btn ' + (nogo ? 'danger' : 'primary')} onClick={A.goLaunch}>{nogo ? 'Launch anyway' : 'GO for launch'}</button>}
      </div>
    </PanelShell>
  );
}

export function StationPanel({ s }) {
  const id = s.panel; if (!id) return null;
  const st = stationById(id);
  if (!isFree(s) && st.stage > s.stage) {
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

/** Multiplayer: every role must approve before a stage locks (decision 1.1, option B). */
export function SignoffModal({ s }) {
  const so = s.signoff; if (!so) return null;
  const checks = stageChecks(s, so.stage);
  return (
    <div className="overlay">
      <section className="signoff glass" aria-label="Team sign-off">
        <div className="label">Team sign-off</div>
        <h2 style={{ margin: '2px 0 4px' }}>Lock {STAGE_NAMES[so.stage - 1].toLowerCase()}?</h2>
        <p className="sub">Each role checks its own numbers. Locking needs all four approvals. One objection sends the team back to fix it.</p>
        {checks.map((c, i) => {
          const approved = so.approvals[i];
          return (
            <div key={c.role} className={'role' + (approved ? ' approved' : '')}>
              <span className="rn">{c.role} <span className="owner">{roleOwner(s, i)}</span></span>
              <span className={'st ' + (c.ok ? 'ok' : 'warn')}>{c.ok ? 'Looks fine' : 'Concern'}</span>
              <span className="rr">{c.note}</span>
              <span className="role-act">
                {approved ? <span className="st ok">Approved</span> : (
                  <>
                    <button className="btn small" onClick={() => A.object(i, c.note)}>Object</button>
                    <button className="btn small primary" onClick={() => A.approve(i)}>Approve</button>
                  </>
                )}
              </span>
            </div>
          );
        })}
        <div className="foot"><button className="btn" onClick={A.cancelSignoff}>Cancel</button><span className="tag">{Object.keys(so.approvals).length} of 4 approved</span></div>
      </section>
    </div>
  );
}
