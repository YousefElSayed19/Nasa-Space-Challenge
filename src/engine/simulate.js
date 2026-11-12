// Mission timeline, events and scoring (GDD 4.7, 4.8, 8.4).
import {
  MISSION, partById, totals, resources, byKey, pct, fmt, headroom, skippedChecks,
  STORM_LOAD, POINTING_NEED, SKIP_RISK, FAULT_CHANCE, DUST_NEED,
} from './model.js';

export function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function simulate(s, seed) {
  const rnd = mulberry32(seed);
  const T = totals(s), R = byKey(resources(T));
  const ev = MISSION.events;
  const timeline = [], issues = [];
  let fail = null, sciFactor = 1, storm = false, lostSci = 0;
  const P = (phase, text, kind) => timeline.push({ phase, text, kind });
  const skipped = new Set(skippedChecks(s).map(c => c.id));
  const hit = id => skipped.has(id) && rnd() < SKIP_RISK;
  const instruments = s.installed.map(partById).filter(p => p.slot === 'instrument');

  // Skipped checks resolve first so their effects feed the rest of the mission.
  let supply = T.supply;
  if (hit('panel')) { supply *= 0.85; issues.push({ res: 'check-panel', loss: 0 }); }
  const powerH = headroom(supply, T.demand);
  let loaded = s.propLoaded;
  const leak = hit('leak');
  if (leak) loaded *= 0.92;

  if (T.wet > T.cap) {
    fail = { phase: 'Launch', res: 'mass', text: `At ${fmt(T.wet * MISSION.u.mass)} kg, the spacecraft was too heavy for ${T.rocket.name} to send toward ${MISSION.destination}. It stayed stranded in Earth orbit.` };
    P('Launch', fail.text, 'fail');
  } else {
    P('Launch', `${T.rocket.name} lifts off carrying ${fmt(T.wet * MISSION.u.mass)} kg.`, 'ok');
  }

  if (!fail) {
    P('Cruise', MISSION.texts.cruise, 'ok');
    if (supply < T.supply) P('Cruise', 'One solar array panel did not fully unfold. Power is 15% lower than designed.', 'warn');
    if (leak) P('Cruise', 'A slow propellant leak lost about 8% of the load.', 'warn');
    if (ev.includes('storm')) {
      storm = rnd() < MISSION.stormChance;
      if (storm) {
        if (!T.has('shield')) {
          sciFactor *= 0.85; issues.push({ res: 'shield', loss: 0.15 });
          P('Cruise', 'Solar storm. Bit flips in unshielded memory forced a safe mode, and observing time was lost.', 'warn');
        } else P('Cruise', 'Solar storm. Shielding protected the computer from bit flips.', 'ok');
        if (powerH < STORM_LOAD) {
          sciFactor *= 0.7; issues.push({ res: 'power', loss: 0.3 });
          P('Cruise', `Recovering from the storm needed about ${pct(STORM_LOAD)} extra power. With ${pct(Math.max(0, powerH))} headroom, instruments stayed off for weeks.`, 'warn');
        } else P('Cruise', `The ${pct(powerH)} power headroom absorbed the storm recovery.`, 'ok');
      }
    }
    if (!fail && ev.includes('entry')) {
      if (!T.has('aeroshell')) {
        fail = { phase: 'Orbit insertion', res: 'entry', text: 'With no heat shield, the spacecraft burned up as it hit the Martian atmosphere.' };
        P('Orbit insertion', fail.text, 'fail');
      } else if (T.wet > T.entryLimit) {
        fail = { phase: 'Orbit insertion', res: 'entry-heavy', text: `At ${fmt(T.wet)} units the spacecraft was too heavy for its heat shield (limit ${T.entryLimit}). It overheated during entry.` };
        P('Orbit insertion', fail.text, 'fail');
      } else if (!T.has('parachute')) {
        fail = { phase: 'Orbit insertion', res: 'parachute', text: 'The heat shield worked, but with no parachute the lander was still falling far too fast for its engines to stop it.' };
        P('Orbit insertion', fail.text, 'fail');
      } else P('Orbit insertion', 'The heat shield survives entry and the parachute opens high above the ground.', 'ok');
    }
    if (!fail && loaded < T.need * 0.98) {
      const frac = loaded / T.need;
      fail = { phase: 'Orbit insertion', res: leak && s.propLoaded >= T.need * 0.98 ? 'check-leak' : 'prop',
        text: MISSION.texts.propFail || `The tank ran dry ${pct(frac)} of the way through the orbit-insertion burn. The spacecraft could not slow down and flew past ${MISSION.destination}.` };
      P('Orbit insertion', fail.text, 'fail');
    } else if (!fail) P('Orbit insertion', MISSION.texts.insertion, 'ok');
  }
  if (!fail && ev.includes('radiation')) {
    if (!T.has('shield')) {
      fail = { phase: 'Science operations', res: 'radiation', text: 'Jupiter’s radiation belts destroyed the unprotected electronics within the first orbits.' };
      P('Science operations', fail.text, 'fail');
    } else P('Science operations', 'Each flyby dips into Jupiter’s radiation belts. The vault protects the electronics.', 'ok');
  }
  if (!fail && !T.has('battery')) {
    fail = { phase: 'Science operations', res: 'battery', text: MISSION.texts.shadow };
    P('Science operations', fail.text, 'fail');
  }
  if (!fail) {
    if (powerH < 0) {
      const f = Math.max(0.2, supply / T.demand);
      sciFactor *= f; issues.push({ res: 'power', loss: 1 - f });
      P('Science operations', `Instruments need more power than the arrays make, so they take turns. Science drops to ${pct(f)}.`, 'warn');
    }
    if (ev.includes('dust')) {
      if (powerH < DUST_NEED) {
        sciFactor *= 0.75; issues.push({ res: 'dust', loss: 0.25 });
        P('Science operations', `A dust storm coated the arrays and cut power to well under half. With only ${pct(Math.max(0, powerH))} power headroom, instruments were switched off for weeks.`, 'warn');
      } else P('Science operations', `A dust storm coated the arrays. The ${pct(powerH)} power headroom kept the key instruments running.`, 'ok');
    }
    if (T.prod > T.downlink) {
      const f = T.downlink / T.prod;
      sciFactor *= f; issues.push({ res: 'data', loss: 1 - f });
      P('Science operations', `The antenna can send only ${pct(f)} of the data the instruments make. The rest is lost.`, 'warn');
    } else if (ev.includes('pointing')) {
      if (R.data.h < POINTING_NEED) {
        sciFactor *= 0.8; issues.push({ res: 'pointing', loss: 0.2 });
        P('Science operations', `During flybys the antenna points away from Earth. With only ${pct(R.data.h)} data headroom, stored flyby data overflowed.`, 'warn');
      } else P('Science operations', 'During flybys the antenna points away from Earth. The data headroom stored everything until it could be sent.', 'ok');
    }
    if (hit('connector')) {
      sciFactor *= 0.85; issues.push({ res: 'check-connector', loss: 0.15 });
      P('Science operations', 'A loose connector caused data dropouts for weeks.', 'warn');
    }
    if (instruments.length && hit('calibration')) {
      const best = instruments.slice().sort((a, b) => b.science - a.science)[0];
      lostSci += best.science * 0.5; issues.push({ res: 'check-calibration', loss: 0.5 * best.science / Math.max(1, T.sci), part: best.id });
      P('Science operations', `The ${best.name} was out of calibration. Half of its data could not be used.`, 'warn');
    }
    if (ev.includes('fault') && instruments.length && rnd() < FAULT_CHANCE) {
      const p = instruments[Math.floor(rnd() * instruments.length)];
      lostSci += p.science * 0.6; issues.push({ res: 'fault', loss: 0.6 * p.science / Math.max(1, T.sci), part: p.id });
      P('Science operations', `Random fault: the ${p.name} stopped working partway through the mission.`, 'warn');
    }
    const returned = Math.max(0, (T.sci * sciFactor - lostSci) / Math.max(1, T.sci));
    P('Science operations', `Science operations complete with ${pct(returned)} of planned observations returned.`, returned >= 0.9 ? 'ok' : 'warn');
  }
  P('End of mission', fail ? 'Mission ended early.' : 'Mission complete. The data is in the hands of scientists.', fail ? 'fail' : 'ok');

  // [Design] Scoring, weights are placeholders (GDD 4.7)
  const science = fail ? 0 : Math.max(0, T.sci * sciFactor - lostSci);
  const returned = T.sci ? science / T.sci : 0;
  const sciPct = Math.min(1, science / MISSION.sciTarget);
  const band = h => (h < 0 ? 0 : h < 0.1 ? 0.6 : h <= 0.35 ? 1 : Math.max(0.4, 1 - (h - 0.35) * 1.5));
  const effKeys = s.mode === 'sandbox' ? ['mass', 'power', 'data'] : ['mass', 'power', 'data', 'budget'];
  const eff = effKeys.map(k => band(R[k].h)).reduce((a, b) => a + b, 0) / effKeys.length;
  let dq = 1 - Math.min(0.5, s.changeCount * 0.1) - s.overruled * 0.15 - (s.propLoaded > T.need * 1.15 ? 0.2 : 0) - skipped.size * 0.05 + Math.min(0.1, (s.objections || 0) * 0.05);
  dq = Math.max(0, Math.min(1, dq));
  const warnEvents = timeline.filter(e => e.kind === 'warn').length;
  const risk = fail ? 0 : Math.max(0, 1 - warnEvents * 0.2);
  const parts = { science: 40 * sciPct, efficiency: 20 * eff, decisions: 25 * dq, risk: 15 * risk };
  const score = Math.round(parts.science + parts.efficiency + parts.decisions + parts.risk);
  const outcome = fail ? 'fail' : returned < 0.9 ? 'warn' : 'ok';
  const primary = fail ? fail.res : issues.length ? issues.slice().sort((a, b) => b.loss - a.loss)[0].res : null;
  return { timeline, fail, issues, sciFactor: returned, science, sciPct, parts, score, outcome, primary, storm, T, R, powerH, skipped: [...skipped] };
}
