const { chromium } = require('playwright');

async function checkStyles() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Remove any blocking overlays
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

  // Check canvas and container styles
  const styles = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const container = canvas?.parentElement;

    if (!canvas || !container) return { error: 'Elements not found' };

    const canvasStyles = window.getComputedStyle(canvas);
    const containerStyles = window.getComputedStyle(container);

    // Also check if there are multiple canvases
    const allCanvases = document.querySelectorAll('canvas');

    return {
      canvasCount: allCanvases.length,
      canvas: {
        display: canvasStyles.display,
        visibility: canvasStyles.visibility,
        opacity: canvasStyles.opacity,
        position: canvasStyles.position,
        width: canvasStyles.width,
        height: canvasStyles.height,
        background: canvasStyles.backgroundColor,
        zIndex: canvasStyles.zIndex
      },
      container: {
        display: containerStyles.display,
        visibility: containerStyles.visibility,
        opacity: containerStyles.opacity,
        position: containerStyles.position,
        width: containerStyles.width,
        height: containerStyles.height,
        background: containerStyles.backgroundColor,
        overflow: containerStyles.overflow
      }
    };
  });

  console.log(JSON.stringify(styles, null, 2));

  await browser.close();
}

checkStyles();
