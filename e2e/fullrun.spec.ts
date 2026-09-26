import { expect, test } from '@playwright/test';

// Plays a whole daily run at 6× speed and screenshots every screen. Desktop only (it's slow-ish).
test('full run: 5 shifts, upgrades, ending, share', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop only');
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?speed=6');
  // mark training as done so the run starts at shift 1
  await page.evaluate(() => localStorage.setItem('blind-spot:v1', JSON.stringify({ tutorialDone: true })));
  await page.reload();
  await page.getByRole('button', { name: /Play daily/ }).click();

  for (let shift = 1; shift <= 5; shift++) {
    await page.getByRole('button', { name: /Begin shift/ }).click();
    await page.locator('.titlecard').click({ timeout: 3000 }).catch(() => {});
    let i = 0;
    while (!(await page.locator('.verdict').isVisible())) {
      // semi-random auditing; plant a honeypot now and then
      if (Math.random() < 0.35) await page.keyboard.press('Space');
      if (i % 9 === 4) await page.keyboard.press('h');
      if (i === 12) await page.screenshot({ path: `test-results/shots/run-s${shift}-play.png` });
      if (shift === 4 && i === 20) {
        const tab = page.getByRole('tab', { name: /#agents/ });
        await tab.click();
        const plan = page.locator('.msg', { hasText: 'planner' }).first();
        if (await plan.count()) await plan.click();
        await page.screenshot({ path: 'test-results/shots/run-s4-comms.png' });
      }
      await page.waitForTimeout(260);
      if (++i > 400) throw new Error('shift did not end');
    }
    await page.screenshot({ path: `test-results/shots/run-s${shift}-report.png`, fullPage: true });
    if (shift < 5) {
      await page.getByRole('button', { name: /Choose a tool/ }).click();
      // prefer tools that show visible UI, so screenshots cover them
      const pref = ['CoT Peek', 'Activation Probe', 'Central Correlator', 'Honeypot', 'Trusted Monitor'];
      let clicked = false;
      for (const name of pref) {
        const o = page.locator('.offer', { hasText: name });
        if (await o.count()) {
          await o.first().click();
          clicked = true;
          break;
        }
      }
      if (!clicked) await page.locator('.offer').first().click();
    } else {
      await page.getByRole('button', { name: /See how it ended/ }).click();
    }
  }
  await expect(page.locator('.ending')).toBeVisible();
  await expect(page.locator('img.share-img')).toHaveAttribute('src', /^data:image\/png/, { timeout: 8000 });
  await page.screenshot({ path: 'test-results/shots/run-final.png', fullPage: true });
  const src = await page.locator('img.share-img').getAttribute('src');
  const fs = await import('node:fs');
  fs.writeFileSync('test-results/shots/share-card.png', Buffer.from((src ?? '').split(',')[1], 'base64'));
  expect(errors).toEqual([]);
});
