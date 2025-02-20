const { chromium } = require('playwright'); const fs = require('fs');

(async () => { const browser = await chromium.launch({ headless: true }); const context = await browser.newContext(); const page = await context.newPage();

// Go to LiveScore
await page.goto('https://www.livescore.com/en/', { waitUntil: 'load' });

// Accept cookies if the dialog appears
try {
    await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
    await page.click('button:has-text("Accept")');
    console.log('Accepted cookies');
} catch (error) {
    console.log('No cookie dialog found');
}

// Wait for page to load fully
await page.waitForTimeout(30000);

// Look for the Europa League section
const europaLeagueSection = await page.locator('div.tf#category-header__category', { hasText: 'Europa League' }).first();

if (await europaLeagueSection.isVisible()) {
    console.log('Europa League section found');
    
    // Find all matches in the Europa League section
    const matches = await page.locator('div.Kq.Oq[id*="match-row"]');
    const matchList = [];
    
    for (let i = 0; i < await matches.count(); i++) {
        const match = matches.nth(i);
        
        // Extract team names
        const awayTeam = await match.locator('div.Uq[id*="away-team-name"]').textContent();
        const homeTeam = await match.locator('div.Uq[id*="home-team-name"]').textContent();
        
        if (homeTeam && awayTeam) {
            matchList.push(`${homeTeam} vs ${awayTeam}`);
        }
    }
    
    // Save matches to file
    fs.writeFileSync('today_fix_matches.txt', matchList.join('\n'), 'utf8');
    console.log('Saved matches to europa_league_matches.txt');
} else {
    console.log('Europa League section not found');
}

await browser.close();

})();

