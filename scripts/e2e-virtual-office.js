const { chromium } = require('playwright');

(async () => {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Visiting mock-login to establish session...');
    const loginResp = await page.goto(`${base}/auth/mock-login`, { waitUntil: 'networkidle' });
    console.log('Mock-login status:', loginResp && loginResp.status());

    // Go to virtual offices page
    console.log('Navigating to Virtual Offices page...');
    await page.goto(`${base}/virtual-offices`, { waitUntil: 'networkidle' });

    // Wait for loader to disappear (if present)
    try {
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 5000 });
      console.log('Loader detached (or not present).');
    } catch (e) {
      console.log('Loader still present or not found within timeout; continuing to checks.');
    }

    // Check for either empty state or table
    const emptyText = 'Zatiaľ nemáte žiadne virtuálne kancelárie';
    const hasEmpty = await page.locator(`text=${emptyText}`).first().count();
    const hasTable = await page.locator('table').count();

    console.log('Initial page state:', { hasEmpty, hasTable });

    // Create a new office via the page's fetch so it shares the cookie/session
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

    // Wait for the list to show the new office name (React Query invalidation should refresh)
    try {
      await page.waitForSelector(`text=${officeName}`, { timeout: 5000 });
      console.log('SUCCESS: Office appeared in the list without full refresh.');
      await browser.close();
      process.exit(0);
    } catch (e) {
      console.error('FAIL: Office did not appear in the list within timeout.');
      // Take screenshot for debugging
      const path = `/tmp/e2e-virtual-office-fail-${Date.now()}.png`;
      await page.screenshot({ path, fullPage: true });
      console.log('Saved screenshot to', path);
      await browser.close();
      process.exit(2);
    }
  } catch (err) {
    console.error('Error during e2e check:', err);
    await browser.close();
    process.exit(3);
  }
})();
