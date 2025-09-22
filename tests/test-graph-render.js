// Test script to verify graph rendering
// Run this in browser console to debug

// Check if Cytoscape is loaded
console.log('Cytoscape loaded:', typeof cytoscape !== 'undefined');

// Get graph container
const container = document.querySelector('[id*="cy"]') ||
                 document.querySelector('div[style*="background-color: rgb(0, 0, 0)"]');
console.log('Graph container found:', !!container);

if (container) {
  console.log('Container dimensions:', {
    width: container.offsetWidth,
    height: container.offsetHeight,
    display: window.getComputedStyle(container).display,
    position: window.getComputedStyle(container).position
  });
}

// Check for canvas elements (Cytoscape uses canvas)
const canvases = document.querySelectorAll('canvas');
console.log('Canvas elements found:', canvases.length);

canvases.forEach((canvas, i) => {
  console.log(`Canvas ${i}:`, {
    width: canvas.width,
    height: canvas.height,
    parent: canvas.parentElement?.className || canvas.parentElement?.tagName
  });
});

// Check React DevTools for GraphVisualization component
console.log('To check React components:');
console.log('1. Install React DevTools extension');
console.log('2. Look for GraphVisualization component');
console.log('3. Check its props.data');

// Try to access Cytoscape instance (if exposed globally for debugging)
if (window.cy) {
  console.log('Global Cytoscape instance found!');
  console.log('Nodes:', window.cy.nodes().length);
  console.log('Edges:', window.cy.edges().length);
} else {
  console.log('No global Cytoscape instance (expected - it\'s in React component)');
}