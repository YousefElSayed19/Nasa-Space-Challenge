// Mission timeline, events and scoring (GDD 4.7, 4.8, 8.4).
import { MISSION, totals, resources, byKey, pct, fmt, STORM_CHANCE, STORM_LOAD } from './model.js';

export function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function simulate(s, seed) {
  const rnd = mulberry32(seed);
  const T = totals(s), R = byKey(resources(T));
  const timeline = [], issues = [];
  let fail = null, sciFactor = 1, storm = false;
  const P = (phase, text, kind) => timeline.push({ phase, text, kind });

  if (T.wet > T.cap) {
    fail = { phase: 'Launch', res: 'mass', text: `At ${fmt(T.wet * MISSION.u.mass)} kg, the spacecraft was too heavy for ${T.rocket.name} to send toward Mars. It stayed stranded in Earth orbit.` };
    P('Launch', fail.text, 'fail');
  } else {
    P('Launch', `${T.rocket.name} lifts off carrying ${fmt(T.wet * MISSION.u.mass)} kg.`, 'ok');
  }

  if (!fail) {
    P('Cruise', 'Cruise toward Mars begins: about seven months in space.', 'ok');
    storm = rnd() < STORM_CHANCE;
    if (storm) {
      if (!T.has('shield')) {
        sciFactor *= 0.85; issues.push({ res: 'shield', loss: 0.15 });
        P('Cruise', 'Solar storm. Bit flips in unshielded memory forced a safe mode, and observing time was lost.', 'warn');
      } else {
        P('Cruise', 'Solar storm. Shielding protected the computer from bit flips.', 'ok');
      }
      if (R.power.h < STORM_LOAD) {
        sciFactor *= 0.7; issues.push({ res: 'power', loss: 0.3 });
        P('Cruise', `Recovering from the storm needed about ${pct(STORM_LOAD)} extra power. With ${pct(Math.max(0, R.power.h))} headroom, instruments stayed off for weeks.`, 'warn');
      } else {
        P('Cruise', `The ${pct(R.power.h)} power headroom absorbed the storm recovery.`, 'ok');
      }
    }
    if (s.propLoaded < T.need * 0.98) {
      const frac = s.propLoaded / T.need;
      fail = { phase: 'Orbit insertion', res: 'prop', text: `The tank ran dry ${pct(frac)} of the way through the orbit-insertion burn. The spacecraft could not slow down and flew past Mars.` };
      P('Orbit insertion', fail.text, 'fail');
    } else {
      P('Orbit insertion', 'Six thrusters fire for about 25 minutes. Captured into Mars orbit.', 'ok');
    }
  }
  if (!fail && !T.has('battery')) {
    fail = { phase: 'Science operations', res: 'battery', text: 'On the first pass through Mars’ shadow, the arrays went dark and there was no battery. The spacecraft lost power.' };
    P('Science operations', fail.text, 'fail');
  }
  if (!fail) {
    if (R.power.h < 0) {
      const f = Math.max(0.2, T.supply / T.demand);
      sciFactor *= f; issues.push({ res: 'power', loss: 1 - f });
      P('Science operations', `Instruments need more power than the arrays make, so they take turns. Science drops to ${pct(f)}.`, 'warn');
    }
    if (T.prod > T.downlink) {
      const f = T.downlink / T.prod;
      sciFactor *= f; issues.push({ res: 'data', loss: 1 - f });
      P('Science operations', `The antenna can send only ${pct(f)} of the data the instruments make. The rest is lost.`, 'warn');
    }
    P('Science operations', `Science operations complete with ${pct(sciFactor)} of planned observations returned.`, sciFactor >= 0.9 ? 'ok' : 'warn');
  }
  P('End of mission', fail ? 'Mission ended early.' : 'Mission complete. The data is in the hands of scientists.', fail ? 'fail' : 'ok');

  // [Design] Scoring, weights are placeholders (GDD 4.7)
  const science = fail ? 0 : T.sci * sciFactor;
  const sciPct = Math.min(1, science / MISSION.sciTarget);
  const band = h => (h < 0 ? 0 : h < 0.1 ? 0.6 : h <= 0.35 ? 1 : Math.max(0.4, 1 - (h - 0.35) * 1.5));
  const eff = [R.mass.h, R.power.h, R.data.h, R.budget.h].map(band).reduce((a, b) => a + b, 0) / 4;
  let dq = 1 - Math.min(0.5, s.changeCount * 0.1) - s.overruled * 0.15 - (s.propLoaded > T.need * 1.15 ? 0.2 : 0);
  dq = Math.max(0, dq);
  const warnEvents = timeline.filter(e => e.kind === 'warn').length;
  const risk = fail ? 0 : Math.max(0, 1 - warnEvents * 0.25);
  const parts = { science: 40 * sciPct, efficiency: 20 * eff, decisions: 25 * dq, risk: 15 * risk };
  const score = Math.round(parts.science + parts.efficiency + parts.decisions + parts.risk);
  const outcome = fail ? 'fail' : sciFactor < 0.9 ? 'warn' : 'ok';
  const primary = fail ? fail.res : issues.length ? issues.slice().sort((a, b) => b.loss - a.loss)[0].res : null;
  return { timeline, fail, issues, sciFactor, science, sciPct, parts, score, outcome, primary, storm, T, R };
}
