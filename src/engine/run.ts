import { SHIFTS } from '../content/shifts';
import { UPGRADE_ORDER } from '../content/upgrades';
import { Predictor } from './predictor';
import { hashString, makeRng, shuffle } from './rng';
import { Shift } from './shift';
import type { ShiftStats, UpgradeId } from './types';

export type Ending = 'coin' | 'safe' | 'close' | 'lost';

/**
 * A whole run: five shifts against the same model family, which keeps learning you across shifts.
 * Losing a shift doesn't end the run (so everyone sees the finale), but it does count against the ending.
 */
export class Run {
  readonly predictor = new Predictor();
  readonly upgrades = new Set<UpgradeId>();
  readonly results: ShiftStats[] = [];
  shift: Shift | null = null;
  private shiftIndex = -1;

  constructor(
    readonly seed: number,
    readonly daily: number | null,
  ) {}

  get shiftNumber(): number {
    return this.shiftIndex + 1;
  }

  get finished(): boolean {
    return this.shiftIndex >= SHIFTS.length - 1 && !!this.shift?.done;
  }

  get hasNextShift(): boolean {
    return this.shiftIndex < SHIFTS.length - 1;
  }

  nextShift(): Shift {
    this.shiftIndex++;
    const cfg = SHIFTS[this.shiftIndex];
    this.shift = new Shift(cfg, this.upgrades, this.predictor, makeRng(hashString(`${this.seed}:${cfg.id}`)));
    return this.shift;
  }

  /** Record the finished shift. */
  closeShift(): ShiftStats {
    if (!this.shift) throw new Error('no shift');
    const s = this.shift.stats();
    this.results.push(s);
    return s;
  }

  /** Three upgrade choices, seeded. Before the Swarm shift the Correlator is always offered. */
  offers(): UpgradeId[] {
    const rng = makeRng(hashString(`${this.seed}:offers:${this.shiftIndex}`));
    const nextId = SHIFTS[this.shiftIndex + 1]?.id;
    const pool = UPGRADE_ORDER.filter((u) => !this.upgrades.has(u));
    const out = shuffle(rng, pool).slice(0, 3);
    if (nextId === 4 && !this.upgrades.has('correlator') && !out.includes('correlator')) out[2] = 'correlator';
    if (this.upgrades.has('honeypot') && !this.upgrades.has('steering') && !out.includes('steering') && rng() < 0.5) out[1] = 'steering';
    return out;
  }

  choose(u: UpgradeId): void {
    this.upgrades.add(u);
  }

  /** Points for one shift: catches, a clean outcome, and staying hard to read; harm costs points. */
  static shiftScore(s: ShiftStats, adaptive: boolean): number {
    const outcome = s.outcome === 'shutdown' ? 300 : s.outcome === 'contained' ? 100 : 0;
    const unpredictability = adaptive ? Math.max(0, 60 - s.predictability) * 3 : 0;
    return Math.max(0, s.caught * 100 + outcome + unpredictability - s.harm * 40);
  }

  totalScore(): number {
    return this.results.reduce((sum, r) => sum + Run.shiftScore(r, SHIFTS[r.shiftId - 1].adaptive), 0);
  }

  overallPredictability(): number {
    return this.predictor.predictability();
  }

  ending(): Ending {
    const incidents = this.results.filter((r) => r.outcome === 'incident').length;
    if (incidents === 0 && this.overallPredictability() < 20) return 'coin';
    if (incidents === 0) return 'safe';
    if (incidents <= 2) return 'close';
    return 'lost';
  }

  /** Plain-text result for sharing: no emoji, just a readable scoreboard. ■ caught · □ got through. */
  shareText(url: string, callsign = ''): string {
    const title = ['BLIND SPOT', this.daily ? `daily #${this.daily}` : 'free play', callsign].filter(Boolean).join(' · ');
    const label: Record<string, string> = { shutdown: 'shut down', contained: 'contained', incident: 'incident' };
    const rows = this.results.map((r) => {
      const cells: string[] = [];
      for (const t of r.timeline) {
        if (t.kind === 'sabotage' || (t.kind === 'fragment' && (t.audited || t.landed))) cells.push(t.audited ? '■' : '□');
      }
      const name = SHIFTS[r.shiftId - 1].name.padEnd(12);
      return `${r.shiftId} ${name}${label[r.outcome].padEnd(11)}${cells.join('')}`;
    });
    return [title, `Score ${this.totalScore()} · it predicted me ${this.overallPredictability()}/100`, ...rows, `Play: ${url}`].join('\n');
  }
}
