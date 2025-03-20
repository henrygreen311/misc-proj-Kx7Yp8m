const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const userDataDir = "/home/runner/Nodepay/nodepay_1";
    const extensionPath = "/home/runner/Nodepay/extension";
    const proxyServer = process.env.TOR_PROXY || "socks5://127.0.0.1:9050";

    if (!fs.existsSync(extensionPath)) {
        console.error(`Error: Extension path does not exist - ${extensionPath}`);
        process.exit(1);
    }

    console.log(`Using Proxy: ${proxyServer}`);

    const browser = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        proxy: { server: proxyServer }, // Use Playwrightâs proxy option instead of args
        args: [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-dev-shm-usage",
            "--start-maximized",
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`
        ]
    });

    const page = await browser.newPage();

    // Verify Tor proxy (with retry)
    let torWorking = false;
    for (let i = 0; i < 3; i++) {
        try {
            await page.goto("https://check.torproject.org", { timeout: 30000 });
            const content = await page.textContent("body");
            console.log("Tor Check:", content);
            if (content.includes("Congratulations")) {
                torWorking = true;
                break;
            }
        } catch (e) {
            console.log(`Tor check attempt ${i + 1} failed: ${e.message}`);
            await page.waitForTimeout(5000); // Wait 5s before retry
        }
    }
    if (!torWorking) {
        console.error("Tor proxy not working. Exiting...");
        await browser.close();
        process.exit(1);
    }

    await page.goto("https://app.nodepay.ai/dashboard", { waitUntil: "load" });

    console.log("Browser started with nodepay_1 profile. Waiting 10 seconds for login verification...");
    await page.waitForTimeout(10000);

    if (page.url() === "https://app.nodepay.ai/dashboard") {
        console.log("Login successful: URL verified.");

        const extensionFiles = fs.readdirSync(extensionPath);
        if (extensionFiles.length === 0) {
            console.log("Extension folder is empty. The extension might not be installed correctly.");
        } else {
            console.log(`Extension files detected: ${extensionFiles.length}`);
        }

        const extensionStatus = await page.locator('span.text-grey-100.lg\\:mt-4.mt-3.mb-3.text-center').isVisible();
        console.log(extensionStatus ? "The extension is NOT running." : "Extension running successfully.");

        const runtimeLimit = 5 * 60 * 60 * 1000 + 30 * 60 * 1000;
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
        }, 900000);

    } else {
        console.log("Login failed: Unexpected URL - " + page.url());
        await browser.close();
    }

})(
