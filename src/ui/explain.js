// Plain-language explanations for every part and rocket: what it is, how to use it, cost, strengths and weaknesses.
import { MISSION, PARTS, ROCKETS, fmt, money } from '../engine/index.js';

export const HOWTO = {
  instrument: 'Pick it up, carry it to the Assembly Cradle in the middle and hold E to bolt it on. You can fit several instruments; each one adds science but also mass, power use, data and cost.',
  array: 'Only one solar array fits. Installing a different one swaps out the old one. Bigger arrays make more power but weigh and cost more.',
  antenna: 'Only one high-gain antenna fits. It must be able to send all the data your instruments make, or that science is lost.',
  battery: 'Needed to survive when the planet blocks the Sun. Without it the spacecraft dies in the first shadow.',
  shield: 'Protects the computer. Near Jupiter it is not optional: without the vault the radiation destroys the electronics.',
};
export const WHAT = {
  instrument: 'A science instrument: the reason the mission exists.',
  array: 'Solar panels that turn sunlight into electricity for everything on board.',
  antenna: 'The dish that sends data home to Earth.',
  battery: 'Stores energy for the time the spacecraft spends in shadow.',
  shield: 'Protection for the electronics against space weather.',
};

const rank = (list, key, p) => {
  const vals = list.map(x => x[key] || 0);
  return { min: Math.min(...vals), max: Math.max(...vals), v: p[key] || 0 };
};

export function prosCons(p) {
  const peers = PARTS.filter(x => x.slot === p.slot);
  const pros = [], cons = [];
  const R = k => rank(peers, k, p);
  if (peers.length > 1) {
    const m = R('mass'), c = R('cost');
    if (m.v === m.min) pros.push('Lightest option'); else if (m.v === m.max) cons.push('Heaviest option');
    if (c.v === c.min) pros.push('Cheapest option'); else if (c.v === c.max) cons.push('Most expensive');
  }
  if (p.slot === 'instrument') {
    const sc = R('science'), pw = R('power'), d = R('data');
    if (sc.v === sc.max) pros.push('Most science of any instrument'); else if (sc.v === sc.min) cons.push('Small science gain');
    if (pw.v === pw.min) pros.push('Very low power draw'); else if (pw.v === pw.max) cons.push('Most power-hungry');
    if (d.v === d.min) pros.push('Little data to send home'); else if (d.v === d.max) cons.push('Biggest data load for the antenna');
    // value for money and for power, compared with the other instruments
    const per = (x, k) => (x.science || 0) / Math.max(1, x[k] || 0);
    const sortBy = k => peers.slice().sort((a, b) => per(b, k) - per(a, k));
    const byCost = sortBy('cost'), byPower = sortBy('power');
    const top = (arr) => arr.indexOf(p) < Math.ceil(arr.length / 3), low = (arr) => arr.indexOf(p) >= arr.length - Math.ceil(arr.length / 3);
    if (top(byCost)) pros.push('Good science for the money'); else if (low(byCost)) cons.push('Expensive for the science it adds');
    if (top(byPower)) pros.push('Good science per watt'); else if (low(byPower)) cons.push('Uses a lot of power for its science');
  } else if (p.slot === 'array') {
    const s = R('supply');
    if (s.v === s.max) pros.push('Most power and safety margin'); else if (s.v === s.min) cons.push('Least power: tight margins');
    else pros.push('Balanced power for its mass');
  } else if (p.slot === 'antenna') {
    const d = R('downlink');
    if (d.v === d.max) pros.push('Fastest downlink'); else cons.push('Slower downlink: watch your data bar');
  } else if (p.slot === 'battery') {
    pros.push('Keeps the craft alive in shadow'); cons.push('Adds mass and cost, no science');
  } else {
    pros.push(MISSION.events.includes('radiation') ? 'Survives Jupiter’s radiation' : 'Protects against solar-storm bit flips'); cons.push('Adds mass and cost, no science');
  }
  if (!pros.length) pros.push('Middle of the range: no extreme strengths');
  if (!cons.length) cons.push('No big drawbacks, but it still adds mass and cost');
  return { pros: pros.slice(0, 3), cons: cons.slice(0, 3) };
}

export function statsOf(p) {
  const u = MISSION.u, rows = [];
  rows.push(['Mass', `${p.mass} u`, `≈ ${fmt(p.mass * u.mass)} kg`, 'up']);
  if (p.power) rows.push(['Power use', `${p.power} u`, `≈ ${fmt(p.power * u.power)} W`, 'up']);
  if (p.supply) rows.push(['Power made', `${p.supply} u`, `≈ ${fmt(p.supply * u.power)} W`, 'good']);
  if (p.data) rows.push(['Data', `${p.data} u`, u.data ? `≈ ${(p.data * u.data).toFixed(u.data < 1 ? 1 : 0)} ${u.dataUnit}` : 'game units', 'up']);
  if (p.downlink) rows.push(['Downlink', `${p.downlink} u`, u.data ? `≈ ${(p.downlink * u.data).toFixed(u.data < 1 ? 1 : 0)} ${u.dataUnit}` : 'game units', 'good']);
  rows.push(['Cost', `${p.cost}`, money(p.cost), 'up']);
  return rows;
}

export function rocketProsCons(r, wet) {
  const pros = [], cons = [];
  const caps = ROCKETS.map(x => x.cap), costs = ROCKETS.map(x => x.cost);
  if (r.cost === Math.min(...costs)) pros.push('Cheapest launch'); if (r.cost === Math.max(...costs)) cons.push('Most expensive launch');
  if (r.cap === Math.max(...caps)) pros.push('Lifts the most'); if (r.cap === Math.min(...caps)) cons.push('Smallest lift');
  if (wet > r.cap) cons.unshift('Cannot lift your current design');
  else if ((r.cap - wet) / r.cap > 0.4) cons.push('Lots of unused capacity: paying for lift you do not need');
  else pros.push('Fits your current design');
  return { pros, cons };
}
