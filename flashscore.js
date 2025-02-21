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
        console.log("No cookie dialog found.");
    }

    // Wait for page to load
    await page.waitForTimeout(5000);

    // Find all match divs
    const matchDivs = await page.$$(`div.event__match.event__match--withRowLink.event__match--twoLine`);
    console.log(`Total unique match divs found: ${matchDivs.length}`);

    if (matchDivs.length === 0) {
        console.log("No matches found. Exiting.");
        await browser.close();
        return;
    }

    let validMatches = [];

    for (const matchDiv of matchDivs) {
        // Get the match ID
        const matchId = await matchDiv.getAttribute('id');

        // Check if it's an upcoming match
        const homeScoreDiv = await matchDiv.$(`div.event__score.event__score--home`);
        const awayScoreDiv = await matchDiv.$(`div.event__score.event__score--away`);

        if (!homeScoreDiv || !awayScoreDiv) {
            console.log(`Skipping match ${matchId}: No score divs found.`);
            continue;
        }

        const homeScore = await homeScoreDiv.textContent();
        const awayScore = await awayScoreDiv.textContent();

        if (homeScore.trim() !== '-' || awayScore.trim() !== '-') {
            console.log(`Skipping match ${matchId}: Already played or live.`);
            continue;
        }

        // Get team names
        const teamSpans = await matchDiv.$$(`span.wcl-simpleText_Asp-0.wcl-scores-simpleText-01_pV2Wk.wcl-name_3y6f5`);

        if (teamSpans.length !== 2) {
            console.log(`Skipping match ${matchId}: Team names not found.`);
            continue;
        }

        const team1 = (await teamSpans[0].textContent()).trim();
        const team2 = (await teamSpans[1].textContent()).trim();

        console.log(`Upcoming match found: ${team1} VS ${team2}`);
        validMatches.push(`${team1} VS ${team2}`);

        // Click to open match page in a new tab
        await matchDiv.click({ button: 'middle' });
        await page.waitForTimeout(3000); // Allow new tab to open
    }

    if (validMatches.length === 0) {
        console.log("No valid upcoming matches found.");
        await browser.close();
        return;
    }

    // Detect new match tab
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

    let matchData = validMatches.join("\n\n") + "\n\n";

    // Count the number of h2h__section elements
    const h2hSections = await matchPage.$$('div.h2h__section.section');
    console.log(`Total H2H sections found: ${h2hSections.length}`);

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

        for (const h2hRow of h2hRows) {
            // Find team names
            const teamSpans = await h2hRow.$$(`span[class*="h2h__participantInner"]`);
            if (teamSpans.length !== 2) {
                console.log("Skipping match row: Team names not found.");
                continue;
            }
            const team1 = (await teamSpans[0].textContent()).trim();
            const team2 = (await teamSpans[1].textContent()).trim();

            // Find match result inside <span class="h2h__result">
            const resultSpan = await h2hRow.$(`span.h2h__result`);
            if (!resultSpan) {
                console.log("Skipping match row: No result span found.");
                continue;
            }

            // Get the two score spans inside <span class="h2h__result">
            const scoreSpans = await resultSpan.$$(`span`);
            if (scoreSpans.length !== 2) {
                console.log("Skipping match row: Score format incorrect.");
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
