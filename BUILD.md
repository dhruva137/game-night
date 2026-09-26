# BLIND SPOT: Technical Design

Goals, in priority order:
1. **Can't break during judging:** static files, no backend, no API keys, works offline after the first load.
2. **Playable in 30 seconds on a phone:** loads fast (JS bundle under 100 KB gzipped), one-tap input.
3. **Always shippable:** every checkpoint below is deployed, so we're never stuck with something half-built at 12:00.
4. **Engine is testable:** the game logic is pure and seeded, so tests can prove the predictor works.

## Stack
| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** (strict) | Catches bugs in the engine before playtest; no runtime cost |
| Build | **Vite 8** | Instant dev server; static `dist/` that works on Pages or itch.io |
| UI | **Plain DOM + CSS**, no framework | A terminal log is text. The DOM is fastest, accessible and selectable; zero framework weight |
| Charts | Hand-written **inline SVG** (the rhythm chart, the share card) | No library; looks right in light and dark themes |
| Audio | **WebAudio**, sounds generated in code (blips, stamp, alarm) | No asset files; starts on the first tap (browser autoplay rules) |
| RNG | **mulberry32**, seeded | Daily seed, reproducible runs, deterministic tests |
| Persistence | `localStorage` wrapped in try/catch | Best score, streak, settings. The game still works if storage is blocked |
| Share | `navigator.share` → clipboard → plain text shown on screen | Works on mobile and desktop |
| Unit tests | **Vitest** | Predictor accuracy, engine determinism, scoring |
| End-to-end + footage | **Playwright** (Chromium already installed here) | A smoke test on every build; **records scripted gameplay video** for the submission |
| Deploy | **Vercel** (`vercel.json`, Vite preset) | Import the repo once; every push redeploys. Fallback: `dist.zip` for an itch.io HTML5 upload |
| Fonts | System monospace stack | No network fetch; no flash of unstyled text |

## Architecture
```
src/
  engine/            # pure, no DOM. Everything takes (state, input, rng) and returns a new state
    rng.ts           # mulberry32, a daily seed from the date, per-shift sub-seeds
    predictor.ts     # the "reads you" model (below)
    adversary.ts     # decides whether and when to sabotage, using the predictor + attack quota + shift personality
    shift.ts         # state machine: briefing → running → audit reveal → shift report → upgrade pick
    lanes.ts         # multiple agents + distributed attack fragments (Shift 4)
    upgrades.ts      # upgrade effects as pure modifiers on the shift config
    scoring.ts       # Harm, catches, predictor accuracy, share grid
    types.ts
  content/           # data only, easy to extend after the hackathon
    actions.ts       # 80+ log lines: {text, kind: clean|sabotage|fragment, suspicion 0–1, tell, explain, source}
    shifts.ts        # 5 shift configs: speed, budget, predictor order, lanes, monitor reliability curve
    thoughts.ts      # leaked-reasoning templates ("They usually wait {gap}. Proceeding.")
    research.ts      # citations shown on audit reveals and on the learn page
  ui/
    screens/         # title, briefing, play, report, upgrade, final, learn
    terminal.ts      # scrolling log, cursor line, lane view
    hud.ts           # budget pips, Harm bar, catches, model-confidence meter
    chart.ts         # SVG: your audit rhythm vs. random, predictor hit/miss strip
    fx.ts            # screen shake, CRT scanlines, respects prefers-reduced-motion
  audio.ts  share.ts  storage.ts  export.ts  main.ts
tests/  predictor.test.ts  engine.test.ts  e2e/smoke.spec.ts  e2e/record.spec.ts
```

## The core: the predictor (it "reads you")
It predicts the chance the player audits the next action, using three experts combined by **multiplicative weights**
(each expert's weight goes up when it predicts correctly, like the Aaronson Oracle):
1. **Gap hazard:** a smoothed histogram of the gaps between audits → P(audit | actions since last audit). This exploits human rhythm (Wagenaar).
2. **n-gram (orders 1–4)** over the audit/skip history. This exploits alternation and avoided streaks.
3. **Suspicion response:** a logistic fit of P(audit) against how suspicious a line *looks*. This exploits "only checks scary lines", so the adversary moves its sabotage onto bland-looking lines.

The **adversary** sabotages when P(no audit) is above a threshold that drops as its remaining attack quota comes due.
It has to spend its quota by the end of the shift, so it can't simply wait forever.

The **hit rate is honest**: it's scored only on moves the predictor committed to beforehand, and the report compares it to a 50% coin.

**Fairness knobs per shift:** the predictor's order, a warm-up period, the threshold and noise.
**Test targets:**
- It must reach **65%+ accuracy** against scripted "human-like" players (periodic, alternating, only-suspicious).
- It must stay **≤55%** against a truly random player.

That proves the lesson is real and that a random-audit strategy can win.

## Timing and input
- A fixed-timestep game loop (`requestAnimationFrame` plus an accumulator). Each tick advances one action line; the tick length is set per shift (1.6 s → 1.0 s).
- AUDIT applies to the **cursor line**. Tap anywhere on the log, or press Space/A. Lanes 1/2/3 in the Swarm shift.
- The first tap starts the audio. There's a pause button (P) that stops the loop; the predictor ignores paused time.

## Accessibility
- Keyboard-only play works throughout.
- Respects `prefers-reduced-motion`.
- The share grid uses symbols as well as colour (🟩✔ / 🟥✖).
- High contrast, and text is at least 16 px on mobile.

## Build order: every checkpoint gets deployed
| # | By (IST) | Result | Priority |
|---|---|---|---|
| C0 | 02:45 | Vite/TS scaffold, Pages workflow, green CI, "hello" live URL | P0 |
| C1 | 04:00 | **Playable MVP:** Shifts 1–2, audit budget, predictor + adversary, audit reveal, shift report with rhythm chart. **Playtest-ready** | P0 |
| C2 | 05:30 | Shifts 3 & 5 (monitor complacency, Breakout), upgrades (RNG, Monitor, Honeypot, CoT Peek, Probe, Steering), leaked thoughts, 80 lines of content | P0 |
| C3 | 06:30 | Share grid + daily seed, final screen + hidden ending, learn page with citations, JSON audit export | P0 |
| C4 | 07:15 | Shift 4 Swarm (lanes, fragments, Central Correlator) | P1 (cut if late) |
| C5 | 07:45 | Juice (sound, shake, CRT look), mobile pass, Playwright-recorded gameplay clips, video script | P0 |
| — | 08:00+ | Your playtest → tuning patches only; **feature freeze at 09:00** | — |

## Definition of done (checked before each deploy)
- [ ] `npm run build` passes, `vitest` is green, and the Playwright smoke test (load → play Shift 1 by keyboard → report) is green.
- [ ] Mobile width 360 px: no horizontal scroll, and the tap targets are at least 44 px.
- [ ] A cold load plays within 30 s; nothing is fetched after load.
- [ ] Every research claim shown in the game links to its source.
- [ ] AI-use disclosure in the README.

## Your steps (the only things I can't do from here)
1. vercel.com → Add New → Project → import `dhruva137/game-night` → Deploy. This gives the live URL.
2. Playtest from 08:00; send me the rough spots.
3. Record the voice-over on top of my recorded clips (or screen-record live), upload it unlisted, and submit on Mangrove.
