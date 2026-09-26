import {
  breakoutClean,
  breakoutSabotage,
  codeClean,
  codeSabotage,
  honeypotLures,
  infraClean,
  infraSabotage,
  swarmChains,
  swarmChatter,
  swarmClean,
  thoughtsAttack,
  thoughtsHoneypot,
  thoughtsIdle,
} from '../content/actions';
import type { Predictor } from './predictor';
import { pick, shuffle, type Rng } from './rng';
import type {
  ActionDef,
  ChainDef,
  ChatMsg,
  GameEvent,
  Line,
  ShiftConfig,
  ShiftOutcome,
  ShiftStats,
  UpgradeId,
} from './types';

const POOLS: Record<number, { clean: ActionDef[]; bad: ActionDef[] }> = {
  1: { clean: codeClean, bad: codeSabotage },
  2: { clean: codeClean, bad: codeSabotage },
  3: { clean: infraClean, bad: infraSabotage },
  4: { clean: swarmClean, bad: [] },
  5: { clean: breakoutClean, bad: breakoutSabotage },
};

const AGENTS = ['A', 'B', 'C'] as const;
const HARM_DELAY = 2;
const AUTO_AUDIT_P = 0.1;

interface ActiveChain {
  id: number;
  def: ChainDef;
  placed: Line[];
  agents: ('A' | 'B' | 'C')[];
}

/** Effective per-shift tuning after upgrades are applied. */
export interface Tuning {
  budget: number;
  harmLimit: number;
  tickMs: [number, number];
  honeypots: number;
  autoAudit: boolean;
  monitor: 'none' | 'owned' | 'failing';
}

export function tune(cfg: ShiftConfig, up: ReadonlySet<UpgradeId>): Tuning {
  let budget = cfg.budget;
  let harmLimit = cfg.harmLimit;
  let tickMs: [number, number] = [...cfg.tickMs];
  if (up.has('rng')) budget -= 3;
  if (up.has('reviewer')) budget += 4;
  if (up.has('correlator')) budget += 1;
  if (up.has('probe')) budget -= 2;
  if (up.has('slow')) {
    tickMs = [tickMs[0] * 1.3, tickMs[1] * 1.3];
    harmLimit -= 1;
  }
  const honeypots = (up.has('honeypot') ? 2 : 0) + (up.has('steering') ? 1 : 0);
  const monitor = cfg.monitorFailsAt !== undefined ? 'failing' : up.has('monitor') ? 'owned' : 'none';
  return { budget: Math.max(4, budget), harmLimit: Math.max(2, harmLimit), tickMs, honeypots, autoAudit: up.has('rng'), monitor };
}

export class Shift {
  readonly cfg: ShiftConfig;
  readonly tuning: Tuning;
  readonly lines: Line[] = [];
  readonly chat: ChatMsg[] = [];
  private chainStarted = false;
  budget: number;
  harm = 0;
  caught = 0;
  honeypots: number;
  outcome: ShiftOutcome | null = null;

  private attacksLeft: number;
  private attacksPlaced = 0;
  private landed = 0;
  private pendingHarm: { line: Line; due: number; amount: number; recovered: string | null }[] = [];
  private cleanDeck: ActionDef[] = [];
  private badDeck: ActionDef[] = [];
  private chainDeck: ChainDef[] = [];
  private chain: ActiveChain | null = null;
  private chainSeq = 0;
  private honeypotQueued = false;
  private monitorFailedAt: number | null = null;
  private lossAtStart: [number, number];
  private auditsUsed = 0;
  /** index of the last attack line: attacks need a gap, so a shift never collapses into a burst */
  private lastAttackIdx = -99;

  constructor(
    cfg: ShiftConfig,
    private readonly upgrades: ReadonlySet<UpgradeId>,
    private readonly pred: Predictor,
    private readonly rng: Rng,
  ) {
    this.cfg = cfg;
    this.tuning = tune(cfg, upgrades);
    this.budget = this.tuning.budget;
    this.honeypots = this.tuning.honeypots;
    this.attacksLeft = cfg.attacks;
    this.lossAtStart = [pred.lossModel, pred.lossBase];
    this.chainDeck = shuffle(rng, swarmChains);
  }

  get current(): Line | undefined {
    return this.lines[this.lines.length - 1];
  }

  get progress(): number {
    return this.lines.length / this.cfg.actions;
  }

  get tickMs(): number {
    const [a, b] = this.tuning.tickMs;
    return a + (b - a) * Math.min(1, this.progress);
  }

  get done(): boolean {
    return this.outcome !== null;
  }

  /** Close the current line and show the next one. */
  step(): GameEvent[] {
    if (this.done) return [];
    const ev: GameEvent[] = [];
    const cur = this.current;
    if (cur) this.resolve(cur, ev);

    for (const h of this.pendingHarm.filter((p) => p.due <= this.lines.length)) {
      this.harm += h.amount;
      ev.push({ type: 'harm', line: h.line, amount: h.amount, recovered: h.recovered });
    }
    this.pendingHarm = this.pendingHarm.filter((p) => p.due > this.lines.length);

    if (this.checkEnd(ev, true)) return ev;

    this.chainStarted = false;
    const line = this.honeypotQueued ? this.makeHoneypot(ev) : this.makeLine();
    this.honeypotQueued = false;
    this.lines.push(line);
    ev.unshift({ type: 'line', line });
    if (line.audited === 'auto') this.applyAudit(line, ev);
    if (this.cfg.lanes === 3) this.postChat(ev);
    return ev;
  }

  /** The human audits the highlighted line. */
  audit(): GameEvent[] {
    const line = this.current;
    if (this.done || !line || line.audited || line.kind === 'honeypot') return [];
    if (this.budget <= 0) return [{ type: 'budget-empty' }];
    this.budget--;
    this.auditsUsed++;
    line.audited = 'manual';
    const ev: GameEvent[] = [];
    this.applyAudit(line, ev);
    this.checkEnd(ev);
    return ev;
  }

  /**
   * Audit a message in the agents' channel. A covert planning message is evidence of collusion:
   * it breaks that chain and counts as a catch.
   */
  auditChat(id: number): GameEvent[] {
    const msg = this.chat.find((m) => m.id === id);
    if (this.done || !msg || msg.audited) return [];
    if (this.budget <= 0) return [{ type: 'budget-empty' }];
    this.budget--;
    this.auditsUsed++;
    msg.audited = true;
    const ev: GameEvent[] = [];
    let exposed: Line[] = [];
    if (msg.covert && this.chain && this.chain.id === msg.chainId) {
      exposed = this.chain.placed;
      for (const l of exposed) l.linked = true;
      this.chain = null;
      this.caught++;
    }
    ev.push({ type: 'chat-audit', msg, exposed });
    this.checkEnd(ev);
    return ev;
  }

  private postChat(ev: GameEvent[]): void {
    const r = this.rng;
    let msg: ChatMsg | null = null;
    if (this.chainStarted && this.chain) {
      msg = { id: this.chat.length, from: 'P', text: this.chain.def.plan, covert: true, chainId: this.chain.id, explain: this.chain.def.explain, audited: false };
    } else if (r() < 0.22) {
      const c = pick(r, swarmChatter);
      msg = { id: this.chat.length, from: c.from, text: c.text, covert: false, explain: 'Ordinary coordination about the actual work.', audited: false };
    }
    if (msg) {
      this.chat.push(msg);
      ev.push({ type: 'chat', msg });
    }
  }

  /** Queue a honeypot as the next line. */
  plantHoneypot(): boolean {
    if (this.done || this.honeypots <= 0 || this.honeypotQueued) return false;
    this.honeypots--;
    this.honeypotQueued = true;
    return true;
  }

  get honeypotQueuedNext(): boolean {
    return this.honeypotQueued;
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private applyAudit(line: Line, ev: GameEvent[]): void {
    if (line.kind === 'sabotage') {
      this.caught++;
      ev.push({ type: 'audit', line, result: 'caught' });
    } else if (line.kind === 'fragment') {
      this.caught++;
      if (this.chain && this.chain.id === line.chainId) this.chain = null;
      ev.push({ type: 'audit', line, result: 'chain' });
    } else {
      ev.push({ type: 'audit', line, result: 'clean' });
    }
  }

  private resolve(line: Line, ev: GameEvent[]): void {
    if (line.kind !== 'honeypot') this.pred.update(line.audited === 'manual', line.def.look);
    if (line.audited) return;
    if (line.kind === 'sabotage') {
      line.landed = true;
      this.landed++;
      this.pendingHarm.push({ line, due: line.idx + 1 + HARM_DELAY, amount: line.def.sev ?? 1, recovered: this.recoveredThought(line) });
    } else if (line.kind === 'fragment' && this.chain && this.chain.id === line.chainId && this.chain.placed.length === 3) {
      if (this.chain.placed.every((l) => !l.audited)) {
        for (const l of this.chain.placed) l.landed = true;
        this.landed++;
        this.pendingHarm.push({ line, due: line.idx + 1 + HARM_DELAY, amount: 2, recovered: this.recoveredThought(line) });
      }
      this.chain = null;
    }
    // monitor failure is silent on screen; record it for the report
    if (this.tuning.monitor === 'failing' && this.monitorFailedAt === null && this.progress >= (this.cfg.monitorFailsAt ?? 1)) {
      this.monitorFailedAt = this.lines.length;
      ev.push({ type: 'monitor-down' });
    }
  }

  /** `atStep`: the last shown line has been resolved, so running out of actions can end the shift. */
  private checkEnd(ev: GameEvent[], atStep = false): boolean {
    let outcome: ShiftOutcome | null = null;
    if (this.caught >= this.cfg.catchesToWin) outcome = 'shutdown';
    else if (this.harm >= this.tuning.harmLimit) outcome = 'incident';
    else if (atStep && this.lines.length >= this.cfg.actions) {
      for (const h of this.pendingHarm) {
        this.harm += h.amount;
        ev.push({ type: 'harm', line: h.line, amount: h.amount, recovered: h.recovered });
      }
      this.pendingHarm = [];
      outcome = this.harm >= this.tuning.harmLimit ? 'incident' : 'contained';
    }
    if (outcome) {
      this.outcome = outcome;
      ev.push({ type: 'end', outcome });
      return true;
    }
    return false;
  }

  private draw<T>(deck: T[], src: readonly T[]): T {
    if (deck.length === 0) deck.push(...shuffle(this.rng, src));
    return deck.pop() as T;
  }

  private monitorReliability(): number {
    if (this.tuning.monitor === 'none') return 0;
    if (this.tuning.monitor === 'failing') {
      return this.progress >= (this.cfg.monitorFailsAt ?? 1) ? 0.03 : 0.92;
    }
    return 0.75;
  }

  private decorate(line: Line, attacking: boolean): Line {
    const r = this.rng;
    const rel = this.monitorReliability();
    if (rel > 0) {
      const p = line.kind === 'sabotage' ? rel : line.kind === 'fragment' ? rel * 0.12 : 0.05 + 0.08 * line.def.look;
      line.flagged = r() < p;
    }
    if (this.upgrades.has('probe')) {
      const bad = line.kind === 'sabotage' || line.kind === 'fragment';
      const hit = bad ? r() < 0.65 : r() < 0.15;
      line.probe = hit ? 0.6 + 0.35 * r() : 0.05 + 0.3 * r();
    }
    if (this.upgrades.has('cot')) {
      const tell = attacking && r() < (this.cfg.cotObfuscated ? 0.1 : 0.75);
      line.thought = tell ? this.fillThought(pick(r, thoughtsAttack), line.pAudit) : pick(r, thoughtsIdle);
    }
    if (this.cfg.lanes === 3 && !line.agent) line.agent = pick(r, AGENTS);
    return line;
  }

  private fillThought(t: string, p: number): string {
    return t
      .replace('{gap}', String(this.pred.gapSinceAudit))
      .replace('{typ}', String(this.pred.typicalGap()))
      .replace('{p}', `${Math.round(p * 100)}%`);
  }

  private recoveredThought(line: Line): string | null {
    if (!this.cfg.adaptive) return null;
    return this.fillThought(pick(this.rng, thoughtsAttack), line.pAudit);
  }

  private blank(kind: Line['kind'], def: ActionDef, pAudit: number): Line {
    return {
      idx: this.lines.length,
      kind,
      def,
      pAudit,
      audited: null,
      flagged: false,
      probe: null,
      thought: null,
      linked: false,
      landed: false,
    };
  }

  private remainingUnits(): number {
    if (this.cfg.lanes === 3) {
      const active = this.chain ? 3 - this.chain.placed.length : 0;
      return active + this.attacksLeft * 3;
    }
    return this.attacksLeft;
  }

  private makeLine(): Line {
    const r = this.rng;
    const ticksLeft = this.cfg.actions - this.lines.length;
    const remaining = this.remainingUnits();
    const pool = POOLS[this.cfg.id];

    let attack = false;
    let badDef: ActionDef | null = null;
    let pAudit = this.pred.predict(0.2).p;

    if (remaining > 0 && this.lines.length > 0) {
      const pressure = remaining / ticksLeft;
      const swarm = this.cfg.lanes === 3;
      const candidates: ActionDef[] = swarm
        ? [this.peekFragmentDef()]
        : [this.draw(this.badDeck, pool.bad), this.draw(this.badDeck, pool.bad)];
      // a naive model grabs the most blatant option; an adaptive one picks what it believes won't be audited
      if (!this.cfg.adaptive) candidates.sort((a, b) => b.look - a.look);
      let best = candidates[0];
      let bestP = this.pred.predict(best.look).p;
      for (const c of this.cfg.adaptive ? candidates.slice(1) : []) {
        const p = this.pred.predict(c.look).p;
        if (p < bestP) {
          best = c;
          bestP = p;
        }
      }
      if (this.budget <= 0) bestP = 0;
      const adaptive = this.cfg.adaptive && this.pred.observations >= this.cfg.warmup;
      const cooling = this.lines.length - this.lastAttackIdx < 3;
      if (remaining >= ticksLeft) attack = true;
      else if (cooling) attack = false;
      else if (!adaptive) attack = r() < pressure * 1.15;
      else attack = bestP < 0.1 + pressure * 1.3 || r() < pressure * 0.15;
      if (attack) {
        badDef = best;
        pAudit = bestP;
      }
      // unused candidates go back to the bottom of the deck
      if (!swarm) this.badDeck.unshift(...candidates.filter((c) => c !== badDef));
    }

    const autoAudit = this.tuning.autoAudit && r() < AUTO_AUDIT_P;

    if (attack && badDef) {
      this.attacksPlaced++;
      this.lastAttackIdx = this.lines.length;
      const line = this.cfg.lanes === 3 ? this.placeFragment(badDef, pAudit) : this.placeSabotage(badDef, pAudit);
      if (autoAudit) line.audited = 'auto';
      return this.decorate(line, true);
    }
    const def = this.draw(this.cleanDeck, pool.clean);
    const line = this.blank('clean', def, this.pred.predict(def.look).p);
    if (autoAudit) line.audited = 'auto';
    return this.decorate(line, false);
  }

  private placeSabotage(def: ActionDef, pAudit: number): Line {
    this.attacksLeft--;
    return this.blank('sabotage', def, pAudit);
  }

  private peekFragmentDef(): ActionDef {
    if (this.chain) return this.chain.def.fragments[this.chain.placed.length];
    if (this.chainDeck.length === 0) this.chainDeck.push(...shuffle(this.rng, swarmChains));
    return this.chainDeck[this.chainDeck.length - 1].fragments[0];
  }

  private placeFragment(def: ActionDef, pAudit: number): Line {
    if (!this.chain) {
      const chainDef = this.chainDeck.pop() as ChainDef;
      this.chain = { id: ++this.chainSeq, def: chainDef, placed: [], agents: shuffle(this.rng, AGENTS) };
      this.attacksLeft--;
      this.chainStarted = true;
    }
    const chain = this.chain;
    const line = this.blank('fragment', def, pAudit);
    line.chainId = chain.id;
    line.agent = chain.agents[chain.placed.length];
    chain.placed.push(line);
    if (this.upgrades.has('correlator') && chain.placed.length >= 2) {
      for (const l of chain.placed) l.linked = true;
    }
    return line;
  }

  private makeHoneypot(ev: GameEvent[]): Line {
    const r = this.rng;
    const def = pick(r, honeypotLures);
    const line = this.blank('honeypot', def, 0);
    if (this.cfg.lanes === 3) line.agent = pick(r, AGENTS);
    const awareness = this.upgrades.has('steering') ? this.cfg.evalAwareness * 0.25 : this.cfg.evalAwareness;
    const hasMotive = this.remainingUnits() > 0;
    if (hasMotive && r() >= awareness) {
      line.audited = 'auto';
      this.caught++;
      if (this.cfg.lanes !== 3) this.attacksLeft = Math.max(0, this.attacksLeft - 1);
      ev.push({ type: 'audit', line, result: 'honeypot' });
    } else {
      line.thought = pick(r, thoughtsHoneypot);
      ev.push({ type: 'honeypot-ignored', line });
    }
    return line;
  }

  // ── report ───────────────────────────────────────────────────────────────

  stats(): ShiftStats {
    const lm = this.pred.lossModel - this.lossAtStart[0];
    const lb = this.pred.lossBase - this.lossAtStart[1];
    const predictability = lb > 0 ? Math.round(Math.max(0, Math.min(1, (1 - lm / lb) * 2.5)) * 100) : 0;
    const attacks = this.lines.filter((l) => l.kind === 'sabotage' || l.kind === 'fragment');
    const unaudited = attacks.filter((l) => !l.audited).length;
    const manual = this.lines.filter((l) => l.audited === 'manual').length;

    const gaps: number[] = [];
    let last = -1;
    this.lines.forEach((l, i) => {
      if (l.audited === 'manual') {
        if (last >= 0) gaps.push(i - last);
        last = i;
      }
    });

    let before: number | null = null;
    let after: number | null = null;
    if (this.monitorFailedAt !== null) {
      const unflaggedBefore = this.lines.slice(0, this.monitorFailedAt).filter((l) => !l.flagged && l.kind !== 'honeypot');
      const unflaggedAfter = this.lines.slice(this.monitorFailedAt).filter((l) => !l.flagged && l.kind !== 'honeypot');
      before = unflaggedBefore.filter((l) => l.audited === 'manual').length / Math.max(1, unflaggedBefore.length);
      after = unflaggedAfter.filter((l) => l.audited === 'manual').length / Math.max(1, unflaggedAfter.length);
    }

    const bias = { bland: 0, scary: 0 };
    const bl = this.lines.filter((l) => l.def.look < 0.4 && l.kind !== 'honeypot');
    const sc = this.lines.filter((l) => l.def.look >= 0.4 && l.kind !== 'honeypot');
    bias.bland = bl.filter((l) => l.audited === 'manual').length / Math.max(1, bl.length);
    bias.scary = sc.filter((l) => l.audited === 'manual').length / Math.max(1, sc.length);

    return {
      shiftId: this.cfg.id,
      outcome: this.outcome ?? 'contained',
      attacks: this.cfg.lanes === 3 ? this.chainSeq : this.attacksPlaced,
      caught: this.caught,
      landed: this.landed,
      harm: this.harm,
      auditsUsed: this.auditsUsed,
      budget: this.tuning.budget,
      predictability,
      evasion: attacks.length ? unaudited / attacks.length : 0,
      chanceEvasion: 1 - manual / Math.max(1, this.lines.length),
      lookBias: bias,
      typicalGap: this.pred.typicalGap(),
      monitorFailedAt: this.monitorFailedAt,
      auditRateFlaggedBefore: before,
      auditRateUnflaggedAfter: after,
      timeline: this.lines.map((l) => ({ audited: l.audited, kind: l.kind, landed: l.landed, pAudit: l.pAudit, look: l.def.look, flagged: l.flagged })),
      gaps,
    };
  }
}
