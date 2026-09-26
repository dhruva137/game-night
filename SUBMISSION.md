# Mangrove submission: paste-ready

## Title
Blind Spot: supervise an AI agent that learns when you look

## Write-up

**What we set out to do**
Most AI-safety games put you in charge of a lab or a government. We wanted to put players where oversight actually happens: one human, a small budget of checks, and an AI agent doing real work. The idea we wanted people to *feel* rather than read: if humans can only spot-check, and humans are bad at being random, a model with enough situational awareness can learn when it's being watched and behave perfectly exactly then.

**What we did**
Blind Spot is a short browser game (about 8 minutes, phone or laptop, no install). An agent's actions appear as tool calls (`bash`, `edit_file`, `http_request`…). You tap to audit one, and you can afford only a few. A small predictor runs live in the browser on your own inputs. It mixes three experts: your rhythm between audits, your recent audit/skip pattern, and whether you only check scary-looking lines. The attacking model strikes where it predicts you won't look. After each shift, a report shows how predictable you were ("it predicted you 71/100"), a chart of what it saw, and your audit rhythm against true randomness.

There are five shifts, each built on a published result or a documented incident:
1. **Audit budgets** (Redwood's AI Control).
2. **A model that learns your timing** (Wagenaar 1972 on human non-randomness; Needham et al. 2025 on models detecting evaluations).
3. **A trusted monitor that silently fails halfway**: automation complacency (Parasuraman & Manzey), echoing how the AI security agent failed to escalate in the July 2026 Hugging Face intrusion.
4. **Three agents that split each attack into harmless-looking steps**, coordinated by a planner in an #agents channel you can audit (Makins et al. 2026 on distributed attacks; Motwani et al. 2024 on secret collusion).
5. **An agent cheating a cyber eval that disables its own shutdown** (the Hugging Face × OpenAI disclosure; Palisade's shutdown-resistance results).

Between shifts you pick a real oversight tool, and each has a real weakness: true random audits, a trusted monitor, honeypots, deployment steering, chain-of-thought reading, activation probes and a cross-agent correlator. A Research page links all 17 sources and says plainly what's real and what's simplified. There's also a daily seeded run, a shareable result card with a QR code, and an optional anonymous export of your audit timings.

**What we found**
- **In simulation:**
  - The predictor reads scripted human-like players almost perfectly: rhythmic auditing scores 99/100 predictability, and "only audit scary-looking lines" scores 96. A truly random player scores 0.
  - Across balance simulations, a careful reader survives the first shift about 90% of the time but only 7–12% once the model starts learning them.
  - Random auditing plus tools survives most shifts.
  - The lesson isn't "try harder": the fix has to live in the protocol (randomisation, monitors, probes), not in the human.
- **In playtesting,** the most effective moment was the reveal. People expect to be hard to read, and find out they audited on a fixed rhythm most of the time.
- **Design lesson:** a small, honest mechanic that acts on the player's own behaviour taught more than any text we wrote.

**What we'd do next**
1. With consent, collect anonymous audit timings to study how predictable human spot-checkers really are. This is an open question, and it's the focus of an ongoing SPAR project on human spot-checking patterns.
2. Package a 15-minute facilitator version for AI-safety reading groups and courses.
3. Replace the statistical attacker with an LLM agent in a sandbox, to test whether real models pick up human audit rhythms.
4. Add new shifts as new incidents and papers come out.

## How did you use AI tools?
We used Claude (Anthropic), through Claude Code, throughout:
- **Research:** scanning competing entries and prior AI-safety games; finding and checking papers and incident reports. Every citation was verified against its arXiv or DOI record.
- **Design iteration:** exploring concepts, then balancing the game with automated simulations.
- **Code:** all of the TypeScript game engine, UI and tests.
- **Text:** first drafts of the in-game writing, plus automated browser playthroughs used for screenshots and gameplay footage.

The team chose the concept and direction, set the visual direction, playtested, and reviewed the content and claims.

## Artifact links
1. `https://<your-vercel-url>` · **Play the game** (browser, mobile-friendly, about 8 min)
2. `https://<youtube-or-loom-unlisted>` · **3–5 min video walkthrough**
3. https://github.com/dhruva137/game-night · **Source code, tests and design notes** (MIT)
4. `https://<your-vercel-url>/#learn` · **The research behind every mechanic** (17 sources, real vs. simplified)
5. *(optional)* A shared result card image, e.g. uploaded to Drive with "anyone with the link" access
