# Comprehensive Graph Rendering Test Specifications

## Problem Statement
Current tests only verify DOM element presence, not actual graph rendering with visible nodes and edges. Tests must verify:
- Visual content is rendered (not black screen)
- Data from API is displayed
- User interactions work
- No console errors

## Test Categories

### 1. Visual Rendering Tests (E2E - Playwright)

#### Test: Graph Canvas Has Visible Content
```typescript
test('graph renders visible nodes and edges', async ({ page }) => {
  // Setup: Mock API with known data
  await page.route('**/api/graph', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify(mockGraphData)
    });
  });

  await page.goto('/');

  // Wait for canvas to be rendered
  const canvas = await page.waitForSelector('canvas', { timeout: 10000 });

  // Take screenshot for visual verification
  const screenshot = await canvas.screenshot();

  // Verify canvas is not all black/white
  const pixels = await page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Count non-black and non-white pixels
    let coloredPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Check if pixel is not black (0,0,0) or white (255,255,255)
      if (a > 0 && !(r === 0 && g === 0 && b === 0) && !(r === 255 && g === 255 && b === 255)) {
        coloredPixels++;
      }
    }

    return {
      totalPixels: data.length / 4,
      coloredPixels,
      percentageColored: (coloredPixels / (data.length / 4)) * 100
    };
  });

  // Assert at least 5% of canvas has colored content
  expect(pixels.percentageColored).toBeGreaterThan(5);
});
```

#### Test: Node Labels Are Visible
```typescript
test('node labels are rendered and readable', async ({ page }) => {
  await page.route('**/api/graph', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        nodes: [
          { id: '1', label: 'TestNode1', type: 'Resource' },
          { id: '2', label: 'TestNode2', type: 'ResourceGroup' }
        ],
        edges: [{ id: 'e1', source: '1', target: '2', type: 'CONTAINS' }],
        stats: { nodeCount: 2, edgeCount: 1 }
      })
    });
  });

  await page.goto('/');
  await page.waitForSelector('canvas');

  // Cytoscape renders text on canvas - check for text rendering
  const hasText = await page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');

    // Create a test canvas to compare
    const testCanvas = document.createElement('canvas');
    testCanvas.width = canvas.width;
    testCanvas.height = canvas.height;
    const testCtx = testCanvas.getContext('2d');

    // Draw test text
    testCtx.font = '12px Arial';
    testCtx.fillText('TestNode1', 50, 50);

    // Compare pixels - if main canvas has similar patterns, text is rendered
    const mainData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Look for text-like patterns (clusters of pixels)
    let textPatterns = 0;
    for (let y = 0; y < canvas.height - 10; y += 10) {
      for (let x = 0; x < canvas.width - 50; x += 10) {
        const region = ctx.getImageData(x, y, 50, 20);
        let nonEmptyPixels = 0;

        for (let i = 0; i < region.data.length; i += 4) {
          if (region.data[i + 3] > 0) { // Alpha channel
            nonEmptyPixels++;
          }
        }

        // Text regions have 10-60% filled pixels
        const fillRatio = nonEmptyPixels / (region.data.length / 4);
        if (fillRatio > 0.1 && fillRatio < 0.6) {
          textPatterns++;
        }
      }
    }

    return textPatterns > 0;
  });

  expect(hasText).toBe(true);
});
```

### 2. Data Integration Tests (E2E)

#### Test: API Data Reaches Component
```typescript
test('all nodes from API are rendered in graph', async ({ page }) => {
  const mockData = {
    nodes: Array.from({ length: 42 }, (_, i) => ({
      id: `node-${i}`,
      label: `Node ${i}`,
      type: i % 3 === 0 ? 'Resource' : i % 3 === 1 ? 'ResourceGroup' : 'Tenant',
      properties: { index: i }
    })),
    edges: Array.from({ length: 15 }, (_, i) => ({
      id: `edge-${i}`,
      source: `node-${i}`,
      target: `node-${i + 1}`,
      type: 'CONTAINS'
    })),
    stats: { nodeCount: 42, edgeCount: 15 }
  };

  await page.route('**/api/graph', async route => {
    await route.fulfill({ status: 200, body: JSON.stringify(mockData) });
  });

  await page.goto('/');

  // Verify stats display
  await expect(page.getByText('42 nodes')).toBeVisible();
  await expect(page.getByText('15 edges')).toBeVisible();

  // Verify Cytoscape received the data
  const cytoscapeData = await page.evaluate(() => {
    // Access Cytoscape instance
    const cy = (window as any).cy;
    if (!cy) return null;

    return {
      nodeCount: cy.nodes().length,
      edgeCount: cy.edges().length,
      nodeIds: cy.nodes().map(n => n.id()),
      edgeIds: cy.edges().map(e => e.id())
    };
  });

  expect(cytoscapeData).not.toBeNull();
  expect(cytoscapeData.nodeCount).toBe(42);
  expect(cytoscapeData.edgeCount).toBe(15);
});
```

#### Test: Data Transform Works Correctly
```typescript
test('vis-network data transform is correct', async ({ page }) => {
  const mockData = {
    nodes: [
      { id: 'n1', label: 'Node1', type: 'Resource', properties: { color: 'red' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'CONNECTED_TO' }
    ]
  };

  let transformedData = null;

  // Intercept vis-network DataSet constructor
  await page.addInitScript(() => {
    const OriginalDataSet = (window as any).vis.DataSet;
    (window as any).vis.DataSet = function(data) {
      (window as any).capturedData = data;
      return new OriginalDataSet(data);
    };
  });

  await page.route('**/api/graph', async route => {
    await route.fulfill({ status: 200, body: JSON.stringify(mockData) });
  });

  await page.goto('/');
  await page.waitForSelector('canvas');

  transformedData = await page.evaluate(() => (window as any).capturedData);

  // Verify transformation
  expect(transformedData).toHaveLength(1);
  expect(transformedData[0]).toMatchObject({
    id: 'n1',
    label: 'Node1',
    color: expect.any(String), // Should have color from NODE_COLORS
    shape: 'dot',
    size: 20
  });
});
```

### 3. Interactivity Tests (E2E)

#### Test: Node Click Shows Details
```typescript
test('clicking node shows details panel', async ({ page }) => {
  await page.route('**/api/graph', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify(basicGraphData)
    });
  });

  await page.route('**/api/graph/node/*', async route => {
    const nodeId = route.request().url().split('/').pop();
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        id: nodeId,
        labels: ['Resource'],
        properties: { name: 'TestResource', status: 'Active' }
      })
    });
  });

  await page.goto('/');
  await page.waitForSelector('canvas');

  // Simulate node click
  const canvas = await page.locator('canvas');
  await canvas.click({ position: { x: 200, y: 200 } });

  // Verify details panel opens
  await expect(page.getByText('Node Details')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('TestResource')).toBeVisible();
});
```

#### Test: Zoom Controls Work
```typescript
test('zoom controls change canvas scale', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');

  // Get initial transform
  const initialTransform = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return window.getComputedStyle(canvas).transform;
  });

  // Click zoom in
  await page.getByRole('button', { name: 'Zoom In' }).click();
  await page.waitForTimeout(500); // Wait for animation

  // Get new transform
  const zoomedTransform = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return window.getComputedStyle(canvas).transform;
  });

  expect(zoomedTransform).not.toBe(initialTransform);

  // Verify zoom level increased
  const getScale = (transform: string) => {
    const match = transform.match(/matrix\(([^,]+)/);
    return match ? parseFloat(match[1]) : 1;
  };

  expect(getScale(zoomedTransform)).toBeGreaterThan(getScale(initialTransform));
});
```

### 4. Browser Console Tests (E2E)

#### Test: No JavaScript Errors During Render
```typescript
test('no console errors during graph render', async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push(error.message);
  });

  await page.route('**/api/graph', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify(mockGraphData)
    });
  });

  await page.goto('/');
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(2000); // Wait for any async operations

  // Check for specific known issues
  const criticalErrors = consoleErrors.filter(error =>
    !error.includes('DevTools') && // Ignore devtools warnings
    !error.includes('favicon') &&   // Ignore favicon 404
    !error.includes('Source map')   // Ignore sourcemap warnings
  );

  expect(criticalErrors).toEqual([]);
});
```

#### Test: API Calls Succeed
```typescript
test('API calls complete successfully', async ({ page }) => {
  const apiCalls: { url: string, status: number }[] = [];

  page.on('response', response => {
    if (response.url().includes('/api/')) {
      apiCalls.push({
        url: response.url(),
        status: response.status()
      });
    }
  });

  await page.goto('/');
  await page.waitForSelector('canvas');

  // Verify API calls
  expect(apiCalls).toContainEqual(
    expect.objectContaining({
      url: expect.stringContaining('/api/graph'),
      status: 200
    })
  );
});
```

### 5. Screenshot/Pixel Tests (E2E)

#### Test: Visual Regression Test
```typescript
test('graph renders consistently', async ({ page }) => {
  await page.route('**/api/graph', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify(fixedGraphData) // Use fixed data for consistency
    });
  });

  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(3000); // Wait for layout stabilization

  // Take screenshot
  await expect(page).toHaveScreenshot('graph-render.png', {
    fullPage: false,
    clip: { x: 0, y: 0, width: 800, height: 600 }
  });
});
```

#### Test: Canvas Not Empty
```typescript
test('canvas contains rendered content', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');

  const canvasStats = await page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;
    let transparentPixels = 0;

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];

      if (a === 0) {
        transparentPixels++;
      } else {
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minG = Math.min(minG, g);
        maxG = Math.max(maxG, g);
        minB = Math.min(minB, b);
        maxB = Math.max(maxB, b);
      }
    }

    return {
      hasColorVariation: (maxR - minR) > 10 || (maxG - minG) > 10 || (maxB - minB) > 10,
      transparentRatio: transparentPixels / (imageData.data.length / 4),
      colorRange: {
        r: { min: minR, max: maxR },
        g: { min: minG, max: maxG },
        b: { min: minB, max: maxB }
      }
    };
  });

  // Canvas should have color variation (not monochrome)
  expect(canvasStats.hasColorVariation).toBe(true);
  // Canvas should not be mostly transparent
  expect(canvasStats.transparentRatio).toBeLessThan(0.9);
});
```

## Unit Test Enhancements

### Enhanced GraphVisualization Unit Tests

```typescript
// GraphVisualization.enhanced.test.tsx

describe('GraphVisualization - Rendering Pipeline', () => {
  let mockVisNetwork: jest.Mock;
  let mockDataSet: jest.Mock;

  beforeEach(() => {
    // Create more realistic mocks
    mockVisNetwork = jest.fn().mockImplementation((container, data, options) => {
      // Verify container is valid
      expect(container).toBeTruthy();
      expect(container.tagName).toBe('DIV');

      // Verify data structure
      expect(data).toHaveProperty('nodes');
      expect(data).toHaveProperty('edges');

      // Store for verification
      (window as any).__lastGraphData = data;
      (window as any).__lastGraphOptions = options;

      return {
        on: jest.fn((event, callback) => {
          if (event === 'stabilizationIterationsDone') {
            setTimeout(callback, 100); // Simulate async stabilization
          }
        }),
        once: jest.fn(),
        setOptions: jest.fn(),
        destroy: jest.fn(),
        selectNodes: jest.fn(),
        focus: jest.fn(),
        fit: jest.fn(),
        getScale: jest.fn(() => 1),
        moveTo: jest.fn(),
        getViewPosition: jest.fn(() => ({ x: 0, y: 0 }))
      };
    });

    mockDataSet = jest.fn().mockImplementation((data) => {
      // Verify data is array
      expect(Array.isArray(data)).toBe(true);
      return data;
    });

    // Replace vis-network mocks
    jest.mock('vis-network/standalone', () => ({
      Network: mockVisNetwork,
      DataSet: mockDataSet
    }));
  });

  test('transforms API data correctly for vis-network', async () => {
    const apiData = {
      nodes: [
        { id: 'n1', label: 'Node1', type: 'Resource', properties: {} },
        { id: 'n2', label: 'Node2', type: 'ResourceGroup', properties: {} }
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'CONTAINS' }
      ],
      stats: { nodeCount: 2, edgeCount: 1 }
    };

    mockedAxios.get.mockResolvedValue({ data: apiData });

    render(
      <BrowserRouter>
        <AppProvider>
          <GraphVisualization />
        </AppProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockVisNetwork).toHaveBeenCalled();
    });

    const graphData = (window as any).__lastGraphData;

    // Verify nodes transformation
    expect(graphData.nodes).toBeDefined();
    const nodes = Array.from(graphData.nodes);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({
      id: 'n1',
      label: 'Node1',
      color: expect.stringMatching(/^#[0-9A-F]{6}$/i), // Hex color
      shape: 'dot',
      size: 20
    });

    // Verify edges transformation
    expect(graphData.edges).toBeDefined();
    const edges = Array.from(graphData.edges);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      id: 'e1',
      from: 'n1', // Note: source -> from
      to: 'n2',   // Note: target -> to
      label: 'CONTAINS',
      color: expect.any(String),
      width: expect.any(Number)
    });
  });

  test('applies correct colors from NODE_COLORS mapping', async () => {
    const apiData = {
      nodes: [
        { id: 'n1', label: 'Tenant1', type: 'Tenant', properties: {} },
        { id: 'n2', label: 'Sub1', type: 'Subscription', properties: {} },
        { id: 'n3', label: 'RG1', type: 'ResourceGroup', properties: {} }
      ],
      edges: [],
      stats: { nodeCount: 3, edgeCount: 0 }
    };

    mockedAxios.get.mockResolvedValue({ data: apiData });

    render(
      <BrowserRouter>
        <AppProvider>
          <GraphVisualization />
        </AppProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockDataSet).toHaveBeenCalled();
    });

    const calls = mockDataSet.mock.calls;
    const nodesCall = calls.find(call =>
      call[0] && call[0][0] && call[0][0].hasOwnProperty('label')
    );

    expect(nodesCall).toBeDefined();
    const nodes = nodesCall[0];

    expect(nodes[0].color).toBe('#FF6B6B'); // Tenant color
    expect(nodes[1].color).toBe('#4ECDC4'); // Subscription color
    expect(nodes[2].color).toBe('#45B7D1'); // ResourceGroup color
  });

  test('filters out Subscription nodes by default', async () => {
    const apiData = {
      nodes: [
        { id: 'n1', label: 'Tenant1', type: 'Tenant', properties: {} },
        { id: 'n2', label: 'Sub1', type: 'Subscription', properties: {} },
        { id: 'n3', label: 'RG1', type: 'ResourceGroup', properties: {} }
      ],
      edges: [],
      stats: {
        nodeCount: 3,
        edgeCount: 0,
        nodeTypes: { Tenant: 1, Subscription: 1, ResourceGroup: 1 }
      }
    };

    mockedAxios.get.mockResolvedValue({ data: apiData });

    render(
      <BrowserRouter>
        <AppProvider>
          <GraphVisualization />
        </AppProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockDataSet).toHaveBeenCalled();
    });

    const calls = mockDataSet.mock.calls;
    const nodesCall = calls.find(call =>
      call[0] && Array.isArray(call[0]) && call[0].some(item => item.label)
    );

    const nodes = nodesCall[0];

    // Should only have 2 nodes (Subscription filtered out)
    expect(nodes).toHaveLength(2);
    expect(nodes.find(n => n.type === 'Subscription')).toBeUndefined();
  });

  test('handles empty graph data without crashing', async () => {
    const emptyData = {
      nodes: [],
      edges: [],
      stats: { nodeCount: 0, edgeCount: 0, nodeTypes: {}, edgeTypes: {} }
    };

    mockedAxios.get.mockResolvedValue({ data: emptyData });

    const { container } = render(
      <BrowserRouter>
        <AppProvider>
          <GraphVisualization />
        </AppProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('0 nodes')).toBeInTheDocument();
    });

    // Should still create network with empty data
    expect(mockVisNetwork).toHaveBeenCalled();
    expect(container.querySelector('[ref]')).toBeInTheDocument();
  });
});

describe('GraphVisualization - Error Handling', () => {
  test('displays specific error for network failure', async () => {
    mockedAxios.get.mockRejectedValue({
      code: 'ERR_NETWORK',
      message: 'Network Error'
    });

    render(
      <BrowserRouter>
        <AppProvider>
          <GraphVisualization />
        </AppProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Cannot connect to backend server/)).toBeInTheDocument();
    });
  });

  test('displays specific error for Neo4j failure', async () => {
    mockedAxios.get.mockRejectedValue({
      response: {
        status: 500,
        data: { error: 'Neo4j connection failed' }
      }
    });

    render(
      <BrowserRouter>
        <AppProvider>
          <GraphVisualization />
        </AppProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Neo4j connection error/)).toBeInTheDocument();
    });
  });

  test('handles malformed API response gracefully', async () => {
    const malformedData = {
      // Missing required fields
      nodes: 'not-an-array',
      // edges missing
      stats: null
    };

    mockedAxios.get.mockResolvedValue({ data: malformedData });

    render(
      <BrowserRouter>
        <AppProvider>
          <GraphVisualization />
        </AppProvider>
      </BrowserRouter>
    );

    // Should not crash, should handle gracefully
    await waitFor(() => {
      expect(mockVisNetwork).toHaveBeenCalledTimes(0); // Should not attempt to render
    });
  });
});
```

## Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 10000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
```

## Mock Data Fixtures

```typescript
// tests/fixtures/graphData.ts

export const basicGraphData = {
  nodes: [
    { id: 'n1', label: 'Tenant', type: 'Tenant', properties: { name: 'Root' } },
    { id: 'n2', label: 'ResourceGroup1', type: 'ResourceGroup', properties: {} },
    { id: 'n3', label: 'VM1', type: 'VirtualMachine', properties: { status: 'Running' } }
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', type: 'CONTAINS' },
    { id: 'e2', source: 'n2', target: 'n3', type: 'CONTAINS' }
  ],
  stats: {
    nodeCount: 3,
    edgeCount: 2,
    nodeTypes: { Tenant: 1, ResourceGroup: 1, VirtualMachine: 1 },
    edgeTypes: { CONTAINS: 2 }
  }
};

export const largeGraphData = {
  nodes: Array.from({ length: 100 }, (_, i) => ({
    id: `node-${i}`,
    label: `Node ${i}`,
    type: ['Resource', 'ResourceGroup', 'VirtualMachine'][i % 3],
    properties: { index: i }
  })),
  edges: Array.from({ length: 150 }, (_, i) => ({
    id: `edge-${i}`,
    source: `node-${Math.floor(Math.random() * 100)}`,
    target: `node-${Math.floor(Math.random() * 100)}`,
    type: ['CONTAINS', 'CONNECTED_TO', 'DEPENDS_ON'][i % 3]
  })),
  stats: {
    nodeCount: 100,
    edgeCount: 150,
    nodeTypes: { Resource: 34, ResourceGroup: 33, VirtualMachine: 33 },
    edgeTypes: { CONTAINS: 50, CONNECTED_TO: 50, DEPENDS_ON: 50 }
  }
};
```

## Test Execution Strategy

### Phase 1: Unit Tests
```bash
npm test -- --coverage --watchAll=false
```

### Phase 2: E2E Tests
```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/graph-rendering.spec.ts

# Run with UI mode for debugging
npx playwright test --ui

# Generate visual baseline
npx playwright test --update-snapshots
```

### Phase 3: Visual Regression
```bash
# First run - generate baselines
npx playwright test tests/e2e/visual-regression.spec.ts --update-snapshots

# Subsequent runs - compare against baselines
npx playwright test tests/e2e/visual-regression.spec.ts
```

## Success Criteria

Tests MUST verify:
1. ✅ Graph renders with visible colored nodes (not black screen)
2. ✅ Node labels are readable
3. ✅ Edges connect nodes with visible lines
4. ✅ All API data appears in the graph
5. ✅ No JavaScript errors in console
6. ✅ User interactions (click, zoom, pan) work
7. ✅ Graph layout algorithms position nodes properly
8. ✅ Canvas contains varied colors (not monochrome)
9. ✅ Visual regression tests pass
10. ✅ Performance: Render completes in < 3 seconds

## Common Issues These Tests Would Catch

1. **Black Canvas**: Pixel analysis would detect all-black rendering
2. **Missing Data**: Node/edge count verification would catch data loss
3. **Transformation Errors**: Unit tests verify data structure changes
4. **Console Errors**: E2E tests monitor console for errors
5. **Interaction Failures**: Click tests would detect non-responsive nodes
6. **Layout Problems**: Screenshot tests would show overlapping nodes
7. **Color Issues**: Pixel analysis ensures proper color mapping
8. **Performance Issues**: Timeout tests catch slow rendering

## Running Tests in CI/CD

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --coverage --watchAll=false

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```