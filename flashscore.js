const { chromium } = require('playwright');
const fs = require('fs');

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
    let uniqueMatches = new Set();

    for (const div of matchDivs) {
        const id = await div.getAttribute('id');

        if (id && !uniqueMatches.has(id)) {
            uniqueMatches.add(id);

            // Check if the match is ongoing or finished
            const scoreDiv = await div.$(`div.event__score.event__score--home`);
            const scoreText = scoreDiv ? await scoreDiv.textContent() : '-';

            if (scoreText.trim() !== '-') {
                console.log(`Skipping match ${id}, it is already played or live.`);
                continue; // Skip live and finished matches
            }

            // Find all team names (should be two per div)
            const teamSpans = await div.$$(`span.wcl-simpleText_Asp-0.wcl-scores-simpleText-01_pV2Wk.wcl-name_3y6f5`);
            
            if (teamSpans.length === 2) {
                const team1 = await teamSpans[0].textContent();
                const team2 = await teamSpans[1].textContent();
                
                const matchString = `${team1} vs ${team2}`;
                console.log(`Upcoming match found: ${matchString}`);

                // Save match to file
                fs.appendFileSync('matches.txt', matchString + '\n');
            }
        }
    }

    console.log(`Total unique upcoming matches found: ${uniqueMatches.size}`);

    await browser.close();
})();
