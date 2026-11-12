// First-time tutorial (GDD 3.1 step 5). Interactive: each action step shows when it is done,
// and the player moves on with Next. Skip ends the tour at any time.
import { store, saveJSON } from './store.js';
import { bus } from './bus.js';
import { Sound } from '../audio/sound.js';

export const TUTORIAL = [
  { title: 'Walk', text: 'Use W A S D or the arrow keys to walk. Hold Shift to run.', keys: ['W', 'A', 'S', 'D'], done: f => f.moved, wait: 'Walk a few steps' },
  { title: 'Look around', text: 'Drag with the mouse to turn the camera. Press V any time to switch to first person.', keys: ['Drag', 'V'], done: f => f.looked, wait: 'Drag the mouse on the hangar' },
  { title: 'Jump', text: 'Press Space to jump. A jet pack jumps higher; heavy parts keep you lower.', keys: ['Space'], done: f => f.jumped, wait: 'Press Space' },
  { title: 'Follow the arrow', text: 'The gold arrow floats over the place you need to go; when it is off screen, an arrow at the edge of the screen points the way. Walk to Mission Control until the “E Mission Control” prompt appears at the bottom, then press E.', keys: ['E'], target: 'control', done: (f, s) => s.panel === 'control' || s.stage > 1, wait: 'Open Mission Control' },
  { title: 'Accept the mission', text: 'Read the goal, budget and trip time, then press Accept mission.', target: 'control', done: (f, s) => s.stage > 1, wait: 'Press Accept mission' },
  { title: 'Pick up an instrument', text: 'Go to the Payload Bay, press E, and pick up any instrument. Each card shows what it costs before you choose.', keys: ['E'], target: 'payload', done: (f, s) => !!s.carrying || s.installed.length > 0, wait: 'Pick up an instrument' },
  { title: 'Install it', text: 'Carry it to the Assembly Cradle in the middle. Hold E until the ring fills and the part bolts on.', keys: ['Hold E'], target: 'cradle', done: (f, s) => s.installed.length > 0, wait: 'Install the part' },
  { title: 'Read the live budget', text: 'Every part changed mass, power, data and cost on the left. The white tick is the 25% safety margin: try to stay to the left of it.', focus: 'res' },
  { title: 'Your task list', text: 'The card at the top always lists the tasks for this stage. The current one has the arrow, and finished ones get a check.', focus: 'tasks' },
  { title: 'Ask “?”', text: 'Every number and part has a small “?”. It explains what it is, why it matters, and the real NASA value. Press Help in the corner for controls and the glossary.', focus: 'info' },
  { title: 'Ready for launch', text: 'Keep building stage by stage. After launch, the debrief will show which of your decisions made the mission succeed or fail. Good luck!', icon: '✓' },
];

const flags = { moved: false, looked: false, jumped: false };
bus.on('moved', () => { flags.moved = true; ping(); });
bus.on('looked', () => { flags.looked = true; ping(); });
bus.on('jumped', () => { flags.jumped = true; ping(); });

let lastDone = false;
function ping() { store.set(s => ({ tutTick: (s.tutTick || 0) + 1 })); }
store.sub(() => {
  const s = store.get();
  if (s.tutorial == null) { lastDone = false; return; }
  const d = isStepDone(s);
  if (d && !lastDone) Sound.chime();
  lastDone = d;
});

export function stepOf(s) { return s.tutorial == null ? null : TUTORIAL[s.tutorial]; }
export function isStepDone(s) {
  const st = stepOf(s); if (!st) return false;
  return !st.done || !!st.done(flags, s);
}
export function nextStep() {
  const s = store.get(); if (s.tutorial == null || !isStepDone(s)) return;
  Sound.click(); lastDone = false;
  if (s.tutorial + 1 >= TUTORIAL.length) finishTutorial();
  else store.set({ tutorial: s.tutorial + 1 });
}
export function prevStep() {
  const s = store.get(); if (!s.tutorial) return;
  Sound.click(); store.set({ tutorial: s.tutorial - 1 });
}
export function finishTutorial() {
  saveJSON('mf-tutorial-done', true);
  store.set({ tutorial: null });
}
export function restartTutorial() {
  flags.moved = flags.looked = flags.jumped = false;
  store.set({ tutorial: 0, showGlossary: false });
}
