const { chromium } = require('playwright');

async function checkAllCanvases() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Remove overlay
  await page.evaluate(() => {
    const overlay = document.querySelector('#webpack-dev-server-client-overlay');
    if (overlay) overlay.remove();
  });

  // Click Visualize tab
  const visualizeTab = await page.locator('button[role="tab"]:has-text("Visualize")');
  if (await visualizeTab.count() > 0) {
    await visualizeTab.click({ force: true });
    await page.waitForTimeout(3000);
  }

  // Check all canvases
  const canvasData = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    const results = [];

    canvases.forEach((canvas, index) => {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
      const pixels = imageData.data;

      let hasContent = false;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 0) { // Check alpha channel
          hasContent = true;
          break;
        }
      }

      results.push({
        index,
        width: canvas.width,
        height: canvas.height,
        hasContent,
        zIndex: window.getComputedStyle(canvas).zIndex,
        dataLayerName: canvas.dataset.layerName || 'unknown'
      });
    });

    return results;
  });

  console.log('Canvas analysis:');
  canvasData.forEach(c => {
    console.log(`Canvas ${c.index}: ${c.width}x${c.height}, z-index: ${c.zIndex}, has content: ${c.hasContent}`);
  });

  await browser.close();
}

checkAllCanvases();
