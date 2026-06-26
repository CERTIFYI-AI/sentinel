const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:4173/settings', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  
  const breadcrumbText = await page.evaluate(() => {
    const navs = document.querySelectorAll('nav[aria-label="breadcrumb"]');
    return Array.from(navs).map(n => n.innerText).join('\n---\n');
  });
  
  console.log("Breadcrumb text on /settings:");
  console.log(breadcrumbText);
  
  await browser.close();
})();
