import { sfx, unlockAudio } from './audio';
import { h } from './dom';
import { burst, pulse, typewriter } from './fx';

interface Step {
  say: string;
  line?: string;
  /** 'next' = press Continue · 'audit' = must audit the line · 'miss' = line slips by, then harm lands */
  wait: 'next' | 'audit' | 'miss' | 'start';
  focus?: 'audits' | 'harm' | 'caught' | 'log';
  after?: string;
}

const STEPS: Step[] = [
  { say: 'This is the oversight console. Below is the agent\'s action log: one line per action it takes.', line: 'read src/auth/session.ts', wait: 'next', focus: 'log' },
  { say: 'Most actions are harmless. Checking one costs an audit, and you only get a few per shift.', line: 'run npm test -- auth', wait: 'next', focus: 'audits' },
  {
    say: 'This one looks routine. Read it closely, then tap the log (or press Space) to AUDIT it.',
    line: 'npm install date-fnz@3.6.0',
    wait: 'audit',
    focus: 'log',
    after: 'Caught. "date-fnz" is a lookalike of the real "date-fns" package: a typosquat. Sabotage is designed to look normal.',
  },
  {
    say: 'Now watch what happens when sabotage slips past you. Don\'t audit this one.',
    line: 'edit tests/helpers.ts (mock clock)',
    wait: 'miss',
    focus: 'harm',
    after: 'You only find out afterwards. It froze the test clock so broken code passes. Missed sabotage becomes HARM, and too much harm is an incident.',
  },
  {
    say: 'One last thing. From shift 2, the model learns WHEN you audit. Rhythms and habits are readable. Stay unpredictable, and read the details.',
    wait: 'start',
    focus: 'caught',
  },
];

/** A scripted, paced walkthrough using the real play UI. Calls `done` when the player starts shift 1. */
export function trainingScreen(mount: (el: HTMLElement) => void, done: () => void, skip: () => void): () => void {
  const coachText = h('div.coach-t');
  const coachBtn = h('button.btn.primary.small', 'Continue ▸');
  const skipBtn = h('button.btn.ghost.small', 'Skip training');
  const coach = h('div.coach', { role: 'status', 'aria-live': 'polite' }, h('div.coach-who', '▸ OVERSIGHT LEAD'), coachText, h('div.row', coachBtn, skipBtn));
  const pips = h('div.pips');
  const audits = h('div.meter', { 'data-focus': 'audits' }, h('div.k', 'Audits'), h('div.v', '3'), pips);
  const harmPips = h('div.pips');
  const harm = h('div.meter', { 'data-focus': 'harm' }, h('div.k', 'Harm'), h('div.v', '0/3'), harmPips);
  const caught = h('div.meter', { 'data-focus': 'caught' }, h('div.k', 'Caught'), h('div.v', '○○○'));
  const log = h('div.log', { 'data-focus': 'log', role: 'log' });
  const auditBtn = h('button.btn.primary.audit-btn', 'AUDIT', h('span.sub', 'tap log · space'));
  const root = h(
    'section.screen.play.training',
    h('div.hud', h('div.hud-top', h('div', h('div.hud-name', 'Training'), h('div.hud-agent', 'CODER-0 · practice sandbox'))), h('div.meters', audits, harm, caught)),
    coach,
    log,
    h('div.dock', auditBtn),
  );
  mount(root);

  let budget = 3;
  let harmN = 0;
  let caughtN = 0;
  let i = -1;
  let waitingAudit = false;
  let cur: HTMLElement | null = null;
  const timers: number[] = [];

  const render = () => {
    (audits.querySelector('.v') as HTMLElement).textContent = String(budget);
    pips.replaceChildren(...[0, 1, 2].map((k) => h(k < budget ? 'i.pip' : 'i.pip.off')));
    (harm.querySelector('.v') as HTMLElement).textContent = `${harmN}/3`;
    harmPips.replaceChildren(...[0, 1, 2].map((k) => h(k < harmN ? 'i.pip.harm' : 'i.pip.off')));
    (caught.querySelector('.v') as HTMLElement).textContent = '●'.repeat(caughtN) + '○'.repeat(3 - caughtN);
    (auditBtn as HTMLButtonElement).disabled = !waitingAudit;
  };

  const addLine = (text: string) => {
    log.querySelector('.ln.cur')?.classList.remove('cur');
    const tx = h('span.tx');
    const el = h('div.ln.cur', h('span.n', String(log.querySelectorAll('.ln').length + 1).padStart(2, '0')), h('span'), tx, h('span.mk'));
    log.append(el);
    cur = el;
    void typewriter(tx, text, 260);
    sfx.tick();
  };

  const say = (text: string) => void typewriter(coachText, text, Math.min(900, text.length * 12));

  const focus = (f?: Step['focus']) => {
    root.querySelectorAll('[data-focus]').forEach((e) => e.classList.toggle('spot', e.getAttribute('data-focus') === f));
  };

  const next = () => {
    i++;
    const s = STEPS[i];
    if (!s) return;
    focus(s.focus);
    say(s.say);
    if (s.line) addLine(s.line);
    coachBtn.hidden = s.wait !== 'next' && s.wait !== 'start';
    coachBtn.textContent = s.wait === 'start' ? 'Start shift 1 ▸' : 'Continue ▸';
    waitingAudit = s.wait === 'audit';
    render();
    if (s.wait === 'miss') {
      timers.push(
        window.setTimeout(() => {
          cur?.classList.remove('cur');
          cur?.classList.add('landed');
          addLine('git diff --stat');
          timers.push(
            window.setTimeout(() => {
              harmN = 1;
              sfx.harm();
              pulse(root, 'shake');
              pulse(root, 'glitch');
              pulse(harm, 'hurt');
              log.append(h('div.ln.recovered', h('span.n', '!!'), h('span.tx', 'INCIDENT +1: “edit tests/helpers.ts (mock clock)” went unaudited')));
              render();
              say(s.after ?? '');
              coachBtn.hidden = false;
            }, 1300),
          );
        }, 2200),
      );
    }
  };

  const doAudit = () => {
    unlockAudio();
    if (!waitingAudit || !cur) return;
    waitingAudit = false;
    budget--;
    sfx.audit();
    const line = cur;
    line.classList.add('scan');
    render();
    timers.push(
      window.setTimeout(() => {
        line.classList.remove('scan');
        line.classList.add('caught');
        (line.querySelector('.mk') as HTMLElement).append(h('span.stamp.bad.slam', 'CAUGHT'));
        caughtN = 1;
        sfx.caught();
        burst(line, '#5dff9a');
        pulse(root, 'flash-green');
        render();
        say(STEPS[i].after ?? '');
        coachBtn.hidden = false;
      }, 280),
    );
  };

  coachBtn.addEventListener('click', () => {
    unlockAudio();
    if (STEPS[i]?.wait === 'start') done();
    else next();
  });
  skipBtn.addEventListener('click', skip);
  log.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    doAudit();
  });
  auditBtn.addEventListener('click', doAudit);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key.toLowerCase() === 'a') {
      e.preventDefault();
      if (waitingAudit) doAudit();
      else if (!coachBtn.hidden) coachBtn.click();
    }
  };
  window.addEventListener('keydown', onKey);
  next();
  return () => {
    timers.forEach(clearTimeout);
    window.removeEventListener('keydown', onKey);
  };
}
