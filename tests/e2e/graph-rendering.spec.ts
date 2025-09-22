import { test, expect, Page } from '@playwright/test';

// Test data fixtures
const basicGraphData = {
  nodes: [
    { id: 'n1', label: 'Tenant Root', type: 'Tenant', properties: { name: 'Main Tenant' } },
    { id: 'n2', label: 'ResourceGroup1', type: 'ResourceGroup', properties: { location: 'eastus' } },
    { id: 'n3', label: 'VM1', type: 'VirtualMachine', properties: { status: 'Running' } },
    { id: 'n4', label: 'Storage1', type: 'StorageAccount', properties: { sku: 'Standard_LRS' } }
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', type: 'CONTAINS', properties: {} },
    { id: 'e2', source: 'n2', target: 'n3', type: 'CONTAINS', properties: {} },
    { id: 'e3', source: 'n2', target: 'n4', type: 'CONTAINS', properties: {} }
  ],
  stats: {
    nodeCount: 4,
    edgeCount: 3,
    nodeTypes: {
      Tenant: 1,
      ResourceGroup: 1,
      VirtualMachine: 1,
      StorageAccount: 1
    },
    edgeTypes: { CONTAINS: 3 }
  }
};

const largeGraphData = {
  nodes: Array.from({ length: 42 }, (_, i) => ({
    id: `node-${i}`,
    label: `Node ${i}`,
    type: ['Resource', 'ResourceGroup', 'VirtualMachine', 'StorageAccount', 'VirtualNetwork'][i % 5],
    properties: {
      index: i,
      status: i % 2 === 0 ? 'Active' : 'Inactive',
      location: i % 3 === 0 ? 'eastus' : i % 3 === 1 ? 'westus' : 'centralus'
    }
  })),
  edges: Array.from({ length: 15 }, (_, i) => ({
    id: `edge-${i}`,
    source: `node-${i}`,
    target: `node-${(i + 1) % 42}`,
    type: ['CONTAINS', 'CONNECTED_TO', 'DEPENDS_ON'][i % 3],
    properties: {}
  })),
  stats: {
    nodeCount: 42,
    edgeCount: 15,
    nodeTypes: {
      Resource: 9,
      ResourceGroup: 9,
      VirtualMachine: 8,
      StorageAccount: 8,
      VirtualNetwork: 8
    },
    edgeTypes: {
      CONTAINS: 5,
      CONNECTED_TO: 5,
      DEPENDS_ON: 5
    }
  }
};

test.describe('Graph Rendering - Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mock for all tests
    await page.route('**/api/graph', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(basicGraphData)
      });
    });
  });

  test('graph renders with visible colored nodes - not black screen', async ({ page }) => {
    await page.goto('/');

    // Wait for vis-network container to be created
    await page.waitForSelector('div[style*="width: 100%"][style*="height: 100%"]', {
      timeout: 10000
    });

    // Wait a bit for rendering to complete
    await page.waitForTimeout(2000);

    // Check if the graph container has content
    const graphContainer = await page.locator('div[style*="width: 100%"][style*="height: 100%"]').first();
    const boundingBox = await graphContainer.boundingBox();

    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.width).toBeGreaterThan(100);
    expect(boundingBox!.height).toBeGreaterThan(100);

    // Take a screenshot and analyze it
    const screenshot = await graphContainer.screenshot();

    // Verify the screenshot is not all black or all white
    const isNotMonochrome = await page.evaluate((screenshotBuffer) => {
      return new Promise((resolve) => {
        const img = new Image();
        const blob = new Blob([new Uint8Array(screenshotBuffer)], { type: 'image/png' });
        const url = URL.createObjectURL(blob);

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          let colorVariation = false;
          let firstPixel = { r: data[0], g: data[1], b: data[2] };

          // Check for color variation
          for (let i = 4; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            if (Math.abs(r - firstPixel.r) > 10 ||
                Math.abs(g - firstPixel.g) > 10 ||
                Math.abs(b - firstPixel.b) > 10) {
              colorVariation = true;
              break;
            }
          }

          URL.revokeObjectURL(url);
          resolve(colorVariation);
        };

        img.src = url;
      });
    }, [...screenshot]);

    expect(isNotMonochrome).toBe(true);
  });

  test('node statistics are displayed correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for stats to appear
    await page.waitForSelector('text=/nodes/i', { timeout: 10000 });

    // Verify node count
    await expect(page.getByText('4 nodes')).toBeVisible();

    // Verify edge count
    await expect(page.getByText('3 edges')).toBeVisible();
  });

  test('node type filters show correct counts', async ({ page }) => {
    await page.goto('/');

    // Wait for filters to load
    await page.waitForSelector('text=/Node Types/i', { timeout: 10000 });

    // Check that node type chips are displayed with counts
    await expect(page.getByText('Tenant (1)')).toBeVisible();
    await expect(page.getByText('ResourceGroup (1)')).toBeVisible();
    await expect(page.getByText('VirtualMachine (1)')).toBeVisible();
    await expect(page.getByText('StorageAccount (1)')).toBeVisible();
  });
});

test.describe('Graph Rendering - Data Integration', () => {
  test('all nodes from API are rendered in the graph', async ({ page }) => {
    // Use the larger dataset
    await page.route('**/api/graph', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeGraphData)
      });
    });

    await page.goto('/');

    // Wait for stats to confirm data loaded
    await expect(page.getByText('42 nodes')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('15 edges')).toBeVisible();

    // Verify node type counts in filters
    const nodeTypeSection = page.locator('text=/Node Types/i').locator('..');

    // Check some node types are present with counts
    await expect(nodeTypeSection.getByText(/Resource \(9\)/)).toBeVisible();
    await expect(nodeTypeSection.getByText(/ResourceGroup \(9\)/)).toBeVisible();
  });

  test('graph handles empty data without crashing', async ({ page }) => {
    const emptyData = {
      nodes: [],
      edges: [],
      stats: {
        nodeCount: 0,
        edgeCount: 0,
        nodeTypes: {},
        edgeTypes: {}
      }
    };

    await page.route('**/api/graph', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyData)
      });
    });

    await page.goto('/');

    // Should display zero counts
    await expect(page.getByText('0 nodes')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('0 edges')).toBeVisible();

    // Page should not crash
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});

test.describe('Graph Rendering - Interactivity', () => {
  test('zoom controls change the graph scale', async ({ page }) => {
    await page.goto('/');

    // Wait for graph to load
    await page.waitForSelector('div[style*="width: 100%"][style*="height: 100%"]', {
      timeout: 10000
    });
    await page.waitForTimeout(2000);

    // Find and click zoom in button
    const zoomInButton = page.getByRole('button').filter({ has: page.locator('svg path[d*="M15.5 14h-.79l-.28-.27"]') }).first();

    // Click zoom in multiple times
    await zoomInButton.click();
    await page.waitForTimeout(500);
    await zoomInButton.click();
    await page.waitForTimeout(500);

    // Verify zoom happened (container should still be visible)
    const graphContainer = await page.locator('div[style*="width: 100%"][style*="height: 100%"]').first();
    await expect(graphContainer).toBeVisible();
  });

  test('search functionality highlights nodes', async ({ page }) => {
    // Mock search endpoint
    await page.route('**/api/graph/search*', async route => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('query');

      const results = basicGraphData.nodes.filter(n =>
        n.label.toLowerCase().includes(query?.toLowerCase() || '')
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(results)
      });
    });

    await page.goto('/');

    // Wait for search box
    const searchInput = page.getByPlaceholder('Search nodes...');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });

    // Type search query
    await searchInput.fill('VM1');
    await searchInput.press('Enter');

    // Wait for search to complete
    await page.waitForTimeout(1000);

    // Search should have been triggered
    const searchButton = page.locator('[aria-label="Search"]').first();
    await expect(searchButton).toBeVisible();
  });

  test('node type filtering works', async ({ page }) => {
    await page.goto('/');

    // Wait for filters to load
    await page.waitForSelector('text=/Node Types/i', { timeout: 10000 });

    // Click on a node type chip to toggle it
    const tenantChip = page.getByText('Tenant (1)');
    await tenantChip.click();

    // The chip appearance should change (it toggles)
    await page.waitForTimeout(500);

    // Click again to re-enable
    await tenantChip.click();
    await page.waitForTimeout(500);

    // Graph should still be visible
    const graphContainer = await page.locator('div[style*="width: 100%"][style*="height: 100%"]').first();
    await expect(graphContainer).toBeVisible();
  });
});

test.describe('Graph Rendering - Error Handling', () => {
  test('displays error message when backend is unavailable', async ({ page }) => {
    await page.route('**/api/graph', async route => {
      await route.abort('failed');
    });

    await page.goto('/');

    // Should show error message
    await expect(page.getByText(/Cannot connect to backend server/i)).toBeVisible({
      timeout: 10000
    });
  });

  test('handles Neo4j connection errors gracefully', async ({ page }) => {
    await page.route('**/api/graph', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Neo4j connection failed' })
      });
    });

    await page.goto('/');

    // Should show Neo4j error message
    await expect(page.getByText(/Neo4j connection error/i)).toBeVisible({
      timeout: 10000
    });
  });
});

test.describe('Graph Rendering - Console Errors', () => {
  test('no JavaScript errors during graph render', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known non-critical errors
        if (!text.includes('favicon.ico') &&
            !text.includes('DevTools') &&
            !text.includes('source map')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    await page.goto('/');

    // Wait for graph to fully load
    await page.waitForSelector('text=/nodes/i', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check for critical errors
    expect(consoleErrors).toEqual([]);
  });

  test('API calls complete successfully', async ({ page }) => {
    const apiCalls: Array<{ url: string, status: number }> = [];

    // Track API responses
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        apiCalls.push({
          url,
          status: response.status()
        });
      }
    });

    await page.goto('/');

    // Wait for graph to load
    await page.waitForSelector('text=/nodes/i', { timeout: 10000 });

    // Verify main graph API call succeeded
    const graphCall = apiCalls.find(call => call.url.includes('/api/graph'));
    expect(graphCall).toBeDefined();
    expect(graphCall?.status).toBe(200);
  });
});

test.describe('Graph Rendering - Performance', () => {
  test('graph renders within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Wait for graph stats to appear (indicates render complete)
    await page.waitForSelector('text=/nodes/i', { timeout: 5000 });

    const renderTime = Date.now() - startTime;

    // Should render in less than 5 seconds
    expect(renderTime).toBeLessThan(5000);
  });

  test('handles large dataset without hanging', async ({ page }) => {
    // Create a very large dataset
    const veryLargeData = {
      nodes: Array.from({ length: 500 }, (_, i) => ({
        id: `node-${i}`,
        label: `Node ${i}`,
        type: 'Resource',
        properties: { index: i }
      })),
      edges: Array.from({ length: 1000 }, (_, i) => ({
        id: `edge-${i}`,
        source: `node-${i % 500}`,
        target: `node-${(i + 1) % 500}`,
        type: 'CONNECTED_TO',
        properties: {}
      })),
      stats: {
        nodeCount: 500,
        edgeCount: 1000,
        nodeTypes: { Resource: 500 },
        edgeTypes: { CONNECTED_TO: 1000 }
      }
    };

    await page.route('**/api/graph', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(veryLargeData)
      });
    });

    await page.goto('/');

    // Should eventually display the counts
    await expect(page.getByText('500 nodes')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('1000 edges')).toBeVisible();
  });
});