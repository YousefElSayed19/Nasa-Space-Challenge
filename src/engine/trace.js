// Cause tracing: link a failure back to the logged decisions that caused it (GDD 4.3).
import { MISSION, ROLES, partById, lastIndex, fmt, STAGE_NAMES, CHECKS } from './model.js';

export function causeTrace(s, res, T, result) {
  const step = id => lastIndex(s.log, e => e.kind === 'install' && e.partId === id);
  const inst = s.installed.map(partById);
  let items = [], summary = '', fix = '';
  const reviewIdx = lastIndex(s.log, e => e.kind === 'go');
  const overruledRole = role => s.verdicts && s.verdicts.some(v => v.role === role && !v.go);
  const confirmIdx = n => lastIndex(s.log, e => e.kind === 'confirm' && e.confirmed === n);
  const skipNote = id => {
    const c = CHECKS.find(x => x.id === id);
    items.push({ idx: reviewIdx, text: `You launched without the ${c.name.toLowerCase()}.` });
  };
  const skipped = new Set((result && result.skipped) || []);

  if (res === 'emergency') {
    summary = 'A flight emergency was handled differently from what the real NASA team did.';
    fix = (result && result.fail && result.fail.nasa) ? 'What NASA did: ' + result.fail.nasa : 'During the flight, read each emergency carefully. The right answer is what NASA actually did in that real case.';
  } else if (res === 'power') {
    inst.filter(p => p.power).sort((a, b) => b.power - a.power).slice(0, 2)
      .forEach(p => items.push({ idx: step(p.id), text: `You installed the ${p.name} (+${p.power} power use).` }));
    const arr = inst.find(p => p.slot === 'array');
    const maxSupply = Math.max(...inst.filter(p => p.slot === 'array').map(p => p.supply), 0);
    if (arr) items.push({ idx: step(arr.id), text: `You chose the ${arr.name}, which makes ${arr.supply} units at ${MISSION.destination}.` });
    if (skipped.has('panel') && result && result.issues.some(i => i.res === 'check-panel')) skipNote('panel');
    if (overruledRole(ROLES[0]) && reviewIdx >= 0) items.push({ idx: reviewIdx, text: 'The Systems Engineer called No-Go on power, and you launched anyway.' });
    summary = 'Power ran short. Together these decisions used up the power margin.';
    fix = 'Keep at least 25% power headroom: fit a bigger array, or drop one power-hungry instrument.' + (maxSupply ? '' : '');
  } else if (res === 'data' || res === 'pointing') {
    inst.filter(p => p.data).sort((a, b) => b.data - a.data).slice(0, 2)
      .forEach(p => items.push({ idx: step(p.id), text: `You installed the ${p.name} (+${p.data} data).` }));
    const ant = inst.find(p => p.slot === 'antenna');
    if (ant) items.push({ idx: step(ant.id), text: `You chose the ${ant.name}, which sends ${ant.downlink} units.` });
    if (overruledRole(ROLES[1]) && reviewIdx >= 0) items.push({ idx: reviewIdx, text: 'The Science Lead called No-Go on data, and you launched anyway.' });
    summary = res === 'pointing' ? 'There was not enough data headroom to store flyby data while the antenna pointed away from Earth.' : 'The instruments made more data than the antenna could send home.';
    fix = res === 'pointing' ? 'Keep at least 15% data headroom on missions where the antenna cannot always face Earth.' : 'Match the payload to the downlink: a larger antenna, or fewer high-data instruments.';
  } else if (res === 'mass') {
    inst.slice().sort((a, b) => b.mass - a.mass).slice(0, 2)
      .forEach(p => items.push({ idx: step(p.id), text: `You installed the ${p.name} (+${p.mass} mass, plus the propellant to carry it).` }));
    const ri = lastIndex(s.log, e => e.kind === 'rocket');
    if (ri >= 0) items.push({ idx: ri, text: `You chose ${T.rocket.name}, which can send ${T.cap} units to ${MISSION.destination}.` });
    const fi = lastIndex(s.log, e => e.kind === 'fuel');
    if (fi >= 0 && s.propLoaded > T.need * 1.15) items.push({ idx: fi, text: 'You overfilled the tank, and extra propellant is extra mass.' });
    summary = 'The launch mass was more than the rocket could lift.';
    fix = 'Every unit of dry mass also needs propellant. Trim mass first, or pay for a bigger rocket.';
  } else if (res === 'prop') {
    const fi = lastIndex(s.log, e => e.kind === 'fuel');
    items.push({ idx: fi, text: `You loaded ${fmt(s.propLoaded)} units of propellant; the burn needed ${fmt(T.need)}.` });
    const changed = lastIndex(s.log, e => e.kind === 'install' && e.stage === 5);
    if (changed >= 0) items.push({ idx: changed, text: 'A part added during fueling raised the propellant target.' });
    summary = 'There was not enough propellant to slow into orbit.';
    fix = 'Fill to the target line. The target moves whenever dry mass changes.';
  } else if (res === 'battery') {
    items.push({ idx: confirmIdx(3), text: 'You confirmed the spacecraft systems without a battery.' });
    summary = 'Without a battery, the craft had no power in shadow.';
    fix = 'Every orbiter that passes through shadow needs stored energy.';
  } else if (res === 'shield') {
    items.push({ idx: confirmIdx(3), text: 'You confirmed the spacecraft systems without electronics shielding.' });
    summary = 'Unshielded memory was hit by a solar storm.';
    fix = 'Shielding costs a little mass, but protects against space weather.';
  } else if (res === 'radiation') {
    items.push({ idx: confirmIdx(3), text: 'You confirmed the spacecraft systems without a radiation vault.' });
    if (overruledRole(ROLES[3]) && reviewIdx >= 0) items.push({ idx: reviewIdx, text: 'The Budget and Risk Manager called No-Go on radiation, and you launched anyway.' });
    summary = 'Jupiter’s radiation belts destroyed the unprotected electronics.';
    fix = 'Near Jupiter, the electronics need a vault. Europa Clipper’s has walls up to 9.2 mm thick.';
  } else if (res.startsWith('check-')) {
    const id = res.slice(6);
    const c = CHECKS.find(x => x.id === id);
    skipNote(id);
    summary = `A skipped ${c.name.toLowerCase()} caused a fault in flight.`;
    fix = `${c.teaches} The check takes a few seconds in the hangar.`;
  } else if (res === 'entry' || res === 'entry-heavy') {
    if (res === 'entry') items.push({ idx: confirmIdx(3), text: 'You confirmed the systems without a heat shield.' });
    else {
      const sh = inst.find(p => p.slot === 'aeroshell');
      if (sh) items.push({ idx: step(sh.id), text: `You chose the ${sh.name}, which protects up to ${sh.maxEntry} units.` });
      inst.slice().sort((a, b) => b.mass - a.mass).slice(0, 2).forEach(p => items.push({ idx: step(p.id), text: `You installed the ${p.name} (+${p.mass} mass).` }));
    }
    summary = res === 'entry' ? 'Nothing protected the lander from the heat of entry.' : 'The lander was heavier than its heat shield could protect.';
    fix = 'A thicker heat shield protects more mass, but weighs more itself. Keep entry mass under the shield’s limit.';
  } else if (res === 'parachute') {
    items.push({ idx: confirmIdx(3), text: 'You confirmed the systems without a parachute.' });
    summary = 'Mars’ air is thin, but a parachute still removes most of the speed left after entry.';
    fix = 'Fit a parachute. A larger one also cuts the propellant needed for the final descent.';
  } else if (res === 'dust') {
    const arr = inst.find(p => p.slot === 'array');
    if (arr) items.push({ idx: step(arr.id), text: `You chose the ${arr.name}, which makes ${arr.supply} units on a clear day.` });
    inst.filter(p => p.power).sort((a, b) => b.power - a.power).slice(0, 2).forEach(p => items.push({ idx: step(p.id), text: `You installed the ${p.name} (+${p.power} power use).` }));
    summary = 'Dust on the arrays cut power, and there was not enough margin to keep working.';
    fix = 'Surface missions need extra power margin: InSight’s arrays made 600–700 W on clear days but only 200–300 W when dusty.';
  } else if (res === 'fault') {
    summary = 'A random instrument fault. No single decision caused it.';
    fix = 'Real missions plan for faults with spare capacity and backup hardware. Extra science value gives you room to lose an instrument.';
  }
  // a decision that fixed one thing and broke another (GDD 4.3 step 4)
  const helps = { mass: e => (e.effects?.['power supply'] > 0 || e.effects?.downlink > 0) && e.effects?.mass > 0,
    'entry-heavy': e => (e.effects?.['power supply'] > 0 || e.effects?.downlink > 0) && e.effects?.mass > 0,
    power: e => e.effects?.['power supply'] < 0 && e.effects?.mass < 0, dust: e => e.effects?.['power supply'] < 0 && e.effects?.mass < 0,
    data: e => e.effects?.downlink < 0 && e.effects?.mass < 0, pointing: e => e.effects?.downlink < 0 && e.effects?.mass < 0 };
  if (helps[res]) {
    const k = lastIndex(s.log, e => e.kind === 'install' && helps[res](e));
    if (k >= 0) {
      const e = s.log[k], fx = e.effects;
      const gain = fx['power supply'] > 0 ? `+${fx['power supply']} power` : fx.downlink > 0 ? `+${fx.downlink} downlink` : `${fx.mass} mass`;
      const loss = fx.mass > 0 ? `+${fx.mass} mass` : fx['power supply'] < 0 ? `${fx['power supply']} power` : `${fx.downlink} downlink`;
      items = items.filter(i => i.idx !== k);
      items.push({ idx: k, tradeoff: true, text: `This fixed one thing and broke another: “${e.text}” gave ${gain}, but cost ${loss}, and that is the resource that failed.` });
    }
  }
  if (result && result.fail && s.loan) {
    const li = lastIndex(s.log, e => e.kind === 'loan');
    if (li >= 0) items.push({ idx: li, text: 'You took extra funding, so this failure cancelled the program.' });
  }
  items = items.filter(i => i.idx >= 0).sort((a, b) => a.idx - b.idx);
  items.forEach(i => { i.label = `${i.tradeoff ? 'Fixed one thing, broke another · ' : ''}Decision ${i.idx + 1}, ${STAGE_NAMES[s.log[i.idx].stage - 1]} stage`; });
  return { items, summary, fix };
}
