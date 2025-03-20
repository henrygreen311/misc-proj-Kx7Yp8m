const { chromium } = require('playwright');
const fs = require('fs');

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
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
            "--disable-blink-features=AutomationControlled",
            "--disable-popup-blocking",
            "--disable-notifications",
            `--disable-extensions-except=${extensionPath}`,  
            `--load-extension=${extensionPath}`  
        ]
    });

    const page = await browser.newPage();

    // Set Chrome User-Agent
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    await page.setUserAgent(userAgent);

    // Anti-Bot Detection: Modify WebRTC, WebGL, and Navigator Properties
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    });

    // Go to NodePay dashboard
    await page.goto("https://app.nodepay.ai/dashboard", { waitUntil: "load" });

    console.log("Browser started with nodepay_1 profile. Waiting 10 seconds for login verification...");
    await page.waitForTimeout(10000); // Wait 10 seconds

    if (page.url() === "https://app.nodepay.ai/dashboard") {
        console.log("Login successful: URL verified.");

        // Improved extension detection
        const extensionFiles = fs.readdirSync(extensionPath);
        if (extensionFiles.length === 0) {
            console.log("Extension folder is empty. The extension might not be installed correctly.");
        } else {
            console.log(`Extension files detected: ${extensionFiles.length}`);
        }

        const extensionStatus = await page.locator('span.text-grey-100.lg\\:mt-4.mt-3.mb-3.text-center').isVisible();
        console.log(extensionStatus ? "The extension is NOT running." : "Extension running successfully.");

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
