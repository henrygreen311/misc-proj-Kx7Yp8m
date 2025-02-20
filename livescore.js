const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to LiveScore...');
    await page.goto('https://www.livescore.com/en/', { waitUntil: 'load' });
    console.log('Page loaded successfully.');

    // Accept cookies if needed
    try {
        await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
        await page.click('button:has-text("Accept")');
        console.log('Accepted cookies.');
    } catch (error) {
        console.log('No cookie dialog found.');
    }

    // Wait extra time for full content to load
    console.log('Waiting 30 seconds for page to load...');
    await page.waitForTimeout(30000);

    console.log('Extracting competitions and matches...');
    const matches = await page.evaluate(() => {
        let allMatches = [];
        const competitions = document.querySelectorAll('div[id="category-header__category"]');

        console.log(`Found ${competitions.length} competitions.`);
        competitions.forEach(category => {
            const competitionName = category.innerText.trim();
            console.log(`Processing competition: ${competitionName}`);

            const matchRows = category.parentElement.querySelectorAll('div.Kq.Oq[id$="__match-row"]');
            console.log(`Found ${matchRows.length} matches in ${competitionName}`);

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
