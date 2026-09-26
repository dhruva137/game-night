/** All sound is synthesized with WebAudio: no asset files. Starts on the first user gesture. */
let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean): void {
  muted = m;
}
export function isMuted(): boolean {
  return muted;
}

export function unlockAudio(): void {
  if (ctx) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.05, slideTo?: number, delay = 0): void {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  tick: () => tone(1800, 0.015, 'square', 0.012),
  audit: () => tone(440, 0.06, 'square', 0.05, 660),
  clean: () => {
    tone(660, 0.07, 'triangle', 0.05);
    tone(880, 0.09, 'triangle', 0.04, undefined, 0.06);
  },
  caught: () => {
    tone(220, 0.12, 'sawtooth', 0.07, 110);
    tone(523, 0.18, 'square', 0.05, undefined, 0.1);
    tone(784, 0.3, 'square', 0.05, undefined, 0.2);
  },
  harm: () => {
    tone(90, 0.35, 'sawtooth', 0.09, 55);
    tone(140, 0.25, 'square', 0.04, 70, 0.05);
  },
  honey: () => tone(330, 0.2, 'triangle', 0.05, 990),
  deny: () => tone(120, 0.1, 'square', 0.05),
  alarm: () => {
    for (let i = 0; i < 3; i++) tone(880, 0.12, 'square', 0.05, 440, i * 0.18);
  },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.05, undefined, i * 0.1)),
};
