const { chromium } = require('playwright');
const fs = require('fs');

(async () => { 
    const browser = await chromium.launch({ headless: true });  // Set to true for GitHub Actions
    const context = await browser.newContext(); 
    const page = await context.newPage();

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

    // Find all divs with the target class
    const matchDivs = await page.$$(`div.event__match.event__match--withRowLink.event__match--twoLine`);

    console.log(`Total unique match divs found: ${matchDivs.length}`);

    if (matchDivs.length === 0) {
        console.log("No matches found. Exiting.");
        await browser.close();
        return;
    }

    let newPageOpened = false;
    let newPage = null;

    // Listen for new pages opening
    context.on('page', async (newTab) => {
        console.log('A new tab opened.');
        newPage = newTab;
        newPageOpened = true;
        await newPage.waitForLoadState();
    });

    // Click on the first match div only
    const firstMatch = matchDivs[0];
    const id = await firstMatch.getAttribute('id');

    if (id) {
        console.log(`Clicking on first match div with ID: ${id}`);
        await firstMatch.click({ button: 'middle' }); // Try opening in a new tab
        await page.waitForTimeout(3000);  // Allow time for tab detection
    }

    // Handle new tab or same tab
    const activePage = newPageOpened ? newPage : page;

    if (activePage) {
        console.log('Waiting 10 seconds before taking a screenshot...');
        await activePage.waitForTimeout(10000); // Wait 10 seconds

        console.log('Taking a screenshot of the opened match page...');
        await activePage.screenshot({ path: 'match_screenshot.png' });
        console.log('Screenshot saved as match_screenshot.png');
    }

    await browser.close();
})();
