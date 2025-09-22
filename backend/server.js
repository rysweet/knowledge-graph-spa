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

// In-memory storage for knowledge building jobs
const buildJobs = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Knowledge Graph API is running' });
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

// KNOWLEDGE BUILDING ENDPOINTS

// Simple ID generator
function generateBuildId() {
  return `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get available topics with their root nodes
app.get('/api/knowledge/topics', async (req, res) => {
  const session = driver.session();

  try {
    // Find all root nodes (nodes with 'TOPIC' label or nodes that have no incoming relationships)
    const topicsResult = await session.run(`
      MATCH (n)
      WHERE 'TOPIC' IN labels(n) OR NOT exists((n)<-[]-())
      RETURN DISTINCT n, labels(n) as labels, id(n) as id
      ORDER BY n.name, n.value
    `);

    const topics = topicsResult.records.map(record => {
      const node = record.get('n');
      const labels = record.get('labels');
      const id = record.get('id').toNumber();

      return {
        id: id.toString(),
        name: node.properties.name || node.properties.value || `Topic ${id}`,
        type: labels[0] || 'TOPIC',
        properties: node.properties,
        labels: labels
      };
    });

    res.json({ topics });

  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: 'Failed to fetch topics', details: error.message });
  } finally {
    await session.close();
  }
});

// Start knowledge building process
app.post('/api/knowledge/build', async (req, res) => {
  const { topic, prompt, sources = [] } = req.body;

  if (!topic || !prompt) {
    return res.status(400).json({ error: 'Topic and prompt are required' });
  }

  const buildId = generateBuildId();
  const buildJob = {
    id: buildId,
    topic,
    prompt,
    sources,
    status: 'queued',
    startTime: new Date(),
    progress: 0,
    currentStep: 'Initializing...',
    logs: [],
    nodesCreated: 0,
    edgesCreated: 0
  };

  buildJobs.set(buildId, buildJob);

  // Start the knowledge building process asynchronously
  buildKnowledgeGraph(buildJob).catch(error => {
    console.error('Knowledge building failed:', error);
    buildJob.status = 'failed';
    buildJob.error = error.message;
  });

  res.json({
    buildId,
    status: 'queued',
    message: 'Knowledge building process started'
  });
});

// Get build status
app.get('/api/knowledge/status/:buildId', (req, res) => {
  const { buildId } = req.params;
  const buildJob = buildJobs.get(buildId);

  if (!buildJob) {
    return res.status(404).json({ error: 'Build job not found' });
  }

  res.json({
    id: buildJob.id,
    topic: buildJob.topic,
    status: buildJob.status,
    progress: buildJob.progress,
    currentStep: buildJob.currentStep,
    startTime: buildJob.startTime,
    endTime: buildJob.endTime,
    nodesCreated: buildJob.nodesCreated,
    edgesCreated: buildJob.edgesCreated,
    logs: buildJob.logs.slice(-10), // Return last 10 log entries
    error: buildJob.error
  });
});

// Agentic research and knowledge building function
async function buildKnowledgeGraph(buildJob) {
  const session = driver.session();

  try {
    buildJob.status = 'running';
    buildJob.currentStep = 'Starting agentic research...';
    buildJob.progress = 10;
    buildJob.logs.push({ timestamp: new Date(), message: `Starting knowledge building for topic: ${buildJob.topic}` });

    // Create or find root node for this topic
    buildJob.currentStep = 'Creating root topic node...';
    buildJob.progress = 20;

    const rootNodeResult = await session.run(`
      MERGE (root:TOPIC {name: $topic})
      SET root.created = datetime()
      RETURN root, id(root) as rootId
    `, { topic: buildJob.topic });

    const rootId = rootNodeResult.records[0].get('rootId').toNumber();
    buildJob.logs.push({ timestamp: new Date(), message: `Created root node: ${buildJob.topic} (ID: ${rootId})` });

    // Simulate agentic research process
    buildJob.currentStep = 'Conducting agentic research...';
    buildJob.progress = 40;

    // Create sample knowledge nodes based on the topic and prompt
    const knowledgeNodes = await generateKnowledgeNodes(buildJob.topic, buildJob.prompt);

    buildJob.currentStep = 'Creating knowledge nodes...';
    buildJob.progress = 60;

    let nodesCreated = 1; // Root node
    let edgesCreated = 0;

    for (const nodeData of knowledgeNodes) {
      // Create node
      const nodeResult = await session.run(`
        CREATE (n:CONCEPT {
          name: $name,
          type: $type,
          description: $description,
          topic: $topic,
          created: datetime()
        })
        RETURN n, id(n) as nodeId
      `, {
        name: nodeData.name,
        type: nodeData.type,
        description: nodeData.description,
        topic: buildJob.topic
      });

      const nodeId = nodeResult.records[0].get('nodeId').toNumber();
      nodesCreated++;

      // Connect to root node
      await session.run(`
        MATCH (root:TOPIC {name: $topic})
        MATCH (concept) WHERE id(concept) = $nodeId
        CREATE (root)-[:CONTAINS]->(concept)
      `, { topic: buildJob.topic, nodeId });

      edgesCreated++;

      buildJob.logs.push({ timestamp: new Date(), message: `Created node: ${nodeData.name} (${nodeData.type})` });
    }

    // Create relationships between concepts
    buildJob.currentStep = 'Creating relationships...';
    buildJob.progress = 80;

    // Create some sample relationships
    for (let i = 0; i < knowledgeNodes.length - 1; i++) {
      if (Math.random() > 0.5) { // 50% chance of creating a relationship
        const sourceIdx = i;
        const targetIdx = i + 1;

        await session.run(`
          MATCH (source:CONCEPT {name: $sourceName, topic: $topic})
          MATCH (target:CONCEPT {name: $targetName, topic: $topic})
          CREATE (source)-[:RELATES_TO]->(target)
        `, {
          sourceName: knowledgeNodes[sourceIdx].name,
          targetName: knowledgeNodes[targetIdx].name,
          topic: buildJob.topic
        });

        edgesCreated++;
      }
    }

    buildJob.currentStep = 'Completed successfully';
    buildJob.progress = 100;
    buildJob.status = 'completed';
    buildJob.endTime = new Date();
    buildJob.nodesCreated = nodesCreated;
    buildJob.edgesCreated = edgesCreated;
    buildJob.logs.push({
      timestamp: new Date(),
      message: `Knowledge building completed. Created ${nodesCreated} nodes and ${edgesCreated} edges.`
    });

  } catch (error) {
    buildJob.status = 'failed';
    buildJob.error = error.message;
    buildJob.endTime = new Date();
    buildJob.logs.push({ timestamp: new Date(), message: `Error: ${error.message}` });
    throw error;
  } finally {
    await session.close();
  }
}

// Generate sample knowledge nodes based on topic and prompt
async function generateKnowledgeNodes(topic, prompt) {
  // This is a simplified implementation - in a real system, this would use
  // actual AI agents to research and generate knowledge

  const topicTemplates = {
    'COBOL': [
      { name: 'IDENTIFICATION DIVISION', type: 'DIVISION', description: 'Program identification section' },
      { name: 'DATA DIVISION', type: 'DIVISION', description: 'Data structure definitions' },
      { name: 'PROCEDURE DIVISION', type: 'DIVISION', description: 'Program logic and procedures' },
      { name: 'WORKING-STORAGE SECTION', type: 'SECTION', description: 'Variable declarations' },
      { name: 'MOVE statement', type: 'STATEMENT', description: 'Data movement operation' },
      { name: 'PERFORM statement', type: 'STATEMENT', description: 'Control flow operation' }
    ],
    '.NET': [
      { name: 'C# Language', type: 'LANGUAGE', description: 'Primary .NET programming language' },
      { name: 'Common Language Runtime', type: 'RUNTIME', description: 'CLR execution environment' },
      { name: 'Base Class Library', type: 'LIBRARY', description: 'Standard .NET libraries' },
      { name: 'Garbage Collector', type: 'COMPONENT', description: 'Memory management system' },
      { name: 'LINQ', type: 'FEATURE', description: 'Language Integrated Query' },
      { name: 'ASP.NET Core', type: 'FRAMEWORK', description: 'Web application framework' }
    ],
    'AI': [
      { name: 'Machine Learning', type: 'CONCEPT', description: 'Algorithms that learn from data' },
      { name: 'Neural Networks', type: 'ARCHITECTURE', description: 'Brain-inspired computing models' },
      { name: 'Natural Language Processing', type: 'FIELD', description: 'AI for understanding text' },
      { name: 'Computer Vision', type: 'FIELD', description: 'AI for understanding images' },
      { name: 'Reinforcement Learning', type: 'METHOD', description: 'Learning through rewards' },
      { name: 'Large Language Models', type: 'MODEL', description: 'AI models trained on text' }
    ],
    'Hot Peppers': [
      { name: 'Capsaicin', type: 'COMPOUND', description: 'Chemical that makes peppers hot' },
      { name: 'Scoville Scale', type: 'MEASUREMENT', description: 'Scale for measuring pepper heat' },
      { name: 'Carolina Reaper', type: 'VARIETY', description: 'Currently hottest known pepper' },
      { name: 'Habanero', type: 'VARIETY', description: 'Popular hot pepper variety' },
      { name: 'Jalapeño', type: 'VARIETY', description: 'Mild to moderate hot pepper' },
      { name: 'Ghost Pepper', type: 'VARIETY', description: 'Very hot pepper variety' }
    ]
  };

  // Find matching template or create generic nodes
  let template = null;
  for (const [key, nodes] of Object.entries(topicTemplates)) {
    if (topic.toLowerCase().includes(key.toLowerCase())) {
      template = nodes;
      break;
    }
  }

  if (!template) {
    // Generate generic nodes based on prompt keywords
    const words = prompt.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    template = words.slice(0, 6).map((word, index) => ({
      name: word.charAt(0).toUpperCase() + word.slice(1),
      type: 'CONCEPT',
      description: `Concept related to ${word}`
    }));
  }

  return template;
}

// MCP STATUS ENDPOINTS

// Neo4j status endpoint
app.get('/api/neo4j/status', async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run('RETURN 1 as test');
    res.json({
      running: true,
      status: 'connected',
      message: 'Neo4j database is connected and responsive'
    });
  } catch (error) {
    res.json({
      running: false,
      status: 'disconnected',
      message: 'Neo4j database connection failed',
      error: error.message
    });
  } finally {
    await session.close();
  }
});

// MCP server status endpoint
app.get('/api/mcp/status', async (req, res) => {
  try {
    // Check if MCP server is running by looking for the process
    // This is a simplified check - in production you'd want to check actual MCP health
    const { spawn } = require('child_process');

    // For now, simulate MCP status based on whether we have the MCP infrastructure
    const mcpDir = require('path').join(__dirname, '..', 'src', 'mcp');
    const fs = require('fs');

    const mcpExists = fs.existsSync(mcpDir);
    const mcpServerExists = fs.existsSync(require('path').join(mcpDir, 'dist', 'server.js'));

    if (mcpExists && mcpServerExists) {
      res.json({
        running: true,
        status: 'connected',
        message: 'MCP server infrastructure is available',
        details: {
          mcp_directory: mcpExists,
          server_compiled: mcpServerExists,
          transport: 'http',
          capabilities: ['knowledge_building', 'graph_operations', 'agentic_research']
        }
      });
    } else {
      res.json({
        running: false,
        status: 'disconnected',
        message: 'MCP server infrastructure not found',
        details: {
          mcp_directory: mcpExists,
          server_compiled: mcpServerExists
        }
      });
    }
  } catch (error) {
    res.json({
      running: false,
      status: 'error',
      message: 'Error checking MCP status',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Knowledge Graph API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await driver.close();
  process.exit(0);
});