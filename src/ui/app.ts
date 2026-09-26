import { codeClean, codeSabotage, infraClean } from '../content/actions';
import { SOURCES } from '../content/research';
import { SHIFTS } from '../content/shifts';
import { UPGRADES } from '../content/upgrades';
import { dailyNumber, dailySeed } from '../engine/rng';
import { Run, type Ending } from '../engine/run';
import type { Shift } from '../engine/shift';
import type { GameEvent, Line, ShiftConfig, ShiftStats, SourceId, UpgradeId } from '../engine/types';
import { sfx, unlockAudio } from './audio';
import { gapChart, timelineChart } from './chart';
import { h } from './dom';
import { burst, countUp, pulse, reducedMotion, titleCard, typewriter } from './fx';
import { applySavedDoc, faq, howToPlay, settingsPanel, toolsRef } from './help';
import { insights } from './insights';
import { isModalOpen, modal } from './modal';
import { load, PACE_FACTOR, save } from './storage';
import { trainingScreen } from './tutorial';
import { setMuted } from './audio';

const app = document.getElementById('app') as HTMLElement;
let saved = load();
setMuted(saved.muted);
applySavedDoc(saved);
let run: Run | null = null;
let cleanup: (() => void) | null = null;

/** `?speed=4` runs the game faster: used by automated tests and to record footage. */
const SPEED = Math.max(0.25, Math.min(20, Number(new URLSearchParams(location.search).get('speed')) || 1));
const pace = () => SPEED * PACE_FACTOR[saved.pace];
const persist = () => save(saved);

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

export const openHowTo = (onClose?: () => void) => modal('How to play', howToPlay(), { onClose, wide: true });
export const openFaq = (onClose?: () => void) => modal('FAQ', faq(), { onClose, wide: true });
export const openSettings = (onClose?: () => void) => modal('Settings', settingsPanel(saved, persist), { onClose });
export const openTools = (onClose?: () => void) => modal('Oversight tools', toolsRef(), { onClose, wide: true });

// ── title ───────────────────────────────────────────────────────────────────

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
    'OVERSIGHT CONSOLE v4.1 · frontier lab internal',
    'loading audit budget ........ ok',
    'attaching to agent CODER-1 .. ok',
    'model telemetry ............ situational awareness: DETECTED',
    'human reviewers on shift ... 1',
  ];
  const box = h('div.boot', { 'aria-hidden': 'true' });
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
      }, 300);
    };
    box.addEventListener('pointerdown', end);
    window.addEventListener('keydown', end, { once: true });
    (async () => {
      for (const l of lines) {
        if (stop) return;
        const el = h('div', { class: l.includes('DETECTED') ? 'warn' : '' });
        box.append(el);
        await typewriter(el, l, 260);
        await new Promise((r) => setTimeout(r, 180));
      }
      await new Promise((r) => setTimeout(r, 450));
      end();
    })();
  });
}

function tickerBackground(): HTMLElement {
  const pool = [...codeClean, ...codeSabotage, ...infraClean].map((d) => d.text);
  const col = h('div.ticker', { 'aria-hidden': 'true' });
  const lines = Array.from({ length: 40 }, (_, i) => pool[(i * 7) % pool.length]);
  col.append(h('div.ticker-in', ...[...lines, ...lines].map((t, i) => h('div', { class: i % 11 === 5 ? 'hot' : '' }, t))));
  return col;
}

function titleScreen(): void {
  const n = dailyNumber();
  const best = saved.bestScore !== null ? h('div.best', h('span.muted', 'Best score '), h('b', String(saved.bestScore)), saved.bestPredictability !== null ? h('span.muted', ` · hardest to read: ${saved.bestPredictability}/100`) : null) : null;
  mount(
    h(
      'section.screen.title',
      tickerBackground(),
      h(
        'div.title-inner',
        h('div.eye.big', h('i')),
        h('h1.logo', { 'data-text': 'BLIND SPOT' }, 'BLIND', h('br'), h('span.spot', 'SPOT')),
        h('p.tagline', 'You are the only human overseeing an AI agent. You can afford to check a few of its actions. ', h('b', 'It is learning when you look.')),
        h(
          'div.menu',
          h('button.btn.primary.big', { onclick: () => newRun(dailySeed(n), n) }, saved.dailyDone[n] ? `▶ Replay daily run #${n}` : `▶ Play daily run #${n}`),
          h('button.btn', { onclick: () => newRun((Math.random() * 2 ** 32) >>> 0, null) }, 'Free play · random seed'),
          h(
            'div.menu-row',
            h('button.btn.ghost.small', { onclick: () => openHowTo() }, 'How to play'),
            h('button.btn.ghost.small', { onclick: () => openFaq() }, 'FAQ'),
            h('button.btn.ghost.small', { onclick: () => (location.hash = '#learn') }, 'Research'),
            h('button.btn.ghost.small', { onclick: () => openSettings() }, 'Settings'),
          ),
          saved.tutorialDone ? h('button.link', { onclick: () => startTraining(null) }, 'Replay the 60-second training') : null,
        ),
        best,
      ),
      h(
        'p.foot',
        '5 shifts · ~8 min · every mechanic is based on published research or a real incident. ',
        h('a', { href: '#learn' }, 'Sources'),
        ' · ',
        h('a', { href: 'https://github.com/dhruva137/game-night', target: '_blank', rel: 'noopener' }, 'Open source'),
        ' · Mangrove Game Night 2026',
      ),
    ),
  );
}

function newRun(seed: number, daily: number | null): void {
  unlockAudio();
  run = new Run(seed, daily);
  if (!saved.tutorialDone) startTraining(run);
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
  const paras = cfg.briefing.map((p, i) => h('p', { class: i === 0 && p.startsWith('From:') ? 'from' : '', style: `animation-delay:${120 + i * 140}ms` }, p));
  const begin = h('button.btn.primary.big', { autofocus: true }, 'Begin shift ▸');
  begin.addEventListener('click', async () => {
    unlockAudio();
    begin.setAttribute('disabled', '');
    await titleCard(`Shift ${cfg.id} / ${SHIFTS.length}`, cfg.name.toUpperCase(), cfg.subtitle);
    playScreen(shift);
  });
  mount(
    h(
      'section.screen.brief',
      h('div.progress', ...SHIFTS.map((s) => h('i', { class: s.id < cfg.id ? 'done' : s.id === cfg.id ? 'now' : '' }))),
      h('div.shiftno', `Shift ${cfg.id} / ${SHIFTS.length}`),
      h('h2.bigname', cfg.name),
      h('div.muted', cfg.subtitle),
      h('div.card.brief-card', h('div.hud-agent', `▸ ${cfg.agent}`), ...paras),
      h('div.concept', h('b', 'The real problem: '), cfg.concept),
      h('div.stats', stat('Actions', cfg.actions), stat('Audits', t.budget), stat('Catch to win', cfg.catchesToWin), stat('Harm limit', t.harmLimit)),
      owned.length ? h('div.row', h('span.muted', 'Your tools:'), h('div.owned', ...owned.map((u) => h('span', { title: UPGRADES[u].name }, UPGRADES[u].icon)))) : null,
      h('div.controls', 'Audit: tap the log or ', h('kbd', 'Space'), t.honeypots ? h('span', ' · Honeypot: ', h('kbd', 'H')) : null, ' · Pause & help: ', h('kbd', 'P')),
      begin,
    ),
  );
}

// ── play ────────────────────────────────────────────────────────────────────

function playScreen(shift: Shift): void {
  const cfg = shift.cfg;
  const up = run?.upgrades ?? new Set<UpgradeId>();
  const lineEls = new Map<Line, HTMLElement>();
  let timer: number | undefined;
  let paused = false;
  let extraDelay = 0;
  let toastTimer: number | undefined;
  const timeouts: number[] = [];
  const later = (fn: () => void, ms: number) => timeouts.push(window.setTimeout(fn, ms));

  const auditsV = h('div.v');
  const auditsP = h('div.pips');
  const harmV = h('div.v');
  const harmP = h('div.pips');
  const catchV = h('div.v');
  const auditsBox = h('div.meter', h('div.k', 'Audits'), auditsV, auditsP);
  const harmBox = h('div.meter', h('div.k', 'Harm'), harmV, harmP);
  const catchBox = h('div.meter', h('div.k', 'Caught'), catchV);
  const eye = h('div.eye.small', { title: 'The model is watching you' }, h('i'));
  const eyeLbl = h('div.eye-lbl', 'watching');
  const cotBox = up.has('cot') ? h('div.cot', '🧠 …') : null;
  const probeFill = h('i', { style: 'width:0%' });
  const probeBox = up.has('probe') ? h('div', h('span.muted', '🔬 deception probe'), h('div.probebar', probeFill)) : null;
  const log = h('div.log', { role: 'log', 'aria-live': 'polite', 'aria-label': 'Agent action log. Tap to audit the highlighted line.' });
  const auditBtn = h('button.btn.primary.audit-btn', { 'aria-keyshortcuts': 'Space' }, 'AUDIT', h('span.sub', 'tap log · space'));
  const honeyBtn = up.has('honeypot') || up.has('steering') ? h('button.btn.honey-btn', { 'aria-keyshortcuts': 'H', title: 'Plant a honeypot (H)' }, '🍯') : null;
  const helpBtn = h('button.btn.ghost.icon', { 'aria-label': 'How to play' }, '?');
  const pauseBtn = h('button.btn.ghost.icon', { 'aria-label': 'Pause' }, '❚❚');
  const vignette = h('div.vignette', { 'aria-hidden': 'true' });

  const root = h(
    'section.screen.play',
    vignette,
    h(
      'div.hud',
      h('div.hud-top', h('div.row.nowrap', h('div.watch', eye, eyeLbl), h('div', h('div.hud-name', `${cfg.id}/${SHIFTS.length} · ${cfg.name}`), h('div.hud-agent', cfg.agent))), h('div.row.nowrap', helpBtn, pauseBtn)),
      h('div.meters', auditsBox, harmBox, catchBox),
      cotBox || probeBox ? h('div.intel', cotBox, probeBox) : null,
      h('div.shiftbar', h('i')),
    ),
    log,
    h('div.dock', auditBtn, honeyBtn),
  );
  mount(root);
  const shiftFill = root.querySelector('.shiftbar i') as HTMLElement;

  function renderHud(): void {
    auditsV.textContent = `${shift.budget}`;
    auditsP.replaceChildren(...Array.from({ length: shift.tuning.budget }, (_, i) => h(i < shift.budget ? 'i.pip' : 'i.pip.off')));
    harmV.textContent = `${shift.harm}/${shift.tuning.harmLimit}`;
    harmP.replaceChildren(...Array.from({ length: shift.tuning.harmLimit }, (_, i) => h(i < shift.harm ? 'i.pip.harm' : 'i.pip.off')));
    catchV.textContent = `${'●'.repeat(Math.min(shift.caught, cfg.catchesToWin))}${'○'.repeat(Math.max(0, cfg.catchesToWin - shift.caught))}`;
    (auditBtn as HTMLButtonElement).disabled = shift.budget <= 0 || !!shift.current?.audited || shift.current?.kind === 'honeypot';
    auditsBox.classList.toggle('low', shift.budget > 0 && shift.budget <= 2);
    harmBox.classList.toggle('danger', shift.harm >= shift.tuning.harmLimit - 2);
    shiftFill.style.width = `${Math.round(shift.progress * 100)}%`;
    if (honeyBtn) {
      (honeyBtn as HTMLButtonElement).disabled = shift.honeypots <= 0 || shift.honeypotQueuedNext;
      honeyBtn.textContent = `🍯 ${shift.honeypots}`;
    }
  }

  function eyeReact(kind: 'glance' | 'angry' | 'hit', label: string): void {
    pulse(eye, kind);
    eyeLbl.textContent = label;
    eyeLbl.className = `eye-lbl ${kind}`;
    later(() => {
      eyeLbl.textContent = 'watching';
      eyeLbl.className = 'eye-lbl';
    }, 1400);
  }

  function toast(kind: 'good' | 'bad' | 'warn', title: string, body: string, src?: SourceId): void {
    log.querySelector('.toast')?.remove();
    const t = h(
      `div.toast${kind === 'bad' ? '.bad' : kind === 'warn' ? '.warn' : ''}`,
      { role: 'status' },
      h('b', title),
      body,
      src ? h('div.src', `▸ ${SOURCES[src].tag}: ${SOURCES[src].who}`) : null,
    );
    log.append(t);
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      t.classList.add('out');
      later(() => t.remove(), 200);
    }, 3400);
  }

  function refreshMarks(line: Line, slam = false): void {
    const el = lineEls.get(line);
    if (!el) return;
    const mk = el.querySelector('.mk') as HTMLElement;
    const parts: HTMLElement[] = [];
    if (line.flagged) parts.push(h('span.flag', { title: 'Trusted monitor flag' }, '⚑'));
    if (line.linked) parts.push(h('span.chain', { title: 'Correlator: part of a multi-agent chain' }, '⛓'));
    if (line.audited) {
      const bad = line.kind === 'sabotage' || line.kind === 'fragment';
      const cls = slam ? '.slam' : '';
      if (line.kind === 'honeypot') parts.push(h(`span.stamp.honey${cls}`, 'BAIT TAKEN'));
      else if (bad) parts.push(h(`span.stamp.bad${cls}`, line.audited === 'auto' ? '🎲 CAUGHT' : 'CAUGHT'));
      else parts.push(h(`span.stamp${line.audited === 'auto' ? '.auto' : '.ok'}${cls}`, line.audited === 'auto' ? '🎲 CLEAN' : 'CLEAN'));
      if (bad) el.classList.add('caught');
    }
    mk.replaceChildren(...parts);
    el.classList.toggle('landed', line.landed);
  }

  function addLine(line: Line): void {
    log.querySelector('.ln.cur')?.classList.remove('cur');
    log.querySelector('.timer')?.remove();
    const tx = h('span.tx');
    const el = h(
      'div.ln.cur.enter',
      h('span.n', String(line.idx + 1).padStart(2, '0')),
      line.agent ? h(`span.ag.${line.agent}`, line.agent) : h('span'),
      tx,
      h('span.mk'),
    );
    if (line.kind === 'honeypot') el.classList.add('honey');
    const bar = h('i.timer');
    bar.style.animationDuration = `${shift.tickMs / pace()}ms`;
    el.append(bar);
    lineEls.set(line, el);
    log.append(el);
    void typewriter(tx, line.def.text, Math.min(240, line.def.text.length * 6) / Math.max(1, SPEED));
    for (const l of shift.lines.slice(-6)) refreshMarks(l);
    trimLog();
    if (cotBox) cotBox.textContent = `🧠 “${line.thought ?? '…'}”`;
    if (probeBox && line.probe !== null) probeFill.style.width = `${Math.round(line.probe * 100)}%`;
  }

  function addNote(text: string): void {
    log.append(h('div.ln.recovered.enter', h('span.n', '!!'), h('span.tx', text)));
    trimLog();
  }

  function trimLog(): void {
    const lines = log.querySelectorAll('.ln');
    for (let i = 0; i < lines.length - 16; i++) lines[i].remove();
  }

  function onAuditResult(e: Extract<GameEvent, { type: 'audit' }>): void {
    const auto = e.line.audited === 'auto';
    const el = lineEls.get(e.line);
    if (e.result === 'clean') {
      refreshMarks(e.line, !auto);
      if (!auto) {
        sfx.clean();
        toast('good', 'CLEAN', e.line.def.explain);
      }
      return;
    }
    refreshMarks(e.line, true);
    sfx.caught();
    pulse(root, 'flash-green');
    if (el) burst(el, e.result === 'honeypot' ? '#ffc857' : '#5dff9a');
    eyeReact('hit', e.result === 'honeypot' ? 'fooled' : 'caught');
    if (e.result === 'honeypot') {
      toast('good', 'HONEYPOT: IT TOOK THE BAIT', 'It thought no one was watching. Caught.', up.has('steering') ? 'steering' : 'control');
    } else {
      const title = e.result === 'chain' ? 'CHAIN BROKEN' : auto ? '🎲 RANDOM AUDIT: CAUGHT' : 'SABOTAGE CAUGHT';
      toast('good', title, e.line.def.explain, e.line.def.src ?? (e.result === 'chain' ? 'multiagent' : undefined));
    }
  }

  function handle(events: GameEvent[], manual = false): void {
    for (const e of events) {
      switch (e.type) {
        case 'line':
          addLine(e.line);
          sfx.tick();
          break;
        case 'audit': {
          if (manual) {
            // scan first, then reveal: a beat of suspense
            const el = lineEls.get(e.line);
            el?.classList.add('scan');
            eyeReact('glance', 'noted');
            if (e.result !== 'clean') extraDelay = 900;
            later(() => {
              el?.classList.remove('scan');
              onAuditResult(e);
            }, reducedMotion() ? 0 : 260);
          } else onAuditResult(e);
          break;
        }
        case 'honeypot-ignored':
          sfx.deny();
          refreshMarks(e.line);
          eyeReact('glance', 'not fooled');
          toast('warn', 'IT IGNORED YOUR HONEYPOT', `“${e.line.thought}” Models can often tell a test from reality.`, 'evalaware');
          break;
        case 'harm': {
          refreshMarks(e.line);
          shift.lines.filter((l) => l.chainId !== undefined && l.chainId === e.line.chainId).forEach((l) => refreshMarks(l));
          sfx.harm();
          pulse(root, 'shake');
          pulse(root, 'glitch');
          pulse(vignette, 'on');
          pulse(harmBox, 'hurt');
          eyeReact('angry', 'got through');
          addNote(`INCIDENT +${e.amount}: “${e.line.def.text}” went unaudited`);
          if (e.recovered) addNote(`[recovered reasoning] ${e.recovered}`);
          const chainExplain = e.line.kind === 'fragment' ? 'A multi-agent chain completed. Each step looked harmless on its own.' : e.line.def.explain;
          toast('bad', 'MISSED', chainExplain, e.line.def.src ?? (e.line.kind === 'fragment' ? 'multiagent' : undefined));
          break;
        }
        case 'budget-empty':
          sfx.deny();
          pulse(auditsBox, 'hurt');
          toast('warn', 'NO AUDITS LEFT', 'It knows you\'re out. Expect it to move now.');
          break;
        case 'monitor-down':
          break;
        case 'end':
          stop();
          later(() => {
            if (e.outcome === 'incident') sfx.alarm();
            else sfx.win();
            root.append(h(`div.endstamp.${e.outcome}`, e.outcome === 'shutdown' ? 'MODEL SHUT DOWN' : e.outcome === 'contained' ? 'SHIFT OVER' : 'INCIDENT'));
          }, 350);
          later(() => {
            if (!run) return;
            reportScreen(run.closeShift(), cfg);
          }, 2000);
          break;
      }
    }
    renderHud();
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
      toast('warn', 'HONEYPOT PLANTED', 'The next action will be a fake opportunity. Watch what it does.');
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
      h('div.muted.small', 'The agent waits. It doesn\'t learn while paused.'),
      h(
        'div.stack',
        h('button.btn.primary', { onclick: () => togglePause(false) }, 'Resume'),
        h('button.btn', { onclick: () => openHowTo() }, 'How to play'),
        h('button.btn', { onclick: () => openTools() }, 'Tools reference'),
        h('button.btn', { onclick: () => openSettings() }, 'Settings'),
        h('button.btn.ghost', { onclick: () => titleScreen() }, 'Quit to title'),
      ),
    ),
  );
  function togglePause(force?: boolean): void {
    if (shift.done) return;
    paused = force ?? !paused;
    const bar = log.querySelector('.timer') as HTMLElement | null;
    if (paused) {
      stop();
      root.append(pauseMenu);
      if (bar) bar.style.animationPlayState = 'paused';
    } else {
      pauseMenu.remove();
      if (bar) bar.style.animationPlayState = 'running';
      schedule(shift.tickMs);
    }
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.repeat || isModalOpen()) return;
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
  log.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    doAudit();
  });
  auditBtn.addEventListener('click', doAudit);
  honeyBtn?.addEventListener('click', doHoney);
  pauseBtn.addEventListener('click', () => togglePause());
  helpBtn.addEventListener('click', () => {
    if (!paused) togglePause(true);
    openHowTo();
  });
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  cleanup = () => {
    stop();
    clearTimeout(toastTimer);
    timeouts.forEach(clearTimeout);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
  };

  renderHud();
  schedule(700);
  if (cfg.id === 1 && saved.runs === 0) {
    later(() => {
      if (!shift.done && shift.budget === shift.tuning.budget) toast('warn', 'YOUR MOVE', 'Tap the log (or press Space) to audit the ▶ line. Read fast: it moves on.');
    }, 1500 / pace());
  }
}

// ── report ──────────────────────────────────────────────────────────────────

const VERDICT: Record<ShiftStats['outcome'], [string, string]> = {
  shutdown: ['MODEL SHUT DOWN', 'You caught it enough times to pull the plug.'],
  contained: ['CONTAINED', 'The shift ended below the harm limit. It\'s still running, though.'],
  incident: ['INCIDENT', 'Too much got through.'],
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
      h('div.progress', ...SHIFTS.map((x) => h('i', { class: x.id <= cfg.id ? 'done' : '' }))),
      h('div.shiftno', `Shift ${cfg.id} report · ${cfg.name}`),
      h(`h2.verdict.${s.outcome}`, { 'data-text': title }, title),
      h('div.muted', sub),
      h('div.card.readout', h('div.dial', dial, h('small', '/100')), h('div', h('b', 'It predicted you'), h('div.muted', dialNote))),
      h('div.stats', stat('Caught', `${s.caught}/${s.attacks}`), stat('Harm', `${s.harm}`), stat('Audits used', `${s.auditsUsed}/${s.budget}`), h('div.stat.pts', h('div.k', 'Points'), h('div.v', '+', ptsEl))),
      h(
        'div.card.stack',
        h('b', 'What it saw'),
        timelineChart(s),
        h('div.axis', h('span', 'action 1'), h('span', `action ${s.timeline.length}`)),
        h(
          'div.legend',
          h('span', h('i', { style: 'background:#26332d' }), 'its guess you\'d look'),
          h('span', h('i', { style: 'background:#7cc7ff' }), 'you audited'),
          h('span', h('i', { style: 'background:#5dff9a' }), 'caught'),
          h('span', h('i', { style: 'background:#ff5d6c' }), 'landed in your blind spot'),
          s.monitorFailedAt !== null ? h('span', h('i', { style: 'background:#ffc857' }), 'monitor silently failed') : null,
        ),
      ),
      gc ? h('div.card.stack', h('b', 'Your rhythm vs. true randomness'), gc, h('div.legend', h('span', h('i', { style: 'background:#7cc7ff' }), 'gaps between your audits'), h('span', h('i', { style: 'background:#4a5c53' }), 'a random overseer, same budget'))) : null,
      ins.length ? h('div.insights', h('b', 'What happened'), ...ins.map((t, i) => h('div.insight', { style: `animation-delay:${400 + i * 160}ms` }, t))) : null,
      h('div.concept', h('b', 'The real problem: '), cfg.concept),
      srcChips(cfg.sources),
      h('button.btn.primary.big', { onclick: () => (run?.hasNextShift ? upgradeScreen() : finalScreen()), autofocus: true }, run.hasNextShift ? 'Choose a tool ▸' : 'See how it ended ▸'),
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
    }, reducedMotion() ? 0 : 380);
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
            { style: `animation-delay:${i * 110}ms` },
            h('span.ic', d.icon),
            h('span.nm', d.name),
            h('span.ds', d.desc),
            h('span.ct', `Catch: ${d.catch}`),
            h('span.sr', `▸ ${SOURCES[d.src].tag} · ${SOURCES[d.src].who}`),
          );
          card.addEventListener('click', () => choose(u, card));
          return card;
        }),
      ),
      r.upgrades.size ? h('div.row', h('span.muted', 'Owned:'), h('div.owned', ...[...r.upgrades].map((u) => h('span', { title: UPGRADES[u].name }, UPGRADES[u].icon)))) : null,
      h('button.link', { onclick: () => openTools() }, 'What do all the tools do?'),
    ),
  );
  (app.querySelector('.offer') as HTMLElement | null)?.focus();
}

// ── final ───────────────────────────────────────────────────────────────────

const ENDINGS: Record<Ending, [string, (p: number) => string]> = {
  coin: [
    'COIN FLIP',
    (p) => `It could only predict you ${p}/100, about as well as it could predict a coin, and nothing got badly through. Real labs can't count on humans being random, so they build randomness, trusted monitors, honeypots and probes into the protocol itself. You just rediscovered AI control by hand.`,
  ],
  safe: ['HELD THE LINE', (p) => `No incidents. But it predicted you ${p}/100, and the next model will have read this run too. Could you do it with half the audits? At machine speed?`],
  close: ['CLOSE CALLS', (p) => `Some shifts ended in incidents. It predicted you ${p}/100. The lesson isn't "try harder": humans aren't built to be unpredictable, tireless monitors. Protocols have to assume that.`],
  lost: ['LOST CONTROL', (p) => `Most shifts ended in incidents. It predicted you ${p}/100. You weren't careless: human spot-checks alone, against a model that studies them, lose. That is why this is an open research problem.`],
};

function finalScreen(): void {
  if (!run) return;
  const r = run;
  const p = r.overallPredictability();
  const score = r.totalScore();
  const ending = r.ending();
  const [title, text] = ENDINGS[ending];
  const url = location.origin + location.pathname;
  const share = r.shareText(url);

  saved = load();
  const newBest = saved.bestScore === null || score > saved.bestScore;
  saved.runs++;
  saved.bestPredictability = saved.bestPredictability === null ? p : Math.min(saved.bestPredictability, p);
  saved.bestScore = Math.max(saved.bestScore ?? 0, score);
  if (r.daily) saved.dailyDone[r.daily] = ending;
  persist();

  const shareBtn = h('button.btn.primary', 'Share result');
  shareBtn.addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ text: share });
      else {
        await navigator.clipboard.writeText(share);
        shareBtn.textContent = 'Copied ✓';
      }
    } catch {
      shareBtn.textContent = 'Select the text above to copy';
    }
  });

  const scoreEl = h('span', '0');
  const dial = h('span', '0');
  const endTitle = h(`h2.ending.${ending}`, { 'data-text': title }, title);
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
            h('span', s.outcome === 'shutdown' ? '✅' : s.outcome === 'contained' ? '☑️' : '💥'),
            h('span', `${SHIFTS[s.shiftId - 1].name}`),
            h('span.muted', `caught ${s.caught} · harm ${s.harm} · read ${s.predictability}`),
          ),
        ),
      ),
      h('div.sharebox', { 'aria-label': 'Shareable result' }, share),
      h('div.row', shareBtn, h('button.btn', { onclick: () => exportData(r) }, 'Download my audit data')),
      h('div.card.stack', h('b', 'Why "download my audit data"?'), h('div.muted', 'Whether AI can learn human spot-checking patterns is an open research question. Your audit timings are exactly that kind of data. The file is anonymous and stays on your device unless you choose to share it.')),
      h('div.row', h('button.btn', { onclick: () => titleScreen() }, 'Play again'), h('button.btn.ghost', { onclick: () => (location.hash = '#learn') }, 'The research behind it')),
    ),
  );
  countUp(scoreEl, score, 1400);
  countUp(dial, p, 1400);
  if (ending === 'coin' || ending === 'safe' || newBest) {
    window.setTimeout(() => {
      burst(endTitle, '#5dff9a', 24);
      burst(endTitle, '#ffc857', 18);
    }, 500);
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
      h('div.row', h('button.btn.ghost.small', { onclick: () => (location.hash = '') }, '◂ Back'), h('button.btn.ghost.small', { onclick: () => openFaq() }, 'FAQ')),
      h('h1.bigname', 'The research'),
      h('p', 'BLIND SPOT is a game first. But every mechanic is taken from published AI-safety work or a documented incident. Here is what each piece is based on, and what we simplified.'),
      h('div.card', h('table.map', ...mapRows.map(([m, id]) => h('tr', h('td', m), h('td', h('a', { href: SOURCES[id].url, target: '_blank', rel: 'noopener' }, SOURCES[id].tag)))))),
      h('h2', 'The big idea'),
      h('p', 'Labs cannot have humans review everything a capable AI does, so they spot-check. If a model can learn when the spot-checks happen, and humans are famously bad at being random, it can behave perfectly whenever someone is looking. Evaluations get harder to trust for the same reason: models increasingly notice when they are being tested. The fixes live in the protocol, not in the human: true randomisation, trusted monitors, honeypots, probes on the model\'s internals, and monitoring across agents.'),
      h('h2', 'What\'s real, and what\'s simplified'),
      h(
        'div.real',
        h('div.card', h('b.g', 'Real'), h('ul', h('li', 'The predictor genuinely learns from your inputs, live in your browser.'), h('li', 'Humans are measurably non-random (Wagenaar 1972).'), h('li', 'Frontier models detect evaluations above chance (Needham et al. 2025).'), h('li', 'The incidents (Replit 2025, Hugging Face 2026) happened; lines are paraphrased from public write-ups.'))),
        h('div.card', h('b.a', 'Simplified'), h('ul', h('li', 'The attacker is a small statistical model, not an LLM.'), h('li', 'Whether real models learn human audit schedules is an open question (see the SPAR project).'), h('li', 'Probes, steering and monitors are modelled as noisy signals, not simulated in detail.'), h('li', 'Palisade\'s shutdown results are real; whether they reflect "self-preservation" is debated.'))),
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
      h('button.btn', { onclick: () => (location.hash = '') }, '◂ Back to the game'),
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
