/** localStorage, wrapped: private windows and blocked storage must never break the game. */
const KEY = 'blind-spot:v1';

export interface Saved {
  runs: number;
  bestPredictability: number | null;
  dailyDone: Record<string, string>;
  muted: boolean;
}

const fresh = (): Saved => ({ runs: 0, bestPredictability: null, dailyDone: {}, muted: false });

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
