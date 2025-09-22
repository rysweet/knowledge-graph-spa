import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { GraphVisualization } from './GraphVisualization';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '../../context/AppContext';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Enhanced vis-network mocks with validation
let mockNetworkInstance: any;
let capturedGraphData: any = null;
let capturedGraphOptions: any = null;

jest.mock('vis-network/standalone', () => {
  const mockNetwork = jest.fn().mockImplementation((container, data, options) => {
    // Validate container
    if (!container || !container.tagName) {
      throw new Error('Invalid container provided to vis-network');
    }

    // Validate data structure
    if (!data || !data.nodes || !data.edges) {
      throw new Error('Invalid data structure provided to vis-network');
    }

    // Capture for testing
    capturedGraphData = data;
    capturedGraphOptions = options;

    mockNetworkInstance = {
      on: jest.fn((event, callback) => {
        if (event === 'stabilizationIterationsDone') {
          setTimeout(callback, 100);
        }
        if (event === 'selectNode') {
          // Store callback for testing
          mockNetworkInstance._selectNodeCallback = callback;
        }
      }),
      once: jest.fn((event, callback) => {
        if (event === 'stabilizationIterationsDone') {
          setTimeout(callback, 100);
        }
      }),
      setOptions: jest.fn((opts) => {
        Object.assign(capturedGraphOptions, opts);
      }),
      destroy: jest.fn(),
      selectNodes: jest.fn(),
      focus: jest.fn(),
      fit: jest.fn(),
      getScale: jest.fn(() => 1),
      moveTo: jest.fn(),
      getViewPosition: jest.fn(() => ({ x: 0, y: 0 })),
      unselectAll: jest.fn(),
      // Simulate node selection
      triggerSelect: (nodeId: string) => {
        if (mockNetworkInstance._selectNodeCallback) {
          mockNetworkInstance._selectNodeCallback({ nodes: [nodeId] });
        }
      }
    };

    return mockNetworkInstance;
  });

  const mockDataSet = jest.fn().mockImplementation((data) => {
    if (!Array.isArray(data)) {
      throw new Error('DataSet expects an array');
    }
    // Return array-like object with vis-network DataSet methods
    return Object.assign(data, {
      get: (id?: string) => id ? data.find((item: any) => item.id === id) : data,
      getIds: () => data.map((item: any) => item.id),
      length: data.length
    });
  });

  return {
    Network: mockNetwork,
    DataSet: mockDataSet
  };
});

// Test data
const testGraphData = {
  nodes: [
    { id: 'n1', label: 'Tenant1', type: 'Tenant', properties: { name: 'Main' } },
    { id: 'n2', label: 'Sub1', type: 'Subscription', properties: { subscriptionId: 'sub-123' } },
    { id: 'n3', label: 'RG1', type: 'ResourceGroup', properties: { location: 'eastus' } },
    { id: 'n4', label: 'VM1', type: 'VirtualMachine', properties: { status: 'Running' } }
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', type: 'CONTAINS', properties: {} },
    { id: 'e2', source: 'n2', target: 'n3', type: 'CONTAINS', properties: {} },
    { id: 'e3', source: 'n3', target: 'n4', type: 'CONTAINS', properties: {} }
  ],
  stats: {
    nodeCount: 4,
    edgeCount: 3,
    nodeTypes: {
      Tenant: 1,
      Subscription: 1,
      ResourceGroup: 1,
      VirtualMachine: 1
    },
    edgeTypes: {
      CONTAINS: 3
    }
  }
};

describe('GraphVisualization - Enhanced Rendering Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedGraphData = null;
    capturedGraphOptions = null;
    mockNetworkInstance = null;
  });

  describe('Data Transformation', () => {
    test('correctly transforms API nodes for vis-network', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: testGraphData });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(capturedGraphData).not.toBeNull();
      });

      const nodes = Array.from(capturedGraphData.nodes);

      // Verify node count (Subscription should be filtered by default)
      expect(nodes).toHaveLength(3);

      // Verify node structure
      const tenantNode = nodes.find((n: any) => n.id === 'n1');
      expect(tenantNode).toMatchObject({
        id: 'n1',
        label: 'Tenant1',
        color: '#FF6B6B', // Tenant color from NODE_COLORS
        shape: 'dot',
        size: 20,
        font: {
          size: 12,
          color: '#2c3e50'
        },
        borderWidth: 2,
        borderWidthSelected: 4
      });

      // Verify title (tooltip) contains HTML
      expect(tenantNode.title).toContain('vis-tooltip-title');
      expect(tenantNode.title).toContain('Tenant1');
      expect(tenantNode.title).toContain('Type:</strong> Tenant');
    });

    test('correctly transforms API edges for vis-network', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: testGraphData });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(capturedGraphData).not.toBeNull();
      });

      const edges = Array.from(capturedGraphData.edges);

      // Only edges where both nodes are visible should be included
      // Since Subscription (n2) is filtered, edges e1 and e2 should be excluded
      expect(edges).toHaveLength(1);

      const edge = edges[0] as any;
      expect(edge).toMatchObject({
        id: 'e3',
        from: 'n3', // source -> from
        to: 'n4',   // target -> to
        label: 'CONTAINS',
        color: '#2E86DE', // CONTAINS color from EDGE_STYLES
        width: 3,
        dashes: false,
        arrows: 'to'
      });
    });

    test('applies correct colors based on node types', async () => {
      const colorTestData = {
        ...testGraphData,
        nodes: [
          { id: 'n1', label: 'Storage', type: 'StorageAccount', properties: {} },
          { id: 'n2', label: 'Network', type: 'VirtualNetwork', properties: {} },
          { id: 'n3', label: 'Unknown', type: 'UnknownType', properties: {} }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce({ data: colorTestData });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(capturedGraphData).not.toBeNull();
      });

      const nodes = Array.from(capturedGraphData.nodes);

      const storageNode = nodes.find((n: any) => n.id === 'n1');
      expect(storageNode.color).toBe('#74B9FF'); // StorageAccount color

      const networkNode = nodes.find((n: any) => n.id === 'n2');
      expect(networkNode.color).toBe('#6C5CE7'); // VirtualNetwork color

      const unknownNode = nodes.find((n: any) => n.id === 'n3');
      expect(unknownNode.color).toBe('#95A5A6'); // Default color
    });
  });

  describe('Filtering', () => {
    test('filters out Subscription nodes by default', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: testGraphData });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(capturedGraphData).not.toBeNull();
      });

      const nodes = Array.from(capturedGraphData.nodes);

      // Should not include Subscription node
      expect(nodes.find((n: any) => n.type === 'Subscription')).toBeUndefined();
      expect(nodes).toHaveLength(3); // Out of 4 original nodes
    });

    test('respects advanced name filter', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: testGraphData });

      const { container } = render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('4 nodes')).toBeInTheDocument();
      });

      // Open advanced filters
      const filterButton = screen.getByText('Advanced Filters');
      fireEvent.click(filterButton);

      // Apply name filter
      const nameFilter = screen.getByLabelText('Filter by Name');
      fireEvent.change(nameFilter, { target: { value: 'VM' } });

      await waitFor(() => {
        // Graph should re-render with filtered data
        const nodes = Array.from(capturedGraphData.nodes);
        expect(nodes).toHaveLength(1);
        expect(nodes[0]).toHaveProperty('label', 'VM1');
      });
    });

    test('handles edge filtering when nodes are filtered', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: testGraphData });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(capturedGraphData).not.toBeNull();
      });

      const edges = Array.from(capturedGraphData.edges);

      // Edges connecting to filtered nodes should also be filtered
      edges.forEach((edge: any) => {
        const nodes = Array.from(capturedGraphData.nodes);
        const sourceExists = nodes.some((n: any) => n.id === edge.from);
        const targetExists = nodes.some((n: any) => n.id === edge.to);

        expect(sourceExists && targetExists).toBe(true);
      });
    });
  });

  describe('Graph Options', () => {
    test('applies correct physics configuration', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: testGraphData });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(capturedGraphOptions).not.toBeNull();
      });

      expect(capturedGraphOptions.physics).toMatchObject({
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 100,
          springConstant: 0.08,
          damping: 0.4,
          avoidOverlap: 0.5
        }
      });
    });

    test('disables physics after stabilization', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: testGraphData });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockNetworkInstance).not.toBeNull();
      });

      // Wait for stabilization callback
      await waitFor(() => {
        expect(mockNetworkInstance.setOptions).toHaveBeenCalledWith({
          physics: { enabled: false }
        });
      }, { timeout: 3000 });
    });
  });

  describe('Error Handling', () => {
    test('handles malformed nodes array gracefully', async () => {
      const malformedData = {
        nodes: 'not-an-array', // Invalid
        edges: [],
        stats: { nodeCount: 0, edgeCount: 0 }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: malformedData });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('0 nodes')).toBeInTheDocument();
      });

      // Should not attempt to create network with invalid data
      expect(capturedGraphData).toBeNull();
    });

    test('handles missing stats gracefully', async () => {
      const dataWithoutStats = {
        nodes: testGraphData.nodes,
        edges: testGraphData.edges
        // stats missing
      };

      mockedAxios.get.mockResolvedValueOnce({ data: dataWithoutStats });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      // Should not crash, component should handle gracefully
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });

      // Network should not be created with invalid data
      expect(capturedGraphData).toBeNull();
    });

    test('handles nodes with missing required fields', async () => {
      const invalidNodesData = {
        nodes: [
          { id: 'n1' }, // Missing label and type
          { label: 'Node2', type: 'Resource' }, // Missing id
          { id: 'n3', label: 'Node3' } // Missing type
        ],
        edges: [],
        stats: { nodeCount: 3, edgeCount: 0 }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: invalidNodesData });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(capturedGraphData).not.toBeNull();
      });

      const nodes = Array.from(capturedGraphData.nodes);

      // Should handle missing fields with defaults
      nodes.forEach((node: any) => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('label');
        expect(node).toHaveProperty('color');
      });
    });
  });

  describe('User Interactions', () => {
    test('handles node selection correctly', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: testGraphData });

      // Mock node details API
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/api/graph/node/')) {
          return Promise.resolve({
            data: {
              id: 'n1',
              labels: ['Tenant'],
              properties: { name: 'Main', created: '2024-01-01' },
              connections: []
            }
          });
        }
        return Promise.resolve({ data: testGraphData });
      });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockNetworkInstance).not.toBeNull();
      });

      // Simulate node selection
      mockNetworkInstance.triggerSelect('n1');

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3001/api/graph/node/n1');
      });

      // Details drawer should open
      await waitFor(() => {
        expect(screen.getByText('Node Details')).toBeInTheDocument();
      });
    });

    test('search functionality triggers correct API call', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: testGraphData });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search nodes...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      fireEvent.keyPress(searchInput, { key: 'Enter', code: 13 });

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          'http://localhost:3001/api/graph/search',
          expect.objectContaining({
            params: { query: 'test search' }
          })
        );
      });
    });

    test('zoom controls update network scale', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: testGraphData });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockNetworkInstance).not.toBeNull();
      });

      // Find zoom in button (it has a tooltip)
      const buttons = screen.getAllByRole('button');
      const zoomInButton = buttons.find(btn =>
        btn.getAttribute('aria-label') === 'Zoom In' ||
        btn.textContent?.includes('ZoomIn')
      );

      if (zoomInButton) {
        fireEvent.click(zoomInButton);

        expect(mockNetworkInstance.moveTo).toHaveBeenCalledWith(
          expect.objectContaining({
            scale: 1.2, // Current scale (1) * 1.2
            animation: expect.any(Object)
          })
        );
      }
    });
  });

  describe('Performance', () => {
    test('handles large dataset without errors', async () => {
      const largeData = {
        nodes: Array.from({ length: 1000 }, (_, i) => ({
          id: `node-${i}`,
          label: `Node ${i}`,
          type: 'Resource',
          properties: {}
        })),
        edges: Array.from({ length: 2000 }, (_, i) => ({
          id: `edge-${i}`,
          source: `node-${i % 1000}`,
          target: `node-${(i + 1) % 1000}`,
          type: 'CONNECTED_TO',
          properties: {}
        })),
        stats: {
          nodeCount: 1000,
          edgeCount: 2000,
          nodeTypes: { Resource: 1000 },
          edgeTypes: { CONNECTED_TO: 2000 }
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: largeData });

      render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('1000 nodes')).toBeInTheDocument();
        expect(screen.getByText('2000 edges')).toBeInTheDocument();
      });

      expect(capturedGraphData).not.toBeNull();
      expect(Array.from(capturedGraphData.nodes)).toHaveLength(1000);
    });

    test('cleans up network on unmount', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: testGraphData });

      const { unmount } = render(
        <BrowserRouter>
          <AppProvider>
            <GraphVisualization />
          </AppProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockNetworkInstance).not.toBeNull();
      });

      unmount();

      expect(mockNetworkInstance.destroy).toHaveBeenCalled();
    });
  });
});