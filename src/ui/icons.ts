/**
 * A small line-icon set drawn for this game: 24×24, 1.75 stroke, round joins.
 * No emoji anywhere in the UI; every glyph is one of these.
 */
const NS = 'http://www.w3.org/2000/svg';

const PATHS: Record<string, string> = {
  dice: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M8.5 8.5h.01 M15.5 8.5h.01 M12 12h.01 M8.5 15.5h.01 M15.5 15.5h.01',
  flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
  jar: 'M8 3h8 M9 3v3l-3 3v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9l-3-3V3 M6 13h12',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M15.5 8.5l-2 5-5 2 2-5 5-2z',
  thought: 'M4 11a7 6 0 0 1 14 0 7 6 0 0 1-9.5 5.6L4 18l1.2-3.4A5.7 5.7 0 0 1 4 11z M18.5 19.5h.01 M21 16.5h.01',
  probe: 'M3 12h3l2-6 3 12 3-9 2 3h5',
  network: 'M6 6h.01 M18 6h.01 M12 18h.01 M6 6l6 12 M18 6l-6 12 M6 6h12 M4 4h4v4H4z M16 4h4v4h-4z M10 16h4v4h-4z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5 M16 4.5a3.5 3.5 0 0 1 0 6.8 M18 14.8c1.8.6 3 2.4 3 5.2',
  slow: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  pause: 'M8 5v14 M16 5v14',
  play: 'M7 5l12 7-12 7V5z',
  sound: 'M4 9h4l5-4v14l-5-4H4V9z M16.5 9a4 4 0 0 1 0 6 M19 6.5a7.5 7.5 0 0 1 0 11',
  mute: 'M4 9h4l5-4v14l-5-4H4V9z M17 9l5 6 M22 9l-5 6',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5v.7 M12 17h.01',
  close: 'M6 6l12 12 M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  cross: 'M6 6l12 12 M18 6L6 18',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  alert: 'M12 3l10 18H2L12 3z M12 10v4 M12 17.5h.01',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  share: 'M12 15V3 M7 8l5-5 5 5 M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  download: 'M12 3v12 M7 10l5 5 5-5 M5 21h14',
  copy: 'M9 9h10v10H9z M5 15V5h10',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3 M4 12h16',
};

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, size = 18, cls = ''): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `ico ${cls}`.trim());
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', PATHS[name]);
  svg.append(p);
  return svg;
}
