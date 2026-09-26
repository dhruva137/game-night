import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto('file://' + fileURLToPath(new URL('./og.html', import.meta.url)));
await page.screenshot({ path: 'public/og.png' });
await browser.close();
