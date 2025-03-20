const { chromium } = require('playwright-extra');
const stealth = require('@extra/stealth')();
chromium.use(stealth);

(async () => {
    const userDataDir = "/home/runner/Nodepay/nodepay_1"; // Use the persistent profile
    const extensionPath = "/home/runner/Nodepay/extension"; // Correct extension path

    if (!fs.existsSync(extensionPath)) {
        console.error(`Error: Extension path does not exist - ${extensionPath}`);
        process.exit(1);
    }

    const browser = await chromium.launchPersistentContext(userDataDir, {
        headless: false, // Extensions do NOT work in headless mode
        args: [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-gpu",  // Fix GPU issues
            "--disable-software-rasterizer", // Use CPU rendering
            "--disable-dev-shm-usage",  // Prevent shared memory issues
            "--start-maximized",
            `--disable-extensions-except=${extensionPath}`,  
            `--load-extension=${extensionPath}`  
        ]
    });

    const page = await browser.newPage();
    
    // Apply Stealth Mode
    await stealth()(page);

    // Set Chrome User-Agent
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36");

    await page.goto("https://app.nodepay.ai/dashboard", { waitUntil: "load" });

    console.log("Browser started with nodepay_1 profile. Waiting 10 seconds for login verification...");
    await page.waitForTimeout(10000); // Wait 10 seconds

    if (page.url() === "https://app.nodepay.ai/dashboard") {
        console.log("Login successful: URL verified.");

        // Wait 30 seconds before checking for the div
        console.log("Waiting 30 seconds before checking for the claim button...");
        await page.waitForTimeout(30000);

        // Locate the div element
        const claimButton = page.locator('div[id="1"][style*="box-shadow: rgba(0, 0, 0, 0.2) 0px -8px 0px 0px inset;"]');

        if (await claimButton.isVisible()) {
            console.log("Claim button found. Clicking now...");
            await claimButton.click();
        } else {
            console.log("Claim button not found.");
        }

        // Set a timeout to stop the script after 5 hours 30 minutes (19,800,000 ms)
        const runtimeLimit = 5 * 60 * 60 * 1000 + 30 * 60 * 1000; // 5h 30m in ms
        const stopTime = Date.now() + runtimeLimit;

        console.log("Script will stop after 5 hours 30 minutes...");

        // Refresh every 15 minutes (900,000 ms) using setInterval
        const refreshInterval = setInterval(async () => {
            if (Date.now() >= stopTime) {
                console.log("Runtime limit reached. Exiting...");
                clearInterval(refreshInterval); // Stop refreshing
                await browser.close();
                process.exit(0); // Exit successfully
            }

            await page.reload({ waitUntil: "load" });
            console.log("Page refreshed at: " + new Date().toISOString());
        }, 900000); // 15 minutes = 900,000 ms

    } else {
        console.log("Login failed: Unexpected URL - " + page.url());
        await browser.close();
    }

})();
