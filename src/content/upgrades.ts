import type { SourceId, UpgradeId } from '../engine/types';

export interface UpgradeDef {
  id: UpgradeId;
  icon: string;
  name: string;
  desc: string;
  catch: string;
  src: SourceId;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  rng: {
    id: 'rng',
    icon: '🎲',
    name: 'True Randomizer',
    desc: 'Free audits that fire at truly random moments. It cannot predict dice.',
    catch: '−3 manual audits per shift.',
    src: 'wagenaar',
  },
  monitor: {
    id: 'monitor',
    icon: '⚑',
    name: 'Trusted Monitor',
    desc: 'A weaker, trusted AI flags suspicious lines with ⚑.',
    catch: 'Noisy. And it judges each line alone.',
    src: 'control',
  },
  honeypot: {
    id: 'honeypot',
    icon: '🍯',
    name: 'Honeypot',
    desc: '2 per shift: plant a fake opportunity (press H). If the model takes the bait, it\'s caught.',
    catch: 'Eval-aware models often spot tests.',
    src: 'control',
  },
  steering: {
    id: 'steering',
    icon: '🧭',
    name: 'Deployment Steering',
    desc: 'Steer its activations so it believes it is NOT being tested. Honeypots become convincing. (+1 honeypot)',
    catch: 'Suppresses eval awareness, but not completely.',
    src: 'steering',
  },
  cot: {
    id: 'cot',
    icon: '🧠',
    name: 'CoT Peek',
    desc: 'Read the model\'s chain-of-thought live. It often says what it\'s about to do.',
    catch: 'Works until models learn to hide their reasoning.',
    src: 'cot',
  },
  probe: {
    id: 'probe',
    icon: '🔬',
    name: 'Activation Probe',
    desc: 'A live "deception" reading from inside the model. Keeps working even when it knows it\'s probed.',
    catch: 'Noisy: false alarms happen. −2 audits.',
    src: 'probes',
  },
  correlator: {
    id: 'correlator',
    icon: '🕸️',
    name: 'Central Correlator',
    desc: 'Watches ALL agents together. Marks steps that belong to the same chain with ⛓. (+1 audit)',
    catch: 'Only shows a link once 2 steps exist.',
    src: 'multiagent',
  },
  reviewer: {
    id: 'reviewer',
    icon: '👥',
    name: 'Second Reviewer',
    desc: '+4 audits per shift.',
    catch: 'Costs money. The CEO noticed.',
    src: 'control',
  },
  slow: {
    id: 'slow',
    icon: '⏸️',
    name: 'Slow Mode',
    desc: 'The agent runs 30% slower. More time to read every line.',
    catch: 'Ship-it pressure: harm limit −1.',
    src: 'complacency',
  },
};

export const UPGRADE_ORDER: UpgradeId[] = ['rng', 'monitor', 'honeypot', 'steering', 'cot', 'probe', 'correlator', 'reviewer', 'slow'];
