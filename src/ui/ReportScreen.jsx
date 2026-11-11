import React from 'react';
import { A } from '../state/actions.js';
import { useAnimatedNumber } from './hooks.js';
import { MISSION, STAGE_NAMES, partById, causeTrace, pct, fmt } from '../engine/index.js';

export function ReportScreen({ s }) {
  const r = s.result, T = r.T;
  const score = useAnimatedNumber(r.score, 1100);
  const title = { ok: 'Mission success', warn: 'Mission degraded', fail: 'Mission lost' }[r.outcome];
  const trace = r.primary ? causeTrace(s, r.primary, T) : null;
  const endText = r.fail ? r.fail.text : r.primary ? ({
    power: 'Science was lost to a power shortfall.', data: 'Science was lost because data could not be sent home.', shield: 'Science was lost to a solar-storm safe mode.',
  })[r.primary] : '';
  const successWhy = !r.fail && r.outcome === 'ok'
    ? (r.storm ? `The mission succeeded because you kept ${pct(r.R.power.h)} power headroom, which absorbed the solar storm${T.has('shield') ? ', and shielding protected the computer' : ''}.` : 'The mission succeeded: every resource stayed within its limit.')
    : null;
  const comp = [
    ['Launch mass', `${fmt(T.wet * MISSION.u.mass)} kg`, '2,180 kg'],
    ['Power at Mars', `${fmt(T.supply * MISSION.u.power)} W`, 'about 2,000 W'],
    ['Downlink', `${(T.downlink * MISSION.u.data).toFixed(1)} Mbps`, 'up to 6 Mbps'],
    ['Total cost', `$${fmt(T.cost)}M`, 'about $720M'],
    ['Instruments', `${s.installed.filter(id => partById(id).slot === 'instrument').length}`, '6 main instruments'],
  ];
  const sc = [['Science value', r.parts.science, 40], ['Efficiency', r.parts.efficiency, 20], ['Decision quality', r.parts.decisions, 25], ['Risk handling', r.parts.risk, 15]];
  return (
    <div className="overlay">
      <section className="report glass">
        <div className="rep-head">
          <div>
            <div className="label">Debrief</div>
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
                <p className="tag">Try a lighter design or a different rocket: several designs can score well if they stay balanced.</p>
              </>
            )}
          </div>
          <div className="sec"><h3>Your design and the real orbiter</h3>
            <table><thead><tr><th></th><th>Yours</th><th>Real MRO</th></tr></thead>
              <tbody>{comp.map(c => <tr key={c[0]}><td>{c[0]}</td><td>{c[1]}</td><td>{c[2]}</td></tr>)}</tbody></table>
            <p className="approx">Real values from the JPL MRO launch press kit.</p>
          </div>
          <div className="sec"><h3>Every decision</h3>
            <table><thead><tr><th>#</th><th>Stage</th><th>Decision</th></tr></thead>
              <tbody>{s.log.map((e, i) => <tr key={i}><td>{i + 1}</td><td>{STAGE_NAMES[e.stage - 1]}</td><td>{e.text}{e.fee ? ` (change request ${e.fee})` : ''}</td></tr>)}</tbody></table>
          </div>
        </div>
        <div className="foot"><span className="tag">Next build: Lunar and Europa missions unlock in order.</span><button className="btn primary" onClick={A.reset}>Fly again</button></div>
      </section>
    </div>
  );
}
