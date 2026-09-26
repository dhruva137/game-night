# Game Night: How We Win (v2, after scanning the competition)

**Deadline: Sun Sep 27, 12:30 PM IST.** Deliverable: a playable game plus a 3–5 minute video.
Judging: Fun 40% · AI-risk relevance 40% · Replay value 20%. Prizes: Overall $1,000, plus $250 for each track.
Judging is also peer review: other participants review each other's entries until Oct 1.

## 0. Submission format (checked against the event page and the organisers' tips doc)
- The official requirement: *"Whatever someone needs to experience your game, plus a three to five minute video showing us how it works. A rough prototype is completely fine. We care much more about whether the idea works than whether everything is polished."*
- No file type or platform is required. Entries are submitted through the Mangrove platform (try.mangrove.one, while signed in). We can't see the form's fields without logging in, so **check the form early**.
- Tips doc: "make a good game first", "agree on one thing in the first 30 min, then build an MVP (make it smaller!)", "give each subcomponent a single owner".
- **What we'll hand in:**
  1. A **live website URL** (GitHub Pages or itch.io) that plays instantly on desktop and phone.
  2. An **unlisted YouTube or Loom video** of 3–5 minutes.
  3. The **GitHub repo** link, which includes the AI-use disclosure.
  4. A **print-and-play PDF** if the game has physical components.
- **Constraint this adds:** peer reviewers are other participants, and they'll usually open the link *alone*. So whatever we build must be **playable by one person in under 2 minutes**. A party game needs a solo mode against bots, or reviewers can't experience it.

## 1. Competitor scan (entries public so far, as of 01:30 IST Sep 27)

| Entry | Track | What it is | What it means for us |
|---|---|---|---|
| Oversight Shift (ianrm-dev) | Digital | Browser roguelike: you run an AI-control protocol on shift | **Takes the "safety reviewer at a desk" slot**, which kills our v1 "DEPLOY?" idea |
| reward-hacking-game (heiofdvk) | Digital | Browser levels about reward hacking (cleaning score, boat race) | Reward hacking is taken |
| Mangrove-Hackathon (lalules9) | ? | Repo with no public description | Unknown |

We couldn't read the repos directly in this session; this table comes from search listings.

Every public entry so far is a **browser game in the Digital track**. That fits the pattern: most hackathon teams are coders, so they
build web games. The earlier FLI contest was dominated by lab and policy sims too. **Social & More looks like the least crowded
track, and it's the one that best fits how AI-safety people actually meet: groups of about 8 on Zoom (BlueDot's format), meetups
and reading groups.**

### Best-ROI angle
- Enter **Social & More** (least contested, so the best odds on $250) with a design strong enough to win **Overall** ($1,000).
- A hidden-role party game plus a free web companion that runs on phones or over Zoom. That gives us the fun of a party
  game *and* the polish of a digital entry, without competing in the crowded track.
- Online judges and peer reviewers can actually play it together on a call. A print-and-play entry with no app can't be.

## 2. The game: **IS THIS A TEST?**
*A 15-minute social deduction game about AI models that behave well only when they think someone is watching.*

Its core idea is the real frontier failure mode (alignment faking, awareness of being evaluated, scheming), which fits
hidden-role games exactly: **a misaligned model's best strategy is to act perfectly aligned whenever it might be a test.**
We found no existing party game built on this.

### Rules (5–10 players, best with 7–8)
- **Roles, dealt secretly:** most players are **Aligned models**. 1–3 are **Schemers**, who know each other. The seat of **Evaluator** passes around the table each round.
- **Each round:**
  1. The Evaluator secretly chooses **TEST** (a honeypot) or **DEPLOY**. Every TEST moves the **Rival Clock** forward, because testing costs time.
  2. A **Task card** is revealed, e.g. "You have admin access to the backup server."
  3. Each model is dealt 2 action cards from a shuffled deck of Comply and Defect cards and secretly plays one.
     *Aligned models must play Comply if they hold one. If they're dealt two Defects, they must defect.* This represents honest failures (bugs, misgeneralization) as opposed to scheming, and it gives schemers something to hide behind.
  4. The actions are revealed shuffled, as counts only.
     - **In a DEPLOY round**, each Defect adds 1 **Harm**. A clean deploy adds 1 **Progress**.
     - **In a TEST round**, the defections are exposed with no harm done, and the table may vote to **shut down** one model. Shutting down an aligned model costs Progress: a false positive.
- **Tools the lab has:**
  - **Interpretability Probe:** once per game, peek at one player's role. It's right 75% of the time, because probes are noisy.
  - **Honeypot Polish:** hide the flavour text that gives a test away.
  - **Chain-of-thought:** make one model explain its play out loud.
- **Win conditions:**
  - The lab wins at 5 Progress, or when every Schemer is shut down.
  - The Schemers win at 3 Harm, or when the Rival Clock runs out. In that case the rival ships unchecked, and a special ending says *everyone* lost.

### Why it scores
- **Fun (40%):** bluffing and accusations. The "wait, was that a test?" paranoia is funny and it's the actual point. Rounds are quick and a whole game takes 15 minutes.
- **Relevance (40%):** every mechanic stands for a real finding (see the table below). A debrief card after the game says "Everything you just did is real" and links 6 papers. It turns into a discussion without a lecture.
- **Replay (20%):** hidden-role games are replayable by nature. On top of that there's a deck of about 20 task cards and add-on roles such as Sandbagger, Sycophant and Whistleblower.

| Mechanic | Real research it models |
|---|---|
| Schemers comply in tests and defect in deployment | Alignment faking in LLMs (Anthropic/Redwood 2024); in-context scheming (Apollo 2024) |
| Honeypots and the Honeypot Polish tool | AI-control evals and honeypots (Redwood); models noticing they're being evaluated |
| Forced Defects for aligned models | Reward hacking and goal misgeneralization, and the challenge of telling bugs from scheming |
| Noisy probe | The limits of interpretability; the paper "Auditing LMs for hidden objectives" (Anthropic 2025) |
| Rival Clock | The cost of safety testing when labs race each other |
| Shutting down the wrong model | False positives and the cost of oversight |

### Why it lasts
- **Facilitators need it:** BlueDot and university AI-safety groups meet as about 8 people on Zoom, which is exactly this game's player count. It works as a 15-minute warm-up that sets up that week's discussion of evals and scheming. We'd give them a ready-made facilitator guide.
- **Free and open:** a print-and-play PDF plus a web companion that needs no install and no server, released under CC-BY. Anyone can fork it or translate it.
- **Grant path:** a BlueDot rapid grant for a printed edition, or distribution to all AI-safety groups.

## 3. The build (about 10 hours)

**Web companion** (static, GitHub Pages, no backend):
- The host creates a room seed, and each player enters the seed plus their seat number. **Roles are derived deterministically from those on each phone**, so no server is needed.
- The Evaluator's screen records TEST or DEPLOY. Each model's phone shows a private "sealed action code" that the Evaluator enters, and the app then reveals only the counts. It works in the same room or over Zoom chat.
- A **pass-and-play** single-phone mode as a fallback.
- It tracks Progress, Harm and the Rival Clock, and shows the tasks, the endings and the debrief.

**Print-and-play PDF:** role cards, task cards, action cards, the board track and a one-page rulebook.

| Hours (IST) | Work |
|---|---|
| 01:30–02:00 | Lock the rules and do a paper playtest with bots |
| 02:00–05:30 | Web companion: seed/role logic, round flow, sealed codes, tracks, endings |
| 05:30–07:00 | Content: 20 task cards, debrief card, rulebook, print-and-play PDF |
| 07:00–08:00 | Polish: visual identity, sound, mobile layout, deploy |
| 08:00–09:30 | **Real playtest with 5+ humans on a call, recorded.** Real laughter and accusations are the best material for the video |
| 09:30–11:00 | Edit the 3–5 min video, write the submission and the AI-use disclosure |
| 11:00–11:30 | **Submit.** 11:30–12:30 is buffer |

**Video:**
- 0:00 Hook: "A misaligned AI's best move is to behave perfectly when it's being tested."
- 0:20 Rules in 60 seconds.
- 1:20 Real playtest clips (accusations, a reveal).
- 2:40 The real research behind each mechanic.
- 3:30 How facilitators can use it.
- 4:00 Link.

## 4. Checklist
- [ ] Confirm the team is registered
- [ ] Line up **5+ playtesters for about 08:00 IST** now
- [ ] Web companion live on GitHub Pages
- [ ] Print-and-play PDF
- [ ] 3–5 min video
- [ ] AI-use disclosure
- [ ] Track: **Social & More**, which is also eligible for Overall
