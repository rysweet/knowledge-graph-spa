import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import { Box, FormControl, InputLabel, Select, MenuItem, Button, ButtonGroup, Typography } from '@mui/material';

// Register layouts
cytoscape.use(dagre);
cytoscape.use(coseBilkent);

const GraphVisualization = ({ data, onNodeSelect, highlightedNode, activeFilters = new Set() }) => {
  const cyRef = useRef(null);
  const [cy, setCy] = useState(null);
  const [layout, setLayout] = useState('cose-bilkent');
  const [isInitialized, setIsInitialized] = useState(false);

  // Color scheme matching Azure design
  const getNodeColor = (type) => {
    const colors = {
      'CONCEPT': '#0078d4',        // Primary concepts (was STATEMENT)
      'PROPERTY': '#00bcf2',       // Properties/attributes (was DATA_TYPE)
      'CATEGORY': '#40e0d0',       // High-level categories (was DIVISION)
      'SUBCATEGORY': '#7b68ee',    // Sub-categories (was SECTION)
      'RULE': '#ff6b35',           // Rules/constraints (was CLAUSE)
      'METHOD': '#ffd23f',         // Methods/functions (was FUNCTION)
      'INSTANCE': '#ee6c4d',       // Specific instances (was SPECIAL_REGISTER)
      'SOURCE': '#00bcf2',         // Source/reference nodes
      'TOPIC': '#40e0d0',          // Topic nodes
      // Legacy mappings for backward compatibility
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
      'SOURCED_FROM': '#ff9900',   // Orange for source relationships
      'RELATES_TO': '#9E9E9E',     // Gray for general relationships
    };
    return colors[type] || '#666';
  };

  useEffect(() => {
    if (!cyRef.current || !data.nodes || !data.nodes.length) {
      console.log('GraphVisualization: No container or no nodes', {
        container: !!cyRef.current,
        nodes: data.nodes?.length || 0
      });
      return;
    }

    // Ensure container has dimensions
    if (cyRef.current.offsetWidth === 0 || cyRef.current.offsetHeight === 0) {
      console.log('GraphVisualization: Container has no dimensions, waiting...');
      // Try again after a short delay
      const retryTimer = setTimeout(() => {
        if (cyRef.current && cyRef.current.offsetWidth > 0 && cyRef.current.offsetHeight > 0) {
          console.log('GraphVisualization: Container now has dimensions, reinitializing');
          // Force a re-render by updating state
          setIsInitialized(false);
        }
      }, 100);
      return () => clearTimeout(retryTimer);
    }

    // Filter nodes based on active filters
    const filteredNodes = activeFilters.size === 0
      ? data.nodes
      : data.nodes.filter(node => !activeFilters.has(node.properties?.type));

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
          type: node.properties?.type || node.type || 'UNKNOWN',
          description: node.properties?.description || '',
          details: node.properties?.details || '',
          properties: node.properties,
        },
        style: {
          'background-color': getNodeColor(node.properties?.type || node.type),
          'color': '#ffffff',
          'font-size': '10px',
          'text-wrap': 'wrap',
          'text-max-width': '80px',
          'width': 'label',
          'height': 'label',
          'padding': '8px',
          'shape': (node.properties?.type || node.type) === 'SOURCE' ? 'diamond' : 'round-rectangle',
          'border-width': (node.properties?.type || node.type) === 'SOURCE' ? 2 : 1,
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
      console.log('GraphVisualization: Updating existing instance with', elements.length, 'elements');
      cy.elements().remove();
      cy.add(elements);

      // Calculate bounding box based on container size
      const container = cyRef.current;
      const layoutInstance = cy.layout({
        name: layout,
        directed: true,
        padding: 50,
        spacingFactor: 1.2,
        animate: false,
        fit: true,
        // Add layout constraints
        nodeSep: 50,
        edgeSep: 10,
        rankSep: 100,
        ranker: 'network-simplex',
        boundingBox: {
          x1: 0,
          y1: 0,
          x2: container.offsetWidth || 900,
          y2: container.offsetHeight || 500
        }
      });

      layoutInstance.run();

      // Force fit after layout using timeout approach
      const fitExistingGraph = () => {
        // Check if cytoscape instance is still valid
        if (!cy || !cy._private || !cy._private.renderer) {
          console.log('GraphVisualization: Existing cytoscape instance not available');
          return;
        }

        if (!cyRef.current) {
          console.log('GraphVisualization: Container ref not available for existing graph');
          return;
        }

        try {
          cy.fit(cy.nodes(), 50);

          const extent = cy.extent();
          const viewportWidth = extent.x2 - extent.x1;
          const viewportHeight = extent.y2 - extent.y1;

          if (viewportWidth > container.offsetWidth || viewportHeight > container.offsetHeight) {
            const zoomLevel = Math.min(
              container.offsetWidth / viewportWidth,
              container.offsetHeight / viewportHeight
            ) * 0.8;

            cy.zoom(zoomLevel);
            cy.center();
          }

          // Force render
          cy.resize();

          // Trigger a style update to force redraw
          cy.style().update();
        } catch (error) {
          console.error('GraphVisualization: Error in fitExistingGraph:', error);
        }
      };

      setTimeout(fitExistingGraph, 0);
      setTimeout(fitExistingGraph, 100);
    } else {
      // Ensure the container is ready for rendering
      const container = cyRef.current;
      container.style.position = 'relative';

      const newCy = cytoscape({
        container: container,
        elements,
        renderer: {
          name: 'canvas'
        },
        style: [
          {
            selector: 'node',
            style: {
              'text-valign': 'center',
              'text-halign': 'center',
              'content': 'data(label)',
              'background-opacity': 1,
              'text-opacity': 1,
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
          padding: 50,
          spacingFactor: 1.2,
          animate: false,
          fit: true,
          // Add constraints to prevent layout from expanding too much
          nodeSep: 50,
          edgeSep: 10,
          rankSep: 100,
          ranker: 'network-simplex'
        },
        minZoom: 0.1,
        maxZoom: 10,
        wheelSensitivity: 0.1
      });

      console.log('GraphVisualization: Created Cytoscape instance with', elements.length, 'elements');
      console.log('Container dimensions:', cyRef.current.offsetWidth, 'x', cyRef.current.offsetHeight);

      // Handle node selection
      newCy.on('tap', 'node', (event) => {
        const node = event.target;
        const nodeId = node.data('id');
        const nodeData = node.data();

        // Clear previous selections
        newCy.elements().removeClass('selected');
        node.addClass('selected');

        // Show node details in console for now
        if (nodeData.description || nodeData.details) {
          console.log('Node Details:', {
            name: nodeData.label,
            type: nodeData.type,
            description: nodeData.description,
            details: nodeData.details
          });
        }

        if (onNodeSelect) {
          onNodeSelect(nodeId);
        }
      });

      // Add hover tooltip for node details
      newCy.on('mouseover', 'node', (event) => {
        const node = event.target;
        const nodeData = node.data();

        if (nodeData.description) {
          // Update the node's label temporarily to show description
          node.data('originalLabel', nodeData.label);
          const tooltipText = `${nodeData.label}\n${nodeData.description}`;
          node.style('font-size', '12px');
          node.style('text-wrap', 'wrap');
          node.style('text-max-width', '150px');
        }
      });

      newCy.on('mouseout', 'node', (event) => {
        const node = event.target;
        const originalLabel = node.data('originalLabel');

        if (originalLabel) {
          node.style('font-size', '10px');
          node.style('text-wrap', 'wrap');
          node.style('text-max-width', '80px');
          node.data('originalLabel', null);
        }
      });

      // Handle background click
      newCy.on('tap', (event) => {
        if (event.target === newCy) {
          newCy.elements().removeClass('selected');
        }
      });

      setCy(newCy);

      // Run initial layout with better constraints for dagre
      const layoutOptions = {
        name: layout,
        directed: true,
        padding: 50,
        spacingFactor: 1.2,
        animate: false,
        fit: true,
        // Add dagre-specific options to constrain layout
        nodeSep: 50, // minimum space between nodes
        edgeSep: 10, // minimum space between edges
        rankSep: 100, // minimum space between ranks
        ranker: 'network-simplex', // better ranking algorithm
        // Force bounds
        boundingBox: {
          x1: 0,
          y1: 0,
          x2: cyRef.current.offsetWidth || 900,
          y2: cyRef.current.offsetHeight || 500
        }
      };

      const initialLayout = newCy.layout(layoutOptions);
      initialLayout.run();

      // Instead of relying on event, use promise and immediate fit
      const fitGraph = () => {
        // Check if cytoscape instance is still valid
        if (!newCy || !newCy._private || !newCy._private.renderer) {
          console.log('GraphVisualization: Cytoscape instance not ready or destroyed');
          return;
        }

        const container = cyRef.current;
        if (!container) {
          console.log('GraphVisualization: Container ref not available');
          return;
        }

        try {
          console.log('GraphVisualization: Fitting graph to container');

          // First, fit all nodes
          newCy.fit(newCy.nodes(), 50);

          // Then check if we need additional zoom adjustment
          const extent = newCy.extent();
          console.log('Container size:', container.offsetWidth, 'x', container.offsetHeight);
          console.log('Viewport after initial fit:', extent);

          // Calculate the required zoom level to fit everything in view
          const viewportWidth = extent.x2 - extent.x1;
          const viewportHeight = extent.y2 - extent.y1;
          const containerWidth = container.offsetWidth;
          const containerHeight = container.offsetHeight;

          if (viewportWidth > containerWidth || viewportHeight > containerHeight) {
            // Calculate zoom to fit
            const zoomLevel = Math.min(
              containerWidth / viewportWidth,
              containerHeight / viewportHeight
            ) * 0.8; // 80% to ensure padding

            console.log('GraphVisualization: Applying zoom level:', zoomLevel);
            newCy.zoom(zoomLevel);
            newCy.center();
          }

          // Force a render/refresh
          newCy.resize();

          // Trigger a style update to force redraw
          newCy.style().update();

          // Final check
          const finalExtent = newCy.extent();
          console.log('Final viewport:', finalExtent);
          console.log('Nodes rendered:', newCy.nodes().length);
          console.log('Edges rendered:', newCy.edges().length);

          // Debug: Check if nodes are visible after fit
          const firstNode = newCy.nodes().first();
          if (firstNode.length > 0) {
            const pos = firstNode.renderedPosition();
            const boundingBox = firstNode.renderedBoundingBox();
            console.log('First node rendered position:', pos);
            console.log('First node bounding box:', boundingBox);
          }

          // Expose for debugging
          window.debugCy = newCy;
        } catch (error) {
          console.error('GraphVisualization: Error in fitGraph:', error);
        }
      };

      // Try to fit immediately and also after a delay to handle async layout
      setTimeout(fitGraph, 0);
      setTimeout(fitGraph, 100);
      setTimeout(fitGraph, 500);

      // Also add a longer delay in case container needs time to render
      setTimeout(() => {
        // Check if cytoscape instance is still valid
        if (!newCy || !newCy._private || !newCy._private.renderer) {
          console.log('GraphVisualization: Cytoscape instance not available for final render');
          return;
        }

        if (!cyRef.current) {
          console.log('GraphVisualization: Container ref not available for final render');
          return;
        }

        try {
          console.log('GraphVisualization: Final render attempt');

          // Make absolutely sure the graph is visible
          newCy.resize();
          newCy.fit(newCy.nodes(), 50);
          newCy.center();

          // Force the graph to render by triggering viewport events
          newCy.viewport({
            zoom: newCy.zoom(),
            pan: newCy.pan()
          });

          // Update styles to force render
          newCy.batch(() => {
            newCy.nodes().forEach(node => {
              node.style('opacity', 0.99);
              node.style('opacity', 1);
            });
          });

          console.log('Final check - nodes visible:', newCy.nodes(':visible').length);
        } catch (error) {
          console.error('GraphVisualization: Error in final render attempt:', error);
        }
      }, 1000);

      setIsInitialized(true);
    }
  }, [data, layout, onNodeSelect, activeFilters]);

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
    if (cy && cyRef.current) {
      const container = cyRef.current;
      const layoutOptions = {
        name: newLayout,
        directed: true,
        padding: 50,
        spacingFactor: newLayout === 'cose-bilkent' ? 1.5 : 1.2,
        fit: true,
        animate: false
      };

      // Add layout-specific options
      if (newLayout === 'dagre') {
        Object.assign(layoutOptions, {
          nodeSep: 50,
          edgeSep: 10,
          rankSep: 100,
          ranker: 'network-simplex',
          boundingBox: {
            x1: 0,
            y1: 0,
            x2: container.offsetWidth || 900,
            y2: container.offsetHeight || 500
          }
        });
      } else if (newLayout === 'cose-bilkent') {
        Object.assign(layoutOptions, {
          idealEdgeLength: 100,
          nodeOverlap: 20,
          refresh: 20,
          randomize: false,
          gravity: 0.25,
          tile: true,
          boundingBox: {
            x1: 0,
            y1: 0,
            x2: container.offsetWidth || 900,
            y2: container.offsetHeight || 500
          }
        });
      }

      const layoutInstance = cy.layout(layoutOptions);
      layoutInstance.run();

      // Ensure fit after layout change
      layoutInstance.on('layoutstop', () => {
        cy.fit(cy.nodes(), 50);
        cy.center();
      });
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
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Graph Controls */}
      <Box sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 1000,
        display: 'flex',
        gap: 1,
        alignItems: 'center'
      }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: '#cccccc' }}>Layout</InputLabel>
          <Select
            value={layout}
            onChange={(e) => handleLayoutChange(e.target.value)}
            label="Layout"
            sx={{
              bgcolor: 'rgba(45, 45, 45, 0.9)',
              color: '#ffffff',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#404040',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#0078d4',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#0078d4',
              }
            }}
          >
            <MenuItem value="dagre">Hierarchical</MenuItem>
            <MenuItem value="cose-bilkent">Force-Directed</MenuItem>
          </Select>
        </FormControl>

        <ButtonGroup variant="contained" size="small">
          <Button onClick={handleFitView} sx={{ bgcolor: '#0078d4' }}>
            Fit
          </Button>
          <Button onClick={handleCenterView} sx={{ bgcolor: '#0078d4' }}>
            Center
          </Button>
        </ButtonGroup>
      </Box>

      {/* Cytoscape Container */}
      <div
        ref={cyRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1e1e1e',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />

      {/* Debug Info */}
      {!isInitialized && data.nodes && data.nodes.length > 0 && (
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ffffff',
          textAlign: 'center'
        }}>
          <Typography>Initializing graph with {data.nodes.length} nodes...</Typography>
        </Box>
      )}
    </Box>
  );
};

export default GraphVisualization;