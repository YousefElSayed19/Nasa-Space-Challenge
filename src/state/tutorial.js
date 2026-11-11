// First-time tutorial: teaches by doing (GDD 3.1, step 5). Steps advance when the player does the thing.
import { store, saveJSON } from './store.js';
import { bus } from './bus.js';
import { Sound } from '../audio/sound.js';

export const TUTORIAL = [
  { title: 'Move', text: 'Walk with W A S D or the arrow keys. Hold Shift to run.', done: f => f.moved },
  { title: 'Look around', text: 'Drag with the mouse to turn the camera. Press V any time for first person.', done: f => f.looked },
  { title: 'Go to Mission Control', text: 'Follow the floating blue marker to Mission Control and press E.', done: (f, s) => s.panel === 'control' || s.stage > 1 },
  { title: 'Accept the mission', text: 'Read the goal and budget, then press Accept mission.', done: (f, s) => s.stage > 1 },
  { title: 'Pick up an instrument', text: 'Walk to the Payload Bay, press E, and pick up any instrument.', done: (f, s) => !!s.carrying || s.installed.length > 0 },
  { title: 'Install it', text: 'Carry it to the Assembly Cradle in the middle. Hold E until the ring fills.', done: (f, s) => s.installed.length > 0 },
  { title: 'Read the live budget', text: 'Every part changed mass, power, data and cost on the left. The white tick is the 25% safety margin: stay left of it. Press ? beside any bar to learn what it means.', done: null },
];

const flags = { moved: false, looked: false };
bus.on('moved', () => { flags.moved = true; check(); });
bus.on('looked', () => { flags.looked = true; check(); });
store.sub(check);

function check() {
  const s = store.get();
  if (s.tutorial == null || s.screen !== 'game') return;
  const step = TUTORIAL[s.tutorial];
  if (step && step.done && step.done(flags, s)) {
    Sound.chime();
    store.set({ tutorial: s.tutorial + 1 < TUTORIAL.length ? s.tutorial + 1 : null });
  }
}

export function finishTutorial() {
  saveJSON('mf-tutorial-done', true);
  store.set({ tutorial: null });
}
