const { chromium } = require('playwright');

(async () => {
    const userDataDir = "/home/kali/Nodepay/nodepay_1"; // Use the persistent profile
    const extensionPath = "/home/kali/Nodepay/extension/2.2.8_0"; // Correct extension path

    const browser = await chromium.launchPersistentContext(userDataDir, {
        headless: true, // Extensions do NOT work in headless mode
        args: [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            `--disable-extensions-except=${extensionPath}`,  // Load only the NodePay extension
            `--load-extension=${extensionPath}`  // Load the extension
        ]
    });

    const page = await browser.newPage();
    await page.goto("https://app.nodepay.ai/dashboard", { waitUntil: "load" });

    console.log("Browser started with nodepay_1 profile. Waiting 10 seconds for login verification...");
    await page.waitForTimeout(10000); // Wait 10 seconds

    if (page.url() === "https://app.nodepay.ai/dashboard") {
        console.log("Login successful: URL verified.");

        // Check if the extension is running
        const extensionStatus = await page.locator('span.text-grey-100.lg\\:mt-4.mt-3.mb-3.text-center').isVisible();

        if (extensionStatus) {
            console.log("The extension is not running.");
        } else {
            console.log("Extension running successfully.");
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
