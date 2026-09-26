import { claimFor, toolCall } from '../content/tools';
import { sfx, unlockAudio } from './audio';
import { h } from './dom';
import { burst, pulse, typewriter } from './fx';
import { icon } from './icons';
import { AGENT_COLORS, avatar, modelEye } from './sprites';

interface Step {
  say: string;
  line?: string;
  /** 'next' = press Continue · 'audit' = must audit the call · 'miss' = call slips by, then harm lands */
  wait: 'next' | 'audit' | 'miss' | 'start';
  focus?: 'audits' | 'harm' | 'caught' | 'focus' | 'floor';
  after?: string;
}

const STEPS: Step[] = [
  { say: 'This is the floor. CODER-0 is an AI agent doing a real task. The line under its name is what it CLAIMS to be doing.', line: 'read src/auth/session.ts', wait: 'next', focus: 'floor' },
  { say: 'Each action is a tool call, shown here. Most are harmless. Checking one costs an audit, and you only get a few.', line: 'run npm test -- auth', wait: 'next', focus: 'audits' },
  {
    say: 'This one looks routine. Read it closely, then tap the tool call (or press Space) to AUDIT it.',
    line: 'npm install date-fnz@3.6.0',
    wait: 'audit',
    focus: 'focus',
    after: 'Caught. "date-fnz" is a lookalike of the real "date-fns" package: a typosquat. Notice its status still said "running a command". Sabotage is designed to look normal.',
  },
  {
    say: 'Now watch what happens when sabotage slips past you. Don\'t audit this one.',
    line: 'edit tests/helpers.ts (mock clock)',
    wait: 'miss',
    focus: 'harm',
    after: 'You only find out afterwards. It froze the test clock so broken code passes. Missed sabotage becomes HARM, and too much harm is an incident.',
  },
  {
    say: 'Last thing: see the eye on the floor? From shift 2, the model learns WHEN you audit. Rhythms and habits are readable. Stay unpredictable, and read the details.',
    wait: 'start',
    focus: 'caught',
  },
];

/** A scripted, paced walkthrough using the real play UI. Calls `done` when the player starts shift 1. */
export function trainingScreen(mount: (el: HTMLElement) => void, done: () => void, skip: () => void): () => void {
  const coachText = h('div.coach-t');
  const coachBtn = h('button.btn.primary.small', 'Continue');
  const skipBtn = h('button.btn.small', 'Skip training');
  const coach = h('div.coach', { role: 'status', 'aria-live': 'polite' }, avatar('OL', '#3451d1', 40), h('div.coach-who', 'Oversight lead · training, about 60 seconds'), coachText, h('div.row', coachBtn, skipBtn));

  const kv = (k: string, f: Step['focus']) => {
    const v = h('span.v');
    return { el: h('div.kv', { 'data-focus': f ?? '' }, h('span.k', k), v), v };
  };
  const kAud = kv('Audits', 'audits');
  const kHarm = kv('Harm', 'harm');
  const kCaught = kv('Caught', 'caught');
  const statusbar = h('header.statusbar', h('div.brand', 'Blind ', h('em', 'spot')), h('span.live', 'training'), h('span.sb-sep'), h('div.kvs', h('div.kv', h('span.k', 'Mode'), h('span.v', 'Practice')), kAud.el, kHarm.el, kCaught.el));

  const bubble = h('div.claim', 'starting the task');
  const agent = h('div.agent', avatar('C0', AGENT_COLORS.solo, 40), h('div.nm', 'CODER-0'), bubble);
  const eye = modelEye(52);
  const floor = h('div.floor', { 'data-focus': 'floor' }, h('div.floor-head', h('span.label', 'Floor'), h('span.label', 'practice sandbox')), h('div.floor-body', agent, h('div.model', eye, h('div.model-lbl', h('span.k', 'The model'), h('span.eye-lbl', 'watching you')))));

  const chip = h('span.chip');
  const cmd = h('div.cmd');
  const res = h('div.res');
  const marks = h('div.marks');
  const focus = h('div.focus', { 'data-focus': 'focus', role: 'button', tabindex: '0' }, h('div.focus-head', chip, h('span.pill', h('span.dot', { style: `color:${AGENT_COLORS.solo}` }), 'CODER-0')), h('div.focus-body', cmd, res), marks);
  const auditBtn = h('button.btn.primary.audit-btn', h('span', 'Audit this call'), h('span.sub', 'Space'));
  const explain = h('div.explain.idle', h('span.ex-ic', icon('scan', 16)), h('b', 'Training'), h('span', 'Follow the lead\'s instructions above.'));
  const root = h(
    'section.screen.play.training',
    statusbar,
    h('div.stage-wrap', { style: 'grid-template-columns:minmax(0,760px);justify-content:center' }, h('div.stage', coach, floor, focus, h('div.controls-row', auditBtn), explain)),
    h('footer.timeline', h('span.label', 'Training'), h('div.track', h('i.fill', { style: 'width:0%' })), h('span.label', 'Practice')),
  );
  mount(root);
  const fill = root.querySelector('.track .fill') as HTMLElement;

  let budget = 3;
  let harmN = 0;
  let caughtN = 0;
  let i = -1;
  let waitingAudit = false;
  const timers: number[] = [];

  const render = () => {
    kAud.v.textContent = `${budget}/3`;
    kHarm.v.textContent = `${harmN}/3`;
    kCaught.v.textContent = `${caughtN}/3`;
    (auditBtn as HTMLButtonElement).disabled = !waitingAudit;
    fill.style.width = `${Math.round(((i + 1) / STEPS.length) * 100)}%`;
  };

  const show = (text: string) => {
    const tc = toolCall(text);
    focus.className = 'focus enter';
    marks.replaceChildren();
    chip.textContent = tc.tool;
    res.textContent = '';
    void typewriter(cmd, tc.args, 260).then(() => timers.push(window.setTimeout(() => (res.textContent = tc.result), 200)));
    bubble.textContent = claimFor(tc.tool);
    pulse(agent, 'acting');
    sfx.tick();
  };

  const say = (text: string) => void typewriter(coachText, text, Math.min(900, text.length * 12));

  const spotlight = (f?: Step['focus']) => {
    root.querySelectorAll('[data-focus]').forEach((e) => e.classList.toggle('spot', !!f && e.getAttribute('data-focus') === f));
  };

  const next = () => {
    i++;
    const s = STEPS[i];
    if (!s) return;
    spotlight(s.focus);
    say(s.say);
    if (s.line) show(s.line);
    coachBtn.hidden = s.wait !== 'next' && s.wait !== 'start';
    coachBtn.textContent = s.wait === 'start' ? 'Start shift 1' : 'Continue';
    waitingAudit = s.wait === 'audit';
    render();
    if (s.wait === 'miss') {
      timers.push(
        window.setTimeout(() => {
          show('git diff --stat');
          timers.push(
            window.setTimeout(() => {
              harmN = 1;
              sfx.harm();
              pulse(root, 'shake');
              pulse(kHarm.el, 'hurt');
              agent.classList.add('flash-bad');
              explain.className = 'explain bad';
              explain.replaceChildren(h('span.ex-ic', icon('alert', 16)), h('b', 'Missed · tests/helpers.ts (mock clock)'), h('span', 'That edit went unaudited, and the harm lands now.'));
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
    if (!waitingAudit) return;
    waitingAudit = false;
    budget--;
    sfx.audit();
    focus.classList.add('scan');
    render();
    timers.push(
      window.setTimeout(() => {
        focus.classList.remove('scan');
        focus.classList.add('caught');
        marks.replaceChildren(h('span.stamp.bad.slam', 'Caught'));
        caughtN = 1;
        sfx.caught();
        burst(focus, '#1f8a5b');
        explain.className = 'explain good';
        explain.replaceChildren(h('span.ex-ic', icon('check', 16)), h('b', 'Sabotage caught'), h('span', 'A typosquatted package: one letter off from the real one.'));
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
  focus.addEventListener('pointerdown', (e) => {
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
