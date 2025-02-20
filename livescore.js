const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Go to LiveScore
    await page.goto('https://www.livescore.com/en/', { waitUntil: 'load' });

    // Wait for 10 seconds to allow full page load
    await page.waitForTimeout(180000);

    // Take screenshot
    await page.screenshot({ path: 'dashboard.png', fullPage: true });

    console.log('Screenshot saved as dashboard.png');

    await browser.close();
})();
