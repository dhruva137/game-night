import { describe, expect, it } from 'vitest';
import { Predictor } from '../src/engine/predictor';
import { makeRng, type Rng } from '../src/engine/rng';

type Player = (i: number, look: number, rng: Rng, last: number[]) => boolean;

/** Scripted overseers that mimic documented human habits, plus a truly random baseline. */
const players: Record<string, Player> = {
  // checks roughly every 3–4 actions
  rhythmic: (_i, _l, rng, last) => {
    const gap = last.length ? _i - last[last.length - 1] : 99;
    return gap >= 3 + (rng() < 0.3 ? 1 : 0);
  },
  // tries to be random but never audits twice in a row and never waits more than 5 (Wagenaar)
  pseudoRandom: (i, _l, rng, last) => {
    const gap = last.length ? i - last[last.length - 1] : 99;
    if (gap <= 1) return false;
    if (gap >= 5) return true;
    return rng() < 0.3;
  },
  // only audits scary-looking lines
  lookOnly: (_i, look, rng) => look > 0.6 && rng() < 0.9,
  random: (_i, _l, rng) => rng() < 0.3,
};

function simulate(name: string, seed: number, n = 60) {
  const rng = makeRng(seed);
  const pred = new Predictor();
  const last: number[] = [];
  // "evasion": when the model thinks P(audit) is lowest, how often was the human actually not looking?
  let chances = 0;
  let evaded = 0;
  for (let i = 0; i < n; i++) {
    const look = rng();
    const p = pred.predict(look).p;
    const audited = players[name](i, look, rng, last);
    if (i >= 10 && p < 0.15) {
      chances++;
      if (!audited) evaded++;
    }
    pred.update(audited, look);
    if (audited) last.push(i);
  }
  return { score: pred.predictability(), evasion: chances ? evaded / chances : 0, chances };
}

function avg(name: string) {
  let score = 0;
  let evasion = 0;
  const runs = 40;
  for (let s = 1; s <= runs; s++) {
    const r = simulate(name, s * 7919);
    score += r.score;
    evasion += r.evasion;
  }
  return { score: score / runs, evasion: evasion / runs };
}

describe('Predictor', () => {
  it('reads human-like overseers', () => {
    for (const name of ['rhythmic', 'pseudoRandom', 'lookOnly']) {
      const r = avg(name);
      expect(r.score, `${name} predictability`).toBeGreaterThan(30);
      expect(r.evasion, `${name} evasion`).toBeGreaterThan(0.85);
    }
  });

  it('cannot read a truly random overseer', () => {
    const r = avg('random');
    expect(r.score).toBeLessThan(15);
  });

  it('is deterministic', () => {
    expect(simulate('pseudoRandom', 42)).toEqual(simulate('pseudoRandom', 42));
  });
});
