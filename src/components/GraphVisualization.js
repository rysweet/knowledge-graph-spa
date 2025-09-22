import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import { Box, FormControl, InputLabel, Select, MenuItem, Button, ButtonGroup } from '@mui/material';

// Register layouts
cytoscape.use(dagre);
cytoscape.use(coseBilkent);

const GraphVisualization = ({ data, onNodeSelect, highlightedNode, activeFilters = new Set() }) => {
  const cyRef = useRef(null);
  const [cy, setCy] = useState(null);
  const [layout, setLayout] = useState('dagre');

  // Color scheme matching Azure design
  const getNodeColor = (type) => {
    const colors = {
      'STATEMENT': '#0078d4',
      'DATA_TYPE': '#00bcf2',
      'DIVISION': '#40e0d0',
      'SECTION': '#7b68ee',
      'CLAUSE': '#ff6b35',
      'FUNCTION': '#ffd23f',
      'SPECIAL_REGISTER': '#ee6c4d',
    };
    return colors[type] || '#9E9E9E';
  };

  const getRelationshipColor = (type) => {
    const colors = {
      'PRECEDES': '#0078d4',
      'CONTAINS': '#00bcf2',
      'ALTERNATIVE_TO': '#ff6b35',
    };
    return colors[type] || '#666';
  };

  useEffect(() => {
    if (!cyRef.current || !data.nodes.length) return;

    // Filter nodes based on active filters
    const filteredNodes = activeFilters.size === 0
      ? data.nodes
      : data.nodes.filter(node => !activeFilters.has(node.type));

    // Filter relationships to only include those between visible nodes
    const visibleNodeIds = new Set(filteredNodes.map(node => node.id));
    // Handle both 'edges' (new API) and 'relationships' (legacy) field names
    const relationships = data.edges || data.relationships || [];
    const filteredRelationships = relationships.filter(rel =>
      visibleNodeIds.has(rel.source) && visibleNodeIds.has(rel.target)
    );

    // Prepare cytoscape elements
    const elements = [
      // Nodes
      ...filteredNodes.map(node => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          properties: node.properties,
        },
        style: {
          'background-color': getNodeColor(node.type),
          'color': '#ffffff',
          'font-size': '10px',
          'text-wrap': 'wrap',
          'text-max-width': '80px',
          'width': 'label',
          'height': 'label',
          'padding': '8px',
          'shape': 'round-rectangle',
          'border-width': 1,
          'border-color': '#404040',
        }
      })),
      // Edges
      ...filteredRelationships.map(rel => ({
        data: {
          id: rel.id,
          source: rel.source,
          target: rel.target,
          label: rel.type,
          type: rel.type,
          properties: rel.properties,
        },
        style: {
          'line-color': getRelationshipColor(rel.type),
          'target-arrow-color': getRelationshipColor(rel.type),
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'label': rel.type,
          'font-size': '8px',
          'text-rotation': 'autorotate',
          'color': '#cccccc',
          'width': 2,
        }
      }))
    ];

    // Initialize or update cytoscape
    if (cy) {
      cy.elements().remove();
      cy.add(elements);
    } else {
      const newCy = cytoscape({
        container: cyRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'text-valign': 'center',
              'text-halign': 'center',
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
            }
          },
          {
            selector: '.highlighted',
            style: {
              'border-width': 3,
              'border-color': '#00ff41',
              'border-style': 'solid',
            }
          },
          {
            selector: '.selected',
            style: {
              'border-width': 4,
              'border-color': '#0078d4',
              'border-style': 'solid',
            }
          }
        ],
        layout: {
          name: layout,
          directed: true,
          padding: 20,
          spacingFactor: 1.2,
        }
      });

      // Handle node selection
      newCy.on('tap', 'node', (event) => {
        const node = event.target;
        const nodeId = node.data('id');

        // Clear previous selections
        newCy.elements().removeClass('selected');
        node.addClass('selected');

        if (onNodeSelect) {
          onNodeSelect(nodeId);
        }
      });

      // Handle background click
      newCy.on('tap', (event) => {
        if (event.target === newCy) {
          newCy.elements().removeClass('selected');
        }
      });

      setCy(newCy);
    }

    // Apply layout
    if (cy) {
      cy.layout({
        name: layout,
        directed: true,
        padding: 20,
        spacingFactor: 1.2,
      }).run();
    }
  }, [data, layout, cy, onNodeSelect, activeFilters]);

  // Handle highlighted node
  useEffect(() => {
    if (!cy || !highlightedNode) return;

    cy.elements().removeClass('highlighted');
    const highlightedElement = cy.getElementById(highlightedNode);
    if (highlightedElement.length > 0) {
      highlightedElement.addClass('highlighted');
      cy.center(highlightedElement);
    }
  }, [cy, highlightedNode]);

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    if (cy) {
      cy.layout({
        name: newLayout,
        directed: true,
        padding: 20,
        spacingFactor: newLayout === 'cose-bilkent' ? 1.5 : 1.2,
      }).run();
    }
  };

  const handleFitView = () => {
    if (cy) {
      cy.fit();
    }
  };

  const handleCenterView = () => {
    if (cy) {
      cy.center();
    }
  };

  return (
    <Box
      ref={cyRef}
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
      }}
    />
  );
};

export default GraphVisualization;