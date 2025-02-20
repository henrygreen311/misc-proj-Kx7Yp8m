const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: false }); // Set to false to see browser actions
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

    console.log('Finding competition headers...');
    const categories = await page.$$eval('div[id="category-header__category"]', elements => 
        elements.map(el => el.textContent.trim())
    );

    if (categories.length === 0) {
        console.log('â No competitions found. Exiting...');
        await browser.close();
        return;
    }

    console.log(`â Found ${categories.length} competitions:`);
    categories.forEach((category, index) => console.log(`  ${index + 1}. ${category}`));

    console.log('\nNow extracting matches...\n');
    
    let matches = [];

    for (const category of categories) {
        console.log(`â¡ Processing matches for competition: ${category}`);

        const matchRows = await page.$$('[id$="__match-row"]'); // Select all match rows

        console.log(`  ð Found ${matchRows.length} match rows under ${category}`);

        for (const row of matchRows) {
            try {
                const homeTeam = await row.$eval('[id$="__match-row__home-team-name"]', el => el.textContent.trim());
                const awayTeam = await row.$eval('[id$="__match-row__away-team-name"]', el => el.textContent.trim());
                
                const matchInfo = `${homeTeam} vs ${awayTeam}`;
                console.log(`  â Match Found: ${matchInfo}`);
                
                matches.push(matchInfo);
            } catch (error) {
                console.log('  â  Skipping an incomplete match entry');
            }
        }
    }

    // Save matches to a file
    if (matches.length > 0) {
        fs.writeFileSync('matches.txt', matches.join('\n'), 'utf-8');
        console.log(`â Matches saved successfully. Total matches: ${matches.length}`);
    } else {
        console.log('â No matches found.');
    }

    await browser.close();
    console.log('Browser 
