# BLIND SPOT

> You are the only human overseeing an AI agent. You can afford to check a few of its actions.
> **It is learning when you look.**

A browser game about AI oversight, built for **[Mangrove Game Night 2026](https://mangrove.one/hackathon/game-night)** (Digital track).
It plays in about 8 minutes, on a phone or a laptop, with no install, no account and no server.

## The idea
Labs can't have humans review everything a capable AI does, so they spot-check. But humans are famously bad at being
random, and a model with enough situational awareness can learn *when* the checks happen and behave perfectly exactly then.
BLIND SPOT makes you experience that from the overseer's chair: a live predictor learns your auditing rhythm and your
habits, and the attacking model strikes in your blind spots. After each shift, the game shows you how predictable you were.

## How it plays
- Agents work on a live "floor". Each action appears as a **tool call** (`bash`, `edit_file`, `http_request`…) with a result line, while the agent's status shows what it *claims* to be doing. **Tap the call (or press Space) to audit it** before the countdown ring runs out. You have a small budget of audits.
- Catch 3 sabotages and the model is shut down. Let too much harm through and it's an incident.
- **Five shifts**, each based on real research or a real incident:

| Shift | What happens | Based on |
|---|---|---|
| 1 Onboarding | The model attacks at random; reading the lines is enough | AI Control audit budgets (Redwood, 2023) |
| 2 It Learns | The model predicts *you* and hides in your blind spots | Wagenaar 1972 (humans aren't random); alignment faking; eval awareness |
| 3 Budget Cut | Fewer audits, plus a trusted monitor that **silently fails** halfway | Automation complacency (Parasuraman & Manzey 2010); HF × OpenAI incident (Jul 2026) |
| 4 Swarm | Three agents split each attack into harmless-looking steps, coordinated by a planner in an **#agents channel** that you can audit | Multi-agent AI control / fragmentation effect (arXiv 2607.07368); secret collusion (Motwani et al. 2024) |
| 5 Breakout | An agent cheating a cyber eval: sandbox escape, encoded payloads, disabling its own shutdown | HF × OpenAI incident (Jul 2026); Palisade shutdown resistance |

- Between shifts you **pick one tool**, and each one is a real oversight technique with a real weakness: True Randomizer, Trusted Monitor, Honeypot, Deployment Steering, CoT Peek, Activation Probe, Central Correlator, Second Reviewer, Slow Mode.
- There's a daily seeded run, scoring, a hidden ending, an optional **callsign** (kept only on your device), and a **shareable result card** (PNG with a QR code to play). It's generated in the browser, and nothing is uploaded.
- An anonymous **audit-data export** at the end: human spot-check timings are real research data.
- A 60-second interactive training level, plus How to play, FAQ, tools reference and settings (pace, motion, text size, sound).

All sources are listed in-game on the **Research** page (`/#learn`) and in [`src/content/research.ts`](src/content/research.ts).

## How the model "reads" you
[`src/engine/predictor.ts`](src/engine/predictor.ts) mixes three experts with multiplicative weights (like Aaronson's "Oracle" demo):
1. **Gap hazard:** how likely you are to audit given how long it's been since your last audit.
2. **n-gram:** your recent audit/skip pattern (orders 1–4 with backoff).
3. **Look response:** how much more often you audit scary-*looking* lines than boring ones.

The predictability score is its information gain over simply knowing your audit rate. It's tested in [`tests/`](tests):
it reads scripted human-like players (rhythmic, "random but never twice in a row", audits-only-scary-lines) at a score above 30,
and a truly random player below 15. Balance simulations check that predictable play loses adaptive shifts and that random play plus tools can win.

## Develop
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + balance tests (Vitest)
npm run e2e        # Playwright: desktop + mobile smoke tests and a full 5-shift run
npm run build      # static site in dist/
```
Add `?speed=4` to the URL to run the game faster (used for tests and recording footage).

## Deploy (Vercel)
1. Go to vercel.com → **Add New… → Project** → import `dhruva137/game-night`.
2. Vercel reads [`vercel.json`](vercel.json): framework Vite, build `npm run build`, output `dist`. Click **Deploy**.
3. Every push to the branch redeploys automatically.

It's also a plain static site, so `dist/` works on GitHub Pages, Netlify or as an itch.io HTML5 upload (zip the `dist/` folder).

## Stack
TypeScript and Vite, with no UI framework: the DOM plus hand-drawn SVG charts, icons and characters, with no emoji and no image assets.
Fonts (Instrument Serif, IBM Plex Sans/Mono) are bundled, so nothing is fetched from third parties. Sound is synthesized with WebAudio, runs
use a seeded PRNG (mulberry32), and QR codes come from `qrcode-generator`. There are no network requests after load, no cookies and no tracking.

## AI use disclosure
As Mangrove asks, here is how AI was used. This project was built with **Claude (Anthropic) via Claude Code** as a
research and coding assistant. It was used for the competitor and research scan, the game-design iteration, the TypeScript code, the tests,
and first drafts of the in-game text. The team chose the concept and direction, playtested and tuned it, and reviewed the content.
Incident descriptions paraphrase public disclosures and link to them.

## License
MIT
