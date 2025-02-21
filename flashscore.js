const { chromium } = require('playwright');

(async () => {
    console.log("Launching browser...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("Navigating to FlashScore...");
    await page.goto('https://www.flashscore.com/', { waitUntil: 'load' });

    // Accept cookies if present
    try {
        await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
        await page.click('button:has-text("Accept")');
        console.log("Accepted cookies");
    } catch (error) {
        console.log("No cookie dialog found");
    }

    // Wait for page to load
    await page.waitForTimeout(5000);

    // Find match elements
    const matchDivs = await page.$$(`div.event__match.event__match--withRowLink.event__match--twoLine`);
    console.log(`Total unique match divs found: ${matchDivs.length}`);

    if (matchDivs.length === 0) {
        console.log("No matches found. Exiting.");
        await browser.close();
        return;
    }

    // Click on the first match
    const firstMatch = matchDivs[0];
    const id = await firstMatch.getAttribute('id');

    if (id) {
        console.log(`Opening first match with ID: ${id}`);
        await firstMatch.click({ button: 'middle' });
        await page.waitForTimeout(3000); // Wait for tab to open
    }

    // Detect new tab
    const newPages = context.pages();
    const matchPage = newPages.length > 1 ? newPages[newPages.length - 1] : null;

    if (!matchPage) {
        console.log("Failed to detect new tab. Exiting.");
        await browser.close();
        return;
    }

    console.log("New match tab opened.");
    await matchPage.waitForLoadState();

    // Click on the H2H tab
    try {
        await matchPage.waitForSelector('a:has-text("H2H")', { timeout: 5000 });
        await matchPage.click('a:has-text("H2H")');
        console.log("Clicked H2H tab.");
    } catch (error) {
        console.log("H2H tab not found. Exiting.");
        await browser.close();
        return;
    }

    // Wait for H2H section to load
    await matchPage.waitForTimeout(3000);

    // Count the number of h2h__section elements
    const h2hSections = await matchPage.$$('div.h2h__section.section');
    console.log(`Total H2H sections found: ${h2hSections.length}`);

    await browser.close();
})();
