// Every player decision goes through here, so it is logged with its effects (GDD 4.3).
import { store, saveJSON, loadJSON, freshState } from './store.js';
import { bus } from './bus.js';
import { addScore } from './leaderboard.js';
import { Sound } from '../audio/sound.js';
import {
  MISSION, MISSIONS, RES_INFO, ROLES, STAGE_NAMES, MARGIN, CHECKS, setMission, missionById, partById, rocketById,
  totals, resources, byKey, pct, fmt, money, changeFee, effectsOf, reviewVerdicts, stageChecks, simulate, isFree, LOAN_SHARE, LOAN_RATE, CHANGE_BASE,
} from '../engine/index.js';

export const unlockedMissions = () => {
  const u = loadJSON('mf-unlocked', ['moon']);
  return Array.isArray(u) ? u : ['moon'];
};
export const roleOwner = (s, i) => (s.team.length ? s.team[i % s.team.length] : s.profile.nick);

function preloadReal(s) {
  const d = MISSION.realDesign;
  const base = { ...s, installed: [...d.installed], rocket: d.rocket, propLoaded: 0 };
  return { installed: base.installed, rocket: d.rocket, propLoaded: totals(base).need };
}

export const A = {
  toast(text, kind = 'info') {
    const st = store.get();
    if (st.toasts.some(t => t.text === text && !t.leaving)) return; // no duplicates
    const id = Date.now() + Math.random();
    const life = Math.min(4200, 2200 + text.length * 14); // short: a quick note at the side
    store.set(s => ({ toasts: [...s.toasts, { id, text, kind, life }].slice(-2) }));
    setTimeout(() => store.set(s => ({ toasts: s.toasts.map(t => (t.id === id ? { ...t, leaving: true } : t)) })), life - 320);
    setTimeout(() => store.set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), life);
  },
  dismissToast(id) {
    store.set(s => ({ toasts: s.toasts.map(t => (t.id === id ? { ...t, leaving: true } : t)) }));
    setTimeout(() => store.set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 320);
  },
  log(entry) { store.set(s => ({ log: [...s.log, { ...entry, stage: s.stage }] })); },
  open(id) { Sound.click(); store.set({ panel: id }); },
  close() { if (store.get().panel) store.set({ panel: null }); },

  // ---------- start screen ----------
  setProfile(patch) { store.set(s => ({ profile: { ...s.profile, ...patch } })); },
  setStartStep(step) { Sound.click(); store.set({ startStep: step }); },
  setMode(mode) { Sound.click(); store.set({ mode }); },
  setMissionId(id) { Sound.click(); setMission(id); store.set({ missionId: id }); bus.emit('mission', id); },
  setTeamNames(names) { store.set({ teamNames: names }); },
  start() {
    const s = store.get();
    saveJSON('mf-profile', s.profile);
    setMission(s.missionId);
    const team = [s.profile.nick, ...s.teamNames.map(n => n.trim()).filter(Boolean)].slice(0, 4);
    // every run starts empty: the player decides everything (Replay alone starts from the real design, and says so)
    let patch = { screen: 'game', team, stage: 1, locked: {}, installed: [], carrying: null, rocket: null, propLoaded: 0, changeFees: 0, changeCount: 0,
      overruled: 0, objections: 0, verdicts: null, checks: {}, log: [], panel: null, result: null, signoff: null, replayNotice: s.mode === 'replay', loan: 0, scoreId: null };
    if (s.mode === 'replay') patch = { ...patch, ...preloadReal(s), stage: 6, locked: { 1: true, 2: true, 3: true, 4: true, 5: true } };
    if (s.mode === 'sandbox') patch = { ...patch, stage: 6 };
    store.set(patch);
    bus.emit('mission', s.missionId); bus.emit('enter');
    Sound.chime();
    const intro = {
      campaign: `Welcome, ${team.join(', ')}. Walk to Mission Control to read your briefing.`,
      sandbox: 'Sandbox: every station is open and there is no budget limit. Launch from the Go/No-Go console when ready.',
      replay: `This is the real ${MISSION.inspired} design, already built and fueled. Change anything, then launch from the Go/No-Go console.`,
    };
    A.toast(intro[s.mode]);
    if (s.mode === 'campaign' && !loadJSON('mf-tutorial-done', false)) store.set({ tutorial: 0 });
  },
  enter() {
    const s = store.get();
    setMission(s.missionId);
    saveJSON('mf-profile', s.profile);
    if (s.mode === 'campaign') { store.set({ screen: 'intro', introBeat: 0 }); bus.emit('mission', s.missionId); } // the intro can always be skipped
    else A.start();
  },
  setIntroBeat(i) { store.set({ introBeat: i }); },
  finishIntro() { try { window.speechSynthesis.cancel(); } catch (e) {} saveJSON('mf-intro-done', true); A.start(); },
  clearDesign() {
    store.set({ installed: [], rocket: null, propLoaded: 0, checks: {}, replayNotice: false, mode: 'sandbox', stage: 6, locked: {} });
    A.toast('Cleared. You are now in sandbox with an empty spacecraft.');
  },
  dismissReplay() { store.set({ replayNotice: false }); },
  setPrefs(patch) {
    store.set(patch);
    const s = store.get();
    saveJSON('mf-prefs', { graphics: s.graphics, muted: s.muted, camMode: s.camMode, mapHidden: s.mapHidden });
    if ('graphics' in patch) bus.emit('graphics', s.graphics);
  },
  cycleView() {
    const order = ['third', 'first', 'hands'];
    const v = order[(order.indexOf(store.get().view || 'third') + 1) % order.length];
    store.set({ view: v, firstPerson: v !== 'third' });
    A.toast({ third: '👁 Third person: you see your whole engineer.', first: '👁 First person: through the visor.', hands: '👁 Hands view: through the visor, with your hands in front of you.' }[v]);
  },
  toggleCamera() {
    const m = store.get().camMode === 'auto' ? 'free' : 'auto';
    A.setPrefs({ camMode: m });
    const fp = store.get().firstPerson;
    A.toast(m === 'auto' ? '🎥 Auto camera: W/S walk, hold A/D to turn, the camera stays behind you. Drag to look around.' : '🎥 Free camera: WASD walks relative to the camera; drag to turn the view.');
  },
  toggleMiniMap() { A.setPrefs({ mapHidden: !store.get().mapHidden }); },
  toggleMap() { Sound.click(); store.set(s => ({ showMap: !s.showMap })); },
  travel(roomId) { store.set({ showMap: false, panel: null }); bus.emit('travel', roomId); },
  toggleGlossary() { Sound.click(); store.set(s => ({ showGlossary: !s.showGlossary })); },

  // ---------- hangar ----------
  /** Go back to an earlier stage to change a locked decision. The fee grows with how far back you go (late changes cost more, NTRS 20150008247). */
  reopenFee(n) { const s = store.get(); return isFree(s) ? 0 : CHANGE_BASE * Math.max(1, s.stage - n) * 2; },
  askReopen(n) { const s = store.get(); if (isFree(s) || n >= s.stage || s.screen !== 'game') return; store.set({ reopen: n }); },
  cancelReopen() { store.set({ reopen: null }); },
  reopenStage(n) {
    const s = store.get(); if (n >= s.stage) return;
    const fee = A.reopenFee(n);
    const keep = {}; Object.keys(s.locked).forEach(k => { const st = k === 'rocket' ? 4 : k === 'fuel' ? 5 : +k.replace('stage', ''); if (st < n) keep[k] = s.locked[k]; });
    A.log({ kind: 'change', text: `Reopened stage ${n}, ${STAGE_NAMES[n - 1]} (change request ${money(fee)})`, effects: { cost: fee }, fee });
    store.set(st => ({ stage: n, locked: keep, reopen: null, verdicts: null, checks: {}, changeFees: (st.changeFees || 0) + fee, changeCount: (st.changeCount || 0) + 1, panel: null }));
    Sound.chime(); A.toast(`Back at stage ${n}. Later stages must be confirmed again.`, 'warn');
  },
  takeLoan() {
    const s = store.get(); if (s.mode !== 'campaign' || s.loan || s.stage > 5) return;
    const amount = Math.round(MISSION.budget * LOAN_SHARE), interest = Math.round(amount * LOAN_RATE);
    A.log({ kind: 'loan', text: `Took extra funding of ${money(amount)} (interest ${money(interest)})`, effects: { budget: amount, cost: interest } });
    store.set({ loan: amount });
    Sound.chime(); A.toast(`Extra funding approved: +${money(amount)}. If this mission fails, the program is cancelled.`, 'warn');
  },
  acceptBriefing() {
    const s = store.get(); if (s.stage !== 1) return;
    A.log({ kind: 'confirm', confirmed: 1, text: `Accepted the ${MISSION.name} briefing.` });
    store.set({ stage: 2, locked: { ...s.locked, 1: true }, panel: null });
    Sound.chime(); A.toast('Stage 2: choose instruments at the Payload Bay.');
  },
  pickUp(id) {
    const s = store.get(); if (!isFree(s) && s.stage > 5) return;
    store.set({ carrying: id, panel: null }); Sound.click();
    const p = partById(id);
    if (!s.installed.length && !s.tutorial) A.toast('Carry it to the Assembly Cradle in the middle of the hangar, then hold E to install.');
    else if (changeFee(s, p)) A.toast(`This stage is locked. Installing it files a change request costing ${money(changeFee(s, p))}.`, 'warn');
  },
  installDirect(id) {
    const s = store.get(); if (!isFree(s) && s.stage > 5) return;
    store.set({ carrying: id }); // the picker stays open so you can keep choosing
    A.install();
    bus.emit('fly', id);
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
    store.set(st => ({ installed, carrying: null, changeFees: st.changeFees + fee, changeCount: st.changeCount + (fee ? 1 : 0), checks: {} }));
    Sound.clunk();
    bus.emit('installed', p.id);
    const after = byKey(resources(totals(store.get())));
    const crossed = ['power', 'mass', 'data', 'budget'].find(k => after[k].limit > 0 && before[k].h >= MARGIN && after[k].h < MARGIN);
    if (crossed) { Sound.warn(); A.toast(`${RES_INFO[crossed].label} headroom is now ${pct(after[crossed].h)}, below the recommended 25% margin.`, 'warn'); }
    else A.toast(`${p.name} installed. ${p.note}`, 'good');
    if (s.propLoaded > 0) A.toast('Dry mass changed, so the propellant target moved. Top up at the Fueling Station.', 'warn');
  },
  remove(id) {
    const s = store.get(); if (!isFree(s) && s.stage > 5) return;
    const p = partById(id); const fee = changeFee(s, p);
    A.log({ kind: 'remove', partId: id, text: `Removed ${p.name}`, effects: effectsOf(p, null, -1), fee });
    store.set(st => ({ installed: st.installed.filter(x => x !== id), changeFees: st.changeFees + fee, changeCount: st.changeCount + (fee ? 1 : 0), checks: {} }));
    Sound.click();
    if (fee) A.toast(`Change request filed: ${money(fee)} added to cost.`, 'warn');
  },
  runCheck(id) {
    const c = CHECKS.find(x => x.id === id);
    store.set(s => ({ checks: { ...s.checks, [id]: true } }));
    A.log({ kind: 'check', text: `Completed the ${c.name.toLowerCase()}` });
    Sound.chime();
  },

  // ---------- locking a stage: team sign-off in multiplayer, advisor in solo (GDD 4.9) ----------
  requestLock(kind, n) {
    const s = store.get();
    const stage = kind === 'stage' ? n : kind === 'rocket' ? 4 : 5;
    if (s.team.length > 1) { Sound.click(); store.set({ signoff: { kind, n, stage, approvals: {} }, panel: null }); return; }
    const concerns = stageChecks(s, stage).filter(c => !c.ok);
    if (concerns.length) A.toast(`Advisor, ${concerns[0].role}: ${concerns[0].note}`, 'warn');
    A.doLock(kind, n);
  },
  approve(i) {
    const s = store.get(); if (!s.signoff) return;
    const approvals = { ...s.signoff.approvals, [i]: true };
    Sound.click();
    if (Object.keys(approvals).length === ROLES.length) {
      const { kind, n } = s.signoff;
      store.set({ signoff: null });
      A.log({ kind: 'signoff', text: `Team sign-off: all four roles approved ${STAGE_NAMES[s.signoff.stage - 1].toLowerCase()}` });
      A.doLock(kind, n);
    } else store.set({ signoff: { ...s.signoff, approvals } });
  },
  object(i, note) {
    const s = store.get(); if (!s.signoff) return;
    A.log({ kind: 'objection', text: `${ROLES[i]} (${roleOwner(s, i)}) objected: ${note}` });
    store.set(st => ({ signoff: null, objections: st.objections + 1 }));
    Sound.warn(); A.toast(`${ROLES[i]} objected. Fix it, then ask for sign-off again.`, 'warn');
  },
  cancelSignoff() { store.set({ signoff: null }); },
  doLock(kind, n) {
    if (kind === 'stage') A.confirmStage(n);
    else if (kind === 'rocket') A.confirmRocket();
    else if (kind === 'fuel') A.finishFueling();
  },
  confirmStage(n) {
    const s = store.get(); if (s.stage !== n) return;
    const next = { 2: 'Stage 3: fit power, antenna, battery and protection from the Systems Rack.', 3: 'Stage 4: choose a rocket at the Launch Vehicle Board.' };
    A.log({ kind: 'confirm', confirmed: n, text: `Confirmed ${STAGE_NAMES[n - 1].toLowerCase()}. Decisions locked (baseline).` });
    store.set({ stage: n + 1, locked: { ...s.locked, [n]: true }, panel: null });
    Sound.chime(); A.toast(next[n]);
  },
  chooseRocket(id) { const s = store.get(); if (s.stage === 4 || isFree(s)) { store.set({ rocket: id }); Sound.click(); } },
  confirmRocket() {
    const s = store.get(); if (s.stage !== 4 || !s.rocket) return;
    const r = rocketById(s.rocket);
    A.log({ kind: 'rocket', text: `Chose ${r.name}`, effects: { cost: r.cost, [`capacity to ${MISSION.destination}`]: r.cap } });
    store.set({ stage: 5, locked: { ...s.locked, 4: true }, panel: null });
    Sound.chime(); A.toast('Stage 5: fill the propellant tank at the Fueling Station.');
  },
  pump(amount) {
    const s = store.get(); if (s.stage !== 5 && !isFree(s)) return;
    const T = totals(s);
    const v = Math.max(0, Math.min(MISSION.tankCap, s.propLoaded + amount));
    if (s.propLoaded <= T.need * 1.15 && v > T.need * 1.15) { Sound.warn(); A.toast('Overfill: extra propellant adds mass and is wasted.', 'warn'); }
    if (v >= MISSION.tankCap && s.propLoaded < MISSION.tankCap) Sound.tone(1200, 0.08, 'square', 0.04);
    store.set({ propLoaded: v, checks: { ...s.checks, leak: false } });
  },
  finishFueling() {
    const s = store.get(); if (s.stage !== 5 || s.propLoaded <= 0) return;
    const T = totals(s);
    A.log({ kind: 'fuel', text: `Loaded ${fmt(s.propLoaded)} of ${fmt(T.need)} propellant units needed`, effects: { propellant: Math.round(s.propLoaded) } });
    store.set({ stage: 6, locked: { ...s.locked, 5: true }, panel: null });
    Sound.chime(); A.toast('Stage 6: run the pre-launch checks at the cradle, then hold the Go/No-Go review.');
  },
  canLaunch(s) { return s.stage === 6 && (!isFree(s) || (s.rocket && s.propLoaded > 0)); },
  goLaunch() {
    const s = store.get(); if (!A.canLaunch(s)) return;
    const v = reviewVerdicts(s); const n = v.filter(x => !x.go).length;
    if (isFree(s) && !s.log.some(e => e.kind === 'fuel')) A.log({ kind: 'fuel', text: `Loaded ${fmt(s.propLoaded)} propellant units` });
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
    if (s.mode === 'campaign' && s.result.outcome !== 'fail') {
      const next = MISSIONS.find(m => m.unlockAfter === s.missionId);
      const u = unlockedMissions();
      if (next && !u.includes(next.id)) { saveJSON('mf-unlocked', [...u, next.id]); A.toast(`${next.name} unlocked.`, 'good'); }
    }
    if (s.mode === 'campaign') {
      const id = addScore({ name: s.team.join(' & '), mission: s.missionId, score: s.result.score, outcome: s.result.outcome });
      store.set({ scoreId: id });
    }
    if (s.result.outcome === 'fail') Sound.bad(); else Sound.good();
  },
  reset(patch = {}) {
    const s = store.get();
    const missionId = patch.missionId || s.missionId;
    const mode = patch.mode || s.mode;
    setMission(missionId);
    store.set({ ...freshState(s.profile, { graphics: s.graphics, muted: s.muted, camMode: s.camMode, mapHidden: s.mapHidden, mode, missionId, teamNames: s.teamNames }), team: s.team, screen: 'game' });
    let extra = { stage: 1 };
    if (mode === 'replay') extra = { ...preloadReal(store.get()), stage: 6, locked: { 1: true, 2: true, 3: true, 4: true, 5: true } };
    if (mode === 'sandbox') extra = { stage: 6, ...(patch.design ? { installed: patch.design.installed, rocket: patch.design.rocket, propLoaded: patch.design.propLoaded } : {}) };
    store.set(extra);
    bus.emit('mission', missionId); bus.emit('reset');
    A.toast(mode === 'campaign' ? `New attempt: ${MISSION.name}. Start at Mission Control.` : `${mode === 'sandbox' ? 'Sandbox' : 'Replay'}: ${MISSION.name}.`);
  },
  saveDesign() {
    const s = store.get(); const r = s.result; if (!r) return;
    const list = loadJSON('mf-designs', []);
    const n = list.filter(d => d.mission === s.missionId).length + 1;
    list.push({
      id: Date.now(), mission: s.missionId, name: `${MISSION.name} design ${n} (score ${r.score})`,
      installed: s.installed, rocket: s.rocket, propLoaded: s.propLoaded, score: r.score, outcome: r.outcome,
      metrics: { wetKg: Math.round(r.T.wet * MISSION.u.mass), powerH: r.R.power.h, dataH: r.R.data.h, massH: r.R.mass.h, cost: r.T.cost, science: Math.round(r.sciFactor * 100) },
    });
    saveJSON('mf-designs', list.slice(-20));
    store.set(st => ({ savedTick: st.savedTick + 1 }));
    Sound.chime(); A.toast('Design saved in this browser.', 'good');
  },
  deleteDesign(id) { saveJSON('mf-designs', loadJSON('mf-designs', []).filter(d => d.id !== id)); store.set(st => ({ savedTick: st.savedTick + 1 })); },
  openInSandbox(design) { A.reset({ mode: 'sandbox', missionId: design.mission, design }); },
  backToMenu() { const s = store.get(); store.set({ ...freshState(s.profile, { graphics: s.graphics, muted: s.muted, camMode: s.camMode, mapHidden: s.mapHidden, mode: s.mode, missionId: s.missionId, teamNames: s.teamNames }) }); bus.emit('reset'); },
};
