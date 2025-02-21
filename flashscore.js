const { chromium } = require('playwright'); const fs = require('fs');

(async () => { const browser = await chromium.launch({ headless: true });  // Set to true for GitHub Actions const context = await browser.newContext(); const page = await context.newPage();

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

await page.waitForTimeout(5000);

const matchDivs = await page.$$('div.event__match.event__match--withRowLink.event__match--twoLine');
console.log(`Total unique match divs found: ${matchDivs.length}`);
if (matchDivs.length === 0) {
    console.log("No matches found. Exiting.");
    await browser.close();
    return;
}

for (const matchDiv of matchDivs) {
    let newPageOpened = false;
    let newPage = null;

    context.on('page', async (newTab) => {
        console.log('A new tab opened.');
        newPage = newTab;
        newPageOpened = true;
        await newPage.waitForLoadState();
    });

    const id = await matchDiv.getAttribute('id');
    if (!id) continue;

    console.log(`Clicking on match div with ID: ${id}`);
    await matchDiv.click({ button: 'middle' });
    await page.waitForTimeout(3000);

    const activePage = newPageOpened ? newPage : page;
    if (!activePage) continue;

    console.log('Waiting 10 seconds for page to load...');
    await activePage.waitForTimeout(10000);

    try {
        // Click on H2H tab
        await activePage.click('a[href="#/h2h"] button', { timeout: 5000 });
        console.log("Clicked on H2H tab");
    } catch (error) {
        console.log("H2H tab not found, skipping match");
        continue;
    }

    await activePage.waitForTimeout(5000);

    // Check for required sections
    const requiredSections = ["Head-to-head matches", "Last matches:"];
    const sectionTexts = await activePage.$$eval('span[data-testid="wcl-scores-overline-02"]', spans => spans.map(span => span.textContent));

    if (!requiredSections.every(section => sectionTexts.some(text => text.includes(section)))) {
        console.log("Required sections not found, skipping match");
        continue;
    }

    console.log("Required sections found, extracting data...");

    let matchData = "";

    for (const section of sectionTexts) {
        matchData += `${section}\n`;
        const rows = await activePage.$$('div.h2h__row');
        for (const row of rows) {
            const teams = await row.$$eval('span.h2h__participantInner', spans => spans.map(span => span.textContent.trim()).join(' vs '));
            const scores = await row.$$eval('span.h2h__result span', spans => spans.map(span => span.textContent.trim()).join(' - '));
            if (teams && scores) {
                matchData += `${teams} = ${scores}\n`;
            }
        }
    }

    fs.appendFileSync('matches.txt', matchData + '\n');
    console.log("Match data saved to matches.txt");
}

await browser.close();

})();

