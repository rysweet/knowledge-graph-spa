# COBOL Knowledge Graph SPA

A modern Single Page Application for visualizing and exploring COBOL knowledge graphs stored in Neo4j.

## Features

- **Interactive Graph Visualization**: Using Cytoscape.js with multiple layout algorithms
- **Real-time Neo4j Integration**: Direct connection to your COBOL knowledge graph database
- **Advanced Search**: Find entities by name, value, or type
- **Entity Details**: Detailed view of selected nodes with relationships
- **Statistics Dashboard**: Overview of graph composition and metrics
- **Professional UI**: Clean, responsive Material-UI interface

## Architecture

```
cobol-knowledge-spa/
├── backend/
│   └── server.js              # Express server with Neo4j integration
├── src/
│   ├── App.js                 # Main React application
│   ├── components/
│   │   ├── GraphVisualization.js  # Cytoscape graph component
│   │   ├── SearchPanel.js          # Search and filtering
│   │   ├── EntityDetails.js       # Selected entity information
│   │   └── StatsPanel.js          # Graph statistics
│   └── services/
│       └── apiService.js      # API client for backend communication
└── public/
    └── index.html             # HTML template
```

## Prerequisites

- Node.js 16+ and npm
- Neo4j database running on bolt://localhost:7988
- COBOL knowledge graph data loaded in Neo4j

## Quick Start

1. Navigate to the SPA directory:
```bash
cd cobol-knowledge-spa
```

2. Install dependencies and start all services:
```bash
npm install
./start.sh
```

3. Open your browser to http://localhost:3000

## Installation

1. Navigate to the SPA directory:
```bash
cd cobol-knowledge-spa
```

2. Install dependencies:
```bash
npm install
```

## Configuration

The application expects your Neo4j database to be running at:
- **URL**: bolt://localhost:7988
- **Username**: neo4j
- **Password**: testpassword

To change these settings, edit `backend/server.js`:
```javascript
const driver = neo4j.driver(
  'bolt://localhost:7988',  // Your Neo4j URL
  neo4j.auth.basic('neo4j', 'testpassword')  // Your credentials
);
```

## Running the Application

### Development Mode

Run both backend and frontend simultaneously:
```bash
npm run dev
```

This starts:
- Backend API server on http://localhost:3001
- React frontend on http://localhost:3000

### Individual Components

Run backend only:
```bash
npm run server
```

Run frontend only (requires backend running):
```bash
npm run client
```

## API Endpoints

The backend provides these REST endpoints:

- `GET /api/health` - Health check
- `GET /api/graph` - Get all nodes and relationships
- `GET /api/search?query=&type=` - Search entities
- `GET /api/node/:id` - Get detailed node information
- `GET /api/stats` - Get graph statistics

## Usage

1. **Open the application** at http://localhost:3000
2. **Explore the graph** using mouse interactions:
   - Click and drag to pan
   - Mouse wheel to zoom
   - Click nodes to select and view details
3. **Search entities** using the search panel:
   - Enter text to search by name/value
   - Filter by entity type
   - Click search results to highlight in graph
4. **Change layouts** using the layout dropdown:
   - Dagre (hierarchical)
   - Cose-Bilkent (force-directed)
   - Circle or Grid layouts
5. **View statistics** in the stats panel for graph overview

## Entity Types Supported

The application recognizes these COBOL entity types:
- STATEMENT (blue)
- DATA_TYPE (green)
- CLAUSE (orange)
- SECTION (purple)
- DIVISION (red)
- FUNCTION (cyan)
- SPECIAL_REGISTER (brown)

## Relationship Types Supported

- PRECEDES (blue arrows)
- CONTAINS (green arrows)
- ALTERNATIVE_TO (orange arrows)

## Troubleshooting

### Backend Connection Issues

1. Verify Neo4j is running on bolt://localhost:7988
2. Check credentials in `backend/server.js`
3. Test connection: `curl http://localhost:3001/api/health`

### Frontend Issues

1. Ensure backend is running on port 3001
2. Check browser console for errors
3. Verify proxy configuration in package.json

### Graph Not Displaying

1. Check if data exists: `curl http://localhost:3001/api/graph`
2. Verify Neo4j contains COBOL entities
3. Check browser developer tools for JavaScript errors

## Production Build

To create a production build:
```bash
npm run build
```

This creates optimized files in the `build/` directory.

## Development

The application uses:
- **React 18** for the frontend framework
- **Material-UI** for the user interface
- **Cytoscape.js** for graph visualization
- **Express.js** for the backend API
- **Neo4j Driver** for database connectivity

## Performance

- Graph layout is optimized for up to 500 nodes
- API responses are cached for better performance
- Lazy loading implemented for large datasets
- Responsive design works on desktop and tablet devices

## License

This COBOL Knowledge Graph SPA is part of the Admiral-KG project.