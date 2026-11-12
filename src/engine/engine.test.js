// Run with: npm test
import { describe, it, expect } from 'vitest';
import { setMission, totals, resources, byKey, propNeededUnits, reviewVerdicts, simulate, causeTrace, MISSIONS } from './index.js';

const base = { mode: 'campaign', installed: [], rocket: 'atlas', propLoaded: 0, changeFees: 0, changeCount: 0, overruled: 0, log: [], verdicts: null, locked: {}, stage: 6,
  checks: { connector: true, panel: true, calibration: true, leak: true } };
const fueled = s => ({ ...s, propLoaded: totals(s).need });
const marsFull = { ...base, installed: ['cam-hires', 'spectro', 'radar', 'ctx', 'sounder', 'color', 'array-m', 'ant-3', 'battery', 'shield'] };

describe('Mars', () => {
  it('more dry mass needs more propellant (snowball)', () => {
    setMission('mars');
    expect(propNeededUnits(100)).toBeGreaterThan(propNeededUnits(90));
  });
  it('full payload on the real-size array leaves a thin power margin', () => {
    setMission('mars');
    const R = byKey(resources(totals(marsFull)));
    expect(R.power.h).toBeLessThan(0.25);
    expect(R.power.h).toBeGreaterThan(0);
    expect(reviewVerdicts(fueled(marsFull))[0].go).toBe(false);
  });
  it('underfilled tank fails orbit insertion', () => {
    setMission('mars');
    const r = simulate({ ...marsFull, propLoaded: 10 }, 1);
    expect(r.primary).toBe('prop');
  });
  it('missing battery fails in shadow', () => {
    setMission('mars');
    const s = fueled({ ...marsFull, installed: marsFull.installed.filter(id => id !== 'battery') });
    expect(simulate(s, 1).primary).toBe('battery');
  });
  it('cause trace orders decisions as they were made', () => {
    setMission('mars');
    const s = fueled({ ...marsFull, log: [{ kind: 'install', partId: 'cam-hires', stage: 2 }, { kind: 'install', partId: 'spectro', stage: 2 }, { kind: 'install', partId: 'array-m', stage: 3 }] });
    expect(causeTrace(s, 'power', totals(s)).items.map(i => i.idx)).toEqual([0, 1, 2]);
  });
});

describe('every mission', () => {
  for (const m of MISSIONS) {
    it(`${m.name}: the real design fits the rocket and budget`, () => {
      setMission(m.id);
      const s = fueled({ ...base, installed: m.realDesign.installed, rocket: m.realDesign.rocket });
      const R = byKey(resources(totals(s)));
      expect(R.mass.h).toBeGreaterThan(0);
      expect(R.budget.h).toBeGreaterThan(0);
      expect(R.power.h).toBeGreaterThan(0);
      expect(R.data.h).toBeGreaterThan(0);
    });
  }
  it('Europa without a vault is lost to radiation', () => {
    setMission('europa');
    const m = MISSIONS.find(x => x.id === 'europa');
    const s = fueled({ ...base, installed: m.realDesign.installed.filter(id => id !== 'eu-vault'), rocket: 'fh' });
    expect(simulate(s, 3).primary).toBe('radiation');
  });
  it('Europa cannot launch on Atlas V', () => {
    setMission('europa');
    const m = MISSIONS.find(x => x.id === 'europa');
    const s = fueled({ ...base, installed: m.realDesign.installed, rocket: 'atlas' });
    expect(simulate(s, 3).primary).toBe('mass');
  });

  it('Lander without a heat shield burns up, without a parachute crashes', () => {
    setMission('lander');
    const m = MISSIONS.find(x => x.id === 'lander');
    const noShield = fueled({ ...base, installed: m.realDesign.installed.filter(id => id !== 'lander-heat-h') });
    expect(simulate(noShield, 2).primary).toBe('entry');
    const noChute = fueled({ ...base, installed: m.realDesign.installed.filter(id => id !== 'lander-chute-l') });
    expect(simulate(noChute, 2).primary).toBe('parachute');
  });
  it('A bigger parachute means less descent propellant', () => {
    setMission('lander');
    const m = MISSIONS.find(x => x.id === 'lander');
    const big = totals({ ...base, installed: m.realDesign.installed }).need;
    const small = totals({ ...base, installed: m.realDesign.installed.map(id => id === 'lander-chute-l' ? 'lander-chute-s' : id) }).need;
    expect(small).toBeGreaterThan(big);
  });
  it('cause trace names a decision that fixed one thing and broke another', () => {
    setMission('mars');
    const s = fueled({ ...marsFull, installed: marsFull.installed.map(id => id === 'array-m' ? 'array-s' : id), log: [
      { kind: 'install', partId: 'array-m', stage: 3, effects: { mass: 10, 'power supply': 100 } },
      { kind: 'install', partId: 'array-s', stage: 3, text: 'Replaced 20 m² Solar Array with 12 m² Solar Array', effects: { mass: -4, 'power supply': -40 } }] });
    const t = causeTrace(s, 'power', totals(s));
    expect(t.items.some(i => i.tradeoff)).toBe(true);
  });
});
