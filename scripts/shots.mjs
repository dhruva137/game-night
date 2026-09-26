// Captures key screens for visual review: node scripts/shots.mjs (needs `npm run preview` on :4173)
import { chromium, devices } from '@playwright/test';
const out = 'test-results/gallery';
const b = await chromium.launch();
const base = 'http://localhost:4173';
async function page(vp, qs = '') {
  const ctx = await b.newContext(vp);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(`${base}/${qs}`);
  await p.evaluate(() => localStorage.setItem('blind-spot:v1', JSON.stringify({ tutorialDone: true, callsign: 'DHRUVA' })));
  await p.reload();
  return p;
}
const desk = { viewport: { width: 1280, height: 760 } };
const mob = { ...devices['Pixel 7'] };
for (const [name, vp] of [['desk', desk], ['mob', mob]]) {
  // title
  let p = await page(vp, '?speed=2');
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/${name}-title.png` });
  // swarm with comms
  p = await page(vp, '?speed=2&start=4');
  await p.getByRole('button', { name: /Play daily run/ }).click();
  await p.getByRole('button', { name: /Begin shift/ }).click();
  for (let i = 0; i < 14; i++) { await p.waitForTimeout(350); if (i % 4 === 1) await p.keyboard.press('Space'); }
  await p.getByRole('tab', { name: /#agents/ }).click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${name}-swarm.png`, fullPage: name === 'mob' });
  // finale → report → final
  p = await page(vp, '?speed=8&start=5');
  await p.getByRole('button', { name: /Play daily run/ }).click();
  await p.getByRole('button', { name: /Begin shift/ }).click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/${name}-breakout.png` });
  while (!(await p.locator('.verdict').isVisible())) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/${name}-report.png`, fullPage: true });
  await p.getByRole('button', { name: /See how it ended/ }).click();
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/${name}-final.png`, fullPage: true });
  if (name === 'desk') {
    const src = await p.locator('img.share-img').getAttribute('src');
    const fs = await import('node:fs');
    fs.writeFileSync(`${out}/share-card.png`, Buffer.from((src ?? '').split(',')[1], 'base64'));
  }
}
await b.close();
console.log('done');
