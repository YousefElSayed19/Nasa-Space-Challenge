// Resource model. Plain JavaScript: no React, no Three.js (GDD 12.1).
import MISSION from '../data/mission-mars.json';
import PARTS_DATA from '../data/parts.json';
import ROCKETS from '../data/rockets.json';
import STATIONS from '../data/stations.json';
import RES_INFO from '../data/resources.json';

export { MISSION, ROCKETS, STATIONS, RES_INFO };
export const PARTS = PARTS_DATA.items;
export const PART_REAL = PARTS_DATA.realBySlot;
export const STAGE_NAMES = ['Briefing', 'Payload', 'Systems', 'Launch vehicle', 'Fueling', 'Go/No-Go', 'Mission', 'Debrief'];

export const MARGIN = 0.25;       // [Design] from NASA 25–30% guidance (NTRS 20120013284, 20150008247)
export const STORM_LOAD = 0.15;   // [Design] extra power headroom needed to recover from a storm safe mode
export const STORM_CHANCE = 0.85; // [Design]
export const CHANGE_BASE = 8;     // [Design] change-request fee per stage of distance
export const G0 = 9.80665;

export const partById = id => PARTS.find(p => p.id === id);
export const rocketById = id => ROCKETS.find(r => r.id === id);
export const stationById = id => STATIONS.find(s => s.id === id);
export const homeOf = p => (p.slot === 'instrument' ? 'payload' : 'systems');
export const partStage = p => (p.slot === 'instrument' ? 2 : 3);

/** Tsiolkovsky: m_prop = m_f (e^(dv / (Isp g0)) - 1), plus the attitude-control allowance. Returns tank units. */
export function propNeededUnits(dryUnits) {
  const mf = dryUnits * MISSION.u.mass;
  const dv = MISSION.dvMOI + MISSION.dvOther;
  const kg = mf * (Math.exp(dv / (MISSION.isp * G0)) - 1) * (1 + MISSION.acs);
  return kg / MISSION.u.prop;
}

/** Sum every installed part into one picture of the spacecraft. */
export function totals(s) {
  let dry = MISSION.busMass, demand = MISSION.busPower, supply = 0, prod = 0, downlink = 0, sci = 0;
  let cost = MISSION.opsCost + MISSION.busCost;
  for (const id of s.installed) {
    const p = partById(id);
    dry += p.mass; cost += p.cost;
    if (p.power) demand += p.power;
    if (p.supply) supply += p.supply;
    if (p.data) prod += p.data;
    if (p.downlink) downlink += p.downlink;
    if (p.science) sci += p.science;
  }
  const rocket = s.rocket ? rocketById(s.rocket) : null;
  if (rocket) cost += rocket.cost;
  cost += s.changeFees || 0;
  const need = propNeededUnits(dry);
  const prop = s.propLoaded > 0 ? s.propLoaded : need;
  const wet = dry + prop * MISSION.u.prop / MISSION.u.mass;
  const cap = rocket ? rocket.cap : ROCKETS[0].cap;
  const has = slot => s.installed.some(id => partById(id).slot === slot);
  return { dry, wet, cap, demand, supply, prod, downlink, cost, budget: MISSION.budget, need, loaded: s.propLoaded, sci, rocket, has };
}

export const headroom = (limit, used) => (limit <= 0 ? -1 : (limit - used) / limit);
export function resources(T) {
  return [
    { key: 'mass', used: T.wet, limit: T.cap },
    { key: 'power', used: T.demand, limit: T.supply },
    { key: 'data', used: T.prod, limit: T.downlink },
    { key: 'prop', used: T.need, limit: MISSION.tankCap },
    { key: 'budget', used: T.cost, limit: T.budget },
  ].map(r => ({ ...r, h: headroom(r.limit, r.used) }));
}
export const byKey = arr => Object.fromEntries(arr.map(r => [r.key, r]));
export const status = h => (h >= MARGIN ? 'ok' : h >= 0 ? 'warn' : 'crit');
export const pct = h => Math.round(h * 100) + '%';
export const fmt = n => Math.round(n).toLocaleString('en-US');
export function lastIndex(arr, fn) { for (let i = arr.length - 1; i >= 0; i--) if (fn(arr[i])) return i; return -1; }

/** [Design] Reversing a locked decision costs more the further back it is (GDD 4.4). */
export function changeFee(s, p) { const ps = partStage(p); return s.locked[ps] ? CHANGE_BASE * (s.stage - ps) : 0; }

export function effectsOf(p, rep, sign = 1) {
  const e = {};
  const d = (k, v) => { if (v) e[k] = v; };
  d('mass', sign * (p.mass - (rep ? rep.mass : 0)));
  d('power use', sign * (p.power || 0));
  d('power supply', sign * ((p.supply || 0) - ((rep && rep.supply) || 0)));
  d('data', sign * (p.data || 0));
  d('downlink', sign * ((p.downlink || 0) - ((rep && rep.downlink) || 0)));
  d('cost', sign * (p.cost - (rep ? rep.cost : 0)));
  return e;
}
