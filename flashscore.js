const { chromium } = require('playwright');

(async () => { 
    const browser = await chromium.launch({ headless: true }); 
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

    let uniqueIds = new Set();
    
    for (const div of matchDivs) {
        const id = await div.getAttribute('id');
        if (id && !uniqueIds.has(id)) {
            uniqueIds.add(id);
            console.log(`Found match div with ID: ${id}`);
        }
    }

    console.log(`Total unique match divs found: ${uniqueIds.size}`);

    await browser.close();
})();
