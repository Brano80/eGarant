import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'http://localhost:3000';

try {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Visiting mock-login to establish session...');
  const loginResp = await page.goto(`${base}/auth/mock-login`, { waitUntil: 'networkidle' });
  console.log('Mock-login status:', loginResp && loginResp.status());

  console.log('Navigating to Virtual Offices page...');
  await page.goto(`${base}/virtual-offices`, { waitUntil: 'networkidle' });

  try {
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 5000 });
    console.log('Loader detached (or not present).');
  } catch (e) {
    console.log('Loader still present or not found within timeout; continuing to checks.');
  }

  const emptyText = 'Zatiaľ nemáte žiadne virtuálne kancelárie';
  const hasEmpty = await page.locator(`text=${emptyText}`).first().count();
  const hasTable = await page.locator('table').count();
  console.log('Initial page state:', { hasEmpty, hasTable });

  const officeName = `E2E Office ${Date.now()}`;
  console.log('Creating office via API with name:', officeName);

  const created = await page.evaluate(async (name) => {
    const res = await fetch('/api/virtual-offices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ownerCompanyId: null }),
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('Create failed: ' + res.status);
    return res.json();
  }, officeName);

  console.log('Created office id:', created.id);

  try {
    await page.waitForSelector(`text=${officeName}`, { timeout: 5000 });
    console.log('SUCCESS: Office appeared in the list without full refresh.');
    await browser.close();
    process.exitCode = 0;
  } catch (e) {
    console.error('FAIL: Office did not appear in the list within timeout.');
    const path = `/tmp/e2e-virtual-office-fail-${Date.now()}.png`;
    await page.screenshot({ path, fullPage: true });
    console.log('Saved screenshot to', path);
    await browser.close();
    process.exitCode = 2;
  }
} catch (err) {
  console.error('Error during e2e check:', err);
  process.exitCode = 3;
}
