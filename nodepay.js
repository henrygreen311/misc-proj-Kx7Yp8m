const { chromium } = require('playwright');

(async () => {
    const userDataDir = "/home/kali/Nodepay"; // New Chromium profile path

    const browser = await chromium.launchPersistentContext(userDataDir, {
        headless: false, 
        args: ["--disable-blink-features=AutomationControlled"]
    });

    const page = await browser.newPage();
    const dashboardURL = 'https://app.nodepay.ai/dashboard';

    await page.goto(dashboardURL, { waitUntil: 'load' });
    await page.reload();

    if (page.url() === dashboardURL) {
        console.log('Login successful, dashboard loaded.');
        await page.waitForTimeout(100000); // Wait for 10 seconds
    } else {
        console.log('Login failed, please check your session.');
    }

    await browser.close();
})();
