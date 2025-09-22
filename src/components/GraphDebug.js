import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { Box, Typography } from '@mui/material';

const GraphDebug = ({ data }) => {
  const cyRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data || !data.nodes || data.nodes.length === 0) {
      console.log('GraphDebug: Missing requirements', {
        container: !!containerRef.current,
        data: !!data,
        nodes: data?.nodes?.length || 0
      });
      return;
    }

    // Log the actual data
    console.log('GraphDebug: Initializing with data', {
      nodes: data.nodes.length,
      edges: data.edges?.length || 0,
      firstNode: data.nodes[0],
      firstEdge: data.edges?.[0]
    });

    // Simple elements with explicit styles
    const elements = [
      ...data.nodes.slice(0, 10).map((node, idx) => ({
        data: {
          id: node.id,
          label: node.label || `Node ${idx}`
        }
      })),
      ...(data.edges || []).slice(0, 10).map(edge => ({
        data: {
          id: edge.id || `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target
        }
      }))
    ];

    console.log('GraphDebug: Created elements', elements);

    try {
      const cy = cytoscape({
        container: containerRef.current,
        elements: elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#0078d4',
              'label': 'data(label)',
              'color': '#ffffff',
              'text-valign': 'center',
              'text-halign': 'center',
              'width': 40,
              'height': 40
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 3,
              'line-color': '#00ff41',
              'target-arrow-color': '#00ff41',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier'
            }
          }
        ],
        layout: {
          name: 'grid',
          rows: 3
        }
      });

      cyRef.current = cy;

      // Log final state
      console.log('GraphDebug: Cytoscape initialized', {
        nodes: cy.nodes().length,
        edges: cy.edges().length,
        container: {
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        }
      });

      // Force a render
      cy.resize();
      cy.fit();

    } catch (error) {
      console.error('GraphDebug: Error initializing Cytoscape', error);
    }

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [data]);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <Typography sx={{ position: 'absolute', top: 10, left: 10, color: 'white', zIndex: 1000 }}>
        Debug Graph: {data?.nodes?.length || 0} nodes, {data?.edges?.length || 0} edges
      </Typography>
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1a1a1a',
          border: '2px solid #00ff41'
        }}
      />
    </Box>
  );
};

export default GraphDebug;