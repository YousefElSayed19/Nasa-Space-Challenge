import React from 'react';
import { STAGE_NAMES, MISSION, isFree } from '../engine/index.js';

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
      <div className="meta"><span>{MISSION.name}</span><span className="who">{s.team.length > 1 ? `Team of ${s.team.length}: ${s.team.join(", ")}` : `${s.profile.nick}, solo with 4 roles`}</span></div>
    </header>
  );
}
