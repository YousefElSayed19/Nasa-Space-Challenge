import React from 'react';
import BEST from '../data/best.json';
import { MISSION, partById, rocketById } from '../engine/index.js';

/** Shown in the debrief (after at least one flight): what each score part needs, and a tested 100-point design. */
export function Perfect() {
  const b = BEST[MISSION.id];
  const name = id => (partById(id) || { name: id }).name;
  return (
    <div className="perfect">
      
      <div className="pf-grid">
        <div className="pf-card"><b>Science · 40 points</b><p>Reach the science target of your mission (the stars on the instruments add up). Then make sure that science gets home: enough power and enough antenna.</p></div>
        <div className="pf-card"><b>Efficiency · 20 points</b><p>Keep <em>every</em> bar (mass, power, data, budget) between <em>10% and 35% headroom</em>. Too tight is risky; too much spare means you paid for capacity you don’t use.</p></div>
        <div className="pf-card"><b>Decision quality · 25 points</b><p>No change requests after a stage is locked, don’t overrule a No-Go, stop pumping inside the green band, and run all four checks at the Assembly Cradle.</p></div>
        <div className="pf-card"><b>Risk handling · 15 points</b><p>No warnings during the flight, and the right call in every flight emergency. Margins absorb surprises: keep about 25% power for storms, extra data headroom, a battery, and the right protection.</p></div>
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
