// The task list for the current stage, and which station the arrow should point at.
import { MISSION, PARTS, CHECKS, partById, homeOf, totals, isFree, skippedChecks, missionSlots } from '../engine/index.js';

export function tasksFor(s) {
  const T = totals(s);
  const nInst = s.installed.filter(id => partById(id).slot === 'instrument').length;
  const fuelOk = s.propLoaded >= T.need * 0.98 && s.propLoaded <= T.need * 1.15;
  let title, items;
  if (isFree(s)) {
    title = s.mode === 'sandbox' ? 'Sandbox' : 'Replay';
    items = [
      { text: 'Change the design in the labs and rooms', done: s.installed.length > 0, station: 'lab-imaging', optional: true },
      { text: 'Choose a rocket', done: !!s.rocket, station: 'board' },
      { text: 'Load propellant to the target line', done: fuelOk, station: 'fuel' },
      { text: 'Launch from the Go/No-Go console', done: false, station: 'review' },
    ];
  } else {
    switch (s.stage) {
      case 1: title = 'Stage 1: Briefing'; items = [
        { text: 'Walk to Mission Control', done: s.panel === 'control', station: 'control' },
        { text: 'Read the briefing and accept the mission', done: false, station: 'control' },
      ]; break;
      case 2: {
        title = 'Stage 2: Payload';
        // point at a lab that still has instruments to look at
        const free = PARTS.filter(p => p.slot === 'instrument' && !s.installed.includes(p.id));
        const lab = free.length ? homeOf(free[0]) : homeOf(PARTS.find(p => p.slot === 'instrument'));
        items = [
          { text: 'Choose an instrument in one of the four labs', done: !!s.carrying || nInst > 0, station: lab },
          { text: 'Install it at the Assembly Cradle', done: nInst > 0, station: 'cradle' },
          { text: `Reach science value ${Math.ceil(MISSION.sciTarget * 0.67)} or more`, done: T.sci >= MISSION.sciTarget * 0.67, station: lab, optional: true },
          { text: 'Confirm the payload in any lab', done: false, station: lab },
        ];
        break;
      }
      case 3: {
        title = 'Stage 3: Systems';
        const names = { array: 'Fit a solar array', antenna: 'Fit an antenna', battery: 'Fit a battery', shield: MISSION.events.includes('radiation') ? 'Fit the radiation vault' : 'Fit shielding', aeroshell: 'Fit a heat shield', parachute: 'Fit a parachute' };
        const roomOf = k => (k === 'antenna' ? 'comms' : k === 'array' || k === 'battery' ? 'power' : 'protection');
        items = missionSlots().filter(k => k !== 'instrument').map(k => ({ text: names[k] || `Fit a ${k}`, done: T.has(k), station: roomOf(k) }));
        const nextRoom = (items.find(i => !i.done) || { station: 'power' }).station;
        items.push({ text: 'Confirm the systems in any systems room', done: false, station: nextRoom });
        break;
      }
      case 4: title = 'Stage 4: Launch vehicle'; items = [
        { text: 'Choose a rocket that can lift your spacecraft', done: !!s.rocket, station: 'board' },
        { text: 'Confirm the rocket', done: false, station: 'board' },
      ]; break;
      case 5: title = 'Stage 5: Fueling'; items = [
        { text: 'Pump propellant to the green band', done: fuelOk, station: 'fuel' },
        { text: 'Finish fueling', done: false, station: 'fuel' },
      ]; break;
      default: title = 'Stage 6: Go/No-Go'; items = [
        { text: `Run the ${CHECKS.length} pre-launch checks at the cradle`, done: skippedChecks(s).length === 0, station: 'cradle', optional: true },
        { text: 'Hold the Go/No-Go review and launch', done: false, station: 'review' },
      ];
    }
  }
  if (s.carrying) items = [{ text: `Install the ${partById(s.carrying).name} at the Assembly Cradle (hold E)`, done: false, station: 'cradle' }, ...items.filter(i => i.done)];
  const current = items.find(i => !i.done) || null;
  return { title, items, current, target: current ? current.station : null };
}
