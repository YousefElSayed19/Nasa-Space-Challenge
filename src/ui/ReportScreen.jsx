import React, { useState } from 'react';
import { A, unlockedMissions } from '../state/actions.js';
import { loadJSON } from '../state/store.js';
import { useAnimatedNumber } from './hooks.js';
import { MISSION, MISSIONS, STAGE_NAMES, partById, causeTrace, pct, fmt, money, isFree } from '../engine/index.js';

const END = {
  power: 'Science was lost to a power shortfall.', data: 'Science was lost because data could not be sent home.',
  shield: 'Science was lost to a solar-storm safe mode.', pointing: 'Flyby data overflowed while the antenna pointed away.',
  fault: 'An instrument failed partway through.', 'check-connector': 'A loose connector caused data dropouts.',
  'check-calibration': 'An uncalibrated instrument returned unusable data.', 'check-panel': 'A solar panel did not fully unfold.',
};

function Compare({ s, r }) {
  const [sel, setSel] = useState('');
  const saved = loadJSON('mf-designs', []).filter(d => d.mission === s.missionId);
  const other = saved.find(d => String(d.id) === sel);
  const me = { wetKg: Math.round(r.T.wet * MISSION.u.mass), powerH: r.R.power.h, dataH: r.R.data.h, massH: r.R.mass.h, cost: r.T.cost, science: Math.round(r.sciFactor * 100) };
  const rows = [
    ['Score', r.score, other && other.score],
    ['Result', r.outcome, other && other.outcome],
    ['Launch mass', `${fmt(me.wetKg)} kg`, other && `${fmt(other.metrics.wetKg)} kg`],
    ['Mass headroom', pct(me.massH), other && pct(other.metrics.massH)],
    ['Power headroom', pct(me.powerH), other && pct(other.metrics.powerH)],
    ['Data headroom', pct(me.dataH), other && pct(other.metrics.dataH)],
    ['Cost', money(me.cost), other && money(other.metrics.cost)],
    ['Science returned', `${me.science}%`, other && `${other.metrics.science}%`],
  ];
  return (
    <div className="sec"><h3>Save and compare designs</h3>
      <div className="compare-bar">
        <button className="btn small" onClick={A.saveDesign}>Save this design</button>
        <select value={sel} onChange={e => setSel(e.target.value)} aria-label="Compare with a saved design">
          <option value="">Compare with a saved design…</option>
          {saved.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      {other ? (
        <>
          <table><thead><tr><th></th><th>This flight</th><th>{other.name}</th></tr></thead>
            <tbody>{rows.map(x => <tr key={x[0]}><td>{x[0]}</td><td>{x[1]}</td><td>{x[2]}</td></tr>)}</tbody></table>
          <div className="compare-bar">
            <button className="btn small" onClick={() => A.openInSandbox(other)}>Open it in sandbox</button>
            <button className="btn small danger" onClick={() => A.deleteDesign(other.id)}>Delete</button>
          </div>
        </>
      ) : <p className="tag">{saved.length ? 'Pick a saved design to see the two side by side.' : 'No saved designs for this mission yet. Saved designs stay in this browser.'}</p>}
    </div>
  );
}

export function ReportScreen({ s }) {
  const r = s.result, T = r.T;
  const score = useAnimatedNumber(r.score, 1100);
  const title = { ok: 'Mission success', warn: 'Mission degraded', fail: 'Mission lost' }[r.outcome];
  const trace = r.primary ? causeTrace(s, r.primary, T, r) : null;
  const endText = r.fail ? r.fail.text : END[r.primary] || '';
  const successWhy = !r.fail && r.outcome === 'ok'
    ? (r.storm ? `The mission succeeded because you kept ${pct(r.powerH)} power headroom, which absorbed the solar storm${T.has('shield') ? ', and shielding protected the computer' : ''}.`
      : MISSION.events.includes('radiation') ? 'The mission succeeded: the vault survived Jupiter’s radiation and every resource stayed within its limit.'
        : 'The mission succeeded: every resource stayed within its limit.')
    : null;
  const comp = [
    ['Launch mass', `${fmt(T.wet * MISSION.u.mass)} kg`, MISSION.real.launch],
    ['Power at destination', `${fmt(T.supply * MISSION.u.power)} W`, MISSION.real.power],
    ['Downlink', MISSION.u.data ? `${(T.downlink * MISSION.u.data).toFixed(MISSION.u.data < 1 ? 1 : 0)} ${MISSION.u.dataUnit}` : `${fmt(T.downlink)} game units`, MISSION.real.downlink],
    ['Total cost', s.mode === 'sandbox' ? `${money(T.cost)} (sandbox)` : money(T.cost), MISSION.real.cost],
    ['Instruments', `${s.installed.filter(id => partById(id).slot === 'instrument').length}`, MISSION.real.instruments],
  ];
  const sc = [['Science value', r.parts.science, 40], ['Efficiency', r.parts.efficiency, 20], ['Decision quality', r.parts.decisions, 25], ['Risk handling', r.parts.risk, 15]];
  const next = MISSIONS.find(m => m.unlockAfter === s.missionId);
  const canNext = s.mode === 'campaign' && next && unlockedMissions().includes(next.id);
  const teamNotes = s.team.length > 1 ? `${s.objections} objection${s.objections === 1 ? '' : 's'} raised and resolved at sign-off.` : null;
  return (
    <div className="overlay">
      <section className="report glass">
        <div className="rep-head">
          <div>
            <div className="label">Debrief: {MISSION.name}{isFree(s) ? ` (${s.mode}, not ranked)` : ''}</div>
            <h2 className={'verdict-big ' + r.outcome}>{title}</h2>
            <p style={{ margin: '6px 0 0', color: '#c3cbef', maxWidth: 560 }}>{r.fail ? r.fail.text : successWhy || `${pct(r.sciFactor)} of planned science reached Earth.`}</p>
          </div>
          <div className="score">{Math.round(score)}<small>of 100</small></div>
        </div>
        <div className="grid2">
          <div className="sec"><h3>Score breakdown</h3>
            {sc.map(([n, v, m]) => (
              <div className="comp" key={n}>
                <div className="row-top"><span>{n}</span><span className="val">{Math.round(v)} / {m}</span></div>
                <div className="bar"><div className="fill grow" style={{ width: (v / m) * 100 + '%', background: 'var(--grad)' }}></div></div>
              </div>
            ))}
            {r.skipped.length > 0 && <p className="tag">Skipped checks: {r.skipped.join(', ')}.</p>}
            {teamNotes && <p className="tag">Team: {teamNotes}</p>}
            <p className="approx">Weights are placeholders to tune in playtesting (GDD 4.7).</p>
          </div>
          <div className="sec"><h3>{trace ? 'What caused it' : 'Why it worked'}</h3>
            {trace ? (
              <>
                <p style={{ marginTop: 0, color: '#c3cbef' }}>{trace.summary}</p>
                <div className="trace">
                  {trace.items.map((it, i) => <div className="tnode" key={i} style={{ animationDelay: i * 0.35 + 's' }}><div className="ts">{it.label}</div>{it.text}</div>)}
                  <div className="tnode end" style={{ animationDelay: trace.items.length * 0.35 + 's' }}><div className="ts">Result</div>{endText}</div>
                </div>
                <div className="note-box"><b>What you could have done.</b> {trace.fix}</div>
              </>
            ) : (
              <>
                <p style={{ marginTop: 0 }}>{successWhy}</p>
                <p className="tag">Several designs can score well if they stay balanced. Try a lighter one, or a different rocket.</p>
              </>
            )}
          </div>
          <div className="sec"><h3>Your design and the real {MISSION.inspired}</h3>
            <table><thead><tr><th></th><th>Yours</th><th>Real</th></tr></thead>
              <tbody>{comp.map(c => <tr key={c[0]}><td>{c[0]}</td><td>{c[1]}</td><td>{c[2]}</td></tr>)}</tbody></table>
            <p className="approx">Real values from NASA and JPL sources; see the info markers and the source register.</p>
          </div>
          <Compare s={s} r={r} key={s.savedTick} />
          <div className="sec wide-sec"><h3>Every decision</h3>
            <table><thead><tr><th>#</th><th>Stage</th><th>Decision</th></tr></thead>
              <tbody>{s.log.map((e, i) => <tr key={i}><td>{i + 1}</td><td>{STAGE_NAMES[e.stage - 1]}</td><td>{e.text}{e.fee ? ` (change request ${e.fee})` : ''}</td></tr>)}</tbody></table>
          </div>
        </div>
        <div className="foot">
          <button className="btn" onClick={A.backToMenu}>Main menu</button>
          <span style={{ display: 'flex', gap: 8 }}>
            {canNext && <button className="btn" onClick={() => A.reset({ missionId: next.id })}>Next: {next.name}</button>}
            <button className="btn primary" onClick={() => A.reset()}>Fly again</button>
          </span>
        </div>
      </section>
    </div>
  );
}
