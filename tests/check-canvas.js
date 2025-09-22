const { chromium } = require('playwright');

async function checkCanvas() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click Visualize tab
  const visualizeTab = await page.locator('button[role="tab"]:has-text("Visualize")');
  if (await visualizeTab.count() > 0) {
    await visualizeTab.click();
    await page.waitForTimeout(3000);
  }

  // Check canvas rendering more thoroughly
  const canvasData = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'No canvas' };

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Sample some pixels to see what colors we have
    const samples = [];
    for (let i = 0; i < 10; i++) {
      const idx = Math.floor(Math.random() * (pixels.length / 4)) * 4;
      samples.push({
        r: pixels[idx],
        g: pixels[idx + 1],
        b: pixels[idx + 2],
        a: pixels[idx + 3]
      });
    }

    // Check if cytoscape is rendering
    if (window.debugCy) {
      const cy = window.debugCy;
      const firstNode = cy.nodes().first();
      const nodeInfo = firstNode.length > 0 ? {
        position: firstNode.position(),
        renderedPosition: firstNode.renderedPosition(),
        visible: firstNode.visible(),
        style: firstNode.style()
      } : null;

      return {
        canvas: { width: canvas.width, height: canvas.height },
        samples,
        cytoscape: {
          nodes: cy.nodes().length,
          zoom: cy.zoom(),
          pan: cy.pan(),
          firstNode: nodeInfo
        }
      };
    }

    return { canvas: { width: canvas.width, height: canvas.height }, samples };
  });

  console.log(JSON.stringify(canvasData, null, 2));

  await page.waitForTimeout(5000);
  await browser.close();
}

checkCanvas();
