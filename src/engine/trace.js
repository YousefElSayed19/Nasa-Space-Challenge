// Cause tracing: link a failure back to the logged decisions that caused it (GDD 4.3).
import { partById, lastIndex, fmt, STAGE_NAMES } from './model.js';

export function causeTrace(s, res, T) {
  const step = id => lastIndex(s.log, e => e.kind === 'install' && e.partId === id);
  const inst = s.installed.map(partById);
  let items = [], summary = '', fix = '';
  const reviewIdx = lastIndex(s.log, e => e.kind === 'go');
  const overruledRole = role => s.verdicts && s.verdicts.some(v => v.role === role && !v.go);
  const confirmIdx = n => lastIndex(s.log, e => e.kind === 'confirm' && e.confirmed === n);

  if (res === 'power') {
    inst.filter(p => p.power).sort((a, b) => b.power - a.power).slice(0, 2)
      .forEach(p => items.push({ idx: step(p.id), text: `You installed the ${p.name} (+${p.power} power use).` }));
    const arr = inst.find(p => p.slot === 'array');
    if (arr && arr.supply < 140) items.push({ idx: step(arr.id), text: `You chose the ${arr.name}, which makes ${arr.supply} units at Mars${arr.supply < 100 ? ', less than the real orbiter’s arrays' : ''}.` });
    if (overruledRole('Systems Engineer') && reviewIdx >= 0) items.push({ idx: reviewIdx, text: 'The Systems Engineer called No-Go on power, and you launched anyway.' });
    summary = 'Power ran short. Together these decisions used up the power margin.';
    fix = 'Keep at least 25% power headroom: fit a bigger array, or drop one power-hungry instrument.';
  } else if (res === 'data') {
    inst.filter(p => p.data).sort((a, b) => b.data - a.data).slice(0, 2)
      .forEach(p => items.push({ idx: step(p.id), text: `You installed the ${p.name} (+${p.data} data).` }));
    const ant = inst.find(p => p.slot === 'antenna');
    if (ant) items.push({ idx: step(ant.id), text: `You chose the ${ant.name}, which sends ${ant.downlink} units.` });
    if (overruledRole('Science Lead') && reviewIdx >= 0) items.push({ idx: reviewIdx, text: 'The Science Lead called No-Go on data, and you launched anyway.' });
    summary = 'The instruments made more data than the antenna could send home.';
    fix = 'Match the payload to the downlink: a larger antenna, or fewer high-data instruments.';
  } else if (res === 'mass') {
    inst.slice().sort((a, b) => b.mass - a.mass).slice(0, 2)
      .forEach(p => items.push({ idx: step(p.id), text: `You installed the ${p.name} (+${p.mass} mass, plus the propellant to carry it).` }));
    const ri = lastIndex(s.log, e => e.kind === 'rocket');
    if (ri >= 0) items.push({ idx: ri, text: `You chose ${T.rocket.name}, which can send ${T.cap} units to Mars.` });
    const fi = lastIndex(s.log, e => e.kind === 'fuel');
    if (fi >= 0 && s.propLoaded > T.need * 1.15) items.push({ idx: fi, text: 'You overfilled the tank, and extra propellant is extra mass.' });
    summary = 'The launch mass was more than the rocket could lift toward Mars.';
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
    summary = 'Without a battery, the craft had no power in Mars’ shadow.';
    fix = 'Every orbiter that passes through shadow needs stored energy.';
  } else if (res === 'shield') {
    items.push({ idx: confirmIdx(3), text: 'You confirmed the spacecraft systems without electronics shielding.' });
    summary = 'Unshielded memory was hit by a solar storm.';
    fix = 'Shielding costs a little mass, but protects against space weather.';
  }
  items = items.filter(i => i.idx >= 0).sort((a, b) => a.idx - b.idx);
  items.forEach(i => { i.label = `Decision ${i.idx + 1}, ${STAGE_NAMES[s.log[i.idx].stage - 1]} stage`; });
  return { items, summary, fix };
}
