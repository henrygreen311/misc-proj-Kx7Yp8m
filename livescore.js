const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to LiveScore...');
    await page.goto('https://www.livescore.com/en/', { waitUntil: 'load' });
    console.log('Page loaded successfully.');

    // Accept cookies if present
    try {
        console.log('Checking for cookie dialog...');
        await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
        await page.click('button:has-text("Accept")');
        console.log('Accepted cookies.');
    } catch (error) {
        console.log('No cookie dialog found.');
    }

    // Wait extra time for all content to load
    console.log('Waiting 45 seconds for full page load...');
    await page.waitForTimeout(45000);
    console.log('Page fully loaded.');

    // Ensure category-header__stage exists before proceeding
    try {
        console.log('Waiting for competition sections to appear...');
        await page.waitForSelector('div[id="category-header__stage"]', { timeout: 10000 });
        console.log('Competition sections found.');
    } catch (error) {
        console.log('No competition sections detected.');
    }

    // Extract matches grouped by competition
    console.log('Extracting matches by competition...');
    const matches = await page.evaluate(() => {
        let allMatches = [];
        const sections = document.querySelectorAll('div[id="category-header__stage"]');

        console.log(`Found ${sections.length} competition sections.`);
        if (sections.length === 0) {
            console.log('No competition sections found, stopping extraction.');
            return [];
        }

        sections.forEach(section => {
            const stage = section.innerText.trim();
            const categoryDiv = section.nextElementSibling;
            const category = categoryDiv && categoryDiv.id === "category-header__category"
                ? categoryDiv.innerText.trim()
                : "Unknown Category";

            console.log(`Processing section: ${category} - ${stage}`);

            const matchRows = section.parentElement.querySelectorAll('div.Kq.Oq[id$="__match-row"]');
            console.log(`Found ${matchRows.length} match rows under ${category} - ${stage}`);

            matchRows.forEach(row => {
                const homeTeam = row.querySelector('[id$="__match-row__home-team-name"]')?.innerText.trim();
                const awayTeam = row.querySelector('[id$="__match-row__away-team-name"]')?.innerText.trim();

                if (homeTeam && awayTeam) {
                    const matchInfo = `${homeTeam} vs ${awayTeam}`;
                    console.log(`Match found: ${matchInfo}`);
                    allMatches.push(matchInfo);
                } else {
                    console.log('Match row found but missing team names.');
                }
            });
        });

        return allMatches;
    });

    // Save matches to file
    if (matches.length > 0) {
        fs.writeFileSync('today_fix_matches.txt', matches.join('\n'));
        console.log(`Matches saved to today_fix_matches.txt. Total matches: ${matches.length}`);
    } else {
        console.log('No matches found.');
    }

    await browser.close();
    console.log('Browser closed.');
})();
