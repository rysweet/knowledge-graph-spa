const { chromium } = require('playwright');

async function checkConsole() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', (msg) => {
    console.log(`Console ${msg.type()}: ${msg.text()}`);
  });

  // Listen for page errors
  page.on('pageerror', (error) => {
    console.log(`Page Error: ${error.message}`);
  });

  console.log('🔍 Checking console for errors...');

  try {
    // Navigate to the SPA
    await page.goto('http://localhost:3002');

    // Wait for app to load
    await page.waitForTimeout(5000);

    // Navigate to visualize tab
    console.log('Navigating to visualize tab...');
    await page.click('button:has-text("Visualize")');

    // Wait for visualization to load
    await page.waitForTimeout(5000);

    console.log('✅ Page check complete');

  } catch (error) {
    console.error('❌ Error during page check:', error);
  } finally {
    await browser.close();
  }
}

checkConsole();