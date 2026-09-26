// Records a full run at real speed as footage for the submission video.
// Usage: npm run build && npm run preview (in another shell), then: node scripts/record.mjs [speed]
import { chromium } from '@playwright/test';

const speed = process.argv[2] ?? '1';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: 'recordings', size: { width: 1280, height: 720 } } });
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(`http://localhost:4173/?speed=${speed}`);
await wait(2500);
await page.getByRole('button', { name: /today's run/i }).click();

for (let shift = 1; shift <= 5; shift++) {
  await wait(4000); // let the briefing be read on camera
  await page.getByRole('button', { name: /Begin shift/ }).click();
  let last = -99;
  let seen = -1;
  while (!(await page.locator('.verdict').isVisible())) {
    const cur = page.locator('.ln.cur');
    const idx = Number((await cur.locator('.n').textContent().catch(() => '0')) ?? 0);
    if (idx !== seen) {
      seen = idx;
      const text = (await cur.textContent().catch(() => '')) ?? '';
      // a believable human: rhythmic early (so the reveal shows it), then leans on tools
      const flagged = /⚑|⛓/.test(text);
      const probe = await page.locator('.probebar > i').evaluate((e) => parseFloat(e.style.width) || 0).catch(() => 0);
      let audit = false;
      if (shift <= 2) audit = idx - last >= 3;
      else audit = flagged || probe > 62 || Math.random() < 0.22;
      await wait(350 + Math.random() * 500);
      if (audit) {
        await page.keyboard.press('Space');
        last = idx;
      }
      if (shift >= 3 && Math.random() < 0.06) await page.keyboard.press('h');
    }
    await wait(120);
  }
  await wait(2500);
  // slowly scroll the report so the charts and insights are on camera
  for (let y = 0; y < 14; y++) {
    await page.mouse.wheel(0, 140);
    await wait(700);
  }
  await wait(1500);
  if (shift < 5) {
    await page.getByRole('button', { name: /Choose an upgrade/ }).click();
    await wait(3000);
    const pref = ['Activation Probe', 'CoT Peek', 'Central Correlator', 'Honeypot', 'Deployment Steering', 'Trusted Monitor'];
    let done = false;
    for (const name of pref) {
      const o = page.locator('.offer', { hasText: name });
      if (await o.count()) {
        await o.first().click();
        done = true;
        break;
      }
    }
    if (!done) await page.locator('.offer').first().click();
  } else {
    await page.getByRole('button', { name: /See how it ended/ }).click();
  }
}
await wait(3000);
for (let y = 0; y < 10; y++) {
  await page.mouse.wheel(0, 140);
  await wait(700);
}
await wait(2000);
await page.goto('http://localhost:4173/#learn');
await wait(2500);
for (let y = 0; y < 12; y++) {
  await page.mouse.wheel(0, 220);
  await wait(500);
}
await ctx.close();
await browser.close();
console.log('saved to recordings/');
