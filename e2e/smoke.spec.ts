import { expect, test, type Page } from '@playwright/test';

async function skipBoot(page: Page) {
  // the boot sequence ends on any key
  await page.keyboard.press('Shift');
  await expect(page.getByRole('heading', { name: /Blind/ })).toBeVisible({ timeout: 8000 });
}

test('first run: boot → modals → training → shift 1 → report → tools', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const shot = (n: string) => page.screenshot({ path: `test-results/shots/${info.project.name}-${n}.png` });

  await page.goto('/');
  await page.waitForTimeout(900);
  await shot('0-boot');
  await skipBoot(page);
  await page.waitForTimeout(400);
  await shot('1-title');

  // pop-ups open and close cleanly
  for (const [btn, heading] of [['How to play', 'How to play'], ['FAQ', 'FAQ'], ['Settings', 'Settings']] as const) {
    await page.getByRole('button', { name: btn, exact: true }).click();
    await expect(page.getByRole('dialog', { name: heading })).toBeVisible();
    if (btn === 'FAQ') await page.getByText('Does the model really learn me').click();
    await page.waitForTimeout(300);
    await shot(`1-modal-${btn.replace(/ /g, '')}`);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }

  // training
  await page.getByRole('button', { name: /Play daily/ }).click();
  await expect(page.getByText('Oversight lead')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(400);
  await shot('2-training');
  await page.keyboard.press('Space');
  await expect(page.locator('.stamp.bad')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Missed · tests/helpers.ts')).toBeVisible({ timeout: 6000 });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Start shift 1/ }).click();

  await expect(page.getByText('Onboarding').first()).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-3-briefing.png`, fullPage: true });
  await page.getByRole('button', { name: /Begin shift/ }).click();
  await page.waitForTimeout(500);
  await shot('4-titlecard');

  await expect(page.locator('.focus .chip')).toBeVisible({ timeout: 6000 });
  let took = false;
  for (let i = 0; i < 90; i++) {
    if (await page.locator('.verdict').isVisible()) break;
    if (i % 3 === 1) await page.keyboard.press('Space');
    if (i === 8 && !took) {
      await page.waitForTimeout(150);
      await shot('5-play');
      took = true;
    }
    await page.waitForTimeout(1600);
  }
  await expect(page.locator('.verdict')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-6-report.png`, fullPage: true });

  await page.getByRole('button', { name: /Choose a tool/ }).click();
  await expect(page.locator('.offer')).toHaveCount(3);
  await page.waitForTimeout(500);
  await shot('7-tools');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('research page renders sources and the real-vs-simplified section', async ({ page }) => {
  await page.goto('/#learn');
  await expect(page.getByRole('heading', { name: 'The research' })).toBeVisible();
  await expect(page.getByText('What\'s real, and what\'s simplified')).toBeVisible();
  expect(await page.locator('.learn .src').count()).toBeGreaterThan(14);
});
