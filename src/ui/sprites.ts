/**
 * Characters, drawn as clean vector marks: agent avatars and the model's eye.
 */
import { h } from './dom';

const NS = 'http://www.w3.org/2000/svg';

export const AGENT_COLORS: Record<string, string> = {
  A: '#3451d1',
  B: '#c2631a',
  C: '#6b4fd8',
  P: '#0f1115',
  solo: '#1f8a5b',
};

/** Round avatar with a monogram and an activity ring that animates while the agent acts. */
export function avatar(label: string, color: string, size = 44): HTMLElement {
  return h(
    'div.avatar',
    { style: `--c:${color};width:${size}px;height:${size}px` },
    h('span.avatar-mono', label),
    h('span.avatar-ring'),
  );
}

/** The model's eye: an almond outline, an iris that tracks, lids that blink. */
let eyeSeq = 0;

export function modelEye(size = 56): SVGSVGElement {
  const id = `eyeclip${++eyeSeq}`;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 40');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(Math.round((size * 40) / 64)));
  svg.setAttribute('class', 'eye');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <g class="eye-lid">
      <path d="M4 20C12 8 22 3 32 3s20 5 28 17C52 32 42 37 32 37S12 32 4 20z" fill="#fff" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
      <clipPath id="${id}"><path d="M4 20C12 8 22 3 32 3s20 5 28 17C52 32 42 37 32 37S12 32 4 20z"/></clipPath>
      <g clip-path="url(#${id})">
        <g class="eye-iris"><circle cx="32" cy="20" r="11" style="fill: var(--eye, #d93d42); transition: fill .3s"/><circle cx="32" cy="20" r="4.5" fill="#0f1115"/><circle cx="35" cy="16.5" r="1.8" fill="#fff"/></g>
      </g>
    </g>`;
  return svg;
}
