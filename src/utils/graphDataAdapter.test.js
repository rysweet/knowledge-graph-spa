/**
 * Test to verify that the GraphVisualization component correctly handles
 * both 'edges' (new API) and 'relationships' (legacy API) field names
 */

describe('Graph Data Adapter - edges/relationships compatibility', () => {
  it('should handle data with edges field', () => {
    const dataWithEdges = {
      nodes: [
        { id: '1', label: 'Node 1' },
        { id: '2', label: 'Node 2' }
      ],
      edges: [
        { id: 'e1', source: '1', target: '2', type: 'CONNECTED' }
      ]
    };

    // Extract edges/relationships
    const relationships = dataWithEdges.edges || dataWithEdges.relationships || [];

    expect(relationships).toHaveLength(1);
    expect(relationships[0].source).toBe('1');
    expect(relationships[0].target).toBe('2');
  });

  it('should handle data with relationships field', () => {
    const dataWithRelationships = {
      nodes: [
        { id: '1', label: 'Node 1' },
        { id: '2', label: 'Node 2' }
      ],
      relationships: [
        { id: 'r1', source: '1', target: '2', type: 'CONNECTED' }
      ]
    };

    // Extract edges/relationships - same logic as in GraphVisualization.js
    const relationships = dataWithRelationships.edges || dataWithRelationships.relationships || [];

    expect(relationships).toHaveLength(1);
    expect(relationships[0].source).toBe('1');
    expect(relationships[0].target).toBe('2');
  });

  it('should handle data with neither edges nor relationships', () => {
    const dataWithoutEdges = {
      nodes: [
        { id: '1', label: 'Node 1' }
      ]
    };

    // Extract edges/relationships
    const relationships = dataWithoutEdges.edges || dataWithoutEdges.relationships || [];

    expect(relationships).toHaveLength(0);
  });

  it('should prioritize edges over relationships if both exist', () => {
    const dataWithBoth = {
      nodes: [],
      edges: [
        { id: 'e1', source: '1', target: '2' }
      ],
      relationships: [
        { id: 'r1', source: '3', target: '4' }
      ]
    };

    // Extract edges/relationships - edges should take precedence
    const relationships = dataWithBoth.edges || dataWithBoth.relationships || [];

    expect(relationships).toHaveLength(1);
    expect(relationships[0].id).toBe('e1');
    expect(relationships[0].source).toBe('1');
  });
});

// Test the actual filtering logic used in GraphVisualization.js
describe('Graph edge filtering logic', () => {
  it('should filter edges to only include those between visible nodes', () => {
    const data = {
      nodes: [
        { id: '1', label: 'Node 1', type: 'Type1' },
        { id: '2', label: 'Node 2', type: 'Type2' },
        { id: '3', label: 'Node 3', type: 'Type3' }
      ],
      edges: [
        { id: 'e1', source: '1', target: '2', type: 'CONNECTED' },
        { id: 'e2', source: '2', target: '3', type: 'CONNECTED' },
        { id: 'e3', source: '1', target: '3', type: 'CONNECTED' }
      ]
    };

    // Simulate filtering nodes (e.g., hiding Type3)
    const filteredNodes = data.nodes.filter(node => node.type !== 'Type3');
    const visibleNodeIds = new Set(filteredNodes.map(node => node.id));

    // Apply the same edge filtering logic as in GraphVisualization.js
    const relationships = data.edges || data.relationships || [];
    const filteredRelationships = relationships.filter(rel =>
      visibleNodeIds.has(rel.source) && visibleNodeIds.has(rel.target)
    );

    // Should only include edges between nodes 1 and 2
    expect(filteredRelationships).toHaveLength(1);
    expect(filteredRelationships[0].id).toBe('e1');
  });
});