import React from 'react';
import { render } from '@testing-library/react';
import GraphVisualization from './GraphVisualization';

// Mock cytoscape and its plugins
jest.mock('cytoscape', () => {
  const mockCytoscape = jest.fn(() => ({
    elements: jest.fn(() => ({
      remove: jest.fn()
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
    fit: jest.fn()
  }));
  mockCytoscape.use = jest.fn();
  return mockCytoscape;
});

jest.mock('cytoscape-dagre', () => jest.fn());
jest.mock('cytoscape-cose-bilkent', () => jest.fn());

describe('GraphVisualization (Old Component)', () => {
  it('should handle both edges and relationships fields from backend', () => {
    const mockDataWithEdges = {
      nodes: [
        { id: '1', label: 'Node 1', type: 'Type1', properties: {} },
        { id: '2', label: 'Node 2', type: 'Type2', properties: {} }
      ],
      edges: [  // New API uses 'edges'
        { id: 'e1', source: '1', target: '2', type: 'CONNECTED', properties: {} }
      ]
    };

    const mockDataWithRelationships = {
      nodes: [
        { id: '1', label: 'Node 1', type: 'Type1', properties: {} },
        { id: '2', label: 'Node 2', type: 'Type2', properties: {} }
      ],
      relationships: [  // Legacy API uses 'relationships'
        { id: 'e1', source: '1', target: '2', type: 'CONNECTED', properties: {} }
      ]
    };

    // Should not crash with 'edges' field
    expect(() => {
      render(<GraphVisualization data={mockDataWithEdges} />);
    }).not.toThrow();

    // Should not crash with 'relationships' field
    expect(() => {
      render(<GraphVisualization data={mockDataWithRelationships} />);
    }).not.toThrow();
  });

  it('should handle empty data gracefully', () => {
    const emptyData = {
      nodes: [],
      edges: []
    };

    expect(() => {
      render(<GraphVisualization data={emptyData} />);
    }).not.toThrow();
  });

  it('should handle missing edges/relationships field', () => {
    const dataWithoutEdges = {
      nodes: [
        { id: '1', label: 'Node 1', type: 'Type1', properties: {} }
      ]
      // No edges or relationships field
    };

    expect(() => {
      render(<GraphVisualization data={dataWithoutEdges} />);
    }).not.toThrow();
  });
});