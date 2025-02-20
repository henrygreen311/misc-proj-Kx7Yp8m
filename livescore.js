const { chromium } = require('playwright');

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

    // Wait for the page to fully load
    await page.waitForTimeout(5000);

    // Find all sections that contain matches
    const categories = await page.$$('[id="category-header__category"]');

    let matches = [];

    // Loop through each category section
    for (const category of categories) {
        // Get the parent element of the category
        const parentSection = await category.evaluateHandle(el => el.closest('section'));

        if (parentSection) {
            // Find all match rows within this section
            const matchRows = await parentSection.$$('[id$="__match-row"]');

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
    }

    // Display extracted matches
    console.log('Extracted Matches:', matches);

    await browser.close();
})();
