import { expect, test } from '@playwright/test';

test('title → briefing → play shift 1 by keyboard → report → upgrade', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /BLIND/ })).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-1-title.png` });

  await page.getByRole('button', { name: /today's run/i }).click();
  await expect(page.getByText('Onboarding')).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-2-briefing.png`, fullPage: true });
  await page.getByRole('button', { name: /Begin shift/ }).click();

  // play: audit roughly every third line until the shift ends
  await expect(page.locator('.ln.cur')).toBeVisible({ timeout: 5000 });
  let shot = false;
  for (let i = 0; i < 80; i++) {
    if (await page.locator('.verdict').isVisible()) break;
    if (i % 3 === 1) await page.keyboard.press('Space');
    if (i === 10 && !shot) {
      await page.screenshot({ path: `test-results/shots/${info.project.name}-3-play.png` });
      shot = true;
    }
    await page.waitForTimeout(1700);
  }
  await expect(page.locator('.verdict')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `test-results/shots/${info.project.name}-4-report.png`, fullPage: true });

  await page.getByRole('button', { name: /Choose an upgrade/ }).click();
  await expect(page.locator('.offer')).toHaveCount(3);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-5-upgrade.png`, fullPage: true });

  // no horizontal scroll on any width
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('learn page renders with sources', async ({ page }) => {
  await page.goto('/#learn');
  await expect(page.getByRole('heading', { name: 'The research' })).toBeVisible();
  expect(await page.locator('.learn .src').count()).toBeGreaterThan(10);
});
