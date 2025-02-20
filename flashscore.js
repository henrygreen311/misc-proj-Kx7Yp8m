const { chromium } = require('playwright');

(async () => { const browser = await chromium.launch({ headless: true }); const context = await browser.newContext(); const page = await context.newPage();

// Go to FlashScore
await page.goto('https://www.flashscore.com/', { waitUntil: 'load' });

// Wait for cookie dialog and accept it if present
try {
    await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
    await page.click('button:has-text("Accept")');
    console.log('Accepted cookies');
} catch (error) {
    console.log('No cookie dialog found');
}

// Wait for full page load
await page.waitForTimeout(5000);

// Take a screenshot of the dashboard
await page.screenshot({ path: 'screenshot_dashboard.png', fullPage: true });
console.log('Screenshot of dashboard taken');

// Scroll to the middle of the page and take another screenshot
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
await page.waitForTimeout(2000);
await page.screenshot({ path: 'screenshot_middle.png', fullPage: true });
console.log('Screenshot of middle section taken');

// Scroll to the footer and take another screenshot
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(2000);
await page.screenshot({ path: 'screenshot_footer.png', fullPage: true });
console.log('Screenshot of footer taken');

await browser.close();

})();

