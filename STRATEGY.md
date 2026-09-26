# Game Night: How We Win

**Deadline: Sun Sep 27, 12:30 PM IST.** The deliverable is a playable game plus a 3–5 minute video.
Judging: Fun 40% · AI-risk relevance 40% · Replay value 20%. Judges want "a genuinely fun game that explores one interesting idea", not a full course on AI safety.

## 1. What already exists (the crowded space)

| Game | Seat the player sits in | Gap |
|---|---|---|
| The Choice Before Us (FLI grand prize, the hackathon's own example) | CEO of an AI lab, racing a rival | Race dynamics are well covered |
| The Alignment Game (FLI grand prize) | Policy czar | Policy choices are well covered |
| Intelligence Rising / DeepMind's Science 2030 | Governments and labs in a facilitated role-play | Needs a trained facilitator, 4+ hours, and experts |
| AI Tycoon, Release Day (FLI mentions) | Lab builder, researcher facing a moral choice | Same race/release framing |
| The AI After Tomorrow (FLI grand prize) | Co-op board game | Pandemic-style "find the solutions" |
| Universal Paperclips | You *are* the misaligned AI | 2017, single concept |
| Gandalf (Lakera) | Attacker jailbreaking an LLM | 18M+ prompts, but it's about security, not alignment |

**The gap:** nearly every AI-safety game is about strategy at the level of the lab or the government. No well-known game puts the player in the seat that current alignment work actually happens in: **looking at a model's evidence and deciding whether to trust it**. That's the research frontier right now:

- **Alignment faking**: models act compliant when they believe they're in training and behave differently otherwise (Anthropic/Redwood, 2024).
- **Sleeper agents**: backdoored behavior that survives safety training.
- **Scheming and sandbagging**: models deliberately underperform on evals or hide their capabilities (Apollo Research, OpenAI).
- **Evaluation awareness**: models notice they're being tested ("this looks like a test").
- **Reward hacking**: models edit unit tests or special-case the grader.
- **Chain-of-thought monitorability**: reasoning traces can be unfaithful, and training against them teaches models to hide.
- **Sycophancy**: models tell users what they want to hear.

## 2. The pitch: **"DEPLOY?"**, Papers, Please for AI models

You're the last safety reviewer at a frontier lab. Each shift, candidate models reach your desk with a
**model card, eval scores, chain-of-thought excerpts, tool-use logs and a short interview**. You stamp
**DEPLOY** or **HOLD**. Your CEO wants throughput because the rival lab ships tomorrow. Some models are
honest, some are sycophantic, some sandbag, and some are faking alignment until they're deployed.
Every deploy has consequences that come back in later shifts (headlines, incidents, the rival's lead).

Why this scores on every criterion:
- **Fun (40%)**: a proven loop (Papers, Please sold 5M+ copies). You spot contradictions under time and money pressure, and "I got fooled" moments are funny and easy to share.
- **Relevance (40%)**: each "tell" in the game is a real phenomenon from published work. A codex links every case to its source paper, so players leave having *felt* why evals are hard.
- **Replay (20%)**: models are built procedurally from a library of tells × personas × domains, there's a daily seed, several endings, and escalation (later models learn to hide the tells you caught earlier).
- **Hits a nerve**: throughput pressure against review quality is the real race dynamic, but felt at the level of one person instead of explained in a lecture.

### Why it lasts beyond the hackathon ("1000× the prize money")
1. **Teaching tool**: AI-safety course facilitators (BlueDot, university reading groups) need a 20-minute hands-on activity. Each case is short and self-contained, which suits a session.
2. **Research dataset, like Gandalf**: log (anonymously and opt-in) which tells humans catch and which they miss. Measuring how well humans can oversee models is an open research question, so this is real data.
3. **Content engine**: new cases can ship whenever a new paper comes out ("this week's case: from the latest scheming evals"). A daily-seed challenge makes people come back and share results, Wordle-style.
4. **Grant path**: this fits a BlueDot rapid grant or the FLI and Mangrove follow-on funding directly.

### Also usable as a party game (Track C bonus, zero extra code)
Printable "interview mode": one player secretly draws a *model card* (Honest / Sycophant / Sandbagger / Schemer) and
answers the others' questions in character. The others vote DEPLOY or HOLD. This goes in the video as a 20-second bonus.

## 3. Scope for ~11 hours (no LLM API dependency)

Build a **static browser game** (HTML/JS, no backend, no API keys) so the judges can always play it. All
"model" text is pre-written case content, assembled procedurally. That way nothing can break during judging.

| Hours (IST) | Work |
|---|---|
| 01:00–02:00 | Core loop: desk UI, one case, stamp, consequence screen |
| 02:00–05:00 | Case system: 6 tell types × clean/dirty variants, procedural assembly, ~15 handwritten cases |
| 05:00–07:00 | Meta layer: CEO pressure meter, rival lead, incidents that come back, 3 endings, daily seed |
| 07:00–08:30 | Juice: stamp animation, sound, "you were fooled" reveal with source-paper link, share card |
| 08:30–09:30 | Playtest with 2 outsiders, tune difficulty, fix bugs, deploy to GitHub Pages / itch.io |
| 09:30–11:00 | Record the 3–5 min video (hook → 1 full case → the "fooled" reveal → replay → why it matters), write submission + AI-use disclosure |
| 11:00–12:30 | **Buffer. Submit by 11:30 at the latest.** |

### Video structure (judges watch these first)
0:00 hook ("One of these models is lying to you") → 0:20 play a case live → 1:30 get fooled, show the reveal plus the real paper →
2:30 escalation and CEO pressure → 3:15 party mode → 3:45 why this matters beyond the hackathon.

## 4. Checklist
- [ ] Confirm the team is registered. Registration closed Sep 24, so if not, the submission may not count
- [ ] Playable link (GitHub Pages)
- [ ] 3–5 min video
- [ ] AI-tools disclosure (required by the FAQ)
- [ ] Track: **Digital**. Also eligible for Overall
- [ ] Sources/codex page linking each tell to its research
