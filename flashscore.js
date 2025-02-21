const { chromium } = require('playwright');

(async () => { console.log("Launching browser..."); const browser = await chromium.launch(); const context = await browser.newContext(); const page = await context.newPage();

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

// Wait for page load
await page.waitForTimeout(5000);

// Find all match divs
const matchDivs = await page.$$('div.event__match.event__match--withRowLink.event__match--twoLine');
console.log(`Total unique match divs found: ${matchDivs.length}`);

if (matchDivs.length === 0) {
    console.log("No matches found. Exiting.");
    await browser.close();
    return;
}

const firstMatch = matchDivs[0];
const id = await firstMatch.getAttribute('id');
console.log(`Opening first match with ID: ${id}`);
await firstMatch.click();
await page.waitForTimeout(5000);

console.log("Clicked H2H tab.");
await page.click('button:has-text("H2H")');
await page.waitForTimeout(5000);

// Find all H2H sections
const h2hSections = await page.$$('div.h2h__section.section');
console.log(`Total H2H sections found: ${h2hSections.length}`);

for (let i = 0; i < h2hSections.length; i++) {
    console.log(`Processing H2H section ${i + 1}...`);
    
    const matchHeaders = await h2hSections[i].$$('span.wcl-overline_rOFfd.wcl-scores-overline-02_n9EXm');
    
    let foundHeaders = [];
    for (let header of matchHeaders) {
        const text = await header.innerText();
        foundHeaders.push(text);
    }
    
    console.log(`H2H section ${i + 1} headers:`, foundHeaders);
}

await browser.close();

})();

