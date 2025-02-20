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

    // Extract all match rows
    const matches = await page.evaluate(() => {
        const matchRows = document.querySelectorAll('div.Kq.Oq[id$="__match-row"]');
        let matchData = [];

        matchRows.forEach(row => {
            const homeTeam = row.querySelector('[id$="__match-row__home-team-name"]')?.innerText.trim();
            const awayTeam = row.querySelector('[id$="__match-row__away-team-name"]')?.innerText.trim();

            if (homeTeam && awayTeam) {
                matchData.push(`${homeTeam} vs ${awayTeam}`);
            }
        });

        return matchData;
    });

    // Save matches to file
    if (matches.length > 0) {
        fs.writeFileSync('today_fix_matches.txt', matches.join('\n'));
        console.log('Matches saved to today_fix_matches.txt');
    } else {
        console.log('No matches found');
    }

    await browser.close();
})();
