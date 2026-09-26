import { describe, expect, it } from 'vitest';
import { SHIFTS } from '../src/content/shifts';
import { Run } from '../src/engine/run';
import { makeRng, type Rng } from '../src/engine/rng';
import type { Shift } from '../src/engine/shift';
import type { UpgradeId } from '../src/engine/types';

type Bot = (shift: Shift, rng: Rng, lastAudit: number) => boolean;

/** Bots stand in for players. `reader` has perfect reading of how lines look, and is rhythmic. */
const bots: Record<string, Bot> = {
  // audits at a steady rhythm matched to the budget
  rhythmic: (s, _r, last) => s.lines.length - 1 - last >= Math.max(2, Math.round(s.cfg.actions / s.tuning.budget)),
  // audits anything that looks suspicious
  reader: (s, r) => (s.current?.def.look ?? 0) >= 0.4 && r() < 0.85,
  // truly random, at the budget rate
  random: (s, r) => r() < s.tuning.budget / s.cfg.actions,
  // random + also audits flagged / probed / linked lines: a strong, sensible player
  savvy: (s, r) => {
    const c = s.current;
    if (!c) return false;
    if (c.flagged || c.linked || (c.probe ?? 0) > 0.6) return r() < 0.9;
    return r() < (s.tuning.budget / s.cfg.actions) * 0.8;
  },
};

function play(botName: string, seed: number, upgrades: UpgradeId[] = []) {
  const run = new Run(seed, null);
  const rng = makeRng(seed ^ 0xabc);
  for (const u of upgrades) run.choose(u);
  while (run.hasNextShift) {
    const shift = run.nextShift();
    let last = -99;
    let guard = 0;
    while (!shift.done && guard++ < 500) {
      shift.step();
      if (shift.done) break;
      if (shift.honeypots > 0 && rng() < 0.08) shift.plantHoneypot();
      if (bots[botName](shift, rng, last)) {
        if (shift.audit().length) last = shift.lines.length - 1;
      }
    }
    expect(shift.done).toBe(true);
    run.closeShift();
  }
  return run;
}

function rates(bot: string, upgrades: UpgradeId[] = [], n = 60) {
  const wins = new Array(SHIFTS.length).fill(0);
  let pred = 0;
  for (let s = 1; s <= n; s++) {
    const run = play(bot, s * 104729, upgrades);
    run.results.forEach((r, i) => (wins[i] += r.outcome === 'incident' ? 0 : 1));
    pred += run.overallPredictability();
  }
  return { survive: wins.map((w) => +(w / n).toFixed(2)), pred: Math.round(pred / n) };
}

describe('Run engine', () => {
  it('always completes all five shifts', () => {
    const run = play('random', 1);
    expect(run.results).toHaveLength(5);
    expect(run.shareText('x')).toContain('BLIND SPOT');
  });

  it('is deterministic for a seed', () => {
    const a = play('savvy', 99).results.map((r) => [r.outcome, r.harm, r.caught]);
    const b = play('savvy', 99).results.map((r) => [r.outcome, r.harm, r.caught]);
    expect(a).toEqual(b);
  });

  it('is balanced: predictable overseers lose adaptive shifts, savvy ones can win', () => {
    const rhythmic = rates('rhythmic');
    const reader = rates('reader');
    const savvy = rates('savvy', ['monitor', 'correlator', 'probe']);
    if (process.env.BALANCE) {
      process.stderr.write(`rhythmic ${JSON.stringify(rhythmic)}\nreader ${JSON.stringify(reader)}\n`);
      process.stderr.write(`random ${JSON.stringify(rates('random'))}\nsavvy+ ${JSON.stringify(savvy)}\n`);
    }
    // shift 2 onward: the adaptive model should beat a metronome
    expect(rhythmic.survive[1]).toBeLessThan(0.5);
    // a player who leans on tools and randomness should survive shift 2 more often than a metronome
    expect(savvy.survive[1]).toBeGreaterThan(rhythmic.survive[1]);
    expect(rhythmic.pred).toBeGreaterThan(savvy.pred);
  });
});
