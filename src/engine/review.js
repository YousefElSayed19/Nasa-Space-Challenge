// Role checks: the Go/No-Go review before launch (GDD 4.5) and team sign-off at each stage (GDD 4.9).
import { MISSION, ROLES, totals, resources, byKey, pct, fmt, MARGIN, skippedChecks } from './model.js';

export function reviewVerdicts(s) {
  const T = totals(s), R = byKey(resources(T));
  const out = [];
  {
    const issues = [];
    if (!T.has('battery')) issues.push(`No battery: the craft will go dark in the shadow at ${MISSION.destination}.`);
    if (R.power.h < MARGIN) issues.push(`Power headroom is ${pct(Math.max(R.power.h, -9))}, below the 25% margin.`);
    const sk = skippedChecks(s);
    out.push({ role: ROLES[0], go: issues.length === 0,
      risk: issues.length ? (R.power.h < 0.1 || !T.has('battery') ? 'High' : 'Medium') : sk.length ? 'Medium' : 'Low',
      reason: issues.length ? issues.join(' ') : `Power headroom ${pct(R.power.h)} and a battery on board.${sk.length ? ` ${sk.length} pre-launch check${sk.length > 1 ? 's' : ''} skipped.` : ''}` });
  }
  {
    const over = T.prod > T.downlink;
    const needPointing = MISSION.events.includes('pointing') && !over && R.data.h < 0.15;
    out.push({ role: ROLES[1], go: !over && !needPointing, risk: over || needPointing ? 'High' : T.sci < MISSION.sciTarget * 0.67 ? 'Medium' : 'Low',
      reason: over ? `The antenna can send only ${pct(T.downlink / T.prod)} of the data we will make.`
        : needPointing ? `Data headroom ${pct(R.data.h)}: too little to store flyby data while the antenna points away from Earth.`
          : T.sci < MISSION.sciTarget * 0.67 ? 'Data fits, but the payload is thin for our objectives.' : 'Payload and downlink are matched.' });
  }
  {
    const issues = [];
    if (T.wet > T.cap) issues.push(`${fmt(T.wet)} units is more than the rocket can send to ${MISSION.destination} (${T.cap}).`);
    if (s.propLoaded < T.need * 0.98) issues.push(`Propellant ${fmt(s.propLoaded)} of ${fmt(T.need)} needed for orbit insertion.`);
    const over = s.propLoaded > T.need * 1.15;
    out.push({ role: ROLES[2], go: issues.length === 0, risk: issues.length ? 'High' : R.mass.h < 0.1 ? 'Medium' : 'Low',
      reason: issues.length ? issues.join(' ') : over ? 'We can reach orbit, but the extra propellant is wasted mass.' : `Mass headroom ${pct(R.mass.h)}; propellant on target.` });
  }
  {
    const overB = T.cost > T.budget;
    const radiation = MISSION.events.includes('radiation');
    const noShield = !T.has('shield');
    out.push({ role: ROLES[3], go: !overB && !(radiation && noShield), risk: overB || (radiation && noShield) ? 'High' : noShield ? 'Medium' : 'Low',
      reason: overB ? `We are ${fmt(T.cost - T.budget)} over budget.`
        : radiation && noShield ? 'No radiation vault: Jupiter’s belts will destroy the electronics.'
          : noShield ? `Budget headroom ${pct(R.budget.h)}. No shielding, so a solar storm may cost observing time.`
            : s.mode === 'sandbox' ? 'Sandbox: no budget limit.' : `Budget headroom ${pct(R.budget.h)}. Space-weather risk covered.` });
  }
  return out;
}

/** Quick checks each role makes before a stage is locked in multiplayer. */
export function stageChecks(s, stage) {
  const T = totals(s), R = byKey(resources(T));
  const ok = note => ({ ok: true, note }), no = note => ({ ok: false, note });
  const power = T.supply > 0 ? (R.power.h >= MARGIN ? ok(`Power headroom ${pct(R.power.h)}.`) : no(`Power headroom ${pct(Math.max(-9, R.power.h))} is below 25%.`)) : ok('Power is sized at the Systems stage.');
  const data = T.downlink > 0 ? (R.data.h >= 0 ? ok(`Data headroom ${pct(R.data.h)}.`) : no('More data than the antenna can send.')) : ok(`Payload makes ${fmt(T.prod)} data units.`);
  const sci = T.sci >= MISSION.sciTarget * 0.67 ? ok(`Science value ${T.sci} of target ${MISSION.sciTarget}.`) : no(`Science value ${T.sci} is thin for target ${MISSION.sciTarget}.`);
  const mass = R.mass.h >= 0.1 ? ok(`Mass headroom ${pct(R.mass.h)}.`) : R.mass.h >= 0 ? no(`Mass headroom only ${pct(R.mass.h)}.`) : no('Heavier than the rocket can lift.');
  const budget = s.mode === 'sandbox' ? ok('No budget limit.') : R.budget.h >= 0.1 ? ok(`Budget headroom ${pct(R.budget.h)}.`) : R.budget.h >= 0 ? no(`Budget headroom only ${pct(R.budget.h)}.`) : no('Over budget.');
  const fuel = s.propLoaded >= T.need * 0.98 && s.propLoaded <= T.need * 1.15 ? ok('Propellant on target.') : no(`Propellant ${fmt(s.propLoaded)} of ${fmt(T.need)} needed.`);
  const battery = T.has('battery') ? power : no('No battery fitted.');
  const byStage = {
    2: [power, sci, mass, budget],
    3: [battery, data, mass, budget],
    4: [power, data, mass, budget],
    5: [power, data, fuel, budget],
  }[stage] || [power, data, mass, budget];
  return ROLES.map((role, i) => ({ role, ...byStage[i] }));
}
