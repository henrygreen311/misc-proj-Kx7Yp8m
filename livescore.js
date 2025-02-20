const { chromium } = require('playwright'); const fs = require('fs');

(async () => { const browser = await chromium.launch({ headless: true }); const context = await browser.newContext(); const page = await context.newPage();

// Go to LiveScore
await page.goto('https://www.livescore.com/en/', { waitUntil: 'load' });

// Wait for cookie dialog and accept it if present
try {
    await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
    await page.click('button:has-text("Accept")');
    console.log('Accepted cookies');
} catch (error) {
    console.log('No cookie dialog found');
}

// Wait for 30 seconds to allow full page load
await page.waitForTimeout(30000);

// Extract all unique category names
const categoryElements = await page.$$('#category-header__category');
const categories = new Set();

for (const element of categoryElements) {
    const text = await element.textContent();
    if (text && !categories.has(text.trim())) {
        categories.add(text.trim());
        console.log(`Found category: ${text.trim()}`);
    }
}

// Write unique categories to matches.txt
fs.writeFileSync('matches.txt', Array.from(categories).join('\n'), 'utf-8');
console.log('Data saved to matches.txt');

await browser.close();

})();

