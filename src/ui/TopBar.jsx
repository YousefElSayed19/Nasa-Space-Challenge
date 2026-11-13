import React, { useState } from 'react';
import { A } from '../state/actions.js';
import { STAGE_NAMES, MISSION, isFree, totals, headroom, money, partById } from '../engine/index.js';
import { useAnimatedNumber } from './hooks.js';

export function TopBar({ s }) {
  return (
    <header className="topbar glass">
      <div className="brand"><span className="logo-mark" aria-hidden="true"></span>MissionForge</div>
      {isFree(s) ? (
        <div className="chips"><span className="chip active"><span className="num">✦</span>{s.mode === 'sandbox' ? 'Sandbox: no locks, no budget limit' : `Replay: the real ${MISSION.inspired} design`}</span></div>
      ) : (
        <ol className="chips" aria-label="Mission stages">
          {STAGE_NAMES.map((n, i) => {
            const k = i + 1, cls = k < s.stage ? ' done' : k === s.stage ? ' active' : '';
            const back = s.screen === 'game' && k >= 2 && k < s.stage && k <= 6;
            return <li key={n} className={'chip' + cls + (back ? ' back' : '')} aria-current={k === s.stage ? 'step' : undefined}
              onClick={back ? () => A.askReopen(k) : undefined} title={back ? `Go back to ${n} (change request)` : undefined}><span className="num">{k < s.stage ? '✓' : k}</span>{n}</li>;
          })}
        </ol>
      )}
      <BudgetChip s={s} />
      <div className="meta"><span>{MISSION.name}</span><span className="who">{s.team.length > 1 ? `Team of ${s.team.length}: ${s.team.join(", ")}` : `${s.profile.nick}, solo with 4 roles`}</span></div>
    </header>
  );
}

function BudgetChip({ s }) {
  const [open, setOpen] = useState(false);
  const T = totals(s);
  const left = useAnimatedNumber(T.budget - T.cost);
  if (s.mode === 'sandbox') return <div className="budget-wrap"><div className="budget-chip ok"><span className="bl">$ Budget</span><b>Unlimited</b></div></div>;
  const h = headroom(T.budget, T.cost);
  const st = h < 0 ? 'crit' : h < 0.25 ? 'warn' : 'ok';
  const parts = s.installed.reduce((a, id) => a + partById(id).cost, 0);
  const rows = [
    ['Operations (team, contact, data)', MISSION.opsCost],
    ['Spacecraft body (structure, computer, propulsion)', MISSION.busCost],
    ['Your parts', parts],
    ['Rocket', T.rocket ? T.rocket.cost : 0],
    ['Change requests', s.changeFees || 0],
    ['Interest on extra funding', T.loanInterest || 0],
  ].filter(([, v], i) => i < 4 || v);
  return (
    <div className="budget-wrap">
      <button className={'budget-chip ' + st} onClick={() => setOpen(o => !o)} aria-expanded={open} title="Click to see where the money goes">
        <span className="bl">$ Budget left</span><b>{money(left)}</b><span className="bs">/ {money(T.budget)}</span><span className="bcaret">▾</span>
      </button>
      {open && (
        <div className="budget-pop glass" onClick={() => setOpen(false)}>
          <div className="pop-t">Where the money goes</div>
          {rows.map(([k, v]) => <div key={k} className="bp-row"><span>{k}</span><b>{money(v)}</b></div>)}
          <div className="bp-row total"><span>Spent</span><b>{money(T.cost)}</b></div>
          <div className="bp-row total"><span>Budget{T.loan ? ' incl. extra funding' : ''}</span><b>{money(T.budget)}</b></div>
          <div className={'bp-row total ' + st}><span>Left to spend</span><b>{money(T.budget - T.cost)}</b></div>
          <p className="tag">Operations and the spacecraft body are fixed costs every mission pays before any choice.</p>
        </div>
      )}
    </div>
  );
}
