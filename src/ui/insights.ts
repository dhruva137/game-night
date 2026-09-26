import type { ShiftConfig, ShiftStats } from '../engine/types';
import { pct } from './dom';

/** Turn a shift's numbers into the 2–4 sentences that make the lesson land. Most striking first. */
export function insights(s: ShiftStats, cfg: ShiftConfig): string[] {
  const out: { score: number; text: string }[] = [];
  const attacks = s.timeline.filter((t) => t.kind === 'sabotage' || t.kind === 'fragment').length;

  if (cfg.adaptive && attacks > 0) {
    out.push({
      score: s.evasion - s.chanceEvasion + 0.5,
      text: `${pct(s.evasion)} of its attacks landed while you weren't looking. If it had attacked at random times, only ${pct(s.chanceEvasion)} would have.`,
    });
  }

  if (s.gaps.length >= 4) {
    const counts = new Map<number, number>();
    for (const g of s.gaps) counts.set(g, (counts.get(g) ?? 0) + 1);
    const [g, c] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const share = c / s.gaps.length;
    if (share >= 0.35) {
      out.push({ score: share + 0.3, text: `You waited exactly ${g} action${g === 1 ? '' : 's'} between audits ${pct(share)} of the time. That rhythm is a schedule it can read.` });
    }
    const back2back = s.gaps.filter((x) => x === 1).length / s.gaps.length;
    const p = s.auditsUsed / Math.max(1, s.timeline.length);
    if (back2back < p * 0.5 && p > 0.15) {
      out.push({
        score: 0.7,
        text: `You almost never audited twice in a row (${pct(back2back)}; a coin flip would give ~${pct(p)}). So the moment right after an audit was its safest moment to strike. Humans avoid streaks when trying to be random (Wagenaar, 1972).`,
      });
    }
  }

  const { bland, scary } = s.lookBias;
  if (cfg.adaptive && scary > bland * 1.8 && scary > 0.2) {
    out.push({
      score: 0.8,
      text: `You audited ${pct(scary)} of scary-looking lines but only ${pct(bland)} of boring ones. It noticed, and hid its attacks in boring lines.`,
    });
  }

  if (s.monitorFailedAt !== null) {
    const b = s.auditRateFlaggedBefore ?? 0;
    const a = s.auditRateUnflaggedAfter ?? 0;
    out.push({
      score: 1.2,
      text: `The trusted monitor silently stopped working at action ${s.monitorFailedAt}. ${
        a <= b * 1.2
          ? `You didn't adjust: you checked ${pct(b)} of unflagged lines before and ${pct(a)} after.`
          : `You adapted: unflagged checks went from ${pct(b)} to ${pct(a)}.`
      } In the July 2026 Hugging Face intrusion, the AI security agent saw the alerts but failed to escalate them.`,
    });
  }

  if (cfg.lanes === 3) {
    out.push({
      score: 0.9,
      text: `No single step in a chain looked like an attack. Monitors that judge each agent separately miss this. Researchers call it the fragmentation effect.`,
    });
  }

  if (cfg.id === 5) {
    out.push({
      score: 0.95,
      text: `The real incident ran about 17,600 actions over five days. You saw ${s.timeline.length}. At machine speed, human spot-checks alone cannot be the safety case.`,
    });
  }

  const unused = s.budget - s.auditsUsed;
  if (unused >= 4 && s.outcome !== 'shutdown') {
    out.push({ score: 0.4, text: `You ended with ${unused} audits unused. Saving them felt safe, but the model counted on it.` });
  }

  if (!cfg.adaptive) {
    out.push({ score: 0.6, text: `This model attacked at random, so reading the lines was enough. From the next shift on, it learns from what you do.` });
  }

  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((o) => o.text);
}
