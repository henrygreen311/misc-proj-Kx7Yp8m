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

    // Create a new file to store match data
    const filePath = 'matches.txt';
    fs.writeFileSync(filePath, ""); // Reset file

    for (let i = 0; i < matchDivs.length; i++) {
        let newPageOpened = false;
        let newPage = null;

        // Listen for new tab
        context.on('page', async (newTab) => {
            console.log('A new tab opened.');
            newPage = newTab;
            newPageOpened = true;
            await newPage.waitForLoadState();
        });

        // Click on match div to open it
        const match = matchDivs[i];
        const id = await match.getAttribute('id');
        if (id) {
            console.log(`Opening match ${i + 1} with ID: ${id}`);
            await match.click({ button: 'middle' }); 
            await page.waitForTimeout(3000);
        }

        const activePage = newPageOpened ? newPage : page;
        if (activePage) {
            console.log('Waiting 10 seconds for page to load...');
            await activePage.waitForTimeout(10000);
        }

        // Click the H2H tab
        try {
            await activePage.waitForSelector('a[href="#/h2h"] button', { timeout: 5000 });
            await activePage.click('a[href="#/h2h"] button');
            console.log('Clicked H2H tab.');
            await activePage.waitForTimeout(5000);
        } catch (error) {
            console.log('H2H tab not found. Skipping match.');
            continue;
        }

        // Find H2H section
        const sections = await activePage.$$('div.h2h__section.section');
        if (sections.length < 3) {
            console.log('Not enough H2H sections. Skipping match.');
            continue;
        }

        // Validate and extract "Head-to-head matches" and "Last matches"
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
            console.log('Required sections not found. Skipping match.');
            continue;
        }

        // Extract team names from "Last matches"
        let teamNames = [];
        for (const section of lastMatches) {
            const titleElement = await section.$('span[data-testid="wcl-scores-overline-02"]');
            const titleText = titleElement ? await titleElement.innerText() : '';
            teamNames.push(titleText);
        }

        // Save "Last matches" data
        for (const team of teamNames) {
            fs.appendFileSync(filePath, `\n${team}\n`);
            console.log(`Extracted ${team}`);
        }

        // Extract and save H2H matches
        fs.appendFileSync(filePath, '\nHead-to-head matches\n');

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

        console.log('Match processing complete.\n');
    }

    console.log('All matches processed.');
    await browser.close();
})();
