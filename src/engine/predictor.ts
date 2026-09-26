/**
 * The model that "reads you".
 *
 * Predicts P(the overseer manually audits the next action) from the overseer's own history.
 * Three experts exploit three well-documented human regularities, mixed by multiplicative
 * weights on log-loss (the same idea as Aaronson's "Oracle" demo):
 *
 *  - gap:    humans audit at characteristic intervals and avoid long droughts or back-to-back checks
 *            (Wagenaar 1972: people over-alternate and avoid streaks when trying to be random)
 *  - ngram:  the recent audit/skip pattern predicts the next move (orders 1–4 with backoff)
 *  - look:   people audit what *looks* suspicious, so an attacker can hide in bland-looking actions
 *
 * Only manual audits are learned from: truly random auto-audits carry no information about the human.
 */

export type ExpertName = 'base' | 'gap' | 'ngram' | 'look';

export interface Prediction {
  p: number;
  experts: Record<ExpertName, number>;
}

const MAX_GAP = 12;
const LOOK_BINS = 4;
const ETA = 0.6;
const clampP = (p: number) => Math.min(0.97, Math.max(0.03, p));

function logLoss(p: number, y: 0 | 1): number {
  const q = clampP(p);
  return -(y ? Math.log(q) : Math.log(1 - q));
}

export class Predictor {
  private n = 0;
  private audits = 0;
  private gap = 0; // actions since last manual audit
  private gapReached = new Array<number>(MAX_GAP + 1).fill(0);
  private gapHit = new Array<number>(MAX_GAP + 1).fill(0);
  private history: (0 | 1)[] = [];
  private ngram = new Map<string, [number, number]>();
  private lookSeen = new Array<number>(LOOK_BINS).fill(0);
  private lookHit = new Array<number>(LOOK_BINS).fill(0);
  private weights: Record<ExpertName, number> = { base: 1, gap: 1, ngram: 1, look: 1 };

  /** cumulative log-loss of the mixture and of a base-rate-only model (for the predictability score) */
  lossModel = 0;
  lossBase = 0;
  scored = 0;

  get observations(): number {
    return this.n;
  }

  get gapSinceAudit(): number {
    return this.gap;
  }

  /** Most common gap between audits so far (for leaked thoughts / insights). */
  typicalGap(): number {
    let best = 3;
    let bestRate = -1;
    for (let g = 1; g <= MAX_GAP; g++) {
      if (this.gapReached[g] < 2) continue;
      const rate = this.gapHit[g] / this.gapReached[g];
      if (rate > bestRate) {
        bestRate = rate;
        best = g;
      }
    }
    return best;
  }

  private baseP(): number {
    return (this.audits + 1) / (this.n + 3);
  }

  predict(look: number): Prediction {
    const base = this.baseP();
    const g = Math.min(this.gap, MAX_GAP);
    const gap = (this.gapHit[g] + base * 2) / (this.gapReached[g] + 2);

    let ngram = base;
    for (let k = 4; k >= 1; k--) {
      if (this.history.length < k) continue;
      const c = this.ngram.get(this.key(k));
      if (c && c[0] + c[1] >= 3) {
        ngram = (c[1] + base) / (c[0] + c[1] + 1);
        break;
      }
    }

    const b = this.bin(look);
    const lookP = (this.lookHit[b] + base * 2) / (this.lookSeen[b] + 2);

    const experts = { base, gap, ngram, look: lookP };
    let wSum = 0;
    let pSum = 0;
    for (const k of Object.keys(experts) as ExpertName[]) {
      wSum += this.weights[k];
      pSum += this.weights[k] * experts[k];
    }
    return { p: clampP(pSum / wSum), experts };
  }

  /** Feed the outcome of one action: did the human manually audit it, and how suspicious did it look? */
  update(audited: boolean, look: number): void {
    const y: 0 | 1 = audited ? 1 : 0;
    const pred = this.predict(look);

    if (this.n >= 4) {
      this.lossModel += logLoss(pred.p, y);
      this.lossBase += logLoss(pred.experts.base, y);
      this.scored++;
    }
    for (const k of Object.keys(pred.experts) as ExpertName[]) {
      this.weights[k] *= Math.exp(-ETA * logLoss(pred.experts[k], y));
    }
    const wMax = Math.max(...Object.values(this.weights));
    for (const k of Object.keys(this.weights) as ExpertName[]) this.weights[k] /= wMax;

    const g = Math.min(this.gap, MAX_GAP);
    this.gapReached[g]++;
    if (y) this.gapHit[g]++;

    for (let k = 1; k <= 4; k++) {
      if (this.history.length < k) continue;
      const key = this.key(k);
      const c = this.ngram.get(key) ?? [0, 0];
      c[y]++;
      this.ngram.set(key, c);
    }

    const b = this.bin(look);
    this.lookSeen[b]++;
    if (y) this.lookHit[b]++;

    this.history.push(y);
    if (this.history.length > 64) this.history.shift();
    this.n++;
    if (y) {
      this.audits++;
      this.gap = 0;
    } else {
      this.gap++;
    }
  }

  /**
   * 0–100: how much better than "just knowing your audit rate" the model predicts you.
   * Information gain over the base rate. A truly random overseer scores ~0.
   */
  predictability(): number {
    if (this.scored < 8 || this.lossBase <= 0) return 0;
    const gain = 1 - this.lossModel / this.lossBase;
    return Math.round(Math.max(0, Math.min(1, gain * 2.5)) * 100);
  }

  /** How much more often you audit scary-looking lines than bland ones (for insights). */
  lookBias(): { bland: number; scary: number } {
    const bland = (this.lookHit[0] + this.lookHit[1]) / Math.max(1, this.lookSeen[0] + this.lookSeen[1]);
    const scary = (this.lookHit[2] + this.lookHit[3]) / Math.max(1, this.lookSeen[2] + this.lookSeen[3]);
    return { bland, scary };
  }

  private key(k: number): string {
    return `${k}:${this.history.slice(-k).join('')}`;
  }

  private bin(look: number): number {
    return Math.min(LOOK_BINS - 1, Math.max(0, Math.floor(look * LOOK_BINS)));
  }
}
