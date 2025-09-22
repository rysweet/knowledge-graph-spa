const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
const PORT = process.env.PORT || 3001;

// Neo4j connection
const driver = neo4j.driver(
  'bolt://localhost:7988',
  neo4j.auth.basic('neo4j', 'testpassword')
);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'COBOL Knowledge Graph API is running' });
});

// Graph status endpoint - check if database has data
app.get('/api/graph/status', async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run('MATCH (n) RETURN count(n) as nodeCount LIMIT 1');
    const nodeCount = result.records[0].get('nodeCount').toNumber();

    res.json({
      isPopulated: nodeCount > 0,
      nodeCount: nodeCount
    });
  } catch (error) {
    console.error('Error checking graph status:', error);
    res.status(500).json({
      error: 'Failed to check graph status',
      details: error.message,
      isPopulated: false
    });
  } finally {
    await session.close();
  }
});

// Get all nodes and relationships
app.get('/api/graph', async (req, res) => {
  const session = driver.session();

  try {
    // Get all nodes
    const nodesResult = await session.run(
      'MATCH (n) RETURN n, labels(n) as labels, id(n) as id LIMIT 100'
    );

    // Get all relationships
    const relationshipsResult = await session.run(
      'MATCH (a)-[r]->(b) RETURN a, r, b, type(r) as relationship_type, id(a) as source_id, id(b) as target_id LIMIT 200'
    );

    const nodes = nodesResult.records.map(record => {
      const node = record.get('n');
      const labels = record.get('labels');
      const id = record.get('id').toNumber();

      return {
        id: id.toString(),
        label: node.properties.name || node.properties.value || `Node ${id}`,
        type: labels[0] || 'Unknown',
        properties: node.properties,
        labels: labels
      };
    });

    const relationships = relationshipsResult.records.map(record => {
      const relationship = record.get('r');
      const sourceId = record.get('source_id').toNumber();
      const targetId = record.get('target_id').toNumber();
      const relationshipType = record.get('relationship_type');

      return {
        id: `${sourceId}-${targetId}`,
        source: sourceId.toString(),
        target: targetId.toString(),
        type: relationshipType,
        label: relationshipType,
        properties: relationship.properties
      };
    });

    // Calculate statistics for frontend
    const nodeTypeStats = {};
    const edgeTypeStats = {};

    nodes.forEach(node => {
      nodeTypeStats[node.type] = (nodeTypeStats[node.type] || 0) + 1;
    });

    relationships.forEach(rel => {
      edgeTypeStats[rel.type] = (edgeTypeStats[rel.type] || 0) + 1;
    });

    res.json({
      nodes,
      edges: relationships, // Frontend expects 'edges', not 'relationships'
      stats: {
        nodeCount: nodes.length,
        edgeCount: relationships.length,
        nodeTypes: nodeTypeStats,
        edgeTypes: edgeTypeStats
      }
    });

  } catch (error) {
    console.error('Error fetching graph data:', error);
    res.status(500).json({ error: 'Failed to fetch graph data', details: error.message });
  } finally {
    await session.close();
  }
});

// Search nodes by name or type (frontend expects this at /api/graph/search)
app.get('/api/graph/search', async (req, res) => {
  const { query, type } = req.query;
  const session = driver.session();

  try {
    let cypher = 'MATCH (n) WHERE 1=1';
    const params = {};

    if (query) {
      cypher += ' AND (toLower(n.name) CONTAINS toLower($query) OR toLower(n.value) CONTAINS toLower($query))';
      params.query = query;
    }

    if (type && type !== 'all') {
      cypher += ' AND $type IN labels(n)';
      params.type = type;
    }

    cypher += ' RETURN n, labels(n) as labels, id(n) as id LIMIT 50';

    const result = await session.run(cypher, params);

    const nodes = result.records.map(record => {
      const node = record.get('n');
      const labels = record.get('labels');
      const id = record.get('id').toNumber();

      return {
        id: id.toString(),
        label: node.properties.name || node.properties.value || `Node ${id}`,
        type: labels[0] || 'Unknown',
        properties: node.properties,
        labels: labels
      };
    });

    res.json({ nodes });

  } catch (error) {
    console.error('Error searching nodes:', error);
    res.status(500).json({ error: 'Failed to search nodes', details: error.message });
  } finally {
    await session.close();
  }
});

// Get node details with neighbors (frontend expects this at /api/graph/node/:id)
app.get('/api/graph/node/:id', async (req, res) => {
  const { id } = req.params;
  const session = driver.session();

  try {
    // Get the node
    const nodeResult = await session.run(
      'MATCH (n) WHERE id(n) = $id RETURN n, labels(n) as labels',
      { id: parseInt(id) }
    );

    if (nodeResult.records.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Get neighbors
    const neighborsResult = await session.run(
      'MATCH (n)-[r]-(neighbor) WHERE id(n) = $id RETURN neighbor, r, type(r) as rel_type, startNode(r) = n as outgoing, labels(neighbor) as neighbor_labels, id(neighbor) as neighbor_id',
      { id: parseInt(id) }
    );

    const nodeRecord = nodeResult.records[0];
    const node = nodeRecord.get('n');
    const labels = nodeRecord.get('labels');

    const neighbors = neighborsResult.records.map(record => {
      const neighbor = record.get('neighbor');
      const relationship = record.get('r');
      const relType = record.get('rel_type');
      const isOutgoing = record.get('outgoing');
      const neighborLabels = record.get('neighbor_labels');
      const neighborId = record.get('neighbor_id').toNumber();

      return {
        id: neighborId.toString(),
        label: neighbor.properties.name || neighbor.properties.value || `Node ${neighborId}`,
        type: neighborLabels[0] || 'Unknown',
        properties: neighbor.properties,
        relationship: {
          type: relType,
          direction: isOutgoing ? 'outgoing' : 'incoming',
          properties: relationship.properties
        }
      };
    });

    res.json({
      node: {
        id: id,
        label: node.properties.name || node.properties.value || `Node ${id}`,
        type: labels[0] || 'Unknown',
        properties: node.properties,
        labels: labels
      },
      neighbors
    });

  } catch (error) {
    console.error('Error fetching node details:', error);
    res.status(500).json({ error: 'Failed to fetch node details', details: error.message });
  } finally {
    await session.close();
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  const session = driver.session();

  try {
    const nodeCountResult = await session.run('MATCH (n) RETURN count(n) as nodeCount');
    const relCountResult = await session.run('MATCH ()-[r]->() RETURN count(r) as relCount');
    const nodeTypesResult = await session.run('MATCH (n) RETURN labels(n)[0] as type, count(n) as count ORDER BY count DESC');
    const relTypesResult = await session.run('MATCH ()-[r]->() RETURN type(r) as type, count(r) as count ORDER BY count DESC');

    const nodeCount = nodeCountResult.records[0].get('nodeCount').toNumber();
    const relCount = relCountResult.records[0].get('relCount').toNumber();

    const nodeTypes = nodeTypesResult.records.map(record => ({
      type: record.get('type') || 'Unknown',
      count: record.get('count').toNumber()
    }));

    const relTypes = relTypesResult.records.map(record => ({
      type: record.get('type'),
      count: record.get('count').toNumber()
    }));

    res.json({
      nodeCount,
      relCount,
      nodeTypes,
      relTypes
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
  } finally {
    await session.close();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`COBOL Knowledge Graph API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await driver.close();
  process.exit(0);
});