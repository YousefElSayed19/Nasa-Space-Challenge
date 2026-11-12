import React from 'react';
import { STAGE_NAMES, MISSION, isFree, totals, headroom, money } from '../engine/index.js';
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
            return <li key={n} className={'chip' + cls} aria-current={k === s.stage ? 'step' : undefined}><span className="num">{k < s.stage ? '✓' : k}</span>{n}</li>;
          })}
        </ol>
      )}
      <BudgetChip s={s} />
      <div className="meta"><span>{MISSION.name}</span><span className="who">{s.team.length > 1 ? `Team of ${s.team.length}: ${s.team.join(", ")}` : `${s.profile.nick}, solo with 4 roles`}</span></div>
    </header>
  );
}

function BudgetChip({ s }) {
  const T = totals(s);
  const left = useAnimatedNumber(T.budget - T.cost);
  if (s.mode === 'sandbox') return <div className="budget-chip ok"><span className="bl">Budget</span><b>Unlimited</b><span className="bs">sandbox</span></div>;
  const h = headroom(T.budget, T.cost);
  const st = h < 0 ? 'crit' : h < 0.25 ? 'warn' : 'ok';
  return (
    <div className={'budget-chip ' + st} title="Money left to spend on this mission. Every part and the rocket cost money.">
      <span className="bl">$ Budget left</span><b>{money(left)}</b><span className="bs">of {money(T.budget)}{T.loan ? ' (incl. extra funding)' : ''}</span>
    </div>
  );
}
