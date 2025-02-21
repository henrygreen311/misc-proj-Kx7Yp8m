const { chromium } = require('playwright');

(async () => { 
    const browser = await chromium.launch({ headless: true }); // Set to true for GitHub Actions
    const context = await browser.newContext(); 
    const page = await context.newPage();

    console.log('Navigating to FlashScore...');
    await page.goto('https://www.flashscore.com/', { waitUntil: 'load' });

    // Accept cookies if present
    try {
        await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
        await page.click('button:has-text("Accept")');
        console.log('Accepted cookies');
    } catch (error) {
        console.log('No cookie dialog found');
    }

    // Wait for full page load
    await page.waitForTimeout(5000);

    // Find the first match div
    const matchDiv = await page.$('div.event__match.event__match--withRowLink.event__match--twoLine');

    if (!matchDiv) {
        console.log("No matches found. Exiting.");
        await browser.close();
        return;
    }

    const id = await matchDiv.getAttribute('id');
    console.log(`Opening first match with ID: ${id}`);
    await matchDiv.click({ button: 'middle' }); // Open in a new tab
    await page.waitForTimeout(3000);  

    // Handle new tab
    let newPage = null;
    context.on('page', async (tab) => {
        newPage = tab;
        console.log('New match tab opened.');
        await newPage.waitForLoadState();
    });

    // Wait for tab to be detected
    await page.waitForTimeout(5000); 
    if (!newPage) {
        console.log('Failed to detect new tab. Exiting.');
        await browser.close();
        return;
    }

    // Wait for page load
    await newPage.waitForTimeout(10000);

    // Click on H2H tab
    try {
        await newPage.click('a.selected[href="#/h2h"] button.wcl-tabSelected_T--kd');
        console.log('Clicked H2H tab.');
    } catch (error) {
        console.log('Failed to find or click H2H tab.');
        await browser.close();
        return;
    }

    // Wait for the H2H section to load
    await newPage.waitForTimeout(5000);

    // Count the number of H2H sections
    const h2hSections = await newPage.$$('div.h2h__section.section');
    console.log(`Total H2H sections found: ${h2hSections.length}`);

    await browser.close();
})();
