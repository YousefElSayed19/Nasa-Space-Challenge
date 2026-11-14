import React, { useState } from 'react';
import { InfoDot } from './InfoDot.jsx';
import { useAnimatedNumber } from './hooks.js';
import { MISSION, RES_INFO, MARGIN, totals, resources, status, pct, fmt, money, rocketById } from '../engine/index.js';

const noChute = T => MISSION.events.includes('entry') && !T.has('parachute');
function hintFor(key, r, T, s) {
  if (key === 'mass' && !T.rocket) return `Measured against ${rocketById(MISSION.defaultRocket).name} until you pick a rocket.`;
  if (key === 'budget' && s.mode === 'sandbox') return 'Sandbox: no budget limit.';
  if (key === 'budget') return r.h < 0 ? `Over budget by ${money(r.used - r.limit)}.` : `${money(r.limit - r.used)} left to spend (${pct(r.h)}).`;
  if (key === 'power' && T.supply === 0) return 'No solar array installed yet.';
  if (key === 'data' && T.downlink === 0) return T.prod ? 'No antenna: no data can reach Earth.' : 'No antenna installed yet.';
  if (key === 'prop' && noChute(T)) return `No parachute yet, so the engines would have to do all the braking (${fmt(T.need)} units). Fit a parachute in the Protection & Entry Room.`;
  if (key === 'prop') return s.propLoaded > 0 ? `Loaded ${fmt(s.propLoaded)} of ${fmt(T.need)} needed.` : `${MISSION.lands ? 'The landing' : 'Orbit insertion'} needs about ${fmt(T.need)} units.`;
  if (r.h < 0) return `Over the limit by ${fmt(r.used - r.limit)}.`;
  if (r.h < MARGIN) return `Headroom ${pct(r.h)}, below the 25% margin.`;
  return `Headroom ${pct(r.h)}.`;
}

const COLORS = { ok: 'var(--go)', warn: 'var(--amber)', crit: 'var(--red)', none: 'var(--muted)' };
const WORDS = { ok: 'OK', warn: 'Thin', crit: 'Over', none: 'Missing' };

function Row({ r, T, s }) {
  const used = useAnimatedNumber(r.used);
  const none = r.limit <= 0;
  const st = none || (r.key === 'prop' && noChute(T)) ? 'none' : status(r.h);
  const ratio = none ? 0 : Math.min(1.08, r.used / r.limit);
  return (
    <div className={'row' + (st === 'crit' ? ' pulse' : '')}>
      <div className="row-top">
        <span>{r.key === 'budget' ? 'Budget ($)' : RES_INFO[r.key].label}<InfoDot title={RES_INFO[r.key].label} info={RES_INFO[r.key]} /></span>
        <span className="val">{r.key === 'budget' ? (r.limit >= 99999 ? `${money(used)} / ∞` : `${money(used)} spent of ${money(r.limit)}`) : `${fmt(used)} / ${none ? '—' : fmt(r.limit)}`}</span>
      </div>
      <div className="bar">
        <div className="fill" style={{ width: (ratio / 1.08) * 100 + '%', background: COLORS[st] }}></div>
        <div className="tick" style={{ left: 75 / 1.08 + '%' }}></div>
        {r.key === 'prop' && s.propLoaded > 0 && <div className="loaded" style={{ left: (Math.min(1.08, s.propLoaded / MISSION.tankCap) / 1.08) * 100 + '%' }}></div>}
      </div>
      <div className="hint"><span className={'st ' + st}>{WORDS[st]}</span>{hintFor(r.key, r, T, s)}</div>
    </div>
  );
}

export function Resources({ s, focus }) {
  const T = totals(s);
  const [open, setOpen] = useState(() => !(window.matchMedia && window.matchMedia('(max-height: 560px)').matches));
  return (
    <section className={'res glass' + (focus ? ' tut-focus' : '') + (open ? '' : ' collapsed')} aria-label="Live resource budget">
      <h3><button className="res-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? '▾' : '▸'} Live budget</button> <InfoDot title="Margins" info={{
        what: 'Each white tick marks 75% of the limit: the recommended 25% headroom.',
        why: 'Estimates grow as a design matures, and space throws surprises at you. Margin absorbs both.',
        real: 'NASA guidance: at least 30% power contingency in concept design (NTRS 20120013284); 25% at end of Phase A (NTRS 20150008247).',
      }} /></h3>
      {resources(T).map(r => <Row key={r.key} r={r} T={T} s={s} />)}
    </section>
  );
}
