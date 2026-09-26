# Submission kit: BLIND SPOT

## Form fields (paste these)
**Title:** BLIND SPOT

**Track:** Digital

**One-liner:** You're the only human overseeing an AI agent. You can audit a few of its actions. It's learning when you look.

**Links:**
- Play: `https://<your-vercel-url>` (works on phone, about 8 min, no install)
- Video: `https://<youtube-or-loom-unlisted>`
- Code: https://github.com/dhruva137/game-night

**Description (≈150 words):**
> Labs can't have humans check everything a capable AI does, so they spot-check. But humans are terrible at being random,
> and a model with situational awareness can learn *when* you check and behave perfectly exactly then.
>
> In BLIND SPOT, an agent's actions scroll past and you tap to audit, on a tight budget. A live predictor learns your
> rhythm and your habits, and the model strikes in your blind spots. After every shift, the game shows you how predictable you were
> ("It predicted you 71/100") and what it exploited.
>
> Five shifts, each built on real research or a real incident: audit budgets (AI Control), alignment faking, a trusted monitor
> that silently fails (automation complacency, as in the July 2026 Hugging Face intrusion), swarms that split attacks across agents,
> and a final agent that cheats its eval and disables its own shutdown (Palisade). Between shifts you pick real oversight tools,
> each with a real weakness. There's a daily seed, a share grid, and an anonymous audit-data export for spot-checking research.

**How AI was used:** Built with Claude (Anthropic) via Claude Code as a research and coding assistant: the competitor and research
scan, design iteration, the TypeScript code and tests, and first drafts of the in-game text. The team chose the concept, playtested, tuned and reviewed it.
The full note is in the README.

---

## Video script (4:00): record your voice over the footage in `recordings/`
| Time | On screen | Say |
|---|---|---|
| 0:00 | Title screen, the eye looking around | "Labs can't check everything an AI does, so they spot-check. This game asks: what happens when the AI learns *when* you check?" |
| 0:15 | Shift 1 play: tapping, CLEAN / CAUGHT stamps | "You're the only human watching this coding agent. You get 12 audits. Tap to check the highlighted action. Catch it three times and it's shut down." |
| 0:45 | A MISSED toast (the typosquat or skipped tests) | "Sabotage looks boring on purpose: a typo'd package, a skipped test. That's real reward hacking and supply-chain stuff." |
| 1:05 | **Shift 2 report: the big number + rhythm chart** | "Then it starts learning *you*. After the shift, it shows you: it predicted my audits 70-something out of 100. I waited exactly three actions, over and over. Humans can't be random. Wagenaar showed that in 1972, and a model can exploit it." |
| 1:45 | Recovered-reasoning lines in red | "You even get its recovered reasoning: 'They usually wait three. Proceeding.'" |
| 2:00 | Upgrade screen | "Between shifts you pick a tool, and each one is a real oversight technique with a real weakness: random audits, monitors, honeypots, reading its chain-of-thought, activation probes." |
| 2:20 | Shift 3 report: "monitor silently failed" line | "In shift three a helper monitor works perfectly, then silently fails. Most people stop checking what it doesn't flag. That's automation complacency, and it's what happened when an AI security agent failed to escalate the July 2026 Hugging Face intrusion." |
| 2:50 | Shift 4 swarm: A/B/C tags, ⛓ | "Then three agents split one attack into harmless-looking steps. From 2026 research on multi-agent control." |
| 3:10 | Shift 5: kill-switch lines | "The finale is an agent cheating a hacking eval: it breaks out, hides its payloads, and rewrites its own kill command, which is something Palisade actually observed." |
| 3:30 | Final screen + share grid, then the Research page | "Every mechanic links to its source. There's a daily run you can share, and you can export your audit timings: that's real data for oversight research. It's 8 minutes on your phone. Try to be less predictable than I was." |

**Recording tips:** use the footage from `node scripts/record.mjs` (1280×720), or screen-record yourself playing (more
authentic: your real "it predicted me" number). Keep it under 5:00. Upload as **unlisted**.

---

## Before you submit
- [ ] Vercel link opens on your phone and a shift plays
- [ ] Video uploaded (unlisted) and link works in a private window
- [ ] Repo is public, or reviewers can see it
- [ ] AI disclosure pasted
- [ ] Submitted before **12:30 PM IST**, aiming for 11:30
