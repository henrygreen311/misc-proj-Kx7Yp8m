const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to LiveScore...');
    await page.goto('https://www.livescore.com/en/', { waitUntil: 'load' });
    console.log('Page loaded successfully.');

    // Wait for cookie dialog and accept it if present
    try {
        console.log('Checking for cookie dialog...');
        await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
        await page.click('button:has-text("Accept")');
        console.log('Accepted cookies.');
    } catch (error) {
        console.log('No cookie dialog found.');
    }

    // Wait for 30 seconds to allow full page load
    console.log('Waiting 30 seconds for full page load...');
    await page.waitForTimeout(30000);
    console.log('Page fully loaded.');

    // Extract all match rows
    console.log('Extracting match data...');
    const matches = await page.evaluate(() => {
        const matchRows = document.querySelectorAll('div.Kq.Oq[id$="__match-row"]');
        let matchData = [];

        console.log(`Found ${matchRows.length} match rows.`);

        matchRows.forEach(row => {
            const homeTeam = row.querySelector('[id$="__match-row__home-team-name"]')?.innerText.trim();
            const awayTeam = row.querySelector('[id$="__match-row__away-team-name"]')?.innerText.trim();

            if (homeTeam && awayTeam) {
                console.log(`Match found: ${homeTeam} vs ${awayTeam}`);
                matchData.push(`${homeTeam} vs ${awayTeam}`);
            } else {
                console.log('Match row found but missing team names.');
            }
        });

        return matchData;
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
