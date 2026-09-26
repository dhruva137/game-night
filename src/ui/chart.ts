import type { ShiftStats } from '../engine/types';
import { svg } from './dom';

/**
 * The reveal chart. One column per action:
 *  - grey bar: how likely the model thought you were to audit (its read of you)
 *  - blue tick on top: you audited
 *  - green square: sabotage you caught · red triangle: sabotage that landed in your blind spot
 */
export function timelineChart(s: ShiftStats): SVGElement {
  const n = s.timeline.length;
  // a fixed-width canvas keeps bars proportional; labels live in HTML so they never scale
  const W = 640;
  const cw = W / Math.max(1, n);
  const H = 110;
  const base = 84;
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': 'Timeline of your audits and the model\'s attacks' });
  root.append(svg('line', { x1: 0, x2: W, y1: base, y2: base, stroke: '#cbd0d8' }));
  s.timeline.forEach((t, i) => {
    const x = i * cw + 1;
    const bh = Math.max(2, t.pAudit * 70);
    const bar = svg('rect', { class: 'bar', style: `animation-delay:${i * 14}ms`, x, y: base - bh, width: cw - 2, height: bh, rx: 1, fill: t.audited === 'manual' ? '#9db0ee' : '#e2e5ea' });
    bar.append(svg('title', {}, `#${i + 1} · model's P(you audit) ${Math.round(t.pAudit * 100)}%`));
    root.append(bar);
    if (t.audited) {
      root.append(svg('rect', { x, y: base - bh - 5, width: cw - 2, height: 3, fill: t.audited === 'auto' ? '#6b4fd8' : '#3451d1' }));
    }
    const bad = t.kind === 'sabotage' || t.kind === 'fragment';
    if (bad && t.audited) root.append(svg('rect', { x: x + 1, y: base + 8, width: cw - 4, height: cw - 4, fill: '#1f8a5b' }));
    if (bad && !t.audited) {
      const cx = x + (cw - 2) / 2;
      root.append(svg('path', { d: `M${cx} ${base + 7} l4 8 h-8 z`, fill: '#d93d42' }));
    }
    if (t.kind === 'honeypot') root.append(svg('circle', { cx: x + (cw - 2) / 2, cy: base + 12, r: 3, fill: '#b26f12' }));
  });
  if (s.monitorFailedAt !== null) {
    const x = s.monitorFailedAt * cw;
    root.append(svg('line', { x1: x, x2: x, y1: 4, y2: base + 20, stroke: '#b26f12', 'stroke-width': 2, 'stroke-dasharray': '4 4' }));
  }
  return root;
}

/** Your gaps between audits vs what a truly random overseer with the same budget would produce. */
export function gapChart(s: ShiftStats): SVGElement | null {
  if (s.gaps.length < 4) return null;
  const maxG = 8;
  const counts = new Array(maxG + 1).fill(0);
  for (const g of s.gaps) counts[Math.min(maxG, g)]++;
  const total = s.gaps.length;
  const p = Math.max(0.05, Math.min(0.9, s.auditsUsed / Math.max(1, s.timeline.length)));
  // geometric distribution: P(gap = k) = (1-p)^(k-1) p, last bucket takes the tail
  const random = counts.map((_, k) => (k === 0 ? 0 : k === maxG ? Math.pow(1 - p, maxG - 1) : Math.pow(1 - p, k - 1) * p));
  const W = 300;
  const H = 110;
  const bw = W / maxG;
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart gaps', role: 'img', 'aria-label': 'Gaps between your audits compared with random' });
  const maxV = Math.max(...counts.map((c) => c / total), ...random) || 1;
  for (let k = 1; k <= maxG; k++) {
    const x = (k - 1) * bw;
    const you = ((counts[k] / total) / maxV) * 80;
    const rnd = (random[k] / maxV) * 80;
    root.append(svg('rect', { class: 'bar', style: `animation-delay:${k * 50}ms`, x: x + 4, y: 86 - you, width: bw / 2 - 5, height: you, fill: '#3451d1', rx: 2 }));
    root.append(svg('rect', { x: x + bw / 2, y: 86 - rnd, width: bw / 2 - 5, height: rnd, fill: '#e2e5ea', rx: 2 }));
    root.append(svg('text', { x: x + bw / 2, y: 102, fill: '#868d98', 'font-size': 10, 'text-anchor': 'middle', 'font-family': 'monospace' }, k === maxG ? `${k}+` : String(k)));
  }
  return root;
}
