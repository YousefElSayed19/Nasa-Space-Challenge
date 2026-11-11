import React from 'react';
import { useHud } from './hooks.js';

export function Prompt() {
  const h = useHud();
  if (!h.prompt) return null;
  const C = 2 * Math.PI * 12;
  return (
    <div className="prompt glass" role="status">
      {h.hold > 0 ? (
        <svg className="ring" viewBox="0 0 30 30" aria-hidden="true">
          <circle cx="15" cy="15" r="12" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="3" />
          <circle cx="15" cy="15" r="12" fill="none" stroke="#6EA8FF" strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - h.hold)} transform="rotate(-90 15 15)" />
        </svg>
      ) : <span className="key">{h.prompt.key}</span>}
      <span>{h.prompt.text}</span>
    </div>
  );
}
