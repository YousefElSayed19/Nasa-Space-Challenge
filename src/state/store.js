// Tiny external store. React reads it with useSyncExternalStore; the 3D scene subscribes directly.
export function makeStore(init) {
  let s = init; const subs = new Set();
  return {
    get: () => s,
    set: p => { s = { ...s, ...(typeof p === 'function' ? p(s) : p) }; subs.forEach(f => f()); },
    sub: f => { subs.add(f); return () => subs.delete(f); },
  };
}

export const DEFAULT_PROFILE = {
  nick: '', suit: '#6EA8FF', accent: '#FFC24B', visor: 'gold', helmet: 'dome',
  body: 'standard', height: 'medium', pack: 'life', patch: 'star', gloves: 'dark',
};

// Local storage can be unavailable (private windows); the game must still run.
export function loadJSON(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; }
}
export function saveJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }

export function loadProfile() {
  const v = loadJSON('mf-profile', null);
  return v && typeof v === 'object' ? { ...DEFAULT_PROFILE, ...v } : { ...DEFAULT_PROFILE };
}

export function freshState(profile, prefs = {}) {
  return {
    screen: 'start', startStep: 'name', profile, stage: 1, locked: {}, installed: [], carrying: null, rocket: null,
    mode: prefs.mode || 'campaign', missionId: prefs.missionId || 'moon', teamNames: prefs.teamNames || [], team: [],
    propLoaded: 0, changeFees: 0, changeCount: 0, overruled: 0, objections: 0, verdicts: null, checks: {},
    log: [], panel: null, firstPerson: false, showLog: true, toasts: [], result: null,
    signoff: null, tutorial: null, tutTick: 0, introBeat: 0, replayNotice: false, thumbsTick: 0, showGlossary: false, savedTick: 0,
    graphics: prefs.graphics || 'high', muted: !!prefs.muted,
  };
}

export const store = makeStore(freshState(loadProfile(), loadJSON('mf-prefs', {})));
// Fast-changing values (prompt, hold progress) live apart so the panels don't re-render every frame.
export const hud = makeStore({ prompt: null, hold: 0, near: null, pumping: false, uiPump: 0, ptr: null, missionPhase: 'Launch', missionKind: 'ok' });
