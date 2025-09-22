import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { GraphVisualization } from './GraphVisualization';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '../../context/AppContext';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock vis-network
jest.mock('vis-network/standalone', () => ({
  Network: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    once: jest.fn(),
    setOptions: jest.fn(),
    destroy: jest.fn(),
    selectNodes: jest.fn(),
    focus: jest.fn(),
    getScale: jest.fn(() => 1),
    moveTo: jest.fn(),
    fit: jest.fn(),
    getViewPosition: jest.fn(() => ({ x: 0, y: 0 })),
    unselectAll: jest.fn(),
  })),
  DataSet: jest.fn().mockImplementation((data) => data),
}));

describe('GraphVisualization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle backend response with edges (not relationships)', async () => {
    // Mock the backend response with 'edges' field (this is what the backend actually returns)
    const mockGraphData = {
      nodes: [
        {
          id: 'node1',
          label: 'Test Node 1',
          type: 'Resource',
          properties: { name: 'resource1' }
        },
        {
          id: 'node2',
          label: 'Test Node 2',
          type: 'ResourceGroup',
          properties: { name: 'rg1' }
        }
      ],
      edges: [  // Note: backend returns 'edges', not 'relationships'
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          type: 'CONTAINS',
          properties: {}
        }
      ],
      stats: {
        nodeCount: 2,
        edgeCount: 1,
        nodeTypes: {
          Resource: 1,
          ResourceGroup: 1
        },
        edgeTypes: {
          CONTAINS: 1
        }
      }
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockGraphData });

    const { container } = render(
      <BrowserRouter>
        <AppProvider>
          <GraphVisualization />
        </AppProvider>
      </BrowserRouter>
    );

    // Wait for the component to load and process the data
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3001/api/graph');
    });

    // Check that the component doesn't crash and renders the vis-network container
    await waitFor(() => {
      // The component should create a container for the vis-network graph
      const graphContainer = container.querySelector('[ref]') ||
                            container.querySelector('div[style*="width: 100%"][style*="height: 100%"]');
      expect(graphContainer).toBeInTheDocument();
    });

    // Verify that the component handled the data correctly without crashing
    // The stats should be displayed
    await waitFor(() => {
      expect(screen.getByText(/2 nodes/)).toBeInTheDocument();
      expect(screen.getByText(/1 edges/)).toBeInTheDocument();
    });
  });

  it('should handle empty graph data', async () => {
    const emptyGraphData = {
      nodes: [],
      edges: [],
      stats: {
        nodeCount: 0,
        edgeCount: 0,
        nodeTypes: {},
        edgeTypes: {}
      }
    };

    mockedAxios.get.mockResolvedValueOnce({ data: emptyGraphData });

    render(
      <BrowserRouter>
        <AppProvider>
          <GraphVisualization />
        </AppProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3001/api/graph');
    });

    // Should display 0 nodes and 0 edges
    await waitFor(() => {
      expect(screen.getByText(/0 nodes/)).toBeInTheDocument();
      expect(screen.getByText(/0 edges/)).toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce({
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
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3001/api/graph');
    });

    // Should display an error message
    await waitFor(() => {
      expect(screen.getByText(/Cannot connect to backend server/)).toBeInTheDocument();
    });
  });

  it('should handle Neo4j connection errors', async () => {
    mockedAxios.get.mockRejectedValueOnce({
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
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3001/api/graph');
    });

    // Should display Neo4j error message
    await waitFor(() => {
      expect(screen.getByText(/Neo4j connection error/)).toBeInTheDocument();
    });
  });
});