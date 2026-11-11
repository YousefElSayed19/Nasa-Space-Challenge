// Run with: npm test
import { describe, it, expect } from 'vitest';
import { totals, resources, byKey, propNeededUnits, reviewVerdicts, simulate, causeTrace } from './index.js';

const base = { installed: [], rocket: 'atlas', propLoaded: 0, changeFees: 0, changeCount: 0, overruled: 0, log: [], verdicts: null, locked: {}, stage: 6 };
const full = { ...base, installed: ['cam-hires', 'spectro', 'radar', 'ctx', 'sounder', 'color', 'array-m', 'ant-3', 'battery', 'shield'] };
const fueled = s => ({ ...s, propLoaded: totals(s).need });

describe('engine', () => {
  it('more dry mass needs more propellant (snowball)', () => {
    expect(propNeededUnits(100)).toBeGreaterThan(propNeededUnits(90));
  });
  it('full payload on the real-size array leaves a thin power margin', () => {
    const R = byKey(resources(totals(full)));
    expect(R.power.h).toBeLessThan(0.25);
    expect(R.power.h).toBeGreaterThan(0);
  });
  it('systems engineer calls No-Go on thin power', () => {
    expect(reviewVerdicts(fueled(full))[0].go).toBe(false);
  });
  it('underfilled tank fails orbit insertion', () => {
    const r = simulate({ ...full, propLoaded: 10 }, 1);
    expect(r.outcome).toBe('fail');
    expect(r.primary).toBe('prop');
  });
  it('missing battery fails in shadow', () => {
    const s = fueled({ ...full, installed: full.installed.filter(id => id !== 'battery') });
    expect(simulate(s, 1).primary).toBe('battery');
  });
  it('a balanced design succeeds', () => {
    const lean = fueled({ ...base, installed: ['spectro', 'radar', 'ctx', 'sounder', 'array-l', 'ant-3', 'battery', 'shield'] });
    const r = simulate(lean, 5);
    expect(r.outcome).toBe('ok');
    expect(r.score).toBeGreaterThan(80);
  });
  it('cause trace orders decisions as they were made', () => {
    const s = fueled({ ...full, log: [
      { kind: 'install', partId: 'cam-hires', stage: 2 }, { kind: 'install', partId: 'spectro', stage: 2 }, { kind: 'install', partId: 'array-m', stage: 3 },
    ] });
    const t = causeTrace(s, 'power', totals(s));
    expect(t.items.map(i => i.idx)).toEqual([0, 1, 2]);
  });
});
