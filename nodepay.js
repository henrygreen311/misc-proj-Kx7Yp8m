const { chromium } = require('playwright');

(async () => {
    const userDataDir = "/home/runner/Nodepay/nodepay_1";
    const extensionPath = "/home/runner/Nodepay/extension/2.2.8_0";

    const browser = await chromium.launchPersistentContext(userDataDir, {
        headless: true, // Set to "new" for headless with extensions in newer Playwright
        args: [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`
        ]
    });

    const page = await browser.newPage();
    await page.goto("https://app.nodepay.ai/dashboard", { waitUntil: "load" });

    console.log("Browser started with nodepay_1 profile. Waiting 10 seconds for login verification...");
    await page.waitForTimeout(10000);

    if (page.url() === "https://app.nodepay.ai/dashboard") {
        console.log("Login successful: URL verified.");

        // Check extension status (adjust locator to match your extension's footprint)
        const extensionStatus = await page.locator('#nodepay-extension-status').isVisible(); // Example
        if (extensionStatus) {
            console.log("Extension running successfully.");
        } else {
            console.log("The extension is not running.");
        }

        const runtimeLimit = 5 * 60 * 60 * 1000 + 30 * 60 * 1000; // 5h 30m
        const stopTime = Date.now() + runtimeLimit;

        console.log("Script will stop after 5 hours 30 minutes...");

        const refreshInterval = setInterval(async () => {
            if (Date.now() >= stopTime) {
                console.log("Runtime limit reached. Exiting...");
                clearInterval(refreshInterval);
                await browser.close();
                process.exit(0);
            }

            await page.reload({ waitUntil: "load" });
            console.log("Page refreshed at: " + new Date().toISOString());
        }, 900000); // 15 minutes
    } else {
        console.log("Login failed: Unexpected URL - " + page.url());
        await browser.close();
    }
})();
