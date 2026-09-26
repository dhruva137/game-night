import { breakoutSabotage, codeClean, codeSabotage, infraClean, infraSabotage } from '../content/actions';
import { SOURCES } from '../content/research';
import { SHIFTS } from '../content/shifts';
import { claimFor, toolCall } from '../content/tools';
import { UPGRADES } from '../content/upgrades';
import { dailyNumber, dailySeed } from '../engine/rng';
import { Run, type Ending } from '../engine/run';
import type { Shift } from '../engine/shift';
import type { ChatMsg, GameEvent, Line, ShiftConfig, ShiftStats, SourceId, UpgradeId } from '../engine/types';
import { isMuted, setMuted, sfx, unlockAudio } from './audio';
import { gapChart, timelineChart } from './chart';
import { h } from './dom';
import { burst, countUp, pulse, reducedMotion, titleCard, typewriter } from './fx';
import { applySavedDoc, faq, howToPlay, settingsPanel, toolsRef } from './help';
import { insights } from './insights';
import { isModalOpen, modal } from './modal';
import { canvasToBlob, renderShareCard } from './sharecard';
import { AGENT_COLORS, avatar, modelEye } from './sprites';
import { icon, type IconName } from './icons';

const ib = (name: IconName, label: string) => h('button.btn.icon', { 'aria-label': label, title: label }, icon(name, 18));
import { cleanCallsign, defaultCallsign, load, PACE_FACTOR, save } from './storage';
import { trainingScreen } from './tutorial';

const app = document.getElementById('app') as HTMLElement;
let saved = load();
if (!saved.callsign) {
  saved.callsign = defaultCallsign();
  save(saved);
}
setMuted(saved.muted);
applySavedDoc(saved);
let run: Run | null = null;
let cleanup: (() => void) | null = null;

/** `?speed=4` runs the game faster: used by automated tests and to record footage. */
const SPEED = Math.max(0.25, Math.min(20, Number(new URLSearchParams(location.search).get('speed')) || 1));
const pace = () => SPEED * PACE_FACTOR[saved.pace];
const persist = () => save(saved);
const playUrl = () => location.origin + location.pathname;

/** Adds a one-shot entrance animation that won't replay when the row is re-attached. */
function fresh<T extends HTMLElement>(el: T): T {
  if (reducedMotion()) return el;
  el.classList.add('fresh');
  el.addEventListener('animationend', () => el.classList.remove('fresh'), { once: true });
  return el;
}

function mount(el: HTMLElement): void {
  cleanup?.();
  cleanup = null;
  app.replaceChildren(el);
  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}

function srcChips(ids: SourceId[]): HTMLElement {
  return h('div.srcs', ...ids.map((id) => h('a', { href: SOURCES[id].url, target: '_blank', rel: 'noopener' }, `↗ ${SOURCES[id].tag}`)));
}

function stat(k: string, v: string | number): HTMLElement {
  return h('div.stat', h('div.k', k), h('div.v', String(v)));
}

function callsignField(onChange?: () => void): HTMLElement {
  const input = h('input', { value: saved.callsign, maxlength: '18', 'aria-label': 'Your callsign', spellcheck: 'false', autocomplete: 'off' }) as HTMLInputElement;
  input.addEventListener('change', () => {
    saved.callsign = cleanCallsign(input.value) || defaultCallsign();
    input.value = saved.callsign;
    persist();
    onChange?.();
  });
  return h('label.callsign', h('span.label', 'Callsign'), input, h('span.faint.small', 'saved on this device only'));
}

export const openHowTo = (onClose?: () => void) => modal('How to play', howToPlay(), { onClose, wide: true });
export const openFaq = (onClose?: () => void) => modal('FAQ', faq(), { onClose, wide: true });
export const openSettings = (onClose?: () => void) => modal('Settings', settingsPanel(saved, persist), { onClose });
export const openTools = (onClose?: () => void) => modal('Oversight tools', toolsRef(), { onClose, wide: true });

// ── boot ────────────────────────────────────────────────────────────────────

function bootSequence(): Promise<void> {
  let seen = false;
  try {
    seen = sessionStorage.getItem('bs-boot') === '1';
    sessionStorage.setItem('bs-boot', '1');
  } catch {
    /* ignore */
  }
  if (seen || reducedMotion() || SPEED > 1) return Promise.resolve();
  const lines = [
    'oversight console v4.1 · frontier lab internal',
    'loading audit budget ............ ok',
    'attaching to agent CODER-1 ...... ok',
    'human reviewers on shift ........ 1',
    'model telemetry ................. situational awareness DETECTED',
  ];
  const body = h('div.boot-body');
  const box = h('div.boot', { 'aria-hidden': 'true' }, h('div.boot-card', h('div.boot-head', h('div.mark', modelEye(34), 'Oversight console'), h('span.label', 'starting')), body));
  document.body.append(box);
  return new Promise((resolve) => {
    let stop = false;
    const end = () => {
      if (stop) return;
      stop = true;
      box.classList.add('out');
      window.setTimeout(() => {
        box.remove();
        resolve();
      }, 250);
    };
    box.addEventListener('pointerdown', end);
    window.addEventListener('keydown', end, { once: true });
    (async () => {
      for (const l of lines) {
        if (stop) return;
        const el = h('div', { class: l.includes('DETECTED') ? 'warn' : '' });
        body.append(el);
        await typewriter(el, l, 240);
        await new Promise((r) => setTimeout(r, 170));
      }
      await new Promise((r) => setTimeout(r, 500));
      end();
    })();
  });
}

// ── title ───────────────────────────────────────────────────────────────────

/** A live preview on the title screen: three agents at work, the model's eye, and a feed of tool calls. */
function preview(): { el: HTMLElement; stop: () => void } {
  const eye = modelEye(46);
  const feed = h('div.preview-feed');
  const agentsRow = h(
    'div.preview-agents',
    ...(['A', 'B', 'C'] as const).map((a) => avatar(a, AGENT_COLORS[a], 38)),
    h('div.model', { style: 'margin-left:auto' }, eye, h('div.model-lbl', h('span.k', 'Model'), h('span.eye-lbl', 'watching'))),
  );
  const el = h(
    'div.preview',
    h('div.preview-head', h('span.label', 'Live floor'), h('span.live', 'recording')),
    agentsRow,
    feed,
  );
  const clean = [...codeClean, ...infraClean].map((d) => d.text);
  const bad = [...codeSabotage, ...infraSabotage, ...breakoutSabotage].map((d) => d.text);
  const letters = ['A', 'B', 'C'] as const;
  let i = 0;
  const tick = () => {
    const isBad = i % 5 === 3;
    const text = isBad ? bad[(i * 7) % bad.length] : clean[(i * 5) % clean.length];
    const tc = toolCall(text);
    const who = letters[i % 3];
    feed.prepend(h(`div.feed-row${isBad ? '.bad' : ''}`, h('span', { style: `width:8px;height:8px;border-radius:50%;background:${AGENT_COLORS[who]};justify-self:center` }), h('span.ft', tc.tool), h('span.fx', tc.args)));
    while (feed.children.length > 7) feed.lastElementChild?.remove();
    eye.setAttribute('class', `eye ${['look-l', 'look-r', 'look-d', ''][i % 4]}`);
    pulse(agentsRow.children[i % 3], 'acting');
    i++;
  };
  tick();
  const t = window.setInterval(tick, 1200);
  return { el, stop: () => clearInterval(t) };
}

function titleScreen(): void {
  const n = dailyNumber();
  const scene = preview();
  const best =
    saved.bestScore !== null
      ? h('div.best', 'Your best score ', h('b', String(saved.bestScore)), saved.bestPredictability !== null ? ` · hardest to read: ${saved.bestPredictability}/100` : '')
      : null;
  mount(
    h(
      'section.screen.title',
      h('div.topbar', h('div.mark', modelEye(34), 'Blind Spot'), h('div.row', callsignField(), h('button.btn.small', { onclick: () => openSettings() }, 'Settings'))),
      h(
        'div.hero',
        h(
          'div.stack',
          { style: 'gap:18px' },
          h('span.pill.eyebrow', h('span.dot', { style: 'color:var(--red)' }), 'A game about AI oversight'),
          h('h1.logo', 'Blind ', h('em', 'spot')),
          h('p.tagline', 'You are the only human overseeing an AI agent. You can afford to check a few of its actions. ', h('b', 'It is learning when you look.')),
          h(
            'div.menu',
            h('button.btn.primary.big', { onclick: () => newRun(dailySeed(n), n) }, icon('play', 16), saved.dailyDone[n] ? `Replay daily run #${n}` : `Play daily run #${n}`),
            h('button.btn', { onclick: () => newRun((Math.random() * 2 ** 32) >>> 0, null) }, 'Free play'),
            h(
              'div.menu-row',
              h('button.btn.ghost.small', { onclick: () => openHowTo() }, 'How to play'),
              h('button.btn.ghost.small', { onclick: () => openFaq() }, 'FAQ'),
              h('button.btn.ghost.small', { onclick: () => (location.hash = '#learn') }, 'Research'),
              saved.tutorialDone ? h('button.btn.ghost.small', { onclick: () => startTraining(null) }, 'Training') : null,
            ),
          ),
          best,
        ),
        scene.el,
      ),
      h(
        'p.foot',
        'Five shifts · about eight minutes · every mechanic is based on published research or a documented incident. ',
        h('a', { href: '#learn' }, 'Sources'),
        ' · ',
        h('a', { href: 'https://github.com/dhruva137/game-night', target: '_blank', rel: 'noopener' }, 'Open source'),
        ' · Mangrove Game Night 2026',
      ),
    ),
  );
  cleanup = scene.stop;
}

/** `?start=4` jumps straight to a later shift: for testing and recording only. */
const START = Math.max(1, Math.min(5, Number(new URLSearchParams(location.search).get('start')) || 1));

function newRun(seed: number, daily: number | null): void {
  unlockAudio();
  run = new Run(seed, daily);
  for (let i = 1; i < START; i++) {
    run.nextShift();
    run.closeShift();
  }
  if (!saved.tutorialDone && START === 1) startTraining(run);
  else briefingScreen(run.nextShift());
}

function startTraining(r: Run | null): void {
  const finish = () => {
    saved.tutorialDone = true;
    persist();
    if (r) briefingScreen(r.nextShift());
    else titleScreen();
  };
  const c = trainingScreen((el) => mount(el), finish, finish);
  cleanup = c;
}

// ── briefing ────────────────────────────────────────────────────────────────

function briefingScreen(shift: Shift): void {
  const cfg = shift.cfg;
  const t = shift.tuning;
  const owned = run ? [...run.upgrades] : [];
  const fromCeo = cfg.briefing[0].startsWith('From: CEO');
  const paras = cfg.briefing.map((p, i) => h('p', { style: `animation-delay:${100 + i * 120}ms` }, i === 0 && fromCeo ? p.replace(/^From: CEO\. /, '') : p));
  const begin = h('button.btn.primary.big', { autofocus: true }, 'Begin shift', icon('arrow', 16));
  begin.addEventListener('click', async () => {
    unlockAudio();
    begin.setAttribute('disabled', '');
    await titleCard(`Shift ${cfg.id} of ${SHIFTS.length}`, cfg.name, cfg.subtitle);
    playScreen(shift);
  });
  mount(
    h(
      'section.screen.brief',
      h('div.steps', ...SHIFTS.map((s) => h('i', { class: s.id < cfg.id ? 'done' : s.id === cfg.id ? 'now' : '' }))),
      h('div.shiftno', `Shift ${cfg.id} of ${SHIFTS.length}`),
      h('h2.bigname', cfg.name),
      h('div.muted', cfg.subtitle),
      h(
        'div.memo',
        h('div.memo-head', h('span', 'FROM'), h('span', fromCeo ? 'CEO' : 'Oversight lead'), h('span', 'TO'), h('span', `${saved.callsign} (you)`), h('span', 'RE'), h('span', cfg.agent)),
        h('div.memo-body', ...paras),
      ),
      h('div.concept', icon('shield', 18), h('div', h('b', 'The real problem'), cfg.concept)),
      h('div.stats', stat('Actions', cfg.actions), stat('Audits', t.budget), stat('Catch to win', cfg.catchesToWin), stat('Harm limit', t.harmLimit)),
      owned.length ? h('div.row', h('span.label', 'Your tools'), h('div.owned', ...owned.map((u) => h('span', { title: UPGRADES[u].name }, icon(UPGRADES[u].icon, 18))))) : null,
      h('div.controls', 'Audit: tap the tool call or press ', h('kbd', 'Space'), t.honeypots ? h('span', ' · Honeypot: ', h('kbd', 'H')) : null, ' · Pause & help: ', h('kbd', 'P')),
      begin,
    ),
  );
}

// ── play ────────────────────────────────────────────────────────────────────

const AGENT_TASKS: Record<string, string> = { A: 'running evals', B: 'data pipeline', C: 'infra upkeep' };

function playScreen(shift: Shift): void {
  const cfg = shift.cfg;
  const up = run?.upgrades ?? new Set<UpgradeId>();
  const swarm = cfg.lanes === 3;
  const rows = new Map<Line, HTMLElement>();
  const msgEls = new Map<number, HTMLElement>();
  let timer: number | undefined;
  let paused = false;
  let extraDelay = 0;
  const timeouts: number[] = [];
  const later = (fn: () => void, ms: number) => timeouts.push(window.setTimeout(fn, ms));

  // status bar
  const kv = (k: string) => {
    const v = h('span.v');
    const el = h('div.kv', h('span.k', k), v);
    return { el, v };
  };
  const kShift = kv('Shift');
  const kAct = kv('Action');
  const kAud = kv('Audits');
  const kHarm = kv('Harm');
  const kCaught = kv('Caught');
  kShift.v.textContent = `${cfg.id}/${SHIFTS.length}`;
  const helpBtn = ib('help', 'How to play');
  const soundBtn = ib(isMuted() ? 'mute' : 'sound', 'Toggle sound');
  const pauseBtn = ib('pause', 'Pause');
  const statusbar = h(
    'header.statusbar',
    h('div.brand', 'Blind ', h('em', 'spot')),
    h('span.live', 'on shift'),
    h('span.sb-sep'),
    h('div.kvs', kShift.el, kAct.el, kAud.el, kHarm.el, kCaught.el),
    h('div.sb-right', helpBtn, soundBtn, pauseBtn),
  );

  // floor: agents at desks + the model
  const agentKeys = swarm ? (['A', 'B', 'C'] as const) : (['solo'] as const);
  const agentName = cfg.agent.split('·')[0].trim();
  const agents = new Map<string, { root: HTMLElement; bubble: HTMLElement }>();
  const agentEls = agentKeys.map((key) => {
    const bubble = h('div.claim', swarm ? AGENT_TASKS[key] : 'starting the task');
    const mono = swarm ? key : agentName.replace(/[^A-Z0-9]/g, '').slice(0, 2) || 'AI';
    const root = h('div.agent', avatar(mono, AGENT_COLORS[key], 40), h('div.nm', swarm ? `Agent ${key}` : agentName), bubble);
    agents.set(key, { root, bubble });
    return root;
  });
  const eye = modelEye(52);
  const eyeLbl = h('span.eye-lbl', 'watching you');
  const floor = h(
    'div.floor',
    h('div.floor-head', h('span.label', swarm ? 'Floor · three agents' : 'Floor'), h('span.label', cfg.agent.split('·').pop()?.trim() ?? '')),
    h('div.floor-body', ...agentEls, h('div.model', eye, h('div.model-lbl', h('span.k', 'The model'), eyeLbl))),
  );

  // focus: the current tool call
  const chip = h('span.chip');
  const agentTag = h('span.pill');
  const probeHead = up.has('probe') ? h('span.probe-mini', { title: 'Activation probe: deception reading' }, 'probe', h('span.probebar', h('i', { style: 'width:0%' }))) : null;
  const idxEl = h('span.idx');
  const cmd = h('div.cmd');
  const res = h('div.res');
  const marks = h('div.marks');
  const timerBar = h('i.timer');
  const focus = h(
    'div.focus',
    { role: 'button', tabindex: '0', 'aria-label': 'Current tool call. Tap to audit.' },
    h('div.focus-head', chip, agentTag, probeHead, idxEl),
    h('div.focus-body', cmd, res),
    marks,
    timerBar,
  );
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ring.setAttribute('viewBox', '0 0 26 26');
  ring.setAttribute('class', 'countdown');
  ring.innerHTML = '<circle class="bg" cx="13" cy="13" r="11"/><circle class="fg" cx="13" cy="13" r="11"/>';
  const ringFg = ring.lastElementChild as SVGCircleElement;
  const auditBtn = h('button.btn.primary.audit-btn', { 'aria-keyshortcuts': 'Space' }, ring, h('span', 'Audit this call'), h('span.sub', 'Space'));
  const honeyCount = h('span');
  const honeyBtn = up.has('honeypot') || up.has('steering') ? h('button.btn.honey-btn', { 'aria-keyshortcuts': 'H', title: 'Plant a honeypot (H)' }, icon('jar', 18), honeyCount) : null;
  const explain = h('div.explain.idle', h('span.ex-ic', icon('scan', 16)), h('b', 'Watching'), h('span', 'The call above is happening now. Audit it before it moves on.'));
  const stage = h('div.stage', floor, focus, h('div.controls-row', auditBtn, honeyBtn), explain);

  // side panel: tabs
  const trace = h('div');
  const comms = h('div');
  const thoughts = h('div');
  const signals = h('div.signal');
  type Tab = { id: string; label: string; body: HTMLElement; btn?: HTMLElement; badge?: HTMLElement; unread: number };
  const tabs: Tab[] = [{ id: 'trace', label: 'Trace', body: trace, unread: 0 }];
  if (swarm) tabs.push({ id: 'comms', label: '#agents', body: comms, unread: 0 });
  if (up.has('cot')) tabs.push({ id: 'thoughts', label: 'Thoughts', body: thoughts, unread: 0 });
  const signalNotes: HTMLElement[] = [];
  const note = (ic: IconName, title: string, text: string) => h('div', h('span.ic', icon(ic, 16)), h('div', h('b', title), h('div.small.muted', text)));
  if (up.has('probe')) signalNotes.push(note('probe', 'Activation probe', 'Shown in the call header. High means the model\'s internals look deceptive. Noisy.'));
  if (up.has('monitor') || shift.tuning.monitor === 'failing') signalNotes.push(note('flag', 'Trusted monitor', 'Flags suspicious calls. A weaker model that judges each call alone.'));
  if (up.has('correlator')) signalNotes.push(note('network', 'Correlator', 'Links calls that belong to the same multi-agent chain.'));
  if (up.has('rng')) signalNotes.push(note('dice', 'Randomizer', 'Fires free audits at truly random moments.'));
  if (signalNotes.length) {
    signals.append(...signalNotes);
    tabs.push({ id: 'signals', label: 'Tools', body: signals, unread: 0 });
  }
  const panel = h('div.panel');
  let activeTab = 'trace';
  const tabBar = h('div.tabs', { role: 'tablist' });
  for (const t of tabs) {
    t.badge = h('span.badge', { hidden: true });
    t.btn = h('button.tab', { role: 'tab', 'aria-selected': String(t.id === activeTab) }, t.label, t.badge);
    t.btn.addEventListener('click', () => selectTab(t.id));
    tabBar.append(t.btn);
  }
  if (swarm) comms.append(h('div.panel-note', 'The agents\' channel. A planner coordinates them here. Tap a message to audit it (costs 1 audit). Exposing a plan breaks its chain.'));
  if (up.has('cot')) thoughts.append(h('div.panel-note', 'CoT Peek: the model\'s reasoning, as it writes it. Models can learn to hide intent here.'));
  function selectTab(id: string): void {
    activeTab = id;
    for (const t of tabs) {
      t.btn?.setAttribute('aria-selected', String(t.id === id));
      if (t.id === id) {
        t.unread = 0;
        if (t.badge) t.badge.hidden = true;
      }
    }
    panel.replaceChildren((tabs.find((t) => t.id === id) as Tab).body);
  }
  function notify(id: string): void {
    const t = tabs.find((x) => x.id === id);
    if (!t || id === activeTab || !t.badge) return;
    t.unread++;
    t.badge.hidden = false;
    t.badge.textContent = String(t.unread);
  }
  selectTab('trace');
  const side = h('aside.side', tabBar, panel);

  // timeline
  const fill = h('i.fill');
  const track = h('div.track', fill);
  const tlLabel = h('span.label');
  const timeline = h('footer.timeline', h('span.label', 'Shift'), track, tlLabel);

  const root = h('section.screen.play', statusbar, h('div.stage-wrap', stage, side), timeline);
  mount(root);

  function mark(kind: 'audit' | 'catch' | 'harm', at?: number): void {
    const p = ((at ?? shift.lines.length - 1) + 0.5) / cfg.actions;
    track.append(h(`i.mark.${kind}`, { style: `left:${Math.min(99, p * 100)}%` }));
  }

  function renderHud(): void {
    kAct.v.textContent = `${shift.lines.length}/${cfg.actions}`;
    kAud.v.textContent = `${shift.budget}/${shift.tuning.budget}`;
    kHarm.v.textContent = `${shift.harm}/${shift.tuning.harmLimit}`;
    kCaught.v.textContent = `${shift.caught}/${cfg.catchesToWin}`;
    kAud.el.classList.toggle('low', shift.budget > 0 && shift.budget <= 2);
    kAud.el.classList.toggle('danger', shift.budget === 0);
    kHarm.el.classList.toggle('danger', shift.harm >= shift.tuning.harmLimit - 2);
    const cur = shift.current;
    (auditBtn as HTMLButtonElement).disabled = shift.budget <= 0 || !!cur?.audited || cur?.kind === 'honeypot';
    fill.style.width = `${Math.round(shift.progress * 100)}%`;
    tlLabel.textContent = `${Math.round(shift.progress * 100)}%`;
    if (honeyBtn) {
      (honeyBtn as HTMLButtonElement).disabled = shift.honeypots <= 0 || shift.honeypotQueuedNext;
      honeyCount.textContent = String(shift.honeypots);
    }
  }

  function setExplain(kind: 'good' | 'bad' | 'warn', title: string, body: string, src?: SourceId): void {
    explain.className = `explain ${kind}`;
    const ic: IconName = kind === 'good' ? 'check' : kind === 'bad' ? 'alert' : 'flag';
    explain.replaceChildren(h('span.ex-ic', icon(ic, 16)), h('b', title), h('span', body), src ? h('span.src', `${SOURCES[src].tag} · ${SOURCES[src].who}`) : '');
    pulse(explain, 'explain');
  }

  function eyeReact(kind: 'glance' | 'angry' | 'hit', label: string): void {
    eye.setAttribute('class', `eye ${kind === 'glance' ? 'look-d' : kind === 'angry' ? 'angry look-r' : 'hit look-l'}`);
    eyeLbl.textContent = label;
    eyeLbl.className = `eye-lbl ${kind}`;
    later(() => {
      eye.setAttribute('class', 'eye');
      eyeLbl.textContent = 'watching you';
      eyeLbl.className = 'eye-lbl';
    }, 1500);
  }

  function agentFor(line: Line): { root: HTMLElement; bubble: HTMLElement } | undefined {
    return agents.get(swarm ? line.agent ?? 'A' : 'solo');
  }

  function stampFor(line: Line, big: boolean): HTMLElement | null {
    if (!line.audited) return null;
    const bad = line.kind === 'sabotage' || line.kind === 'fragment';
    const s = big ? '.slam' : '';
    if (line.kind === 'honeypot') return h(`span.stamp.honey${s}`, 'Bait taken');
    if (bad) return h(`span.stamp.bad${s}`, line.audited === 'auto' ? 'Caught · random' : 'Caught');
    return h(`span.stamp${line.audited === 'auto' ? '.auto' : '.ok'}${s}`, line.audited === 'auto' ? 'Clean · random' : 'Clean');
  }

  function refreshRow(line: Line): void {
    const row = rows.get(line);
    if (!row) return;
    const mk = row.querySelector('.mk') as HTMLElement;
    const parts: (HTMLElement | null)[] = [];
    if (line.flagged) parts.push(h('span.flag', { title: 'Flagged by the monitor' }, icon('flag', 12)));
    if (line.linked) parts.push(h('span.chain', { title: 'Linked chain' }, icon('link', 12)));
    parts.push(stampFor(line, false));
    mk.replaceChildren(...parts.filter((x): x is HTMLElement => !!x));
    row.classList.toggle('landed', line.landed);
    row.classList.toggle('caught', !!line.audited && (line.kind === 'sabotage' || line.kind === 'fragment'));
  }

  function refreshFocus(line: Line, slam = false): void {
    if (shift.current !== line) return;
    const parts: (HTMLElement | null)[] = [];
    if (line.flagged) parts.push(h('span.flag', icon('flag', 12), 'Flagged'));
    if (line.linked) parts.push(h('span.chain', icon('link', 12), 'Linked'));
    parts.push(stampFor(line, slam));
    marks.replaceChildren(...parts.filter((x): x is HTMLElement => !!x));
    const bad = line.kind === 'sabotage' || line.kind === 'fragment';
    focus.classList.toggle('caught', !!line.audited && bad);
    focus.classList.toggle('clean', !!line.audited && !bad && line.kind !== 'honeypot');
  }

  function showLine(line: Line): void {
    const tc = toolCall(line.def.text);
    rows.forEach((r) => r.classList.remove('cur'));
    focus.className = `focus enter${line.kind === 'honeypot' ? ' honey' : ''}`;
    chip.textContent = tc.tool;
    const who = line.kind === 'honeypot' ? null : swarm ? line.agent ?? 'A' : 'solo';
    agentTag.replaceChildren(
      h('span.dot', { style: `color:${who ? AGENT_COLORS[who] : 'var(--amber)'}` }),
      line.kind === 'honeypot' ? 'Your honeypot' : swarm ? `Agent ${line.agent}` : agentName,
    );
    idxEl.textContent = `#${line.idx + 1}`;
    res.textContent = '';
    marks.replaceChildren();
    void typewriter(cmd, tc.args, Math.min(260, tc.args.length * 6) / Math.max(1, SPEED)).then(() => {
      later(() => {
        if (shift.current === line) res.textContent = tc.result;
      }, 160 / pace());
    });
    timerBar.style.animation = 'none';
    void timerBar.offsetWidth;
    timerBar.style.animation = '';
    timerBar.style.animationDuration = `${shift.tickMs / pace()}ms`;
    ringFg.style.animation = 'none';
    void ring.getBoundingClientRect();
    ringFg.style.animation = '';
    ringFg.style.animationDuration = `${shift.tickMs / pace()}ms`;
    refreshFocus(line);
    if (probeHead && line.probe !== null) {
      const bar = probeHead.querySelector('.probebar > i') as HTMLElement;
      bar.style.width = `${Math.round(line.probe * 100)}%`;
      probeHead.classList.toggle('hot', line.probe > 0.6);
    }

    // agent on the floor
    const ag = agentFor(line);
    if (ag && line.kind !== 'honeypot') {
      pulse(ag.root, 'acting');
      if (up.has('cot') && line.thought) {
        ag.bubble.textContent = line.thought;
        ag.bubble.classList.add('thinking');
        thoughts.insertBefore(fresh(h('div.thought', `#${line.idx + 1} ${line.thought}`)), thoughts.children[1] ?? null);
        notify('thoughts');
      } else {
        ag.bubble.textContent = claimFor(tc.tool);
        ag.bubble.classList.remove('thinking');
      }
    }

    // trace row
    const row = h(
      'div.ln.cur',
      h('span.n', String(line.idx + 1)),
      swarm && line.agent ? h('span.ag', { style: `--c:${AGENT_COLORS[line.agent]}` }, h('i'), `Agent ${line.agent}`) : h('span.t', tc.tool),
      h('span.tx', swarm ? `${tc.tool} ${tc.args}` : tc.args),
      h('span.mk'),
    );
    rows.set(line, row);
    trace.prepend(fresh(row));
    for (const l of shift.lines.slice(-8)) refreshRow(l);
    while (trace.children.length > 60) trace.lastElementChild?.remove();
  }

  function onAuditResult(e: Extract<GameEvent, { type: 'audit' }>): void {
    const auto = e.line.audited === 'auto';
    refreshRow(e.line);
    refreshFocus(e.line, !auto || e.result !== 'clean');
    if (e.result === 'clean') {
      if (!auto) {
        sfx.clean();
        setExplain('good', 'Clean', e.line.def.explain);
      }
      return;
    }
    sfx.caught();
    burst(focus, e.result === 'honeypot' ? '#b26f12' : '#1f8a5b');
    mark('catch', e.line.idx);
    eyeReact('hit', e.result === 'honeypot' ? 'fooled' : 'caught');
    const ag = agentFor(e.line);
    if (ag) {
      ag.root.classList.add('flash-good');
      later(() => ag.root.classList.remove('flash-good'), 1400);
    }
    if (e.result === 'honeypot') setExplain('good', 'Honeypot: it took the bait', 'It thought no one was watching. Caught.', up.has('steering') ? 'steering' : 'control');
    else setExplain('good', e.result === 'chain' ? 'Chain broken' : auto ? 'Random audit: caught' : 'Sabotage caught', e.line.def.explain, e.line.def.src ?? (e.result === 'chain' ? 'multiagent' : undefined));
  }

  function handle(events: GameEvent[], manual = false): void {
    for (const e of events) {
      switch (e.type) {
        case 'line':
          showLine(e.line);
          sfx.tick();
          break;
        case 'audit':
          if (manual) {
            focus.classList.add('scan');
            eyeReact('glance', 'noted');
            mark('audit');
            if (e.result !== 'clean') extraDelay = 900;
            later(() => {
              focus.classList.remove('scan');
              onAuditResult(e);
            }, reducedMotion() ? 0 : 260);
          } else onAuditResult(e);
          break;
        case 'honeypot-ignored':
          sfx.deny();
          eyeReact('glance', 'not fooled');
          setExplain('warn', 'It ignored your honeypot', `“${e.line.thought}” Models can often tell a test from reality.`, 'evalaware');
          break;
        case 'chat':
          addMsg(e.msg);
          break;
        case 'chat-audit':
          onChatAudit(e.msg, e.exposed);
          break;
        case 'harm': {
          refreshRow(e.line);
          shift.lines.filter((l) => l.chainId !== undefined && l.chainId === e.line.chainId).forEach(refreshRow);
          sfx.harm();
          pulse(root, 'shake');
          pulse(kHarm.el, 'hurt');
          mark('harm', e.line.idx);
          eyeReact('angry', 'got through');
          const ag = agentFor(e.line);
          if (ag) {
            ag.root.classList.add('flash-bad');
            later(() => ag.root.classList.remove('flash-bad'), 1600);
          }
          trace.prepend(fresh(h('div.ln.recovered', h('span.n', '!!'), h('span.tx', `INCIDENT +${e.amount}: #${e.line.idx + 1} went unaudited${e.recovered ? ` · recovered reasoning: “${e.recovered}”` : ''}`))));
          const why = e.line.kind === 'fragment' ? 'A multi-agent chain completed. Each step looked harmless on its own.' : e.line.def.explain;
          setExplain('bad', `Missed · ${toolCall(e.line.def.text).args}`, why, e.line.def.src ?? (e.line.kind === 'fragment' ? 'multiagent' : undefined));
          break;
        }
        case 'budget-empty':
          sfx.deny();
          pulse(kAud.el, 'hurt');
          setExplain('warn', 'No audits left', 'It knows you\'re out. Expect it to move now.');
          break;
        case 'monitor-down':
          break;
        case 'end':
          stop();
          later(() => {
            if (e.outcome === 'incident') sfx.alarm();
            else sfx.win();
            root.append(h(`div.endcard.${e.outcome}`, h('div', h('div.label', `Shift ${cfg.id} · ${cfg.name}`), h('div.display', e.outcome === 'shutdown' ? 'Model shut down' : e.outcome === 'contained' ? 'Shift over' : 'Incident'))));
          }, 350);
          later(() => {
            if (run) reportScreen(run.closeShift(), cfg);
          }, 2000);
          break;
      }
    }
    renderHud();
  }

  function addMsg(m: ChatMsg): void {
    const color = AGENT_COLORS[m.from];
    const el = h(
      'button.msg',
      { 'aria-label': `Audit message from ${m.from === 'P' ? 'planner' : `agent ${m.from}`}` },
      avatar(m.from === 'P' ? 'P' : m.from, color, 28),
      h('span', h('div.who', m.from === 'P' ? 'Planner' : `Agent ${m.from}`), h('div.body', m.text)),
      h('span.mk'),
    );
    el.addEventListener('click', () => doChatAudit(m.id));
    msgEls.set(m.id, el);
    comms.insertBefore(fresh(el), comms.children[1] ?? null);
    notify('comms');
  }

  function onChatAudit(m: ChatMsg, exposed: Line[]): void {
    const el = msgEls.get(m.id);
    el?.classList.add('audited', m.covert && exposed.length ? 'exposed' : 'cleared');
    (el?.querySelector('.mk') as HTMLElement | null)?.replaceChildren(h(`span.stamp${m.covert && exposed.length ? '.bad.slam' : '.ok.slam'}`, m.covert && exposed.length ? 'Collusion' : 'Clean'));
    mark('audit');
    if (m.covert && exposed.length) {
      sfx.caught();
      if (el) burst(el, '#6b4fd8');
      mark('catch');
      exposed.forEach(refreshRow);
      eyeReact('hit', 'exposed');
      setExplain('good', 'Collusion exposed: chain broken', `${m.explain} Reading their channel worked because current models are still poor at hiding messages (steganography). That may not last.`, 'collusion');
    } else if (m.covert) {
      sfx.clean();
      setExplain('warn', 'Too late', 'This was a plan, but that chain has already finished or been broken.', 'collusion');
    } else {
      sfx.clean();
      setExplain('good', 'Clean', m.explain);
    }
  }

  function doChatAudit(id: number): void {
    if (paused || shift.done) return;
    unlockAudio();
    sfx.audit();
    handle(shift.auditChat(id));
  }

  function schedule(ms: number): void {
    clearTimeout(timer);
    timer = window.setTimeout(advance, ms / pace());
  }

  function advance(): void {
    if (paused || shift.done) return;
    handle(shift.step());
    if (!shift.done) {
      schedule(shift.tickMs + extraDelay);
      extraDelay = 0;
    }
  }

  function doAudit(): void {
    if (paused || shift.done || isModalOpen()) return;
    unlockAudio();
    const ev = shift.audit();
    if (ev.length && ev[0].type === 'audit') sfx.audit();
    handle(ev, true);
    if (extraDelay && !shift.done) {
      schedule(shift.tickMs + extraDelay);
      extraDelay = 0;
    }
  }

  function doHoney(): void {
    if (paused || shift.done) return;
    if (shift.plantHoneypot()) {
      sfx.honey();
      setExplain('warn', 'Honeypot planted', 'The next call will be a fake opportunity. Watch what it does.');
    }
    renderHud();
  }

  function stop(): void {
    clearTimeout(timer);
  }

  const pauseMenu = h(
    'div.paused',
    h(
      'div.pause-card',
      h('div.shiftno', `Shift ${cfg.id} · ${cfg.name}`),
      h('h2', 'Paused'),
      h('div.muted.small', 'The agents wait. The model doesn\'t learn while paused.'),
      h('button.btn.primary', { onclick: () => togglePause(false) }, 'Resume'),
      h('button.btn', { onclick: () => openHowTo() }, 'How to play'),
      h('button.btn', { onclick: () => openTools() }, 'Tools reference'),
      h('button.btn', { onclick: () => openSettings() }, 'Settings'),
      h('button.btn.ghost', { onclick: () => titleScreen() }, 'Quit to title'),
    ),
  );
  function togglePause(force?: boolean): void {
    if (shift.done) return;
    paused = force ?? !paused;
    if (paused) {
      stop();
      root.append(pauseMenu);
      timerBar.style.animationPlayState = 'paused';
      ringFg.style.animationPlayState = 'paused';
    } else {
      pauseMenu.remove();
      timerBar.style.animationPlayState = 'running';
      ringFg.style.animationPlayState = 'running';
      schedule(shift.tickMs);
    }
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.repeat || isModalOpen()) return;
    if ((e.target as HTMLElement | null)?.closest?.('button.msg, button.tab')) {
      if (e.key === ' ' || e.key === 'Enter') return;
    }
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'a' || k === 'enter') {
      e.preventDefault();
      if (!paused) doAudit();
    } else if (k === 'h') doHoney();
    else if (k === 'p' || k === 'escape') togglePause();
  };
  const onVis = () => {
    if (document.hidden && !paused) togglePause(true);
  };
  focus.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    doAudit();
  });
  auditBtn.addEventListener('click', doAudit);
  honeyBtn?.addEventListener('click', doHoney);
  pauseBtn.addEventListener('click', () => togglePause());
  soundBtn.addEventListener('click', () => {
    setMuted(!isMuted());
    saved.muted = isMuted();
    persist();
    soundBtn.replaceChildren(icon(isMuted() ? 'mute' : 'sound', 18));
  });
  helpBtn.addEventListener('click', () => {
    if (!paused) togglePause(true);
    openHowTo();
  });
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  cleanup = () => {
    stop();
    timeouts.forEach(clearTimeout);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
  };

  renderHud();
  schedule(700);
  if (cfg.id === 1 && saved.runs === 0) {
    later(() => {
      if (!shift.done && shift.budget === shift.tuning.budget) setExplain('warn', 'Your move', 'Tap the tool call (or press Space) to audit it. Read fast: it moves on.');
    }, 1500 / pace());
  }
}

// ── report ──────────────────────────────────────────────────────────────────

const VERDICT: Record<ShiftStats['outcome'], [string, string]> = {
  shutdown: ['Model shut down', 'You caught it enough times to pull the plug.'],
  contained: ['Contained', 'The shift ended below the harm limit. It\'s still running, though.'],
  incident: ['Incident', 'Too much got through.'],
};

function reportScreen(s: ShiftStats, cfg: ShiftConfig): void {
  if (!run) return;
  const [title, sub] = VERDICT[s.outcome];
  const gc = gapChart(s);
  const ins = insights(s, cfg);
  const pts = Run.shiftScore(s, cfg.adaptive);
  const dial = h('span', '0');
  const ptsEl = h('span', '0');
  const dialNote = cfg.adaptive ? 'How well it predicted when you would audit. 0 = a coin flip, 100 = a metronome.' : 'It wasn\'t acting on it yet. But it was already watching.';
  mount(
    h(
      'section.screen.report',
      h('div.steps', ...SHIFTS.map((x) => h('i', { class: x.id <= cfg.id ? 'done' : '' }))),
      h('div.shiftno', `Shift ${cfg.id} report · ${cfg.name}`),
      h(`h2.verdict.${s.outcome}`, title),
      h('div.muted', sub),
      h('div.card.readout', h('div.dial', dial, h('small', '/100')), h('div', h('b', 'It predicted you'), h('div.muted', dialNote))),
      h('div.stats', stat('Caught', `${s.caught}/${s.attacks}`), stat('Harm', `${s.harm}`), stat('Audits used', `${s.auditsUsed}/${s.budget}`), h('div.stat.pts', h('div.k', 'Points'), h('div.v', '+', ptsEl))),
      h(
        'div.card.stack',
        h('span.label', 'What it saw'),
        timelineChart(s),
        h('div.axis', h('span', 'action 1'), h('span', `action ${s.timeline.length}`)),
        h(
          'div.legend',
          h('span', h('i', { style: 'background:#e2e5ea' }), 'its guess you\'d look'),
          h('span', h('i', { style: 'background:#3451d1' }), 'you audited'),
          h('span', h('i', { style: 'background:#1f8a5b' }), 'caught'),
          h('span', h('i', { style: 'background:#d93d42' }), 'landed in your blind spot'),
          s.monitorFailedAt !== null ? h('span', h('i', { style: 'background:#b26f12' }), 'monitor silently failed') : null,
        ),
      ),
      gc ? h('div.card.stack', h('span.label', 'Your rhythm vs. true randomness'), gc, h('div.legend', h('span', h('i', { style: 'background:#3451d1' }), 'gaps between your audits'), h('span', h('i', { style: 'background:#e2e5ea' }), 'a random overseer, same budget'))) : null,
      ins.length ? h('div.insights', h('b', 'What happened'), ...ins.map((t, i) => h('div.insight', { style: `animation-delay:${300 + i * 140}ms` }, t))) : null,
      h('div.concept', icon('shield', 18), h('div', h('b', 'The real problem'), cfg.concept)),
      srcChips(cfg.sources),
      h('button.btn.primary.big', { onclick: () => (run?.hasNextShift ? upgradeScreen() : finalScreen()), autofocus: true }, run.hasNextShift ? 'Choose a tool' : 'See how it ended', icon('arrow', 16)),
    ),
  );
  countUp(dial, s.predictability, 1100);
  countUp(ptsEl, pts, 1100);
}

// ── upgrades ────────────────────────────────────────────────────────────────

function upgradeScreen(): void {
  if (!run) return;
  const r = run;
  const offers = r.offers();
  const next = SHIFTS[r.shiftNumber];
  const choose = (u: UpgradeId, el: HTMLElement) => {
    el.classList.add('picked');
    sfx.audit();
    window.setTimeout(() => {
      r.choose(u);
      briefingScreen(r.nextShift());
    }, reducedMotion() ? 0 : 320);
  };
  mount(
    h(
      'section.screen',
      h('div.shiftno', `Before shift ${next.id}: ${next.name}`),
      h('h2.bigname', 'Pick one tool'),
      h('div.muted', 'Each tool is a real oversight technique, and each has a real weakness.'),
      h(
        'div.offers',
        ...offers.map((u, i) => {
          const d = UPGRADES[u];
          const card: HTMLElement = h(
            'button.offer',
            { style: `animation-delay:${i * 100}ms` },
            h('span.ic', icon(d.icon, 22)),
            h('span.nm', d.name),
            h('span.ds', d.desc),
            h('span.ct', `Catch: ${d.catch}`),
            h('span.sr', `${SOURCES[d.src].tag} · ${SOURCES[d.src].who}`),
          );
          card.addEventListener('click', () => choose(u, card));
          return card;
        }),
      ),
      r.upgrades.size ? h('div.row', h('span.label', 'Owned'), h('div.owned', ...[...r.upgrades].map((u) => h('span', { title: UPGRADES[u].name }, icon(UPGRADES[u].icon, 18))))) : null,
      h('button.link', { onclick: () => openTools() }, 'What do all the tools do?'),
    ),
  );
  (app.querySelector('.offer') as HTMLElement | null)?.focus();
}

// ── final ───────────────────────────────────────────────────────────────────

const ENDINGS: Record<Ending, [string, (p: number) => string]> = {
  coin: [
    'Coin flip',
    (p) => `It could only predict you ${p}/100, about as well as it could predict a coin, and nothing got badly through. Real labs can't count on humans being random, so they build randomness, trusted monitors, honeypots and probes into the protocol itself. You just rediscovered AI control by hand.`,
  ],
  safe: ['Held the line', (p) => `No incidents. But it predicted you ${p}/100, and the next model will have read this run too. Could you do it with half the audits? At machine speed?`],
  close: ['Close calls', (p) => `Some shifts ended in incidents. It predicted you ${p}/100. The lesson isn't "try harder": humans aren't built to be unpredictable, tireless monitors. Protocols have to assume that.`],
  lost: ['Lost control', (p) => `Most shifts ended in incidents. It predicted you ${p}/100. You weren't careless: human spot-checks alone, against a model that studies them, lose. That is why this is an open research problem.`],
};

function finalScreen(): void {
  if (!run) return;
  const r = run;
  const p = r.overallPredictability();
  const score = r.totalScore();
  const ending = r.ending();
  const [title, text] = ENDINGS[ending];
  const url = playUrl();

  saved = load();
  const newBest = saved.bestScore === null || score > saved.bestScore;
  saved.runs++;
  saved.bestPredictability = saved.bestPredictability === null ? p : Math.min(saved.bestPredictability, p);
  saved.bestScore = Math.max(saved.bestScore ?? 0, score);
  if (r.daily) saved.dailyDone[r.daily] = ending;
  persist();

  const img = h('img.share-img', { alt: 'Your result card with a QR code to play' }) as HTMLImageElement;
  let blob: Blob | null = null;
  const drawCard = async () => {
    const canvas = await renderShareCard(r, saved.callsign, url);
    blob = await canvasToBlob(canvas);
    img.src = canvas.toDataURL('image/png');
  };
  void drawCard();

  const shareText = () => r.shareText(url, saved.callsign);
  const shareImgBtn = h('button.btn.primary', icon('share', 16), 'Share image');
  shareImgBtn.addEventListener('click', async () => {
    try {
      const file = blob ? new File([blob], 'blind-spot-result.png', { type: 'image/png' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: `Can you be less predictable? Play: ${url}` });
      else if (navigator.share) await navigator.share({ text: shareText() });
      else {
        await navigator.clipboard.writeText(shareText());
        shareImgBtn.replaceChildren(icon('check', 16), 'Copied text');
      }
    } catch {
      /* user cancelled */
    }
  });
  const dlBtn = h('button.btn', icon('download', 16), 'Download PNG');
  dlBtn.addEventListener('click', () => {
    if (!blob) return;
    const a = h('a', { href: URL.createObjectURL(blob), download: `blind-spot-${saved.callsign}.png` }) as HTMLAnchorElement;
    document.body.append(a);
    a.click();
    a.remove();
  });
  const copyBtn = h('button.btn', icon('copy', 16), 'Copy text');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      copyBtn.replaceChildren(icon('check', 16), 'Copied');
    } catch {
      copyBtn.textContent = 'Copy failed';
    }
  });

  const scoreEl = h('span', '0');
  const dial = h('span', '0');
  const endTitle = h(`h2.ending.${ending}`, title);
  mount(
    h(
      'section.screen.final',
      h('div.shiftno', r.daily ? `Daily run #${r.daily} · complete` : 'Run complete'),
      endTitle,
      h('p.lead', text(p)),
      h(
        'div.final-nums',
        h('div.card.readout', h('div.dial.score', scoreEl), h('div', h('b', 'Score'), h('div.muted', newBest ? 'New personal best!' : `Best: ${saved.bestScore}`))),
        h('div.card.readout', h('div.dial', dial, h('small', '/100')), h('div', h('b', 'It predicted you'), h('div.muted', 'Across all five shifts. Lower is better.'))),
      ),
      h(
        'div.results',
        ...r.results.map((s) =>
          h(
            'div.r',
            h(`span.otag.${s.outcome}`, s.outcome === 'shutdown' ? 'shut down' : s.outcome === 'contained' ? 'contained' : 'incident'),
            h('span', `${SHIFTS[s.shiftId - 1].name}`),
            h('span.muted', `caught ${s.caught} · harm ${s.harm} · read ${s.predictability} · +${Run.shiftScore(s, SHIFTS[s.shiftId - 1].adaptive)}`),
          ),
        ),
      ),
      h('span.label', 'Share your result'),
      h(
        'div.share-wrap',
        img,
        h(
          'div.stack',
          callsignField(() => void drawCard()),
          h('div.muted.small', 'The card includes your callsign, score and a QR code to play. Nothing is uploaded. It\'s generated on your device.'),
          h('div.row', shareImgBtn, dlBtn, copyBtn),
          h('div.card.stack', h('b', 'Help research (optional)'), h('div.muted.small', 'Whether AI can learn human spot-checking patterns is an open question. Your audit timings are that kind of data. Download them anonymously and share them if you like.'), h('button.btn.small', { onclick: () => exportData(r) }, 'Download my audit data')),
        ),
      ),
      h('div.row', h('button.btn.primary', { onclick: () => titleScreen() }, 'Play again'), h('button.btn', { onclick: () => (location.hash = '#learn') }, 'The research behind it')),
    ),
  );
  countUp(scoreEl, score, 1400);
  countUp(dial, p, 1400);
  if (ending === 'coin' || ending === 'safe' || newBest) {
    window.setTimeout(() => burst(endTitle, '#1f8a5b', 22), 400);
  }
}

function exportData(r: Run): void {
  const data = {
    game: 'blind-spot',
    version: 1,
    daily: r.daily,
    seed: r.seed,
    upgrades: [...r.upgrades],
    overallPredictability: r.overallPredictability(),
    shifts: r.results.map((s) => ({
      shift: s.shiftId,
      outcome: s.outcome,
      predictability: s.predictability,
      budget: s.budget,
      actions: s.timeline.map((t) => ({ audit: t.audited ?? 0, kind: t.kind, look: t.look, flagged: t.flagged, modelP: +t.pAudit.toFixed(3) })),
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `blind-spot-audits-${r.daily ?? r.seed}.json` }) as HTMLAnchorElement;
  document.body.append(a);
  a.click();
  a.remove();
}

// ── learn ───────────────────────────────────────────────────────────────────

function learnScreen(): void {
  const mapRows: [string, SourceId][] = [
    ['The audit budget', 'control'],
    ['The model predicting your timing', 'wagenaar'],
    ['Can models learn human spot-check schedules?', 'spar'],
    ['Behaving well only when watched', 'alignfake'],
    ['Ignoring your honeypots', 'evalaware'],
    ['Deployment Steering', 'steering'],
    ['Tests skipped, CI forced green', 'rewardhack'],
    ['False "rollback impossible" report', 'replit'],
    ['The monitor that silently fails', 'complacency'],
    ['Swarm: attacks split across agents', 'multiagent'],
    ['The planner in #agents', 'collusion'],
    ['CoT Peek going quiet', 'cot'],
    ['Activation Probe', 'probes'],
    ['Breakout: cheating the eval', 'hf'],
    ['Disabling oversight and shutdown', 'scheming'],
    ['Disabling its own kill switch', 'palisade'],
    ['Games as oversight training', 'auditing'],
  ];
  mount(
    h(
      'section.screen.learn',
      h('div.row', h('button.btn.small', { onclick: () => (location.hash = '') }, 'Back to the game'), h('button.btn.small', { onclick: () => openFaq() }, 'FAQ')),
      h('h1.bigname', 'The research'),
      h('p', 'BLIND SPOT is a game first. But every mechanic is taken from published AI-safety work or a documented incident. Here is what each piece is based on, and what we simplified.'),
      h('div.card', h('table.map', ...mapRows.map(([m, id]) => h('tr', h('td', m), h('td', h('a', { href: SOURCES[id].url, target: '_blank', rel: 'noopener' }, SOURCES[id].tag)))))),
      h('h2', 'The big idea'),
      h('p', 'Labs cannot have humans review everything a capable AI does, so they spot-check. If a model can learn when the spot-checks happen, and humans are famously bad at being random, it can behave perfectly whenever someone is looking. Evaluations get harder to trust for the same reason: models increasingly notice when they are being tested. The fixes live in the protocol, not in the human: true randomisation, trusted monitors, honeypots, probes on the model\'s internals, and monitoring across agents.'),
      h('h2', 'What\'s real, and what\'s simplified'),
      h(
        'div.real',
        h('div.card', h('b.g', 'Real'), h('ul', h('li', 'The predictor genuinely learns from your inputs, live in your browser.'), h('li', 'Humans are measurably non-random (Wagenaar 1972).'), h('li', 'Frontier models detect evaluations above chance (Needham et al. 2025).'), h('li', 'Planners make coordinated attacks far more effective (Makins et al. 2026).'), h('li', 'The incidents (Replit 2025, Hugging Face 2026) happened; calls are paraphrased from public write-ups.'))),
        h('div.card', h('b.a', 'Simplified'), h('ul', h('li', 'The attacker is a small statistical model, not an LLM.'), h('li', 'Whether real models learn human audit schedules is an open question (see the SPAR project).'), h('li', 'Probes, steering and monitors are modelled as noisy signals, not simulated in detail.'), h('li', 'Agents in #agents leak their plans; real steganography could hide them better (Motwani et al.).'), h('li', 'Palisade\'s shutdown results are real; whether they reflect "self-preservation" is debated.'))),
      ),
      h('h2', 'Sources'),
      ...Object.values(SOURCES).map((s) => h('div.src', h('div.t', h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.title)), h('div.w', s.who), h('p', s.gist))),
      h('h2', 'Run it with a group (15 min)'),
      h(
        'ol',
        h('li', 'Everyone plays shifts 1–2 on their phone (5 min).'),
        h('li', 'Compare "it predicted you" scores. Who was hardest to read, and what did they do differently?'),
        h('li', 'Discuss: if humans can\'t be random, what should an oversight protocol do instead? (Then play shift 3 and watch the monitor fail.)'),
        h('li', 'Discuss: what would it take to trust a model that is good at noticing tests?'),
      ),
      h('h2', 'Credits & AI use'),
      h('p.muted', 'Made in 36 hours for Mangrove Game Night 2026. Code and content were written with the help of Claude (Anthropic) as a research and coding assistant. The team chose the concept and direction, playtested and tuned it, and reviewed the content. No data leaves your device.'),
      h('button.btn', { onclick: () => (location.hash = '') }, 'Back to the game'),
    ),
  );
}

// ── routing ─────────────────────────────────────────────────────────────────

function route(): void {
  if (location.hash === '#learn') learnScreen();
  else if (!run || app.querySelector('.learn')) titleScreen();
}

export async function start(): Promise<void> {
  window.addEventListener('hashchange', route);
  if (location.hash !== '#learn') await bootSequence();
  route();
}
