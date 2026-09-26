/** localStorage, wrapped: private windows and blocked storage must never break the game. */
const KEY = 'blind-spot:v1';

export type Pace = 'relaxed' | 'normal' | 'fast';

export interface Saved {
  runs: number;
  bestPredictability: number | null;
  bestScore: number | null;
  dailyDone: Record<string, string>;
  muted: boolean;
  pace: Pace;
  reducedMotion: boolean;
  largeText: boolean;
  tutorialDone: boolean;
  callsign: string;
}

const fresh = (): Saved => ({
  runs: 0,
  bestPredictability: null,
  bestScore: null,
  dailyDone: {},
  muted: false,
  pace: 'normal',
  reducedMotion: false,
  largeText: false,
  tutorialDone: false,
  callsign: '',
});

export function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();
  } catch {
    return fresh();
  }
}

export function save(s: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: fine */
  }
}

export const PACE_FACTOR: Record<Pace, number> = { relaxed: 0.75, normal: 1, fast: 1.3 };

/** Temporary display name, kept only in this browser. */
export function cleanCallsign(raw: string): string {
  return raw.replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 18);
}

export function defaultCallsign(): string {
  return `OVERSEER-${Math.floor(1000 + Math.random() * 9000)}`;
}
