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

    // Wait for the page to fully load
    await page.waitForTimeout(5000);

    // Find all match elements
    const matchDivs = await page.$$(`div.event__match.event__match--withRowLink.event__match--twoLine`);
    console.log(`Total matches found: ${matchDivs.length}`);

    if (matchDivs.length === 0) {
        console.log("No matches found. Exiting.");
        await browser.close();
        return;
    }

    let uniqueMatches = new Set();
    let upcomingMatches = [];

    for (const div of matchDivs) {
        const id = await div.getAttribute('id');

        if (id && !uniqueMatches.has(id)) {
            uniqueMatches.add(id);

            // Check if the match is ongoing or finished
            const scoreDiv = await div.$(`div.event__score.event__score--home`);
            const scoreText = scoreDiv ? (await scoreDiv.textContent()).trim() : '-';

            if (scoreText !== '-') {
                console.log(`Skipping match ${id}, it is already played or live.`);
                continue; // Skip ongoing or finished matches
            }

            // Extract team names
            const teamSpans = await div.$$(`span.wcl-simpleText_Asp-0.wcl-scores-simpleText-01_pV2Wk.wcl-name_3y6f5`);

            if (teamSpans.length === 2) {
                const team1 = (await teamSpans[0].textContent()).trim();
                const team2 = (await teamSpans[1].textContent()).trim();

                const matchString = `${team1} vs ${team2}`;
                upcomingMatches.push(matchString);
                console.log(`Upcoming match found: ${matchString}`);
            }
        }
    }

    if (upcomingMatches.length === 0) {
        console.log("No upcoming matches found. Exiting.");
        await browser.close();
        return;
    }

    // Click on the first upcoming match
    const firstMatchText = upcomingMatches[0];
    console.log(`Attempting to click match: "${firstMatchText}"`);

    try {
        await page.waitForSelector(`div.event__match.event__match--withRowLink.event__match--twoLine:has-text("${firstMatchText}")`, { timeout: 30000, state: 'visible' });
        await page.click(`div.event__match.event__match--withRowLink.event__match--twoLine:has-text("${firstMatchText}")`, { timeout: 60000 });
        console.log(`Clicked match: ${firstMatchText}`);
    } catch (error) {
        console.error(`Failed to click match: ${firstMatchText}`, error);
        await browser.close();
        return;
    }

    // Detect new tab
    await page.waitForTimeout(3000);
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

    let matchData = `${firstMatchText}\n`;

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

            // Find match result inside <span class="h2h__result">
            const resultSpan = await h2hRow.$(`span.h2h__result`);
            if (!resultSpan) {
                console.log(`Skipping match row ${j + 1}: No result span found.`);
                continue;
            }

            // Get the two score spans inside <span class="h2h__result">
            const scoreSpans = await resultSpan.$$(`span`);
            if (scoreSpans.length !== 2) {
                console.log(`Skipping match row ${j + 1}: Score format incorrect.`);
                continue;
            }

            const score1 = (await scoreSpans[0].textContent()).trim();
            const score2 = (await scoreSpans[1].textContent()).trim();

            const matchLine = `  - ${team1} vs ${team2} = ${score1} - ${score2}`;
            console.log(matchLine);
            matchData += `${matchLine}\n`;
        }
    }

    // Save extracted match details to matches.txt
    fs.writeFileSync('matches.txt', matchData.trim());
    console.log("Match data saved to matches.txt");

    await browser.close();
})();

// Handle Unhandled Promise Rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
});
