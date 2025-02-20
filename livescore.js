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

    // Wait for 30 seconds to allow full page load
    await page.waitForTimeout(30000);

    // Find all match-row divs
    const matchRows = await page.$$eval('div.Kq.Oq[id]', elements => 
        elements.map(el => el.outerHTML)
    );

    // Count matches found
    console.log(`Total matches found: ${matchRows.length}`);

    // Save match data to a file
    fs.writeFileSync('today_fix_matches.txt', matchRows.join('\n'), 'utf-8');
    console.log('Match data saved to today_fix_matches.txt');

    await browser.close();
})();
