import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import GraphVisualization from './GraphVisualization';

// Mock cytoscape and its plugins
const mockCyInstance = {
  elements: jest.fn(() => ({
    remove: jest.fn(),
    removeClass: jest.fn(),
    length: 10
  })),
  add: jest.fn(),
  on: jest.fn(),
  layout: jest.fn(() => ({
    run: jest.fn()
  })),
  getElementById: jest.fn(() => ({
    length: 0,
    addClass: jest.fn()
  })),
  center: jest.fn(),
  fit: jest.fn(),
  nodes: jest.fn(() => ({
    length: 10
  })),
  edges: jest.fn(() => ({
    length: 5
  })),
  container: jest.fn(() => document.createElement('div'))
};

jest.mock('cytoscape', () => {
  const mockCytoscape = jest.fn(() => mockCyInstance);
  mockCytoscape.use = jest.fn();
  return mockCytoscape;
});

jest.mock('cytoscape-dagre', () => jest.fn());
jest.mock('cytoscape-cose-bilkent', () => jest.fn());

describe('GraphVisualization Comprehensive Tests', () => {
  const mockData = {
    nodes: [
      { id: '1', label: 'MOVE', properties: { type: 'STATEMENT' } },
      { id: '2', label: 'DISPLAY', properties: { type: 'STATEMENT' } },
      { id: '3', label: 'INTEGER', properties: { type: 'DATA_TYPE' } },
      { id: '4', label: 'PROCEDURE', properties: { type: 'DIVISION' } },
      { id: '5', label: 'WORKING-STORAGE', properties: { type: 'SECTION' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', type: 'PRECEDES', properties: {} },
      { id: 'e2', source: '4', target: '1', type: 'CONTAINS', properties: {} },
      { id: 'e3', source: '4', target: '2', type: 'CONTAINS', properties: {} },
      { id: 'e4', source: '5', target: '3', type: 'CONTAINS', properties: {} }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<GraphVisualization data={mockData} />);
      expect(container).toBeInTheDocument();
    });

    it('should create a cytoscape container element', () => {
      const { container } = render(<GraphVisualization data={mockData} />);
      const cyContainer = container.querySelector('[style*="width: 100%"][style*="height: 100%"]');
      expect(cyContainer).toBeInTheDocument();
    });

    it('should render graph controls (layout selector and buttons)', () => {
      render(<GraphVisualization data={mockData} />);

      // Check for layout selector
      expect(screen.getByLabelText(/Layout/i)).toBeInTheDocument();

      // Check for control buttons
      expect(screen.getByText(/Fit/i)).toBeInTheDocument();
      expect(screen.getByText(/Center/i)).toBeInTheDocument();
    });
  });

  describe('Data Processing', () => {
    it('should handle both edges and relationships field names', () => {
      const cytoscape = require('cytoscape');

      // Test with 'edges' field
      render(<GraphVisualization data={mockData} />);
      expect(cytoscape).toHaveBeenCalled();

      // Test with 'relationships' field (legacy)
      const legacyData = {
        ...mockData,
        relationships: mockData.edges,
        edges: undefined
      };
      render(<GraphVisualization data={legacyData} />);
      expect(cytoscape).toHaveBeenCalled();
    });

    it('should process all nodes with correct properties', async () => {
      const cytoscape = require('cytoscape');
      render(<GraphVisualization data={mockData} />);

      await waitFor(() => {
        const callArgs = cytoscape.mock.calls[0][0];
        expect(callArgs.elements).toBeDefined();

        // Check that all nodes are included
        const nodes = callArgs.elements.filter(el => !el.data.source);
        expect(nodes).toHaveLength(5);

        // Verify node properties
        const moveNode = nodes.find(n => n.data.id === '1');
        expect(moveNode).toMatchObject({
          data: {
            id: '1',
            label: 'MOVE',
            type: 'STATEMENT'
          },
          style: expect.objectContaining({
            'background-color': '#0078d4' // STATEMENT color
          })
        });
      });
    });

    it('should process all edges with correct properties', async () => {
      const cytoscape = require('cytoscape');
      render(<GraphVisualization data={mockData} />);

      await waitFor(() => {
        const callArgs = cytoscape.mock.calls[0][0];
        const edges = callArgs.elements.filter(el => el.data.source);
        expect(edges).toHaveLength(4);

        // Verify edge properties
        const precedesEdge = edges.find(e => e.data.type === 'PRECEDES');
        expect(precedesEdge).toMatchObject({
          data: {
            source: '1',
            target: '2',
            type: 'PRECEDES'
          },
          style: expect.objectContaining({
            'line-color': '#0078d4' // PRECEDES color
          })
        });
      });
    });

    it('should handle empty data gracefully', () => {
      const emptyData = { nodes: [], edges: [] };
      expect(() => {
        render(<GraphVisualization data={emptyData} />);
      }).not.toThrow();
    });

    it('should handle missing edges/relationships field', () => {
      const dataWithoutEdges = {
        nodes: mockData.nodes
        // No edges or relationships field
      };
      expect(() => {
        render(<GraphVisualization data={dataWithoutEdges} />);
      }).not.toThrow();
    });
  });

  describe('Cytoscape Initialization', () => {
    it('should initialize cytoscape with correct configuration', async () => {
      const cytoscape = require('cytoscape');
      render(<GraphVisualization data={mockData} />);

      await waitFor(() => {
        expect(cytoscape).toHaveBeenCalledWith(
          expect.objectContaining({
            container: expect.any(HTMLElement),
            elements: expect.any(Array),
            style: expect.any(Array),
            layout: expect.objectContaining({
              name: 'dagre',
              directed: true,
              padding: 20
            }),
            minZoom: 0.1,
            maxZoom: 10,
            wheelSensitivity: 0.1
          })
        );
      });
    });

    it('should register layout plugins', () => {
      const cytoscape = require('cytoscape');
      render(<GraphVisualization data={mockData} />);

      expect(cytoscape.use).toHaveBeenCalledTimes(2);
    });

    it('should run initial layout', async () => {
      render(<GraphVisualization data={mockData} />);

      await waitFor(() => {
        expect(mockCyInstance.layout).toHaveBeenCalled();
        expect(mockCyInstance.layout().run).toHaveBeenCalled();
      });
    });

    it('should fit view after initialization', async () => {
      jest.useFakeTimers();
      render(<GraphVisualization data={mockData} />);

      // Fast-forward timers to trigger the setTimeout callback
      jest.runAllTimers();

      await waitFor(() => {
        expect(mockCyInstance.fit).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });
  });

  describe('User Interactions', () => {
    it('should register node click handler', async () => {
      render(<GraphVisualization data={mockData} />);

      await waitFor(() => {
        expect(mockCyInstance.on).toHaveBeenCalledWith(
          'tap',
          'node',
          expect.any(Function)
        );
      });
    });

    it('should handle node selection', async () => {
      const onNodeSelect = jest.fn();
      render(<GraphVisualization data={mockData} onNodeSelect={onNodeSelect} />);

      await waitFor(() => {
        // Get the tap handler that was registered
        const tapCall = mockCyInstance.on.mock.calls.find(
          call => call[0] === 'tap' && call[1] === 'node'
        );
        expect(tapCall).toBeDefined();

        // Simulate node tap
        const handler = tapCall[2];
        const mockEvent = {
          target: {
            data: jest.fn(() => 'node-1'),
            addClass: jest.fn()
          }
        };
        handler(mockEvent);

        expect(onNodeSelect).toHaveBeenCalledWith('node-1');
      });
    });

    it('should handle layout change', () => {
      const { getByLabelText } = render(<GraphVisualization data={mockData} />);
      const layoutSelect = getByLabelText(/Layout/i);

      expect(layoutSelect).toBeInTheDocument();
      expect(layoutSelect).toHaveValue('dagre');
    });

    it('should handle fit and center buttons', () => {
      const { getByText } = render(<GraphVisualization data={mockData} />);

      const fitButton = getByText(/Fit/i);
      const centerButton = getByText(/Center/i);

      expect(fitButton).toBeInTheDocument();
      expect(centerButton).toBeInTheDocument();
    });
  });

  describe('Visual Verification', () => {
    it('should apply correct colors to node types', async () => {
      const cytoscape = require('cytoscape');
      render(<GraphVisualization data={mockData} />);

      await waitFor(() => {
        const callArgs = cytoscape.mock.calls[0][0];
        const nodes = callArgs.elements.filter(el => !el.data.source);

        // Check STATEMENT nodes (blue)
        const statementNodes = nodes.filter(n => n.data.type === 'STATEMENT');
        statementNodes.forEach(node => {
          expect(node.style['background-color']).toBe('#0078d4');
        });

        // Check DATA_TYPE nodes (cyan)
        const dataTypeNodes = nodes.filter(n => n.data.type === 'DATA_TYPE');
        dataTypeNodes.forEach(node => {
          expect(node.style['background-color']).toBe('#00bcf2');
        });

        // Check DIVISION nodes (turquoise)
        const divisionNodes = nodes.filter(n => n.data.type === 'DIVISION');
        divisionNodes.forEach(node => {
          expect(node.style['background-color']).toBe('#40e0d0');
        });
      });
    });

    it('should apply correct colors to edge types', async () => {
      const cytoscape = require('cytoscape');
      render(<GraphVisualization data={mockData} />);

      await waitFor(() => {
        const callArgs = cytoscape.mock.calls[0][0];
        const edges = callArgs.elements.filter(el => el.data.source);

        // Check PRECEDES edges
        const precedesEdges = edges.filter(e => e.data.type === 'PRECEDES');
        precedesEdges.forEach(edge => {
          expect(edge.style['line-color']).toBe('#0078d4');
        });

        // Check CONTAINS edges
        const containsEdges = edges.filter(e => e.data.type === 'CONTAINS');
        containsEdges.forEach(edge => {
          expect(edge.style['line-color']).toBe('#00bcf2');
        });
      });
    });

    it('should show initialization message when loading', () => {
      const { getByText } = render(<GraphVisualization data={mockData} />);

      // Should show initialization message briefly
      expect(getByText(/Initializing graph with 5 nodes/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets without crashing', () => {
      // Create a large dataset
      const largeData = {
        nodes: Array.from({ length: 1000 }, (_, i) => ({
          id: `node-${i}`,
          label: `Node ${i}`,
          properties: { type: 'STATEMENT' }
        })),
        edges: Array.from({ length: 500 }, (_, i) => ({
          id: `edge-${i}`,
          source: `node-${i}`,
          target: `node-${i + 1}`,
          type: 'PRECEDES',
          properties: {}
        }))
      };

      expect(() => {
        render(<GraphVisualization data={largeData} />);
      }).not.toThrow();
    });

    it('should update efficiently when data changes', () => {
      const { rerender } = render(<GraphVisualization data={mockData} />);

      const updatedData = {
        ...mockData,
        nodes: [...mockData.nodes, { id: '6', label: 'NEW_NODE', properties: { type: 'STATEMENT' } }]
      };

      expect(() => {
        rerender(<GraphVisualization data={updatedData} />);
      }).not.toThrow();

      // Verify that elements were updated
      expect(mockCyInstance.elements).toHaveBeenCalled();
      expect(mockCyInstance.add).toHaveBeenCalled();
    });
  });
});