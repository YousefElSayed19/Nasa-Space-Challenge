import React from 'react';
import { A } from '../state/actions.js';
import GLOSSARY from '../data/glossary.json';
import { restartTutorial } from '../state/tutorial.js';

const CONTROLS = [['W A S D / arrows', 'Walk'], ['Shift', 'Run'], ['Space', 'Jump; hold it in the air to fly with the thrusters'], ['F', 'Flight mode: hover low above the floor (Space up, Q down, F again to land)'], ['Mouse drag', 'Look around (in Auto camera, it swings back behind you when you walk)'], ['C', 'Auto camera or free camera'], ['E', 'Use a station, pick up'], ['Hold E', 'Install a part, pump propellant'], ['X', 'Put a part back'], ['V', 'Change view: third person, first person, hands view'], ['L', 'Show or hide the decision log'], ['Esc', 'Close a panel']];

export function Glossary() {
  return (
    <div className="overlay" onClick={A.toggleGlossary}>
      <section className="glossary glass" aria-label="Glossary" onClick={e => e.stopPropagation()}>
        <div className="panel-head"><div><h2>Help</h2><p className="sub">Controls, the tour, and the engineering ideas this game teaches.</p></div>
          <button className="x" aria-label="Close glossary" onClick={A.toggleGlossary}>✕</button></div>
        <h3 className="help-h">Controls</h3>
        <div className="controls-grid">{CONTROLS.map(([k, v]) => <div key={k}><span className="key">{k}</span><span>{v}</span></div>)}</div>
        <button className="btn small" onClick={restartTutorial}>Replay the tour</button>
        <h3 className="help-h">Glossary</h3>
        <dl>
          {GLOSSARY.map(g => (
            <div key={g.term} className="gterm"><dt>{g.term}</dt><dd>{g.def}<span className="tag"> Source: {g.source}.</span></dd></div>
          ))}
        </dl>
      </section>
    </div>
  );
}
