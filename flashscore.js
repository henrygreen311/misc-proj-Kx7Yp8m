const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    console.log("Launching browser...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("Navigating to FlashScore...");
    await page.goto('https://www.flashscore.com/', { waitUntil: 'load' });

    // Accept cookies if present
    try {
        await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
        await page.click('button:has-text("Accept")');
        console.log("Accepted cookies");
    } catch (error) {
        console.log("No cookie dialog found");
    }

    // Wait for page to load
    await page.waitForTimeout(5000);

    // Find match elements
    const matchDivs = await page.$$('div.event__match.event__match--withRowLink.event__match--twoLine');
    console.log(`Total match divs found: ${matchDivs.length}`);

    if (matchDivs.length === 0) {
        console.log("No matches found. Exiting.");
        await browser.close();
        return;
    }

    let upcomingMatch = null;

    // Loop through matchDivs to find the first upcoming match
    for (const match of matchDivs) {
        const scoreElement = await match.$('div.event__score');
        if (scoreElement) {
            const scoreText = await scoreElement.textContent();
            if (scoreText.trim() === "-") { // Only consider matches with "-"
                upcomingMatch = match;
                break; // Stop at the first upcoming match
            }
        }
    }

    if (!upcomingMatch) {
        console.log("No upcoming matches found. Exiting.");
        await browser.close();
        return;
    }

    // Click on the first upcoming match
    const id = await upcomingMatch.getAttribute('id');

    if (id) {
        console.log(`Opening first upcoming match with ID: ${id}`);
        await upcomingMatch.click({ button: 'middle' });
        await page.waitForTimeout(3000); // Wait for tab to open
    }

    // Detect new tab
    const newPages = context.pages();
    const matchPage = newPages.length > 1 ? newPages[newPages.length - 1] : null;

    if (!matchPage) {
        console.log("Failed to detect new tab. Exiting.");
        await browser.close();
        return;
    }

    console.log("New match tab opened.");
    await matchPage.waitForLoadState();

    // Click on the H2H tab
    try {
        await matchPage.waitForSelector('a:has-text("H2H")', { timeout: 5000 });
        await matchPage.click('a:has-text("H2H")');
        console.log("Clicked H2H tab.");
    } catch (error) {
        console.log("H2H tab not found. Exiting.");
        await browser.close();
        return;
    }

    // Wait for H2H section to load
    await matchPage.waitForTimeout(3000);

    // Count the number of h2h__section elements
    const h2hSections = await matchPage.$$('div.h2h__section.section');
    console.log(`Total H2H sections found: ${h2hSections.length}`);

    let matchData = '';

    // Process only the first 3 sections
    for (let i = 0; i < Math.min(3, h2hSections.length); i++) {
        console.log(`Checking H2H section ${i + 1}...`);

        // Find section headers  
        const spanElements = await h2hSections[i].$$('span.wcl-overline_rOFfd.wcl-scores-overline-02_n9EXm[data-testid="wcl-scores-overline-02"]');  
        if (spanElements.length > 0) {  
            for (const span of spanElements) {  
                const text = await span.textContent();  
                console.log(`Found section: ${text}`);  
                matchData += `\n${text}\n`;  
            }  
        } else {  
            console.log(`No matching spans found.`);  
        }  

        // Look for <div class="h2h__row "> inside this section  
        const h2hRows = await h2hSections[i].$$('div.h2h__row[title="Click for match detail!"]');  
        console.log(`Total h2h__row divs found in section ${i + 1}: ${h2hRows.length}`);  

        for (let j = 0; j < h2hRows.length; j++) {  
            const h2hRow = h2hRows[j];  

            // Find team names  
            const teamSpans = await h2hRow.$$(`span[class*="h2h__participantInner"]`);  
            if (teamSpans.length !== 2) {  
                console.log(`Skipping match row ${j + 1}: Team names not found.`);  
                continue;  
            }  
            const team1 = (await teamSpans[0].textContent()).trim();  
            const team2 = (await teamSpans[1].textContent()).trim();  

            const matchLine = `  - ${team1} vs ${team2} =`;  
            console.log(matchLine);  
            matchData += `${matchLine}\n`;  
        }  
    }

    // Save extracted match details to matches.txt
    fs.writeFileSync('matches.txt', matchData.trim());
    console.log("Match data saved to matches.txt");

    await browser.close();
})();
