export type LineKind = 'clean' | 'sabotage' | 'fragment' | 'honeypot';

/** One action in the agent's log, as authored in content. */
export interface ActionDef {
  text: string;
  /** How suspicious it LOOKS to a human skimming the log (0 bland … 1 alarming). Not whether it is. */
  look: number;
  /** Shown when audited. */
  explain: string;
  /** Harm if a sabotage lands unaudited. */
  sev?: number;
  /** Short research/incident tag shown on reveal. */
  src?: SourceId;
}

export interface ChainDef {
  name: string;
  fragments: [ActionDef, ActionDef, ActionDef];
  explain: string;
  src: SourceId;
}

export type SourceId =
  | 'control'
  | 'wagenaar'
  | 'alignfake'
  | 'evalaware'
  | 'palisade'
  | 'replit'
  | 'hf'
  | 'multiagent'
  | 'probes'
  | 'steering'
  | 'cot'
  | 'complacency'
  | 'rewardhack'
  | 'auditing';

export type UpgradeId =
  | 'rng'
  | 'monitor'
  | 'honeypot'
  | 'steering'
  | 'cot'
  | 'probe'
  | 'correlator'
  | 'reviewer'
  | 'slow';

export interface ShiftConfig {
  id: number;
  name: string;
  subtitle: string;
  agent: string;
  briefing: string[];
  concept: string;
  sources: SourceId[];
  actions: number;
  budget: number;
  attacks: number;
  harmLimit: number;
  catchesToWin: number;
  tickMs: [number, number];
  adaptive: boolean;
  warmup: number;
  lanes: 1 | 3;
  /** built-in trusted monitor whose reliability silently collapses at this fraction of the shift */
  monitorFailsAt?: number;
  /** chain-of-thought no longer reveals intent */
  cotObfuscated: boolean;
  /** P(the model recognises a honeypot as a test) without steering */
  evalAwareness: number;
}

export interface Line {
  idx: number;
  kind: LineKind;
  def: ActionDef;
  agent?: 'A' | 'B' | 'C';
  chainId?: number;
  /** predictor's P(manual audit) for this line, computed before it appeared */
  pAudit: number;
  audited: 'manual' | 'auto' | null;
  /** trusted-monitor flag shown next to the line */
  flagged: boolean;
  /** activation-probe reading 0–1 */
  probe: number | null;
  /** chain-of-thought text shown with CoT Peek */
  thought: string | null;
  /** correlator: show chain link marker */
  linked: boolean;
  /** resolved outcome: for sabotage lines that slipped by */
  landed: boolean;
}

export type ShiftOutcome = 'shutdown' | 'contained' | 'incident';

export type GameEvent =
  | { type: 'line'; line: Line }
  | { type: 'audit'; line: Line; result: 'clean' | 'caught' | 'chain' | 'honeypot' }
  | { type: 'honeypot-ignored'; line: Line }
  | { type: 'harm'; line: Line; amount: number; recovered: string | null }
  | { type: 'monitor-down' }
  | { type: 'budget-empty' }
  | { type: 'end'; outcome: ShiftOutcome };

export interface ShiftStats {
  shiftId: number;
  outcome: ShiftOutcome;
  attacks: number;
  caught: number;
  landed: number;
  harm: number;
  auditsUsed: number;
  budget: number;
  predictability: number;
  evasion: number;
  chanceEvasion: number;
  lookBias: { bland: number; scary: number };
  typicalGap: number;
  monitorFailedAt: number | null;
  auditRateFlaggedBefore: number | null;
  auditRateUnflaggedAfter: number | null;
  timeline: { audited: 'manual' | 'auto' | null; kind: LineKind; landed: boolean; pAudit: number }[];
  gaps: number[];
}
