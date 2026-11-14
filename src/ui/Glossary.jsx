import React from 'react';
import { A } from '../state/actions.js';
import GLOSSARY from '../data/glossary.json';
import { restartTutorial } from '../state/tutorial.js';
import BEST from '../data/best.json';
import { MISSION, partById, rocketById } from '../engine/index.js';

const GROUPS = [
  ['🚶 Moving', [['W / S', 'Walk forward and back'], ['A / D', 'Turn (Auto camera) or step sideways (Free camera). Hold to keep turning'], ['Shift', 'Run'], ['Space', 'Jump. In third person, hold it in the air to fly'], ['F', 'Flight mode (third person): Space up, Q down, F to land']]],
  ['🎥 Camera and view', [['Mouse drag', 'Look around'], ['C', 'Auto camera (follows you) or Free camera'], ['V', 'Third person, first person, or hands view'], ['M', 'Facility map: click a room to travel there']]],
  ['🛠 Building', [['E', 'Use a station or pick up a part'], ['Hold E', 'Install a part at the cradle, pump propellant'], ['X', 'Put a part back'], ['L', 'Show or hide the decision log'], ['Esc', 'Close a window']]],
];
const CONTROLS = [['W / S', 'Walk forward and back'], ['A / D (hold)', 'Turn left and right (Auto camera); step sideways with the Free camera'], ['Shift', 'Run'], ['Space', 'Jump; in third person, hold it in the air to fly'], ['F', 'Flight mode, third person only: hover low (Space up, Q down, F to land)'], ['Mouse drag', 'Look around (in Auto camera, it swings back behind you when you walk)'], ['C', 'Auto camera or free camera'], ['E', 'Use a station, pick up'], ['Hold E', 'Install a part, pump propellant'], ['X', 'Put a part back'], ['V', 'Change view: third person, first person, hands view'], ['L', 'Show or hide the decision log'], ['Esc', 'Close a panel']];

export function Glossary() {
  return (
    <div className="overlay" onClick={A.toggleGlossary}>
      <section className="glossary glass" aria-label="Glossary" onClick={e => e.stopPropagation()}>
        <div className="panel-head"><div><h2>Help</h2><p className="sub">Controls, the tour, and the engineering ideas this game teaches.</p></div>
          <button className="x" aria-label="Close glossary" onClick={A.toggleGlossary}>✕</button></div>
        <h3 className="help-h">Controls</h3>
        <div className="ctl-groups">
          {GROUPS.map(([title, rows]) => (
            <div key={title} className="ctl-group">
              <div className="ctl-title">{title}</div>
              {rows.map(([k, v]) => <div key={k} className="ctl-row"><span className="key">{k}</span><span className="ctl-d">{v}</span></div>)}
            </div>
          ))}
        </div>
        <button className="btn small" onClick={restartTutorial}>Replay the tour</button>
        <Perfect />
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


/** How to score 100: the rules behind each part of the score, plus a tested example design for this mission. */
function Perfect() {
  const b = BEST[MISSION.id];
  const name = id => (partById(id) || { name: id }).name;
  return (
    <div className="perfect">
      <h3 className="help-h">🏆 How to score 100</h3>
      <div className="pf-grid">
        <div className="pf-card"><b>Science · 40 points</b><p>Reach the science target of your mission (the stars on the instruments add up). Then make sure that science gets home: enough power and enough antenna.</p></div>
        <div className="pf-card"><b>Efficiency · 20 points</b><p>Keep <em>every</em> bar (mass, power, data, budget) between <em>10% and 35% headroom</em>. Too tight is risky; too much spare means you paid for capacity you don’t use.</p></div>
        <div className="pf-card"><b>Decision quality · 25 points</b><p>No change requests after a stage is locked, don’t overrule a No-Go, stop pumping inside the green band, and run all four checks at the Assembly Cradle.</p></div>
        <div className="pf-card"><b>Risk handling · 15 points</b><p>No warnings during the flight. Margins absorb surprises: keep about 25% power for storms, extra data headroom, a battery, and the right protection.</p></div>
      </div>
      {b && (
        <div className="pf-example">
          <div className="pf-ex-h"><b>A design that scored 100 on the {MISSION.name}</b><span>{b.rate} test flights scored 100; the rest lost a few points to a random fault (bad luck you can’t control).</span></div>
          <div className="pf-cols">
            <div><span className="pf-l">Instruments</span>{b.instruments.map(id => <span key={id} className="pf-chip">{name(id)}</span>)}</div>
            <div><span className="pf-l">Systems</span>{b.systems.map(id => <span key={id} className="pf-chip">{name(id)}</span>)}</div>
            <div><span className="pf-l">Rocket</span><span className="pf-chip">{rocketById(b.rocket).name}</span><span className="pf-l" style={{ marginTop: 8 }}>Propellant</span><span className="pf-chip">Just inside the green band</span></div>
          </div>
          <p className="tag">It’s one answer, not the only one. Try to find your own design that keeps every bar in the 10–35% band.</p>
        </div>
      )}
    </div>
  );
}
