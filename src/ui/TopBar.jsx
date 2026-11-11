import React from 'react';
import { STAGE_NAMES, MISSION } from '../engine/index.js';

export function TopBar({ s }) {
  return (
    <header className="topbar glass">
      <div className="brand"><span className="logo-mark" aria-hidden="true"></span>MissionForge</div>
      <ol className="chips" aria-label="Mission stages">
        {STAGE_NAMES.map((n, i) => {
          const k = i + 1, cls = k < s.stage ? ' done' : k === s.stage ? ' active' : '';
          return <li key={n} className={'chip' + cls} aria-current={k === s.stage ? 'step' : undefined}><span className="num">{k < s.stage ? '✓' : k}</span>{n}</li>;
        })}
      </ol>
      <div className="meta"><span>{MISSION.name}</span><span className="who">{s.profile.nick}, solo with 4 roles</span></div>
    </header>
  );
}
