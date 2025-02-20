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

    let matches = [];

    // Find all category headers
    const categoryDivs = await page.$$('div[id="category-header__category"]');

    for (const categoryDiv of categoryDivs) {
        try {
            const categoryName = await categoryDiv.textContent();
            console.log(`Processing category: ${categoryName.trim()}`);

            // Get match rows within the same category container
            const matchRows = await categoryDiv.$$('[id$="__match-row"]');

            for (const row of matchRows) {
                try {
                    const homeTeam = await row.$eval('[id$="__match-row__home-team-name"]', el => el.textContent.trim());
                    const awayTeam = await row.$eval('[id$="__match-row__away-team-name"]', el => el.textContent.trim());
                    matches.push(`${homeTeam} vs ${awayTeam}`);
                } catch (error) {
                    console.log('Skipping an incomplete match entry');
                }
            }
        } catch (error) {
            console.log('Skipping a category due to an error');
        }
    }

    // Save matches to a file
    fs.writeFileSync('matches.txt', matches.join('\n'), 'utf-8');
    console.log(`Matches saved successfully: ${matches.length} matches found`);

    await browser.close();
})();
