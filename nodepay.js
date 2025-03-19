const { chromium } = require('playwright');

(async () => {
    const userDataDir = "/home/runner/Nodepay/nodepay_1"; // Use the new profile

    const browser = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto("https://app.nodepay.ai/dashboard", { waitUntil: "load" });

    console.log("Browser started with nodepay_1 profile. Waiting 10 seconds for login verification...");

    await page.waitForTimeout(10000); // Wait 10 seconds

    // Verify URL after waiting
    if (page.url() === "https://app.nodepay.ai/dashboard") {
        console.log("Login successful: URL verified.");
    } else {
        console.log("Login failed: Unexpected URL - " + page.url());
    }

})();
