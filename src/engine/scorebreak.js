// Explains every point the player did not get: which part of the score, how many points, why, and how to win them back.
import { MISSION, pct, fmt } from './model.js';

const LABEL = { mass: 'Mass', power: 'Power', data: 'Data', budget: 'Budget' };
/** Spread a category's lost points over its reasons so the reasons add up exactly to what was lost. */
function share(lost, items) {
  const raw = items.reduce((a, i) => a + i.w, 0);
  return items.filter(i => i.w > 0).map(i => ({ ...i, pts: raw > 0 ? lost * i.w / raw : 0 }));
}

export function scoreBreakdown(s, r) {
  const out = { science: [], efficiency: [], decisions: [], risk: [] };
  const max = { science: 40, efficiency: 20, decisions: 25, risk: 15 };
  const lost = k => Math.max(0, max[k] - r.parts[k]);
  const T = r.T, R = r.R;

  // science (40): planned science below target, plus science lost during the flight
  if (lost('science') > 0.05) {
    if (r.fail) out.science = [{ pts: lost('science'), why: 'The mission was lost, so no science reached Earth.', fix: 'Fix the cause shown in “What caused it” first: a mission that fails scores no science.' }];
    else {
      const planned = Math.min(1, T.sci / MISSION.sciTarget);
      const items = [];
      if (planned < 1) items.push({ w: 1 - planned, why: `Your instruments add up to science value ${T.sci} of the ${MISSION.sciTarget} target.`, fix: 'Add or swap in instruments with more stars, if the budget, power and data allow it.' });
      const flown = Math.max(0, planned - r.sciPct);
      for (const i of r.issues) {
        const txt = {
          power: 'Not enough power: instruments were switched off.', dust: 'Dust on the arrays cut power and switched instruments off.',
          data: 'The antenna could not send all the data home.', pointing: 'The antenna could not send everything during the flybys.',
          'check-calibration': 'An instrument was out of calibration because its check was skipped.', fault: 'A random fault broke an instrument.',
          storm: 'The solar storm hit with too little margin.', radiation: 'Radiation damaged the electronics.',
        }[i.res] || 'Science was lost during the flight.';
        const fix = {
          power: 'Pick a bigger solar array, or keep about 25% power headroom.', dust: 'Surface missions need about 30% power headroom for dust storms.',
          data: 'Pick a faster antenna, or fewer data-hungry instruments.', pointing: 'Keep extra data headroom so data can wait until the antenna points home.',
          'check-calibration': 'Run all four pre-launch checks at the cradle.', fault: 'Random faults are bad luck; fewer, well-chosen instruments lose less.',
          storm: 'Keep about 25% power headroom.', radiation: 'Fit the radiation protection for this mission.',
        }[i.res] || 'Keep more margin on every resource.';
        items.push({ w: flown * (i.loss || 0) / Math.max(1e-6, r.issues.reduce((a, x) => a + (x.loss || 0), 0)) || 0, why: txt, fix });
      }
      if (!items.length || items.every(i => !i.w)) items.push({ w: 1, why: 'Part of the planned science did not come back.', fix: 'Keep more margin on power and data.' });
      out.science = share(lost('science'), items);
    }
  }

  // efficiency (20): each resource should sit in the 10–35% headroom band
  if (lost('efficiency') > 0.05) {
    const keys = s.mode === 'sandbox' ? ['mass', 'power', 'data'] : ['mass', 'power', 'data', 'budget'];
    const band = h => (h < 0 ? 0 : h < 0.1 ? 0.6 : h <= 0.35 ? 1 : Math.max(0.4, 1 - (h - 0.35) * 1.5));
    out.efficiency = share(lost('efficiency'), keys.map(k => {
      const h = R[k].h, w = 1 - band(h);
      const why = h < 0 ? `${LABEL[k]} is over its limit.` : h < 0.1 ? `${LABEL[k]} headroom is only ${pct(h)}: too tight to be safe.` : `${LABEL[k]} headroom is ${pct(h)}: a lot of unused capacity you paid for.`;
      const fix = h > 0.35 ? (k === 'budget' ? 'Spend some of the spare money on more science, or pick a cheaper rocket and keep the rest.' : k === 'mass' ? 'A smaller, cheaper rocket would still lift this design.' : `Use a smaller ${k === 'power' ? 'solar array' : 'antenna'} and save mass and money.`) : `Aim for 10–35% ${LABEL[k].toLowerCase()} headroom.`;
      return { w, why, fix };
    }));
  }

  // decision quality (25)
  if (lost('decisions') > 0.05) {
    const items = [];
    if (s.changeCount) items.push({ w: Math.min(0.5, s.changeCount * 0.1), why: `${s.changeCount} change request${s.changeCount > 1 ? 's' : ''} after a stage was locked.`, fix: 'Decide carefully before confirming each stage: late changes cost points and money, like at NASA.' });
    if (s.overruled) items.push({ w: s.overruled * 0.15, why: `You overruled the team ${s.overruled} time${s.overruled > 1 ? 's' : ''} at the Go/No-Go review.`, fix: 'Fix the No-Go concerns instead of launching over them.' });
    if (s.propLoaded > T.need * 1.15) items.push({ w: 0.2, why: `You loaded ${fmt(s.propLoaded)} units of propellant when ${fmt(T.need)} were needed: extra mass for nothing.`, fix: 'Stop pumping inside the green band at the Fueling Station.' });
    if (r.skipped.length) items.push({ w: r.skipped.length * 0.05, why: `${r.skipped.length} pre-launch check${r.skipped.length > 1 ? 's were' : ' was'} skipped: ${r.skipped.join(', ')}.`, fix: 'Run all four checks at the Assembly Cradle before launch.' });
    if (!items.length) items.push({ w: 1, why: 'Decision quality was reduced.', fix: 'Avoid late changes and run every check.' });
    out.decisions = share(lost('decisions'), items);
  }

  // risk handling (15): every warning during the flight costs points; a failure costs all of them
  if (lost('risk') > 0.05) {
    if (r.fail) out.risk = [{ pts: lost('risk'), why: 'The mission was lost.', fix: 'Keep margins on every resource so one problem cannot end the mission.' }];
    else {
      const warns = r.timeline.filter(e => e.kind === 'warn');
      out.risk = share(lost('risk'), warns.map(e => ({ w: 1, why: `${e.phase}: ${e.text}`, fix: 'More margin on the resource involved would have absorbed it.' })));
    }
  }
  const total = Object.values(out).flat().reduce((a, i) => a + i.pts, 0);
  return { items: out, max, total, missing: 100 - r.score };
}
