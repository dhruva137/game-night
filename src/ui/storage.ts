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
