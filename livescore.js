const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Go to LiveScore
    await page.goto('https://www.livescore.com/en/', { waitUntil: 'load' });

    // Accept cookies if present
    try {
        await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
        await page.click('button:has-text("Accept")');
        console.log('Accepted cookies');
    } catch (error) {
        console.log('No cookie dialog found');
    }

    // Wait for the page to load
    await page.waitForTimeout(5000);

    // Find all competition headers
    const categories = await page.$$eval('[id="category-header__category"]', elements => 
        elements.map(el => el.textContent.trim())
    );

    let matches = [];

    // Iterate over each category and find matches
    for (const category of categories) {
        const matchRows = await page.$$('[id$="__match-row"]'); // Select all match rows dynamically

        for (const row of matchRows) {
            try {
                const homeTeam = await row.$eval('[id$="__match-row__home-team-name"]', el => el.textContent.trim());
                const awayTeam = await row.$eval('[id$="__match-row__away-team-name"]', el => el.textContent.trim());
                matches.push(`${homeTeam} vs ${awayTeam}`);
            } catch (error) {
                console.log('Skipping an incomplete match entry');
            }
        }
    }

    // Save matches to a file
    fs.writeFileSync('matches.txt', matches.join('\n'), 'utf-8');
    console.log('Matches saved successfully');

    await browser.close();
})();
