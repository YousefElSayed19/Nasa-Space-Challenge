// Resource model. Plain JavaScript: no React, no Three.js (GDD 12.1).
import MISSIONS from '../data/missions.json';
import PARTS_DATA from '../data/parts.json';
import ROCKETS_DATA from '../data/rockets.json';
import STATIONS from '../data/stations.json';
import RES_BASE from '../data/resources.json';
import FACILITY from '../data/facility.json';

export { MISSIONS, STATIONS, FACILITY };
export const ALL_PARTS = PARTS_DATA.items;
export const ALL_ROCKETS = ROCKETS_DATA;
export const STAGE_NAMES = ['Briefing', 'Payload', 'Systems', 'Launch vehicle', 'Fueling', 'Go/No-Go', 'Mission', 'Debrief'];
export const ROLES = ['Systems Engineer', 'Science Lead', 'Launch and Orbit Lead', 'Budget and Risk Manager'];

export const MARGIN = 0.25;       // [Design] from NASA 25–30% guidance (NTRS 20120013284, 20150008247)
export const STORM_LOAD = 0.15;   // [Design] extra power headroom needed to recover from a storm safe mode
export const POINTING_NEED = 0.15;// [Design] data headroom needed to store flyby data while the antenna points away
export const SKIP_RISK = 0.35;    // [Design] chance that a skipped check causes its fault
export const FAULT_CHANCE = 0.12; // [Design] chance of a random instrument fault
export const CHANGE_BASE = 8;     // [Design] change-request fee per stage of distance
export const SANDBOX_BUDGET = 99999;
export const LOAN_SHARE = 0.2;    // [Design] extra funding: 20% of the budget (GDD 4.6)
export const LOAN_RATE = 0.15;    // [Design] interest added to cost
export const DUST_NEED = 0.3;     // [Design] power headroom needed to ride out a dust storm
export const G0 = 9.80665;

// The current mission. These are live bindings: importers always see the latest values.
export let MISSION = null;
export let PARTS = [];
export let ROCKETS = [];
export let PART_REAL = {};
export let RES_INFO = {};

export function setMission(id) {
  MISSION = MISSIONS.find(m => m.id === id) || MISSIONS[1];
  PARTS = ALL_PARTS.filter(p => p.missions.includes(MISSION.id));
  ROCKETS = ALL_ROCKETS.map(r => ({ ...r, cap: r.cap[MISSION.id], cost: r.cost[MISSION.id], approx: r.approx[MISSION.id] }));
  PART_REAL = PARTS_DATA.realBySlot[MISSION.id];
  RES_INFO = Object.fromEntries(Object.entries(RES_BASE).map(([k, v]) => [k, { ...v, real: MISSION.resReal[k] }]));
  return MISSION;
}
setMission('mars');

export const missionById = id => MISSIONS.find(m => m.id === id);
export const partById = id => ALL_PARTS.find(p => p.id === id);
export const rocketById = id => ROCKETS.find(r => r.id === id);
export const stationById = id => STATIONS.find(s => s.id === id);
/** The station where a part is chosen and put back. */
export const homeOf = p => (p.slot === 'instrument' ? 'lab-' + p.lab : p.slot === 'antenna' ? 'comms' : p.slot === 'array' || p.slot === 'battery' ? 'power' : 'protection');
export const isPickerStation = id => !!(STATIONS.find(s => s.id === id) || {}).picker;
export const ROOMS = [FACILITY.hall, ...FACILITY.rooms];
export const roomById = id => ROOMS.find(r => r.id === id);
/** Which room a floor position is in (rooms first, then the hall). */
export const roomAt = (x, z) => FACILITY.rooms.find(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) || FACILITY.hall;
export const partStage = p => (p.slot === 'instrument' ? 2 : 3);
export const missionSlots = () => [...new Set(PARTS.map(p => p.slot))];
/** Sandbox and replay have no stage locks, fees or order. */
export const isFree = s => s.mode === 'sandbox' || s.mode === 'replay';

/** Tsiolkovsky: m_prop = m_f (e^(dv / (Isp g0)) - 1), plus the attitude-control allowance. Returns tank units. */
export function propNeededUnits(dryUnits, dvSave = 0) {
  const mf = dryUnits * MISSION.u.mass;
  const dv = Math.max(0, MISSION.dvMOI + MISSION.dvOther - dvSave);
  const kg = mf * (Math.exp(dv / (MISSION.isp * G0)) - 1) * (1 + MISSION.acs);
  return kg / MISSION.u.prop;
}

/** Sum every installed part into one picture of the spacecraft. */
export function totals(s) {
  let dry = MISSION.busMass, demand = MISSION.busPower, supply = 0, prod = 0, downlink = 0, sci = 0, dvSave = 0, entryLimit = 0;
  let cost = MISSION.opsCost + MISSION.busCost;
  for (const id of s.installed) {
    const p = partById(id);
    dry += p.mass; cost += p.cost;
    if (p.power) demand += p.power;
    if (p.supply) supply += p.supply;
    if (p.data) prod += p.data;
    if (p.downlink) downlink += p.downlink;
    if (p.science) sci += p.science;
    if (p.dvSave) dvSave += p.dvSave;
    if (p.maxEntry) entryLimit = p.maxEntry;
  }
  const loan = s.loan || 0, loanInterest = Math.round(loan * LOAN_RATE);
  cost += loanInterest;
  const rocket = s.rocket ? rocketById(s.rocket) : null;
  if (rocket) cost += rocket.cost;
  cost += s.changeFees || 0;
  const need = propNeededUnits(dry, dvSave);
  const prop = s.propLoaded > 0 ? s.propLoaded : need;
  const wet = dry + prop * MISSION.u.prop / MISSION.u.mass;
  const cap = rocket ? rocket.cap : rocketById(MISSION.defaultRocket).cap;
  const has = slot => s.installed.some(id => partById(id).slot === slot);
  const budget = s.mode === 'sandbox' ? SANDBOX_BUDGET : MISSION.budget + loan;
  return { dry, wet, cap, demand, supply, prod, downlink, cost, budget, need, loaded: s.propLoaded, sci, rocket, has, entryLimit, loan, loanInterest };
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
export const money = units => {
  const m = units * MISSION.u.budget;
  return m >= 1000 ? `$${(m / 1000).toFixed(2)}B` : `$${fmt(m)}M`;
};

/** [Design] Reversing a locked decision costs more the further back it is (GDD 4.4). */
export function changeFee(s, p) {
  if (isFree(s)) return 0;
  const ps = partStage(p); return s.locked[ps] ? CHANGE_BASE * (s.stage - ps) : 0;
}

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

// Pre-launch maintenance checks (GDD 5.6).
export const CHECKS = [
  { id: 'connector', name: 'Connector check', what: 'Inspect and secure the wire connectors between parts.', teaches: 'Interfaces between parts must be verified before launch.', needs: s => s.installed.length > 0 },
  { id: 'panel', name: 'Panel deployment test', what: 'Unfold the solar arrays once on the ground.', teaches: 'Mechanisms are tested before flight.', needs: s => s.installed.some(id => partById(id).slot === 'array') },
  { id: 'calibration', name: 'Instrument calibration', what: 'Align each instrument against a known target.', teaches: 'Instruments need calibration to give valid science.', needs: s => s.installed.some(id => partById(id).slot === 'instrument') },
  { id: 'leak', name: 'Leak check', what: 'Watch the tank pressure after fueling.', teaches: 'Propellant systems are checked for leaks.', needs: s => s.propLoaded > 0 },
];
export const skippedChecks = s => CHECKS.filter(c => c.needs(s) && !(s.checks && s.checks[c.id]));
