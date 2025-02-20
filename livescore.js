const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Go to LiveScore
    await page.goto('https://www.livescore.com/en/', { waitUntil: 'load' });

    // Wait for cookie dialog and accept it if present
    try {
        await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
        await page.click('button:has-text("Accept")');
        console.log('Accepted cookies');
    } catch (error) {
        console.log('No cookie dialog found');
    }

    // Wait for the page to load completely
    await page.waitForTimeout(30000);

    // Extract all match divs
    const matchDivs = await page.$$eval('div.Kq.Oq[id]', divs => 
        divs.map(div => div.outerHTML) // Extract full HTML of the div
    );

    // Save extracted divs to a file
    if (matchDivs.length > 0) {
        fs.writeFileSync('today_fix_matches.txt', matchDivs.join('\n\n'));
        console.log(`Saved ${matchDivs.length} matches to today_fix_matches.txt`);
    } else {
        console.log('No match divs found.');
    }

    await browser.close();
})();
