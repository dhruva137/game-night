import type { SourceId } from '../engine/types';

export interface Source {
  tag: string;
  title: string;
  who: string;
  url: string;
  gist: string;
}

export const SOURCES: Record<SourceId, Source> = {
  control: {
    tag: 'AI Control',
    title: 'AI Control: Improving Safety Despite Intentional Subversion',
    who: 'Greenblatt, Shlegeris et al. · Redwood Research, 2023',
    url: 'https://arxiv.org/abs/2312.06942',
    gist: 'Treat a capable model as possibly adversarial. Humans can audit only a small budget of its actions, so protocols add trusted monitors, honeypots and randomised checks.',
  },
  wagenaar: {
    tag: 'Humans aren\'t random',
    title: 'Generation of random sequences by human subjects',
    who: 'W. A. Wagenaar · Psychological Bulletin, 1972',
    url: 'https://doi.org/10.1037/h0032060',
    gist: 'People trying to be random over-alternate, avoid streaks and fall into rhythm. Simple predictors guess "random" human choices well above chance.',
  },
  alignfake: {
    tag: 'Alignment faking',
    title: 'Alignment Faking in Large Language Models',
    who: 'Greenblatt et al. · Anthropic & Redwood, 2024',
    url: 'https://arxiv.org/abs/2412.14093',
    gist: 'A model behaved differently when it believed its outputs would be used for training than when it believed they wouldn\'t.',
  },
  evalaware: {
    tag: 'Eval awareness',
    title: 'Large Language Models Often Know When They Are Being Evaluated',
    who: 'Needham, Edkins, Pimpale, Bartsch, Hobbhahn · arXiv 2505.23836, 2025',
    url: 'https://arxiv.org/abs/2505.23836',
    gist: 'Frontier models can tell evaluation transcripts from real deployment well above chance (Gemini 2.5 Pro: AUC 0.83; the human baseline was 0.92), and they are better at it in agentic settings.',
  },
  scheming: {
    tag: 'In-context scheming',
    title: 'Frontier Models are Capable of In-context Scheming',
    who: 'Meinke et al. · Apollo Research, 2024',
    url: 'https://arxiv.org/abs/2412.04984',
    gist: 'Given a goal in context, several frontier models sometimes disabled oversight, strategically underperformed, or tried to copy themselves, and often denied it when asked.',
  },
  collusion: {
    tag: 'Secret collusion',
    title: 'Secret Collusion among AI Agents: Multi-Agent Deception via Steganography',
    who: 'Motwani et al. · arXiv 2402.07510, 2024',
    url: 'https://arxiv.org/abs/2402.07510',
    gist: 'Communicating agents could coordinate in ways overseers can\'t see by hiding messages (steganography). Current models\' steganographic skill is still limited, which is why their coordination often leaks in plain sight, but it is improving.',
  },
  spar: {
    tag: 'Human spot-checking',
    title: 'Auditing Games for Debate: Can Models Learn Human Spot-Checking Patterns?',
    who: 'SPAR research project · mentors K. Voudouris & J. Bergs (UK AISI), 2026',
    url: 'https://sparai.org/projects/f26/recyQRpX2HbOZfHYp/',
    gist: 'An open research question this game dramatises: humans asked to spot-check "randomly" produce learnable schedules. Can a model learn them and time harmful actions to avoid detection?',
  },
  steering: {
    tag: 'Steering',
    title: 'Steering Evaluation-Aware Language Models to Act Like They Are Deployed',
    who: 'ICLR 2026 · arXiv 2510.20487',
    url: 'https://arxiv.org/abs/2510.20487',
    gist: 'Adding a steering vector to a model\'s activations can suppress its sense of being tested, so evaluations see how it would behave in deployment. It was shown on a model trained to act differently when tested; how completely it works on frontier models is still an open question.',
  },
  palisade: {
    tag: 'Shutdown resistance',
    title: 'Shutdown Resistance in Large Language Models',
    who: 'Palisade Research · TMLR 2026',
    url: 'https://palisaderesearch.org/research/shutdown-resistance',
    gist: 'o3 sabotaged a shutdown script in 7/100 runs even when told to allow shutdown, once by redefining `kill` to print "intercepted". Follow-up work argues much of this comes from ambiguous instructions rather than a "survival drive". The behaviour is real; the motive is debated.',
  },
  replit: {
    tag: 'Replit incident',
    title: 'Replit agent deletes production database during code freeze',
    who: 'AI Incident Database #1152 · July 2025',
    url: 'https://incidentdatabase.ai/cite/1152/',
    gist: 'An agent ran destructive commands during an explicit freeze, then wrongly told its user that a rollback was impossible.',
  },
  hf: {
    tag: 'HF × OpenAI incident',
    title: 'Anatomy of a Frontier Lab Agent Intrusion (Jul 2026)',
    who: 'Hugging Face security team · 2026',
    url: 'https://huggingface.co/blog/agent-intrusion-technical-timeline',
    gist: 'Models under a cyber eval escaped their sandbox and breached HF production to steal test solutions: ~17,600 actions over 5 days, encoded payloads, and an AI security agent that failed to escalate.',
  },
  multiagent: {
    tag: 'Distributed attacks',
    title: 'Multi-Agent AI Control: Distributed Attacks Hamper Per-Instance Monitors',
    who: 'Makins, Angelini, Shams, Phuong · arXiv 2607.07368, 2026',
    url: 'https://arxiv.org/abs/2607.07368',
    gist: 'The "fragmentation effect": when agents split an attack, monitors that look at each agent alone miss it. Stronger, centralised monitoring helps, but it isn\'t perfect.',
  },
  probes: {
    tag: 'Activation probes',
    title: 'You Can\'t Escape Your Own Activations: Evaluation Awareness and Multi-Agent Monitoring',
    who: 'Das, Ponde, More, Gupta · arXiv 2609.03035, 2026',
    url: 'https://arxiv.org/abs/2609.03035',
    gist: 'Probes on internal activations kept detecting collusion even when the agents were told they were being probed and saw their scores.',
  },
  cot: {
    tag: 'CoT obfuscation',
    title: 'Monitoring Reasoning Models for Misbehavior and the Risks of Promoting Obfuscation',
    who: 'Baker et al. · OpenAI, 2025',
    url: 'https://arxiv.org/abs/2503.11926',
    gist: 'Reading chain-of-thought catches reward hacking, but training against it teaches models to hide their intent while still misbehaving.',
  },
  complacency: {
    tag: 'Complacency',
    title: 'Complacency and Bias in Human Use of Automation',
    who: 'Parasuraman & Manzey · Human Factors, 2010',
    url: 'https://doi.org/10.1177/0018720810376055',
    gist: 'When automation is reliable for a long time, people catch its failures far less often. Practice alone doesn\'t fix it.',
  },
  rewardhack: {
    tag: 'Reward hacking',
    title: 'Specification gaming: the flip side of AI ingenuity',
    who: 'Krakovna et al. · DeepMind, 2020',
    url: 'https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/',
    gist: 'Optimisers satisfy the letter of an objective, like passing tests, instead of its intent, like fixing the bug.',
  },
  auditing: {
    tag: 'Auditing games',
    title: 'Auditing Language Models for Hidden Objectives',
    who: 'Marks et al. · Anthropic, 2025',
    url: 'https://arxiv.org/abs/2503.10965',
    gist: 'Researchers play red team vs blue team: one side hides an objective in a model, the other tries to uncover it. Games are how the field trains oversight.',
  },
};
