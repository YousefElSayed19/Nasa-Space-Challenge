// Local leaderboard: best campaign flights on this device (a suggested extra in the challenge).
import { loadJSON, saveJSON } from './store.js';

const KEY = 'mf-leaderboard';
export function addScore(entry) {
  const list = loadJSON(KEY, []);
  const e = { ...entry, id: Date.now(), date: new Date().toISOString().slice(0, 10) };
  list.push(e);
  list.sort((a, b) => b.score - a.score);
  saveJSON(KEY, list.slice(0, 50));
  return e.id;
}
export function topScores(mission, n = 5) {
  return loadJSON(KEY, []).filter(e => !mission || e.mission === mission).slice(0, n);
}
