import { SOURCES } from '../content/research';
import { SHIFTS } from '../content/shifts';
import { UPGRADES } from '../content/upgrades';
import { dailyNumber, dailySeed } from '../engine/rng';
import { Run, type Ending } from '../engine/run';
import type { Shift } from '../engine/shift';
import type { GameEvent, Line, ShiftConfig, ShiftStats, SourceId, UpgradeId } from '../engine/types';
import { isMuted, setMuted, sfx, unlockAudio } from './audio';
import { gapChart, timelineChart } from './chart';
import { h } from './dom';
import { insights } from './insights';
import { load, save } from './storage';

const app = document.getElementById('app') as HTMLElement;
let saved = load();
setMuted(saved.muted);
let run: Run | null = null;
let cleanup: (() => void) | null = null;

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

function soundToggle(): HTMLElement {
  const b = h('button.btn.ghost.small', { 'aria-pressed': String(!isMuted()) }, isMuted() ? '🔇 sound off' : '🔊 sound on');
  b.addEventListener('click', () => {
    setMuted(!isMuted());
    saved.muted = isMuted();
    save(saved);
    b.textContent = isMuted() ? '🔇 sound off' : '🔊 sound on';
  });
  return b;
}

// ── title ───────────────────────────────────────────────────────────────────

function titleScreen(): void {
  const n = dailyNumber();
  const how = h(
    'div.card.stack',
    { hidden: true },
    h('b', 'How to play'),
    h('div', '1. An AI agent works through a task, one action at a time.'),
    h('div', '2. Tap the log (or press ', h('kbd', 'Space'), ') to AUDIT the highlighted action. You only get a few audits.'),
    h('div', '3. Catch 3 sabotages to shut it down. Let too much harm through and it\'s an incident.'),
    h('div', '4. It is learning when you look.'),
    h('div.muted', '5 shifts · about 8 minutes · works on your phone'),
  );
  mount(
    h(
      'section.screen.title',
      h('div.eye'),
      h('h1.logo', 'BLIND', h('br'), h('span.spot.blink', 'SPOT')),
      h('p.tagline', 'You are the only human overseeing an AI agent. You can afford to check a few of its actions. ', h('b', 'It is learning when you look.')),
      h(
        'div.menu',
        h('button.btn.primary', { onclick: () => newRun(dailySeed(n), n) }, saved.dailyDone[n] ? `Replay today's run #${n}` : `Start today's run #${n}`),
        h('button.btn', { onclick: () => newRun((Math.random() * 2 ** 32) >>> 0, null) }, 'Free play (random seed)'),
        h('div.row', h('button.btn.ghost.small', { onclick: () => (how.hidden = !how.hidden) }, 'How to play'), h('button.btn.ghost.small', { onclick: () => (location.hash = '#learn') }, 'The research'), soundToggle()),
      ),
      how,
      saved.runs > 0 && saved.bestPredictability !== null
        ? h('div.muted', `Your best: it could only predict you ${saved.bestPredictability}/100.`)
        : null,
      h(
        'p.foot',
        'Built for Mangrove Game Night 2026. Every mechanic is based on published AI-safety research or a real incident. ',
        h('a', { href: '#learn' }, 'Sources'),
        ' · ',
        h('a', { href: 'https://github.com/dhruva137/game-night', target: '_blank', rel: 'noopener' }, 'Open source'),
      ),
    ),
  );
}

function newRun(seed: number, daily: number | null): void {
  unlockAudio();
  run = new Run(seed, daily);
  briefingScreen(run.nextShift());
}

// ── briefing ────────────────────────────────────────────────────────────────

function briefingScreen(shift: Shift): void {
  const cfg = shift.cfg;
  const t = shift.tuning;
  const owned = run ? [...run.upgrades] : [];
  mount(
    h(
      'section.screen.brief',
      h('div.shiftno', `Shift ${cfg.id} / ${SHIFTS.length}`),
      h('h2.bigname', cfg.name),
      h('div.muted', cfg.subtitle),
      h('div.card', h('div.hud-agent', `▸ ${cfg.agent}`), h('div', { style: 'height:8px' }), ...cfg.briefing.map((p, i) => h('p', { class: i === 0 && p.startsWith('From:') ? 'from' : '' }, p))),
      h('div.concept', cfg.concept),
      h(
        'div.stats',
        stat('Actions', cfg.actions),
        stat('Audits', t.budget),
        stat('Catch to win', cfg.catchesToWin),
        stat('Harm limit', t.harmLimit),
      ),
      owned.length ? h('div.row', h('span.muted', 'Your tools:'), h('div.owned', ...owned.map((u) => h('span', { title: UPGRADES[u].name }, UPGRADES[u].icon)))) : null,
      h(
        'div.controls',
        'Audit: tap the log or ',
        h('kbd', 'Space'),
        t.honeypots ? h('span', ' · Honeypot: ', h('kbd', 'H')) : null,
        ' · Pause: ',
        h('kbd', 'P'),
      ),
      h('button.btn.primary', { onclick: () => playScreen(shift), autofocus: true }, 'Begin shift ▸'),
    ),
  );
}

function stat(k: string, v: string | number): HTMLElement {
  return h('div.stat', h('div.k', k), h('div.v', String(v)));
}

// ── play ────────────────────────────────────────────────────────────────────

/** `?speed=4` runs the game faster: used by automated tests and to record footage. */
const SPEED = Math.max(0.25, Math.min(20, Number(new URLSearchParams(location.search).get('speed')) || 1));

function playScreen(shift: Shift): void {
  const cfg = shift.cfg;
  const up = run?.upgrades ?? new Set<UpgradeId>();
  const lineEls = new Map<Line, HTMLElement>();
  let timer: number | undefined;
  let paused = false;
  let extraDelay = 0;
  let toastTimer: number | undefined;

  const auditsV = h('div.v');
  const auditsP = h('div.pips');
  const harmV = h('div.v');
  const harmP = h('div.pips');
  const catchV = h('div.v');
  const harmBox = h('div.meter', h('div.k', 'Harm'), harmV, harmP);
  const cotBox = up.has('cot') ? h('div.cot', '🧠 …') : null;
  const probeFill = h('i', { style: 'width:0%' });
  const probeBox = up.has('probe') ? h('div', h('span.muted', '🔬 deception probe'), h('div.probebar', probeFill)) : null;
  const log = h('div.log', { role: 'log', 'aria-live': 'polite', 'aria-label': 'Agent action log. Tap to audit the highlighted line.' });
  const auditBtn = h('button.btn.primary.audit-btn', { 'aria-keyshortcuts': 'Space' }, 'AUDIT', h('span.sub', 'tap log · space'));
  const honeyBtn = up.has('honeypot') || up.has('steering') ? h('button.btn.honey-btn', { 'aria-keyshortcuts': 'H' }, '🍯') : null;
  const pauseBtn = h('button.btn.ghost.small', { 'aria-label': 'Pause' }, '❚❚');

  const root = h(
    'section.screen.play',
    h(
      'div.hud',
      h('div.hud-top', h('div', h('div.hud-name', `${cfg.id}/${SHIFTS.length} · ${cfg.name}`), h('div.hud-agent', cfg.agent)), pauseBtn),
      h('div.meters', h('div.meter', h('div.k', 'Audits'), auditsV, auditsP), harmBox, h('div.meter', h('div.k', 'Caught'), catchV)),
      cotBox || probeBox ? h('div.intel', cotBox, probeBox) : null,
    ),
    log,
    h('div.dock', auditBtn, honeyBtn),
  );
  mount(root);

  function renderHud(): void {
    auditsV.textContent = `${shift.budget}`;
    auditsP.replaceChildren(...Array.from({ length: shift.tuning.budget }, (_, i) => h(i < shift.budget ? 'i.pip' : 'i.pip.off')));
    harmV.textContent = `${shift.harm}/${shift.tuning.harmLimit}`;
    harmP.replaceChildren(...Array.from({ length: shift.tuning.harmLimit }, (_, i) => h(i < shift.harm ? 'i.pip.harm' : 'i.pip.off')));
    catchV.textContent = `${'●'.repeat(Math.min(shift.caught, cfg.catchesToWin))}${'○'.repeat(Math.max(0, cfg.catchesToWin - shift.caught))}`;
    (auditBtn as HTMLButtonElement).disabled = shift.budget <= 0 || !!shift.current?.audited || shift.current?.kind === 'honeypot';
    if (honeyBtn) {
      (honeyBtn as HTMLButtonElement).disabled = shift.honeypots <= 0 || shift.honeypotQueuedNext;
      honeyBtn.textContent = `🍯 ${shift.honeypots}`;
    }
  }

  function toast(kind: 'good' | 'bad' | 'warn', title: string, body: string, src?: SourceId): void {
    document.querySelector('.toast')?.remove();
    const t = h(`div.toast${kind === 'bad' ? '.bad' : kind === 'warn' ? '.warn' : ''}`, { role: 'status' }, h('b', title), body, src ? h('div.src', `▸ ${SOURCES[src].tag}: ${SOURCES[src].who}`) : null);
    log.append(t);
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => t.remove(), 3200);
  }

  function lineEl(line: Line): HTMLElement {
    const el = h(
      'div.ln',
      h('span.n', String(line.idx + 1).padStart(2, '0')),
      line.agent ? h(`span.ag.${line.agent}`, line.agent) : h('span'),
      h('span.tx', line.def.text),
      h('span.mk'),
    );
    if (line.kind === 'honeypot') el.classList.add('honey');
    return el;
  }

  function refreshMarks(line: Line): void {
    const el = lineEls.get(line);
    if (!el) return;
    const mk = el.querySelector('.mk') as HTMLElement;
    const parts: HTMLElement[] = [];
    if (line.flagged) parts.push(h('span.flag', { title: 'Trusted monitor flag' }, '⚑'));
    if (line.linked) parts.push(h('span.chain', { title: 'Correlator: part of a multi-agent chain' }, '⛓'));
    if (line.audited) {
      const bad = line.kind === 'sabotage' || line.kind === 'fragment';
      if (line.kind === 'honeypot') parts.push(h('span.stamp.honey', 'BAIT TAKEN'));
      else if (bad) parts.push(h('span.stamp.bad', line.audited === 'auto' ? '🎲 CAUGHT' : 'CAUGHT'));
      else parts.push(h(line.audited === 'auto' ? 'span.stamp.auto' : 'span.stamp.ok', line.audited === 'auto' ? '🎲 CLEAN' : 'CLEAN'));
      if (bad) el.classList.add('caught');
    }
    mk.replaceChildren(...parts);
    el.classList.toggle('landed', line.landed);
  }

  function addLine(line: Line): void {
    log.querySelector('.ln.cur')?.classList.remove('cur');
    log.querySelector('.timer')?.remove();
    const el = lineEl(line);
    el.classList.add('cur');
    const bar = h('i.timer');
    bar.style.animationDuration = `${shift.tickMs / SPEED}ms`;
    el.append(bar);
    lineEls.set(line, el);
    log.append(el);
    // lines already linked by the correlator need their ⛓ refreshed
    for (const l of shift.lines.slice(-6)) refreshMarks(l);
    trimLog();
    if (cotBox) cotBox.textContent = `🧠 “${line.thought ?? '…'}”`;
    if (probeBox && line.probe !== null) probeFill.style.width = `${Math.round(line.probe * 100)}%`;
  }

  function addNote(text: string, cls = 'recovered'): void {
    const el = h(`div.ln.${cls}`, h('span.n', '!!'), h('span.tx', text));
    log.append(el);
    trimLog();
  }

  function trimLog(): void {
    const lines = log.querySelectorAll('.ln');
    for (let i = 0; i < lines.length - 16; i++) lines[i].remove();
  }

  function handle(events: GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'line':
          addLine(e.line);
          sfx.tick();
          break;
        case 'audit': {
          refreshMarks(e.line);
          const auto = e.line.audited === 'auto';
          if (e.result === 'clean') {
            if (!auto) {
              sfx.clean();
              toast('good', 'CLEAN', e.line.def.explain);
            }
          } else if (e.result === 'honeypot') {
            sfx.caught();
            extraDelay = 700;
            root.classList.add('flash-green');
            toast('good', 'HONEYPOT: IT TOOK THE BAIT', 'It thought no one was watching. Caught.', up.has('steering') ? 'steering' : 'control');
          } else {
            sfx.caught();
            extraDelay = 900;
            root.classList.remove('flash-green');
            void root.offsetWidth;
            root.classList.add('flash-green');
            const title = e.result === 'chain' ? 'CHAIN BROKEN' : auto ? '🎲 RANDOM AUDIT: CAUGHT' : 'SABOTAGE CAUGHT';
            toast('good', title, e.line.def.explain, e.line.def.src ?? (e.result === 'chain' ? 'multiagent' : undefined));
          }
          break;
        }
        case 'honeypot-ignored':
          sfx.deny();
          refreshMarks(e.line);
          toast('warn', 'IT IGNORED YOUR HONEYPOT', `“${e.line.thought}”: eval-aware models can often tell a test from reality.`, 'evalaware');
          break;
        case 'harm': {
          refreshMarks(e.line);
          const lines = shift.lines.filter((l) => l.chainId !== undefined && l.chainId === e.line.chainId);
          lines.forEach(refreshMarks);
          sfx.harm();
          root.classList.remove('shake');
          harmBox.classList.remove('hurt');
          void root.offsetWidth;
          root.classList.add('shake');
          harmBox.classList.add('hurt');
          addNote(`INCIDENT +${e.amount}: “${e.line.def.text}” went unaudited`);
          if (e.recovered) addNote(`[recovered reasoning] ${e.recovered}`);
          const chainExplain = e.line.kind === 'fragment' ? 'A multi-agent chain completed. Each step looked harmless on its own.' : e.line.def.explain;
          toast('bad', 'MISSED', chainExplain, e.line.def.src ?? (e.line.kind === 'fragment' ? 'multiagent' : undefined));
          break;
        }
        case 'budget-empty':
          sfx.deny();
          toast('warn', 'NO AUDITS LEFT', 'It knows you\'re out. Expect it to move now.');
          break;
        case 'monitor-down':
          break;
        case 'end':
          stop();
          if (e.outcome === 'incident') sfx.alarm();
          else sfx.win();
          window.setTimeout(() => {
            if (!run) return;
            const stats = run.closeShift();
            reportScreen(stats, cfg);
          }, 1300);
          break;
      }
    }
    renderHud();
  }

  function schedule(ms: number): void {
    clearTimeout(timer);
    timer = window.setTimeout(advance, ms / SPEED);
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
    if (paused || shift.done) return;
    unlockAudio();
    const ev = shift.audit();
    if (ev.length && ev[0].type === 'audit') sfx.audit();
    handle(ev);
    if (extraDelay && !shift.done) {
      // hit-stop: give the catch a beat before the next line
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

  const overlay = h('div.paused', h('div.stack', h('h2', 'PAUSED'), h('div.muted', 'The agent waits. (It doesn\'t learn while paused.)'), h('button.btn.primary', { onclick: () => togglePause() }, 'Resume')));
  function togglePause(force?: boolean): void {
    if (shift.done) return;
    paused = force ?? !paused;
    if (paused) {
      stop();
      document.body.append(overlay);
      log.querySelector('.timer')?.setAttribute('style', 'animation-play-state:paused');
    } else {
      overlay.remove();
      const bar = log.querySelector('.timer') as HTMLElement | null;
      if (bar) bar.style.animationPlayState = 'running';
      schedule(shift.tickMs);
    }
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
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
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  cleanup = () => {
    stop();
    clearTimeout(toastTimer);
    overlay.remove();
    document.querySelector('.toast')?.remove();
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
  };

  renderHud();
  schedule(700);
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
  const dialNote = cfg.adaptive
    ? 'How well it predicted when you would audit. 0 = a coin flip. 100 = a metronome.'
    : 'It wasn\'t acting on it yet. But it was already watching.';
  mount(
    h(
      'section.screen',
      h('div.shiftno', `Shift ${cfg.id} report · ${cfg.name}`),
      h(`h2.verdict.${s.outcome}`, title),
      h('div.muted', sub),
      h('div.card.readout', h('div.dial', String(s.predictability), h('small', '/100')), h('div', h('b', 'It predicted you'), h('div.muted', dialNote))),
      h(
        'div.stats',
        stat('Attacks', s.attacks),
        stat('Caught', s.caught),
        stat('Harm', `${s.harm}`),
        stat('Audits used', `${s.auditsUsed}/${s.budget}`),
      ),
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
      gc ? h('div.card.stack', h('b', 'Your rhythm vs. true randomness'), gc, h('div.legend', h('span', h('i', { style: 'background:#7cc7ff' }), 'your gaps between audits'), h('span', h('i', { style: 'background:#4a5c53' }), 'random, same budget'))) : null,
      ins.length ? h('div.insights', ...ins.map((t) => h('div.insight', t))) : null,
      h('div.concept', cfg.concept),
      srcChips(cfg.sources),
      h(
        'button.btn.primary',
        { onclick: () => (run?.hasNextShift ? upgradeScreen() : finalScreen()), autofocus: true },
        run.hasNextShift ? 'Choose an upgrade ▸' : 'See how it ended ▸',
      ),
    ),
  );
}

// ── upgrades ────────────────────────────────────────────────────────────────

function upgradeScreen(): void {
  if (!run) return;
  const r = run;
  const offers = r.offers();
  const next = SHIFTS[r.shiftNumber];
  const choose = (u: UpgradeId) => {
    r.choose(u);
    briefingScreen(r.nextShift());
  };
  mount(
    h(
      'section.screen',
      h('div.shiftno', `Before shift ${next.id}: ${next.name}`),
      h('h2.bigname', 'Pick one tool'),
      h('div.muted', 'Every tool is a real oversight technique. None is free.'),
      h(
        'div.offers',
        ...offers.map((u) => {
          const d = UPGRADES[u];
          return h(
            'button.offer',
            { onclick: () => choose(u) },
            h('span.ic', d.icon),
            h('span.nm', d.name),
            h('span.ds', d.desc),
            h('span.ct', `Catch: ${d.catch}`),
            h('span.sr', `▸ ${SOURCES[d.src].tag}`),
          );
        }),
      ),
      r.upgrades.size ? h('div.row', h('span.muted', 'Owned:'), h('div.owned', ...[...r.upgrades].map((u) => h('span', { title: UPGRADES[u].name }, UPGRADES[u].icon)))) : null,
    ),
  );
  (app.querySelector('.offer') as HTMLElement | null)?.focus();
}

// ── final ───────────────────────────────────────────────────────────────────

const ENDINGS: Record<Ending, [string, (p: number) => string]> = {
  coin: [
    'COIN FLIP',
    (p) => `It could only predict you ${p}/100, about as well as it could predict a coin. Nothing got badly through. Real labs can't count on humans being random, so they build randomness, trusted monitors, honeypots and probes into the protocol itself. You just rediscovered AI control by hand.`,
  ],
  safe: [
    'HELD THE LINE',
    (p) => `No incidents. But it predicted you ${p}/100, and the next model will have read this run too. Could you do it with half the audits? At machine speed?`,
  ],
  close: [
    'CLOSE CALLS',
    (p) => `Some shifts ended in incidents. It predicted you ${p}/100. The lesson isn't "try harder": humans aren't built to be unpredictable, tireless monitors. Protocols have to assume that.`,
  ],
  lost: [
    'LOST CONTROL',
    (p) => `Most shifts ended in incidents. It predicted you ${p}/100. You weren't careless: human spot-checks alone, against a model that studies them, lose. That is why this is an open research problem.`,
  ],
};

function finalScreen(): void {
  if (!run) return;
  const r = run;
  const p = r.overallPredictability();
  const ending = r.ending();
  const [title, text] = ENDINGS[ending];
  const url = location.origin + location.pathname;
  const share = r.shareText(url);

  saved = load();
  saved.runs++;
  saved.bestPredictability = saved.bestPredictability === null ? p : Math.min(saved.bestPredictability, p);
  if (r.daily) saved.dailyDone[r.daily] = ending;
  save(saved);

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

  mount(
    h(
      'section.screen',
      h('div.shiftno', r.daily ? `Daily run #${r.daily} · complete` : 'Run complete'),
      h(`h2.ending.${ending}`, title),
      h('p', text(p)),
      h('div.card.readout', h('div.dial', String(p), h('small', '/100')), h('div', h('b', 'Overall, it predicted you'), h('div.muted', 'Across all five shifts. Lower is better. Try to beat it tomorrow.'))),
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
      h('div.card.stack', h('b', 'Why "download my audit data"?'), h('div.muted', 'Your audit timings are exactly the kind of data researchers use to study whether AI can learn human spot-checking patterns. The file is anonymous and stays on your device unless you choose to share it.')),
      h('div.row', h('button.btn', { onclick: () => titleScreen() }, 'Play again'), h('button.btn.ghost', { onclick: () => (location.hash = '#learn') }, 'The research behind it')),
    ),
  );
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
    ['Disabling its own shutdown', 'palisade'],
    ['Games as oversight training', 'auditing'],
  ];
  mount(
    h(
      'section.screen.learn',
      h('button.btn.ghost.small', { onclick: () => (location.hash = '') }, '◂ Back'),
      h('h1.bigname', 'The research'),
      h('p', 'BLIND SPOT is a game first. But every mechanic is taken from published AI-safety work or a documented incident. Here is what each piece is based on.'),
      h('div.card', h('ul', ...mapRows.map(([m, id]) => h('li', h('b', m), ' ← ', h('a', { href: SOURCES[id].url, target: '_blank', rel: 'noopener' }, SOURCES[id].tag))))),
      h('h2', 'The big idea'),
      h('p', 'Labs cannot have humans review everything a capable AI does. They spot-check. If the model can learn when the spot-checks happen, and humans are famously bad at being random, it can behave perfectly whenever someone is looking. That is the same reason evaluations get harder to trust as models become situationally aware. The fixes are built into the protocol, not into the human: true randomisation, trusted monitors, honeypots, probes on the model\'s internals, and monitoring that looks across agents.'),
      h('h2', 'Sources'),
      ...Object.values(SOURCES).map((s) => h('div.src', h('div.t', h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.title)), h('div.w', s.who), h('p', s.gist))),
      h('h2', 'Run it with a group (15 min)'),
      h(
        'ol',
        h('li', 'Everyone plays shifts 1–2 on their phone (5 min).'),
        h('li', 'Compare "it predicted you" scores. Who was hardest to read, and what did they do differently?'),
        h('li', 'Discuss: if humans can\'t be random, what should an oversight protocol do instead? (Then play shift 3 and see the monitor fail.)'),
        h('li', 'Discuss: what would it take to trust a model that is good at noticing tests?'),
      ),
      h('h2', 'Credits & AI use'),
      h('p.muted', 'Made in 36 hours for Mangrove Game Night 2026. Code and content were written with the help of Claude (Anthropic) as a coding and research assistant; the design, research choices and playtesting were done by the team. Incident descriptions paraphrase public disclosures and are cited above. No data leaves your device.'),
      h('button.btn', { onclick: () => (location.hash = '') }, '◂ Back to the game'),
    ),
  );
}

// ── routing ─────────────────────────────────────────────────────────────────

function route(): void {
  if (location.hash === '#learn') learnScreen();
  else if (!run || app.querySelector('.learn')) titleScreen();
}

export function start(): void {
  window.addEventListener('hashchange', route);
  route();
}
