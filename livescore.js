const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Go to LiveScore
    await page.goto('https://www.livescore.com/en/', { waitUntil: 'load' });

    // Wait for cookie dialog and accept it if present
    try {
        await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
        await page.click('button:has-text("Accept")');
        console.log('Accepted cookies');
    } catch (error) {
        console.log('No cookie dialog found');
    }

    // Wait for 30 seconds to allow full page load
    await page.waitForTimeout(30000);

    // Take screenshot
    await page.screenshot({ path: 'dashboard.png', fullPage: true });

    console.log('Screenshot saved as dashboard.png');

    await browser.close();
})();
