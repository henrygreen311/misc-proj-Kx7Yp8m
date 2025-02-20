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

    // Take initial screenshot (dashboard view)
    await page.screenshot({ path: 'dashboard_top.png' });
    console.log('Screenshot saved as dashboard_top.png');

    // Scroll to the middle of the page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(30000); // Small delay to ensure smooth scrolling

    // Take middle screenshot
    await page.screenshot({ path: 'dashboard_middle.png' });
    console.log('Screenshot saved as dashboard_middle.png');

    // Scroll to the footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(30000); // Small delay to ensure smooth scrolling

    // Take footer screenshot
    await page.screenshot({ path: 'dashboard_footer.png' });
    console.log('Screenshot saved as dashboard_footer.png');

    await browser.close();
})();
