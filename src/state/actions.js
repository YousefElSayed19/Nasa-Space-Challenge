// Every player decision goes through here, so it is logged with its effects (GDD 4.3).
import { store, saveJSON, loadJSON, freshState } from './store.js';
import { bus } from './bus.js';
import { Sound } from '../audio/sound.js';
import {
  MISSION, RES_INFO, STAGE_NAMES, MARGIN, partById, rocketById, totals, resources, byKey, pct, fmt,
  changeFee, effectsOf, reviewVerdicts, simulate,
} from '../engine/index.js';

export const A = {
  toast(text, kind = 'info') {
    const id = Date.now() + Math.random();
    store.set(s => ({ toasts: [...s.toasts, { id, text, kind }].slice(-3) }));
    setTimeout(() => store.set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4200);
  },
  log(entry) { store.set(s => ({ log: [...s.log, { ...entry, stage: s.stage }] })); },
  open(id) { Sound.click(); store.set({ panel: id }); },
  close() { if (store.get().panel) store.set({ panel: null }); },

  setProfile(patch) { store.set(s => ({ profile: { ...s.profile, ...patch } })); },
  setStartStep(step) { Sound.click(); store.set({ startStep: step }); },
  start() {
    const s = store.get();
    saveJSON('mf-profile', s.profile);
    store.set({ screen: 'game' });
    bus.emit('enter');
    Sound.chime();
    A.toast(`Welcome, ${s.profile.nick}. Walk to Mission Control to read your briefing.`);
  },
  setPrefs(patch) {
    store.set(patch);
    const s = store.get();
    saveJSON('mf-prefs', { graphics: s.graphics, muted: s.muted });
    if ('graphics' in patch) bus.emit('graphics', s.graphics);
  },

  acceptBriefing() {
    const s = store.get(); if (s.stage !== 1) return;
    A.log({ kind: 'confirm', confirmed: 1, text: 'Accepted the Mars Orbiter briefing.' });
    store.set({ stage: 2, locked: { ...s.locked, 1: true }, panel: null });
    Sound.chime(); A.toast('Stage 2: choose instruments at the Payload Bay.');
  },
  pickUp(id) {
    const s = store.get(); if (s.stage > 5) return;
    store.set({ carrying: id, panel: null }); Sound.click();
    const p = partById(id);
    if (!s.installed.length) A.toast('Carry it to the Assembly Cradle in the middle of the hangar, then hold E to install.');
    else if (changeFee(s, p)) A.toast(`This stage is locked. Installing it files a change request costing ${changeFee(s, p)}.`, 'warn');
  },
  putBack() { if (store.get().carrying) { store.set({ carrying: null }); Sound.click(); } },
  install() {
    const s = store.get(); const p = partById(s.carrying); if (!p) return;
    const before = byKey(resources(totals(s)));
    let installed = [...s.installed], replaced = null;
    if (p.slot !== 'instrument') {
      const ex = installed.find(id => partById(id).slot === p.slot);
      if (ex) { replaced = partById(ex); installed = installed.filter(id => id !== ex); }
    }
    installed.push(p.id);
    const fee = changeFee(s, p);
    A.log({ kind: 'install', partId: p.id, text: replaced ? `Replaced ${replaced.name} with ${p.name}` : `Installed ${p.name}`, effects: effectsOf(p, replaced), fee });
    store.set(st => ({ installed, carrying: null, changeFees: st.changeFees + fee, changeCount: st.changeCount + (fee ? 1 : 0) }));
    Sound.clunk();
    bus.emit('installed', p.id);
    const after = byKey(resources(totals(store.get())));
    const crossed = ['power', 'mass', 'data', 'budget'].find(k => after[k].limit > 0 && before[k].h >= MARGIN && after[k].h < MARGIN);
    if (crossed) { Sound.warn(); A.toast(`${RES_INFO[crossed].label} headroom is now ${pct(after[crossed].h)}, below the recommended 25% margin.`, 'warn'); }
    else A.toast(`${p.name} installed. ${p.note}`, 'good');
    if (s.propLoaded > 0) A.toast('Dry mass changed, so the propellant target moved. Top up at the Fueling Station.', 'warn');
  },
  remove(id) {
    const s = store.get(); if (s.stage > 5) return;
    const p = partById(id); const fee = changeFee(s, p);
    A.log({ kind: 'remove', partId: id, text: `Removed ${p.name}`, effects: effectsOf(p, null, -1), fee });
    store.set(st => ({ installed: st.installed.filter(x => x !== id), changeFees: st.changeFees + fee, changeCount: st.changeCount + (fee ? 1 : 0) }));
    Sound.click();
    if (fee) A.toast(`Change request filed: ${fee} added to cost.`, 'warn');
  },
  confirmStage(n) {
    const s = store.get(); if (s.stage !== n) return;
    const next = { 2: 'Stage 3: fit power, antenna, battery and shielding from the Systems Rack.', 3: 'Stage 4: choose a rocket at the Launch Vehicle Board.' };
    A.log({ kind: 'confirm', confirmed: n, text: `Confirmed ${STAGE_NAMES[n - 1].toLowerCase()}. Decisions locked (baseline).` });
    store.set({ stage: n + 1, locked: { ...s.locked, [n]: true }, panel: null });
    Sound.chime(); A.toast(next[n]);
  },
  chooseRocket(id) { if (store.get().stage === 4) { store.set({ rocket: id }); Sound.click(); } },
  confirmRocket() {
    const s = store.get(); if (s.stage !== 4 || !s.rocket) return;
    const r = rocketById(s.rocket);
    A.log({ kind: 'rocket', text: `Chose ${r.name}`, effects: { cost: r.cost, 'capacity to Mars': r.cap } });
    store.set({ stage: 5, locked: { ...s.locked, 4: true }, panel: null });
    Sound.chime(); A.toast('Stage 5: fill the propellant tank at the Fueling Station.');
  },
  pump(amount) {
    const s = store.get(); if (s.stage !== 5) return;
    const T = totals(s);
    const v = Math.max(0, Math.min(MISSION.tankCap, s.propLoaded + amount));
    if (s.propLoaded <= T.need * 1.15 && v > T.need * 1.15) { Sound.warn(); A.toast('Overfill: extra propellant adds mass and is wasted.', 'warn'); }
    if (v >= MISSION.tankCap && s.propLoaded < MISSION.tankCap) Sound.tone(1200, 0.08, 'square', 0.04);
    store.set({ propLoaded: v });
  },
  finishFueling() {
    const s = store.get(); if (s.stage !== 5 || s.propLoaded <= 0) return;
    const T = totals(s);
    A.log({ kind: 'fuel', text: `Loaded ${fmt(s.propLoaded)} of ${fmt(T.need)} propellant units needed`, effects: { propellant: Math.round(s.propLoaded) } });
    store.set({ stage: 6, locked: { ...s.locked, 5: true }, panel: null });
    Sound.chime(); A.toast('Stage 6: hold the Go/No-Go review at the console.');
  },
  goLaunch() {
    const s = store.get(); if (s.stage !== 6) return;
    const v = reviewVerdicts(s); const n = v.filter(x => !x.go).length;
    A.log({ kind: 'go', text: n ? `Chose GO despite ${n} No-Go call${n > 1 ? 's' : ''}` : 'All four roles GO. Launch approved.' });
    store.set({ stage: 7, locked: { ...s.locked, 6: true }, overruled: n, verdicts: v, panel: null, carrying: null, screen: 'launching' });
    bus.emit('launch'); Sound.rumble();
  },
  startMission() { const s = store.get(); store.set({ screen: 'mission', result: simulate(s, (Date.now() & 0xffffff) + 7) }); },
  openReport() {
    const s = store.get();
    store.set({ screen: 'report', stage: 8 });
    const best = +loadJSON('mf-best', 0) || 0;
    if (s.result.score > best) saveJSON('mf-best', s.result.score);
    if (s.result.outcome === 'fail') Sound.bad(); else Sound.good();
  },
  reset() {
    const s = store.get();
    store.set({ ...freshState(s.profile, { graphics: s.graphics, muted: s.muted }), screen: 'game' });
    bus.emit('reset');
    A.toast('New attempt. Start at Mission Control.');
  },
};
