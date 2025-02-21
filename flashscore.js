const { chromium } = require('playwright');
const fs = require('fs');

(async () => { 
    const browser = await chromium.launch({ headless: true });  
    const context = await browser.newContext(); 
    const page = await context.newPage();

    console.log('Navigating to FlashScore...');
    await page.goto('https://www.flashscore.com/', { waitUntil: 'load' });

    // Accept cookies if present
    try {
        await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
        await page.click('button:has-text("Accept")');
        console.log('Accepted cookies');
    } catch (error) {
        console.log('No cookie dialog found');
    }

    await page.waitForTimeout(5000); // Ensure page loads fully

    // Find all match divs
    const matchDivs = await page.$$(`div.event__match.event__match--withRowLink.event__match--twoLine`);
    console.log(`Total unique match divs found: ${matchDivs.length}`);

    if (matchDivs.length === 0) {
        console.log("No matches found. Exiting.");
        await browser.close();
        return;
    }

    const firstMatch = matchDivs[0]; // Only process the first match
    const id = await firstMatch.getAttribute('id');

    if (!id) {
        console.log("First match ID not found. Exiting.");
        await browser.close();
        return;
    }

    console.log(`Opening first match with ID: ${id}`);
    const [newPage] = await Promise.all([
        context.waitForEvent('page'), // Wait for a new tab to open
        firstMatch.click({ button: 'middle' }) // Open match in a new tab
    ]);

    await newPage.waitForLoadState();
    console.log('New match tab opened.');
    await newPage.waitForTimeout(10000); // Wait for page to load

    // Click the H2H tab
    try {
        await newPage.waitForSelector('a[href="#/h2h"] button', { timeout: 5000 });
        await newPage.click('a[href="#/h2h"] button');
        console.log('Clicked H2H tab.');
        await newPage.waitForTimeout(5000);
    } catch (error) {
        console.log('H2H tab not found. Exiting.');
        await browser.close();
        return;
    }

    // Find H2H section
    const sections = await newPage.$$('div.h2h__section.section');
    if (sections.length < 3) {
        console.log('Not enough H2H sections. Exiting.');
        await browser.close();
        return;
    }

    // Extract "Head-to-head matches" and "Last matches"
    let headToHead = null;
    let lastMatches = [];

    for (const section of sections) {
        const titleElement = await section.$('span[data-testid="wcl-scores-overline-02"]');
        const titleText = titleElement ? await titleElement.innerText() : '';

        if (titleText.includes('Head-to-head matches')) {
            headToHead = section;
        } else if (titleText.includes('Last matches')) {
            lastMatches.push(section);
        }
    }

    if (!headToHead || lastMatches.length !== 2) {
        console.log('Required sections not found. Exiting.');
        await browser.close();
        return;
    }

    // Extract team names from "Last matches"
    let teamNames = [];
    for (const section of lastMatches) {
        const titleElement = await section.$('span[data-testid="wcl-scores-overline-02"]');
        const titleText = titleElement ? await titleElement.innerText() : '';
        teamNames.push(titleText);
    }

    // Save extracted data
    const filePath = 'matches.txt';
    fs.writeFileSync(filePath, ""); // Reset file

    for (const team of teamNames) {
        fs.appendFileSync(filePath, `\n${team}\n`);
        console.log(`Extracted ${team}`);
    }

    fs.appendFileSync(filePath, '\nHead-to-head matches\n');

    // Extract and save H2H matches
    const h2hMatches = await headToHead.$$('div.h2h__row[title="Click for match detail!"]');
    for (const match of h2hMatches) {
        const teams = await match.$$('span.h2h__participantInner');
        const results = await match.$$('span.h2h__result span');

        if (teams.length === 2 && results.length === 2) {
            const team1 = await teams[0].innerText();
            const team2 = await teams[1].innerText();
            const score1 = await results[0].innerText();
            const score2 = await results[1].innerText();

            const matchResult = `${team1} vs ${team2} = ${score1} - ${score2}`;
            fs.appendFileSync(filePath, matchResult + '\n');
            console.log(`Saved match result: ${matchResult}`);
        }
    }

    console.log('Match processing complete.');
    await browser.close();
})();
