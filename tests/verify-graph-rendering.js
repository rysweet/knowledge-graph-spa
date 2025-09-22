const { chromium } = require('playwright');

async function verifyGraphRendering() {
  const browser = await chromium.launch({ headless: false }); // Run with visible browser
  const page = await browser.newPage();

  console.log('🔍 COMPREHENSIVE GRAPH RENDERING VERIFICATION\n');
  console.log('=' .repeat(60));

  try {
    // Navigate to app
    console.log('\n1️⃣ Loading application...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Remove webpack overlay if present
    await page.evaluate(() => {
      const overlay = document.querySelector('#webpack-dev-server-client-overlay');
      if (overlay) overlay.remove();
    });

    // Check what tabs are visible
    console.log('\n2️⃣ Checking visible tabs...');
    const visibleTabs = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      return tabs.map(tab => tab.textContent.trim());
    });

    console.log('   Tabs found:', visibleTabs);

    // Check for unwanted tabs
    const unwantedTabs = ['Generate IaC', 'Create Tenant', 'Undeploy', 'Threat Model', 'Generate Spec', 'Docs', 'CLI', 'Config', 'Agent Mode'];
    const foundUnwantedTabs = visibleTabs.filter(tab =>
      unwantedTabs.some(unwanted => tab.toLowerCase().includes(unwanted.toLowerCase()))
    );

    if (foundUnwantedTabs.length > 0) {
      console.log('   ❌ FOUND UNWANTED AZURE TABS:', foundUnwantedTabs);
    } else {
      console.log('   ✅ No unwanted Azure tabs found');
    }

    // Click on Visualize tab
    console.log('\n3️⃣ Navigating to Visualize tab...');
    const visualizeTab = await page.locator('button[role="tab"]:has-text("Visualize")');
    if (await visualizeTab.count() > 0) {
      await visualizeTab.click({ force: true });
      await page.waitForTimeout(3000);
      console.log('   ✅ Clicked Visualize tab');
    } else {
      console.log('   ❌ Visualize tab not found!');
    }

    // Check for canvas element
    console.log('\n4️⃣ Checking for graph canvas...');
    const canvasExists = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return canvases.length > 0;
    });

    if (canvasExists) {
      console.log('   ✅ Canvas element found');
    } else {
      console.log('   ❌ NO CANVAS ELEMENT FOUND');
    }

    // Take screenshot for visual inspection
    console.log('\n5️⃣ Taking screenshot...');
    await page.screenshot({ path: 'graph-render-check.png', fullPage: false });
    console.log('   📸 Screenshot saved as graph-render-check.png');

    // Check canvas pixel data - check all canvases
    console.log('\n6️⃣ Analyzing canvas pixel data...');
    const canvasAnalysis = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      if (!canvases.length) return { error: 'No canvas found' };

      let overallBlackPixels = 0;
      let overallColoredPixels = 0;
      let overallTotalPixels = 0;
      let hasContent = false;

      // Check all canvases
      for (const canvas of canvases) {
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const totalPixels = pixels.length / 4;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          if (a > 0) { // Non-transparent pixel
            hasContent = true;
            if (r === 0 && g === 0 && b === 0) {
              overallBlackPixels++;
            } else {
              overallColoredPixels++;
            }
          }
        }
        overallTotalPixels += totalPixels;
      }

      return {
        width: canvases[0].width,
        height: canvases[0].height,
        canvasCount: canvases.length,
        totalPixels: overallTotalPixels,
        blackPixels: overallBlackPixels,
        coloredPixels: overallColoredPixels,
        hasContent,
        blackPercentage: overallTotalPixels > 0 ? ((overallBlackPixels / overallTotalPixels) * 100).toFixed(2) : 0,
        coloredPercentage: overallTotalPixels > 0 ? ((overallColoredPixels / overallTotalPixels) * 100).toFixed(2) : 0
      };
    });

    if (canvasAnalysis.error) {
      console.log('   ❌', canvasAnalysis.error);
    } else {
      console.log('   Canvas count:', canvasAnalysis.canvasCount);
      console.log('   Canvas dimensions:', canvasAnalysis.width, 'x', canvasAnalysis.height);
      console.log('   Has content:', canvasAnalysis.hasContent ? 'Yes' : 'No');
      console.log('   Black pixels:', canvasAnalysis.blackPercentage + '%');
      console.log('   Colored pixels:', canvasAnalysis.coloredPercentage + '%');

      if (!canvasAnalysis.hasContent) {
        console.log('   ❌ NO CONTENT IN ANY CANVAS - GRAPH NOT RENDERING');
      } else if (parseFloat(canvasAnalysis.blackPercentage) > 95) {
        console.log('   ❌ CANVAS IS MOSTLY BLACK - GRAPH NOT RENDERING');
      } else if (parseFloat(canvasAnalysis.coloredPercentage) < 0.01) {
        console.log('   ❌ NO COLORED CONTENT - GRAPH NOT VISIBLE');
      } else {
        console.log('   ✅ Graph appears to be rendering with content');
      }
    }

    // Check console for Cytoscape debug info
    console.log('\n7️⃣ Checking Cytoscape debug info...');
    const cytoscapeInfo = await page.evaluate(() => {
      if (typeof window.debugCy !== 'undefined') {
        const cy = window.debugCy;
        return {
          exists: true,
          nodes: cy.nodes().length,
          edges: cy.edges().length,
          viewport: cy.extent()
        };
      }
      return { exists: false };
    });

    if (cytoscapeInfo.exists) {
      console.log('   ✅ Cytoscape instance found');
      console.log('   Nodes:', cytoscapeInfo.nodes);
      console.log('   Edges:', cytoscapeInfo.edges);
      console.log('   Viewport:', cytoscapeInfo.viewport);

      if (cytoscapeInfo.nodes === 0) {
        console.log('   ❌ NO NODES IN GRAPH');
      }
    } else {
      console.log('   ❌ Cytoscape debug instance not available');
    }

    // Check API response
    console.log('\n8️⃣ Checking API data...');
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/graph');
        const data = await response.json();
        return {
          success: true,
          nodeCount: data.nodes?.length || 0,
          edgeCount: data.edges?.length || 0,
          hasData: (data.nodes?.length || 0) > 0
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    if (apiResponse.success) {
      console.log('   ✅ API responding');
      console.log('   Nodes from API:', apiResponse.nodeCount);
      console.log('   Edges from API:', apiResponse.edgeCount);
      if (!apiResponse.hasData) {
        console.log('   ⚠️ API returns no data');
      }
    } else {
      console.log('   ❌ API error:', apiResponse.error);
    }

    // Final verdict
    console.log('\n' + '=' .repeat(60));
    console.log('📊 FINAL VERDICT:');

    const issues = [];
    if (foundUnwantedTabs.length > 0) {
      issues.push('Unwanted Azure tabs still visible');
    }
    if (!canvasExists) {
      issues.push('No canvas element found');
    }
    if (canvasAnalysis.blackPercentage && parseFloat(canvasAnalysis.blackPercentage) > 95) {
      issues.push('Canvas is black - graph not rendering');
    }
    if (cytoscapeInfo.exists && cytoscapeInfo.nodes === 0) {
      issues.push('Cytoscape has no nodes');
    }

    if (issues.length === 0) {
      console.log('✅ Graph appears to be rendering correctly!');
    } else {
      console.log('❌ CRITICAL ISSUES FOUND:');
      issues.forEach(issue => console.log('   •', issue));
    }

    console.log('\nKeeping browser open for manual inspection...');
    console.log('Press Ctrl+C to close');

    // Keep browser open for inspection
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

verifyGraphRendering();