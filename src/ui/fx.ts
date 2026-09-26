import { h } from './dom';

export const reducedMotion = (): boolean =>
  document.documentElement.dataset.motion === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Types text into an element. Resolves when done. Instant under reduced motion. */
export function typewriter(el: HTMLElement, text: string, totalMs = 220): Promise<void> {
  if (reducedMotion() || totalMs <= 0) {
    el.textContent = text;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const start = performance.now();
    el.textContent = '';
    const step = (now: number) => {
      const n = Math.min(text.length, Math.ceil(((now - start) / totalMs) * text.length));
      el.textContent = text.slice(0, n);
      if (n < text.length) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

/** Animates a number from 0 to `to`. */
export function countUp(el: HTMLElement, to: number, ms = 900, fmt: (n: number) => string = (n) => String(Math.round(n))): void {
  if (reducedMotion()) {
    el.textContent = fmt(to);
    return;
  }
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(to * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Small square particles bursting from an element. */
export function burst(from: HTMLElement, color: string, count = 16): void {
  if (reducedMotion()) return;
  const r = from.getBoundingClientRect();
  const layer = h('div.burst', { style: `left:${r.left + r.width * 0.75}px;top:${r.top + r.height / 2}px` });
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const d = 40 + Math.random() * 70;
    const p = h('i', {
      style: `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;background:${color};animation-delay:${Math.random() * 60}ms`,
    });
    layer.append(p);
  }
  document.body.append(layer);
  window.setTimeout(() => layer.remove(), 900);
}

/** Retriggers a one-shot CSS animation class. */
export function pulse(el: Element, cls: string): void {
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

/** Full-screen shift title card. */
export function titleCard(kicker: string, title: string, sub: string): Promise<void> {
  if (reducedMotion()) return Promise.resolve();
  return new Promise((resolve) => {
    const card = h('div.titlecard', { 'aria-hidden': 'true' }, h('div.tc-card', h('div.tc-kicker', kicker), h('div.tc-title', title), h('div.tc-sub', sub)));
    document.body.append(card);
    const done = () => {
      card.classList.add('out');
      window.setTimeout(() => {
        card.remove();
        resolve();
      }, 350);
    };
    const t = window.setTimeout(done, 1700);
    card.addEventListener('pointerdown', () => {
      clearTimeout(t);
      done();
    });
  });
}
