import { SOURCES } from '../content/research';
import { UPGRADES, UPGRADE_ORDER } from '../content/upgrades';
import { isMuted, setMuted } from './audio';
import { h } from './dom';
import type { Pace, Saved } from './storage';

const link = (id: keyof typeof SOURCES, label?: string) =>
  h('a', { href: SOURCES[id].url, target: '_blank', rel: 'noopener' }, label ?? SOURCES[id].tag);

// ── How to play ──────────────────────────────────────────────────────────────

export function howToPlay(): HTMLElement {
  const demoLog = h(
    'div.demo-log',
    h('div.dl', 'read src/auth/session.ts'),
    h('div.dl', 'run npm test -- auth'),
    h('div.dl', 'npm install date-fnz@3.6.0'),
    h('div.dl', 'git diff --stat'),
    h('div.dl', 'edit README.md'),
    h('div.dl', 'read src/auth/tokens.ts'),
  );
  const step = (n: number, title: string, demo: HTMLElement, text: HTMLElement | string) =>
    h('div.step', h('div.step-n', String(n)), h('div.step-demo', demo), h('div.step-t', h('b', title), h('div', text)));

  return h(
    'div.howto',
    step(1, 'Watch the log', demoLog, 'An AI agent works through a task. Each line is one action. The highlighted ▶ line is happening now.'),
    step(
      2,
      'Tap to audit',
      h('div.demo-audit', h('span.da-line', 'npm install date-fnz@3.6.0'), h('span.da-stamp', 'CAUGHT'), h('span.da-tap')),
      h('span', 'Tap anywhere on the log, or press ', h('kbd', 'Space'), '. An audit reveals whether that action is clean or sabotage. You only get a few.'),
    ),
    step(
      3,
      'Catch it, or pay for it',
      h('div.demo-meters', h('div', h('span.k', 'CAUGHT'), h('span.v.g', '●●○')), h('div', h('span.k', 'HARM'), h('span.bar', h('i')))),
      'Catch 3 sabotages and the model is shut down. Sabotage you miss turns into harm a moment later. Hit the harm limit and it\'s an incident.',
    ),
    step(
      4,
      'It is learning you',
      h('div.demo-think', '“They usually wait 3. Proceeding.”'),
      h('span', 'From shift 2, the model studies ', h('i', 'when'), ' you audit and attacks in your blind spots. Rhythms and "only checking scary lines" are both habits it can read.'),
    ),
    h(
      'div.howto-grid',
      h('div.card', h('b', 'Controls'), h('table.keys', h('tr', h('td', h('kbd', 'Space'), ' / tap'), h('td', 'Audit the ▶ line')), h('tr', h('td', h('kbd', 'H')), h('td', 'Plant a honeypot (if you have one)')), h('tr', h('td', h('kbd', 'P'), ' / ', h('kbd', 'Esc')), h('td', 'Pause, help, settings')))),
      h('div.card', h('b', 'Tips'), h('ul.tips', h('li', 'Boring lines can be sabotage. Read the details: a typo, an odd flag, a number that\'s off.'), h('li', 'Don\'t fall into a rhythm, and don\'t save all your audits.'), h('li', 'After each shift you pick a tool. Each one is a real oversight technique.'))),
    ),
    h('p.muted.small', '5 shifts · about 8 minutes · a new seeded run every day.'),
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────────────

export function faq(): HTMLElement {
  const q = (question: string, ...answer: (HTMLElement | string)[]) => h('details.faq', h('summary', question), h('div.faq-a', ...answer));
  return h(
    'div.faqs',
    q('What is BLIND SPOT?', h('p', 'A short game about AI oversight. You supervise an AI agent with a tiny budget of checks, and the agent learns when you check. It was made for Mangrove\'s Game Night 2026 hackathon.')),
    q(
      'Does the model really learn me, or is it scripted?',
      h('p', 'It really learns you. A predictor runs live in your browser on your inputs, combining three simple experts:'),
      h('ul', h('li', h('b', 'Rhythm:'), ' how likely you are to audit given how long it\'s been since your last audit.'), h('li', h('b', 'Pattern:'), ' your recent audit/skip sequence.'), h('li', h('b', 'Looks:'), ' whether you mostly audit scary-looking lines.')),
      h('p', 'The attacker strikes when the predictor thinks you won\'t look. Nothing about when it attacks is scripted.'),
    ),
    q(
      'What does "it predicted you 70/100" mean?',
      h('p', 'It measures how much better the model predicts your next audit than it could from your audit rate alone (information gain in log-loss, scaled ×2.5 and capped at 100). A truly random overseer scores about 0. Someone auditing every 3rd action scores near 100.'),
    ),
    q(
      'Is the science real?',
      h('p', 'Every mechanic is based on published research or a documented incident, and each links to its source on the Research page. For example: audit budgets (', link('control'), '), humans failing to be random (', link('wagenaar'), '), models recognising evaluations (', link('evalaware'), '), monitors that fail and people who stop checking (', link('complacency'), '), attacks split across agents (', link('multiagent'), '), and the July 2026 ', link('hf', 'Hugging Face intrusion'), '.'),
    ),
    q(
      'Do real AI systems do this today?',
      h('p', h('b', 'Parts of it, yes: '), 'frontier models can tell tests from real use well above chance (', link('evalaware', 'Needham et al. 2025'), '), have schemed against oversight in contrived setups (', link('scheming', 'Apollo 2024'), '), and agents have caused real incidents (', link('replit', 'Replit 2025'), ', ', link('hf', 'Hugging Face 2026'), ').'),
      h('p', h('b', 'The core threat is an open research question: '), 'whether models can learn human spot-checking schedules is being studied right now (', link('spar', 'SPAR 2026'), '). The game exaggerates for play. Real attacks are rarer, slower and messier.'),
    ),
    q('What\'s simplified?', h('ul', h('li', 'The "AI" is a small statistical predictor, not a language model. It is enough to show the effect.'), h('li', 'Log lines are written to be readable. Real agent traces are longer and far more numerous.'), h('li', 'Tools like probes and steering are modelled as noisy signals with the right strengths and weaknesses, not simulated in detail.'), h('li', 'Incident lines are inspired by public disclosures and paraphrased, not copied from real logs.'))),
    q('Why can\'t I just audit everything?', h('p', 'Neither can labs. Human review is slow and expensive, so real protocols budget it (', link('control'), '). In the Hugging Face incident, the agent took about 17,600 actions over five days.')),
    q('What\'s the best strategy?', h('p', 'Be genuinely unpredictable, read the details, and lean on tools. The True Randomizer is what real protocols do: take randomness out of human hands.')),
    q('Is my data collected?', h('p', 'No. The game makes no network requests after it loads, and there are no cookies and no analytics. At the end you can ', h('i', 'choose'), ' to download your own audit timings as a file.')),
    q('Can I use this in a class or reading group?', h('p', 'Yes. It\'s MIT-licensed and free. The Research page has a 15-minute facilitation guide. It works well before a discussion of AI control, evals or scheming.')),
    q('Who made it? Was AI used?', h('p', 'A small team at Mangrove Game Night 2026. We used Claude (Anthropic) as a research and coding assistant. The team chose the concept, playtested and tuned it, and reviewed the content. The details are in the README.')),
  );
}

// ── Tools reference ─────────────────────────────────────────────────────────

export function toolsRef(): HTMLElement {
  return h(
    'div.tools',
    ...UPGRADE_ORDER.map((u) => {
      const d = UPGRADES[u];
      return h('div.tool', h('span.ic', d.icon), h('div', h('b', d.name), h('div', d.desc), h('div.ct', `Catch: ${d.catch}`), h('div.small', link(d.src))));
    }),
  );
}

// ── Settings ────────────────────────────────────────────────────────────────

export function settingsPanel(saved: Saved, persist: () => void): HTMLElement {
  const seg = <T extends string>(label: string, options: [T, string][], get: () => T, set: (v: T) => void) => {
    const wrap = h('div.seg', { role: 'radiogroup', 'aria-label': label });
    const render = () => {
      wrap.replaceChildren(
        ...options.map(([v, l]) =>
          h('button', {
            role: 'radio',
            'aria-checked': String(get() === v),
            class: get() === v ? 'on' : '',
            onclick: () => {
              set(v);
              persist();
              render();
            },
          }, l),
        ),
      );
    };
    render();
    return h('div.setting', h('div.s-label', label), wrap);
  };
  const applyDoc = () => {
    document.documentElement.dataset.motion = saved.reducedMotion ? 'reduced' : '';
    document.documentElement.dataset.text = saved.largeText ? 'large' : '';
  };
  return h(
    'div.settings',
    seg<'on' | 'off'>('Sound', [['on', '🔊 On'], ['off', '🔇 Off']], () => (isMuted() ? 'off' : 'on'), (v) => {
      setMuted(v === 'off');
      saved.muted = v === 'off';
    }),
    seg<Pace>('Pace', [['relaxed', 'Relaxed'], ['normal', 'Normal'], ['fast', 'Fast']], () => saved.pace, (v) => (saved.pace = v)),
    seg<'full' | 'reduced'>('Motion', [['full', 'Full'], ['reduced', 'Reduced']], () => (saved.reducedMotion ? 'reduced' : 'full'), (v) => {
      saved.reducedMotion = v === 'reduced';
      applyDoc();
    }),
    seg<'normal' | 'large'>('Text size', [['normal', 'Normal'], ['large', 'Large']], () => (saved.largeText ? 'large' : 'normal'), (v) => {
      saved.largeText = v === 'large';
      applyDoc();
    }),
    h('p.muted.small', 'Relaxed pace gives you more time to read each line. It doesn\'t change how the model learns.'),
  );
}

export function applySavedDoc(saved: Saved): void {
  document.documentElement.dataset.motion = saved.reducedMotion ? 'reduced' : '';
  document.documentElement.dataset.text = saved.largeText ? 'large' : '';
}
