// Go/No-Go review: each of the four roles checks the margins it owns (GDD 4.5, 4.9).
import { totals, resources, byKey, pct, fmt, MARGIN } from './model.js';

export function reviewVerdicts(s) {
  const T = totals(s), R = byKey(resources(T));
  const out = [];
  {
    const issues = [];
    if (!T.has('battery')) issues.push('No battery: the craft will go dark in Mars’ shadow.');
    if (R.power.h < MARGIN) issues.push(`Power headroom is ${pct(Math.max(R.power.h, -9))}, below the 25% margin.`);
    out.push({ role: 'Systems Engineer', go: issues.length === 0,
      risk: issues.length ? (R.power.h < 0.1 || !T.has('battery') ? 'High' : 'Medium') : 'Low',
      reason: issues.length ? issues.join(' ') : `Power headroom ${pct(R.power.h)} and a battery on board.` });
  }
  {
    const over = T.prod > T.downlink;
    out.push({ role: 'Science Lead', go: !over, risk: over ? 'High' : T.sci < 8 ? 'Medium' : 'Low',
      reason: over ? `The antenna can send only ${pct(T.downlink / T.prod)} of the data we will make.`
        : T.sci < 8 ? 'Data fits, but the payload is thin for our objectives.' : 'Payload and downlink are matched.' });
  }
  {
    const issues = [];
    if (T.wet > T.cap) issues.push(`${fmt(T.wet)} units is more than the rocket can send to Mars (${T.cap}).`);
    if (s.propLoaded < T.need * 0.98) issues.push(`Propellant ${fmt(s.propLoaded)} of ${fmt(T.need)} needed for orbit insertion.`);
    const over = s.propLoaded > T.need * 1.15;
    out.push({ role: 'Launch and Orbit Lead', go: issues.length === 0, risk: issues.length ? 'High' : R.mass.h < 0.1 ? 'Medium' : 'Low',
      reason: issues.length ? issues.join(' ') : over ? 'We can reach orbit, but the extra propellant is wasted mass.' : `Mass headroom ${pct(R.mass.h)}; propellant on target.` });
  }
  {
    const overB = T.cost > T.budget;
    const noShield = !T.has('shield');
    out.push({ role: 'Budget and Risk Manager', go: !overB, risk: overB ? 'High' : noShield ? 'Medium' : 'Low',
      reason: overB ? `We are ${fmt(T.cost - T.budget)} over budget.`
        : noShield ? `Budget headroom ${pct(R.budget.h)}. No shielding, so a solar storm may cost observing time.`
          : `Budget headroom ${pct(R.budget.h)}. Storm risk covered by shielding.` });
  }
  return out;
}
