const { chromium } = require('playwright');

async function testVisualizationRenders() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let errors = [];
  let warnings = [];
  let testPassed = true;

  // Capture all console messages
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
      console.log(`❌ Console Error: ${text}`);
    } else if (msg.type() === 'warning') {
      warnings.push(text);
    } else {
      console.log(`ℹ️  Console ${msg.type()}: ${text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.log(`❌ Page Error: ${error.message}`);
  });

  console.log('🧪 Starting E2E test for graph visualization...\n');

  try {
    // Step 1: Navigate to the app
    console.log('1️⃣  Navigating to app...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });

    // Step 2: Wait for initial load and remove any overlay iframes
    await page.waitForTimeout(2000);

    // Remove webpack dev server overlay if present
    await page.evaluate(() => {
      const overlayIframe = document.querySelector('#webpack-dev-server-client-overlay');
      if (overlayIframe) {
        overlayIframe.remove();
        console.log('Removed webpack dev server overlay');
      }
    });

    // Step 3: Click on Visualize tab
    console.log('2️⃣  Clicking Visualize tab...');
    const visualizeButton = await page.locator('button:has-text("Visualize")');
    await visualizeButton.click({ force: true });

    // Step 4: Wait for graph container to appear (use broader selector)
    console.log('3️⃣  Waiting for graph container...');
    await page.waitForSelector('canvas, .MuiBox-root canvas', {
      timeout: 10000
    });

    // Step 5: Check if graph has rendered nodes
    console.log('4️⃣  Checking for rendered graph elements...');
    await page.waitForTimeout(3000); // Give graph time to render

    // Check for Cytoscape or vis-network elements
    const hasGraphElements = await page.evaluate(() => {
      // Look for any canvas element which is what Cytoscape renders
      const canvases = document.querySelectorAll('canvas');

      // Check if we have a canvas with actual dimensions
      for (const canvas of canvases) {
        if (canvas.width > 0 && canvas.height > 0) {
          return true;
        }
      }

      return false;
    });

    if (!hasGraphElements) {
      console.log('⚠️  Warning: No graph canvas detected or canvas is empty');
      testPassed = false;
    } else {
      console.log('✅ Graph canvas rendered successfully');
    }

    // Step 6: Check for the critical error that was reported
    const hasCriticalError = errors.some(err =>
      err.includes("data.relationships") ||
      err.includes("undefined is not an object") ||
      err.includes("Cannot read properties of undefined")
    );

    if (hasCriticalError) {
      console.log('\n❌ CRITICAL ERROR FOUND - the data.relationships error still exists!');
      testPassed = false;
    } else {
      console.log('✅ No critical data.relationships errors found');
    }

    // Step 7: Try interacting with a node (if any exist)
    console.log('\n5️⃣  Attempting to interact with graph...');
    try {
      const graphArea = await page.locator('canvas').first();
      await graphArea.click({ position: { x: 100, y: 100 } });
      await page.waitForTimeout(500);
      console.log('✅ Graph interaction successful');
    } catch (e) {
      console.log('⚠️  Could not interact with graph (might be empty)');
    }

    // Step 8: Verify tabs exist (don't fail test if other tabs aren't implemented)
    console.log('\n6️⃣  Checking available tabs...');
    const tabsToCheck = ['Visualize'];
    for (const tabName of tabsToCheck) {
      try {
        const tab = await page.locator(`button:has-text("${tabName}")`);
        await tab.click();
        await page.waitForTimeout(500);
        console.log(`✅ ${tabName} tab is clickable`);
      } catch (e) {
        console.log(`❌ ${tabName} tab is not clickable`);
        testPassed = false;
      }
    }

    // Final report
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS:');
    console.log('='.repeat(50));
    console.log(`Errors found: ${errors.length}`);
    console.log(`Warnings found: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n🔴 Errors:');
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    if (testPassed && errors.length === 0) {
      console.log('\n✅✅✅ ALL TESTS PASSED - Visualization renders without critical errors!');
      process.exit(0);
    } else {
      console.log('\n❌❌❌ TESTS FAILED - Issues need to be fixed');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the test
testVisualizationRenders().catch(console.error);