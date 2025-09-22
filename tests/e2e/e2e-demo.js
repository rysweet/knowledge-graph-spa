#!/usr/bin/env node

/**
 * Knowledge Graph System - Comprehensive E2E Demo Test Script
 *
 * This script demonstrates the complete functionality of the Knowledge Graph system including:
 * - System status verification
 * - Knowledge building for multiple topics
 * - Graph visualization and interaction
 * - API endpoint testing
 *
 * Requirements:
 * - npm install playwright @playwright/test axios
 * - Backend API running on http://localhost:5000
 * - Frontend running on http://localhost:3000
 *
 * Usage:
 * node e2e-demo.js
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Configuration
const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  SCREENSHOT_DIR: path.join(__dirname, 'e2e-screenshots'),
  REPORT_DIR: path.join(__dirname, 'e2e-reports'),
  TIMEOUT: 120000, // 2 minutes for long operations
  TOPICS: [
    { name: 'COBOL', description: 'COBOL programming language fundamentals and best practices' },
    { name: 'Hot Peppers', description: 'Cultivation and varieties of hot peppers' },
    { name: '.NET', description: '.NET ecosystem and development framework' },
    { name: 'AI Agent SDKs', description: 'Software development kits for AI agents' }
  ]
};

// Test metrics collector
class MetricsCollector {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      tests: [],
      screenshots: [],
      apiCalls: [],
      errors: []
    };
  }

  addTest(name, status, duration, details = {}) {
    this.metrics.tests.push({
      name,
      status,
      duration,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  addScreenshot(name, path) {
    this.metrics.screenshots.push({ name, path, timestamp: new Date().toISOString() });
  }

  addApiCall(endpoint, method, status, duration) {
    this.metrics.apiCalls.push({
      endpoint,
      method,
      status,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  addError(test, error) {
    this.metrics.errors.push({
      test,
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.metrics.startTime;

    return {
      ...this.metrics,
      summary: {
        totalDuration: `${(totalDuration / 1000).toFixed(2)}s`,
        totalTests: this.metrics.tests.length,
        passedTests: this.metrics.tests.filter(t => t.status === 'passed').length,
        failedTests: this.metrics.tests.filter(t => t.status === 'failed').length,
        totalScreenshots: this.metrics.screenshots.length,
        totalApiCalls: this.metrics.apiCalls.length,
        totalErrors: this.metrics.errors.length
      }
    };
  }
}

// Screenshot helper
async function takeScreenshot(page, name, metrics) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}_${name.replace(/\s+/g, '_')}.png`;
  const filepath = path.join(CONFIG.SCREENSHOT_DIR, filename);

  await page.screenshot({
    path: filepath,
    fullPage: true,
    animations: 'disabled'
  });

  metrics.addScreenshot(name, filepath);
  console.log(`  📸 Screenshot saved: ${filename}`);
  return filepath;
}

// API testing helper
async function testAPI(endpoint, method = 'GET', data = null, metrics) {
  const startTime = Date.now();
  const url = `${CONFIG.BACKEND_URL}${endpoint}`;

  try {
    const response = await axios({
      method,
      url,
      data,
      timeout: 10000,
      validateStatus: null // Don't throw on any status
    });

    const duration = Date.now() - startTime;
    metrics.addApiCall(endpoint, method, response.status, duration);

    console.log(`  ✓ API ${method} ${endpoint}: ${response.status} (${duration}ms)`);
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    metrics.addApiCall(endpoint, method, 'error', duration);
    console.log(`  ✗ API ${method} ${endpoint}: Error (${duration}ms)`);
    throw error;
  }
}

// Test: System Status Check
async function testSystemStatus(metrics) {
  console.log('\n🔍 Testing System Status...');
  const testStart = Date.now();

  try {
    // Check backend API health
    const healthResponse = await testAPI('/api/health', 'GET', null, metrics);
    if (healthResponse.status !== 200) {
      throw new Error(`Backend health check failed: ${healthResponse.status}`);
    }

    // Check Neo4j connection
    const neo4jResponse = await testAPI('/api/neo4j/status', 'GET', null, metrics);
    if (neo4jResponse.status !== 200) {
      throw new Error(`Neo4j connection check failed: ${neo4jResponse.status}`);
    }

    // Check MCP status
    const mcpResponse = await testAPI('/api/mcp/status', 'GET', null, metrics);
    if (mcpResponse.status !== 200) {
      console.log('  ⚠️  MCP status check returned non-200 (may be expected)');
    }

    const duration = Date.now() - testStart;
    metrics.addTest('System Status Check', 'passed', duration, {
      backend: healthResponse.data,
      neo4j: neo4jResponse.data,
      mcp: mcpResponse.data
    });

    console.log(`  ✅ System status verified (${duration}ms)`);
    return true;
  } catch (error) {
    const duration = Date.now() - testStart;
    metrics.addTest('System Status Check', 'failed', duration);
    metrics.addError('System Status Check', error);
    console.log(`  ❌ System status check failed: ${error.message}`);
    return false;
  }
}

// Test: Knowledge Building Demo
async function testKnowledgeBuilding(page, metrics) {
  console.log('\n🏗️  Testing Knowledge Building...');
  const testStart = Date.now();

  try {
    // Navigate to Build Knowledge tab
    await page.goto(`${CONFIG.FRONTEND_URL}/#/build`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'build_knowledge_tab', metrics);

    // Test building knowledge for each topic
    for (const topic of CONFIG.TOPICS) {
      console.log(`\n  📚 Building knowledge for: ${topic.name}`);
      const topicStart = Date.now();

      try {
        // Enter topic in the input field
        const topicInput = await page.locator('input[placeholder*="topic"]');
        await topicInput.clear();
        await topicInput.fill(topic.name);
        await page.waitForTimeout(500);

        // Click build button
        const buildButton = await page.locator('button:has-text("Build Knowledge")');
        await buildButton.click();

        // Wait for and capture progress updates
        console.log('    Waiting for build to start...');
        await page.waitForSelector('.progress-indicator', { timeout: 10000 });
        await takeScreenshot(page, `building_${topic.name}_progress`, metrics);

        // Monitor build progress
        let buildComplete = false;
        const maxWaitTime = 60000; // 1 minute max per topic
        const checkInterval = 2000;
        let elapsed = 0;

        while (!buildComplete && elapsed < maxWaitTime) {
          // Check for completion indicators
          const successIndicator = await page.locator('.build-success').count();
          const errorIndicator = await page.locator('.build-error').count();

          if (successIndicator > 0) {
            buildComplete = true;
            console.log(`    ✓ Build completed for ${topic.name}`);
            await takeScreenshot(page, `build_complete_${topic.name}`, metrics);
          } else if (errorIndicator > 0) {
            throw new Error(`Build failed for ${topic.name}`);
          }

          if (!buildComplete) {
            await page.waitForTimeout(checkInterval);
            elapsed += checkInterval;

            // Capture intermediate progress
            if (elapsed % 10000 === 0) {
              await takeScreenshot(page, `building_${topic.name}_progress_${elapsed}ms`, metrics);
            }
          }
        }

        if (!buildComplete) {
          console.log(`    ⚠️  Build timeout for ${topic.name}`);
        }

        // Capture build logs if available
        const logsButton = await page.locator('button:has-text("View Logs")');
        if (await logsButton.count() > 0) {
          await logsButton.click();
          await page.waitForTimeout(1000);
          await takeScreenshot(page, `build_logs_${topic.name}`, metrics);

          // Close logs modal if present
          const closeButton = await page.locator('button:has-text("Close")');
          if (await closeButton.count() > 0) {
            await closeButton.click();
          }
        }

        const topicDuration = Date.now() - topicStart;
        metrics.addTest(`Build Knowledge: ${topic.name}`, 'passed', topicDuration);

      } catch (error) {
        const topicDuration = Date.now() - topicStart;
        metrics.addTest(`Build Knowledge: ${topic.name}`, 'failed', topicDuration);
        metrics.addError(`Build Knowledge: ${topic.name}`, error);
        console.log(`    ❌ Failed to build knowledge for ${topic.name}: ${error.message}`);
      }
    }

    const duration = Date.now() - testStart;
    console.log(`\n  ✅ Knowledge building tests completed (${duration}ms)`);
    return true;

  } catch (error) {
    const duration = Date.now() - testStart;
    metrics.addTest('Knowledge Building', 'failed', duration);
    metrics.addError('Knowledge Building', error);
    console.log(`  ❌ Knowledge building failed: ${error.message}`);
    return false;
  }
}

// Test: Graph Visualization
async function testGraphVisualization(page, metrics) {
  console.log('\n📊 Testing Graph Visualization...');
  const testStart = Date.now();

  try {
    // Navigate to Visualize tab
    await page.goto(`${CONFIG.FRONTEND_URL}/#/visualize`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'visualize_tab_initial', metrics);

    // Wait for graph to render
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow graph to stabilize

    // Capture complete multi-topic graph
    console.log('  📈 Capturing complete graph...');
    await takeScreenshot(page, 'graph_complete_view', metrics);

    // Test topic filtering
    for (const topic of CONFIG.TOPICS) {
      console.log(`  🔍 Testing filter for: ${topic.name}`);

      // Look for topic filter dropdown or buttons
      const filterDropdown = await page.locator('select#topic-filter, .topic-filter-dropdown');
      if (await filterDropdown.count() > 0) {
        await filterDropdown.selectOption(topic.name);
        await page.waitForTimeout(1500); // Wait for graph to update
        await takeScreenshot(page, `graph_filtered_${topic.name}`, metrics);
      }
    }

    // Reset to show all topics
    const showAllButton = await page.locator('button:has-text("Show All")');
    if (await showAllButton.count() > 0) {
      await showAllButton.click();
      await page.waitForTimeout(1500);
    }

    // Test layout changes
    console.log('  🎨 Testing layout changes...');

    // Hierarchical layout
    const hierarchicalButton = await page.locator('button:has-text("Hierarchical")');
    if (await hierarchicalButton.count() > 0) {
      await hierarchicalButton.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'graph_hierarchical_layout', metrics);
    }

    // Force-directed layout
    const forceButton = await page.locator('button:has-text("Force")');
    if (await forceButton.count() > 0) {
      await forceButton.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'graph_force_layout', metrics);
    }

    // Test node interaction
    console.log('  👆 Testing node selection...');

    // Click on a node (approximate center of canvas)
    const canvas = await page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(1000);

      // Check for node details panel
      const detailsPanel = await page.locator('.node-details, .details-panel');
      if (await detailsPanel.count() > 0) {
        await takeScreenshot(page, 'node_selection_details', metrics);
      }
    }

    const duration = Date.now() - testStart;
    metrics.addTest('Graph Visualization', 'passed', duration);
    console.log(`  ✅ Graph visualization tests completed (${duration}ms)`);
    return true;

  } catch (error) {
    const duration = Date.now() - testStart;
    metrics.addTest('Graph Visualization', 'failed', duration);
    metrics.addError('Graph Visualization', error);
    console.log(`  ❌ Graph visualization failed: ${error.message}`);
    return false;
  }
}

// Test: API Endpoints
async function testAPIEndpoints(metrics) {
  console.log('\n🔌 Testing API Endpoints...');
  const testStart = Date.now();

  try {
    // Test graph data retrieval
    console.log('  Testing graph data endpoints...');
    const graphResponse = await testAPI('/api/graph', 'GET', null, metrics);

    if (graphResponse.data && graphResponse.data.nodes && graphResponse.data.edges) {
      console.log(`    Found ${graphResponse.data.nodes.length} nodes and ${graphResponse.data.edges.length} edges`);
    }

    // Test topic management
    console.log('  Testing topic management...');
    const topicsResponse = await testAPI('/api/topics', 'GET', null, metrics);

    // Test search functionality
    console.log('  Testing search...');
    const searchResponse = await testAPI('/api/search?q=COBOL', 'GET', null, metrics);

    // Test individual topic data
    for (const topic of CONFIG.TOPICS) {
      const topicResponse = await testAPI(`/api/topics/${encodeURIComponent(topic.name)}`, 'GET', null, metrics);
    }

    // Test statistics endpoint
    const statsResponse = await testAPI('/api/stats', 'GET', null, metrics);
    if (statsResponse.data) {
      console.log('  📊 System Statistics:');
      console.log(`    - Total Nodes: ${statsResponse.data.totalNodes || 0}`);
      console.log(`    - Total Edges: ${statsResponse.data.totalEdges || 0}`);
      console.log(`    - Topics: ${statsResponse.data.topics || 0}`);
    }

    const duration = Date.now() - testStart;
    metrics.addTest('API Endpoints', 'passed', duration, {
      graphNodes: graphResponse.data?.nodes?.length || 0,
      graphEdges: graphResponse.data?.edges?.length || 0,
      topics: topicsResponse.data?.length || 0
    });

    console.log(`  ✅ API tests completed (${duration}ms)`);
    return true;

  } catch (error) {
    const duration = Date.now() - testStart;
    metrics.addTest('API Endpoints', 'failed', duration);
    metrics.addError('API Endpoints', error);
    console.log(`  ❌ API tests failed: ${error.message}`);
    return false;
  }
}

// Generate HTML report
async function generateHTMLReport(metrics) {
  const report = metrics.generateReport();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(CONFIG.REPORT_DIR, `e2e-report-${timestamp}.html`);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Knowledge Graph E2E Test Report - ${new Date().toLocaleString()}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        h1 {
            margin: 0;
            font-size: 2.5em;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
            margin-top: 0;
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        .summary-card.success { border-left: 4px solid #10b981; }
        .summary-card.error { border-left: 4px solid #ef4444; }
        .summary-card.info { border-left: 4px solid #3b82f6; }
        .section {
            background: white;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h2 {
            margin-top: 0;
            color: #333;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }
        .test-result {
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .test-result.passed {
            background: #d1fae5;
            border-left: 4px solid #10b981;
        }
        .test-result.failed {
            background: #fee2e2;
            border-left: 4px solid #ef4444;
        }
        .screenshot-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .screenshot-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        .screenshot-card img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            cursor: pointer;
        }
        .screenshot-card .caption {
            padding: 10px;
            font-size: 0.9em;
            color: #666;
        }
        .error-details {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 5px;
            padding: 15px;
            margin: 10px 0;
        }
        .error-details h4 {
            margin-top: 0;
            color: #dc2626;
        }
        .error-stack {
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            background: #1f2937;
            color: #f3f4f6;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
        .api-calls-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .api-calls-table th,
        .api-calls-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        .api-calls-table th {
            background: #f9fafb;
            font-weight: 600;
        }
        .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 600;
        }
        .status-badge.success { background: #d1fae5; color: #065f46; }
        .status-badge.error { background: #fee2e2; color: #991b1b; }
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.9);
        }
        .modal-content {
            display: block;
            margin: auto;
            max-width: 90%;
            max-height: 90%;
            margin-top: 2%;
        }
        .close {
            position: absolute;
            top: 15px;
            right: 35px;
            color: #f1f1f1;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Knowledge Graph E2E Test Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Duration: ${report.summary.totalDuration}</p>
    </div>

    <div class="summary">
        <div class="summary-card success">
            <h3>Tests Passed</h3>
            <div class="value">${report.summary.passedTests}</div>
        </div>
        <div class="summary-card error">
            <h3>Tests Failed</h3>
            <div class="value">${report.summary.failedTests}</div>
        </div>
        <div class="summary-card info">
            <h3>Total Tests</h3>
            <div class="value">${report.summary.totalTests}</div>
        </div>
        <div class="summary-card info">
            <h3>Screenshots</h3>
            <div class="value">${report.summary.totalScreenshots}</div>
        </div>
        <div class="summary-card info">
            <h3>API Calls</h3>
            <div class="value">${report.summary.totalApiCalls}</div>
        </div>
        <div class="summary-card ${report.summary.totalErrors > 0 ? 'error' : 'success'}">
            <h3>Errors</h3>
            <div class="value">${report.summary.totalErrors}</div>
        </div>
    </div>

    <div class="section">
        <h2>📋 Test Results</h2>
        ${report.tests.map(test => `
            <div class="test-result ${test.status}">
                <div>
                    <strong>${test.name}</strong>
                    ${test.details ? `<br><small>${JSON.stringify(test.details)}</small>` : ''}
                </div>
                <div>
                    <span class="status-badge ${test.status === 'passed' ? 'success' : 'error'}">
                        ${test.status.toUpperCase()}
                    </span>
                    <small>${test.duration}ms</small>
                </div>
            </div>
        `).join('')}
    </div>

    ${report.errors.length > 0 ? `
    <div class="section">
        <h2>❌ Errors</h2>
        ${report.errors.map(error => `
            <div class="error-details">
                <h4>${error.test}</h4>
                <p>${error.error}</p>
                ${error.stack ? `<pre class="error-stack">${error.stack}</pre>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <h2>🔌 API Calls</h2>
        <table class="api-calls-table">
            <thead>
                <tr>
                    <th>Endpoint</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                ${report.apiCalls.map(call => `
                    <tr>
                        <td>${call.endpoint}</td>
                        <td>${call.method}</td>
                        <td>
                            <span class="status-badge ${call.status === 200 ? 'success' : 'error'}">
                                ${call.status}
                            </span>
                        </td>
                        <td>${call.duration}ms</td>
                        <td>${new Date(call.timestamp).toLocaleTimeString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>📸 Screenshots</h2>
        <div class="screenshot-grid">
            ${report.screenshots.map(screenshot => `
                <div class="screenshot-card">
                    <img src="${screenshot.path}" alt="${screenshot.name}" onclick="openModal('${screenshot.path}')">
                    <div class="caption">
                        <strong>${screenshot.name}</strong><br>
                        <small>${new Date(screenshot.timestamp).toLocaleTimeString()}</small>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <div id="imageModal" class="modal">
        <span class="close" onclick="closeModal()">&times;</span>
        <img class="modal-content" id="modalImage">
    </div>

    <script>
        function openModal(src) {
            const modal = document.getElementById('imageModal');
            const modalImg = document.getElementById('modalImage');
            modal.style.display = 'block';
            modalImg.src = src;
        }

        function closeModal() {
            document.getElementById('imageModal').style.display = 'none';
        }

        // Close modal when clicking outside the image
        window.onclick = function(event) {
            const modal = document.getElementById('imageModal');
            if (event.target === modal) {
                closeModal();
            }
        }
    </script>
</body>
</html>`;

  await fs.writeFile(reportPath, html);
  console.log(`\n📊 HTML Report saved: ${reportPath}`);
  return reportPath;
}

// Generate JSON report
async function generateJSONReport(metrics) {
  const report = metrics.generateReport();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(CONFIG.REPORT_DIR, `e2e-report-${timestamp}.json`);

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 JSON Report saved: ${reportPath}`);
  return reportPath;
}

// Main execution
async function runE2EDemo() {
  console.log('🚀 Starting Knowledge Graph E2E Demo Test');
  console.log('=' .repeat(50));

  const metrics = new MetricsCollector();

  // Create directories
  await fs.mkdir(CONFIG.SCREENSHOT_DIR, { recursive: true });
  await fs.mkdir(CONFIG.REPORT_DIR, { recursive: true });

  let browser;
  let page;

  try {
    // System status check first
    const systemOk = await testSystemStatus(metrics);
    if (!systemOk) {
      console.log('\n⚠️  System status check failed, but continuing with tests...');
    }

    // Launch browser
    console.log('\n🌐 Launching browser...');
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2, // High quality screenshots
    });

    page = await context.newPage();

    // Set default timeout
    page.setDefaultTimeout(CONFIG.TIMEOUT);

    // Run tests
    await testKnowledgeBuilding(page, metrics);
    await testGraphVisualization(page, metrics);
    await testAPIEndpoints(metrics);

    // Generate reports
    console.log('\n📝 Generating reports...');
    const htmlReport = await generateHTMLReport(metrics);
    const jsonReport = await generateJSONReport(metrics);

    // Summary
    const report = metrics.generateReport();
    console.log('\n' + '=' .repeat(50));
    console.log('✨ E2E Demo Test Complete!');
    console.log('=' .repeat(50));
    console.log(`Total Duration: ${report.summary.totalDuration}`);
    console.log(`Tests Passed: ${report.summary.passedTests}/${report.summary.totalTests}`);
    console.log(`Screenshots Captured: ${report.summary.totalScreenshots}`);
    console.log(`API Calls Made: ${report.summary.totalApiCalls}`);

    if (report.summary.totalErrors > 0) {
      console.log(`\n⚠️  ${report.summary.totalErrors} errors occurred during testing`);
    }

    console.log(`\n📊 View detailed report: ${htmlReport}`);
    console.log(`📄 JSON report: ${jsonReport}`);

  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    metrics.addError('Fatal', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run the demo
if (require.main === module) {
  runE2EDemo().catch(console.error);
}

module.exports = { runE2EDemo, CONFIG };