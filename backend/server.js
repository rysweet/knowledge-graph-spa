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

// Clear the entire database
app.post('/api/clear-database', async (req, res) => {
  console.log('Clear database request received');
  const session = driver.session();

  try {
    // Delete all nodes and relationships
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('Database cleared successfully');
    res.json({
      success: true,
      message: 'Database cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing database:', error);
    res.status(500).json({
      error: 'Failed to clear database',
      details: error.message
    });
  } finally {
    await session.close();
  }
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

    buildJob.currentStep = 'Creating knowledge nodes and sources...';
    buildJob.progress = 60;

    let nodesCreated = 1; // Root node
    let edgesCreated = 0;

    // First, create all unique source nodes
    const uniqueSources = new Set();
    knowledgeNodes.forEach(node => {
      if (node.sources) {
        node.sources.forEach(source => uniqueSources.add(source));
      }
    });

    buildJob.currentStep = 'Creating source nodes...';
    buildJob.progress = 50;

    const sourceNodeIds = {};
    for (const sourceName of uniqueSources) {
      const sourceResult = await session.run(`
        MERGE (s:SOURCE {name: $name})
        ON CREATE SET
          s.type = 'Reference',
          s.created = datetime(),
          s.topic = $topic
        RETURN s, id(s) as sourceId
      `, {
        name: sourceName,
        topic: buildJob.topic
      });

      sourceNodeIds[sourceName] = sourceResult.records[0].get('sourceId').toNumber();
      nodesCreated++;
      buildJob.logs.push({ timestamp: new Date(), message: `Created source: ${sourceName}` });
    }

    buildJob.currentStep = 'Creating concept nodes...';
    buildJob.progress = 60;

    for (const nodeData of knowledgeNodes) {
      // Create node with enhanced properties
      const nodeResult = await session.run(`
        CREATE (n:CONCEPT {
          name: $name,
          type: $type,
          description: $description,
          details: $details,
          topic: $topic,
          created: datetime()
        })
        RETURN n, id(n) as nodeId
      `, {
        name: nodeData.name,
        type: nodeData.type,
        description: nodeData.description,
        details: nodeData.details || nodeData.description,
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

      // Connect concept to its sources
      if (nodeData.sources) {
        for (const sourceName of nodeData.sources) {
          const sourceId = sourceNodeIds[sourceName];
          if (sourceId) {
            await session.run(`
              MATCH (concept) WHERE id(concept) = $conceptId
              MATCH (source) WHERE id(source) = $sourceId
              CREATE (concept)-[:SOURCED_FROM]->(source)
            `, { conceptId: nodeId, sourceId });
            edgesCreated++;
          }
        }
      }

      buildJob.logs.push({ timestamp: new Date(), message: `Created concept: ${nodeData.name} (${nodeData.type}) with ${nodeData.sources ? nodeData.sources.length : 0} sources` });
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
      {
        name: 'IDENTIFICATION DIVISION',
        type: 'DIVISION',
        description: 'Program identification section that contains metadata about the COBOL program including program name, author, date, and purpose.',
        details: 'The IDENTIFICATION DIVISION is the first division in a COBOL program and provides essential program documentation.',
        sources: ['IBM COBOL Language Reference', 'Enterprise COBOL Programming Guide']
      },
      {
        name: 'DATA DIVISION',
        type: 'DIVISION',
        description: 'Defines all data structures, file descriptions, and working storage variables used in the program.',
        details: 'Contains FILE SECTION for file descriptions, WORKING-STORAGE SECTION for program variables, and LINKAGE SECTION for parameter passing.',
        sources: ['IBM COBOL Language Reference', 'COBOL Standard ISO/IEC 1989:2014']
      },
      {
        name: 'PROCEDURE DIVISION',
        type: 'DIVISION',
        description: 'Contains the executable code and program logic using paragraphs and sections.',
        details: 'This division contains all the statements that perform the actual processing of data. It is organized into paragraphs and sections.',
        sources: ['IBM Enterprise COBOL Documentation', 'COBOL Programming Guide']
      },
      {
        name: 'WORKING-STORAGE SECTION',
        type: 'SECTION',
        description: 'Declares variables that persist throughout program execution and retain their values between calls.',
        details: 'Variables defined here are initialized once when the program starts and maintain their values throughout the program lifecycle.',
        sources: ['IBM COBOL Language Reference', 'Micro Focus COBOL Documentation']
      },
      {
        name: 'MOVE statement',
        type: 'STATEMENT',
        description: 'Transfers data from source to destination with automatic type conversion when compatible.',
        details: 'The MOVE statement is one of the most frequently used statements in COBOL. It handles numeric, alphanumeric, and group moves with implicit conversions.',
        sources: ['COBOL Language Specification', 'IBM Enterprise COBOL Reference']
      },
      {
        name: 'PERFORM statement',
        type: 'STATEMENT',
        description: 'Executes paragraphs or sections either once or repetitively based on conditions.',
        details: 'PERFORM provides structured programming capabilities including PERFORM UNTIL (loop), PERFORM TIMES (counted loop), and PERFORM VARYING (for loop).',
        sources: ['IBM COBOL Language Reference', 'COBOL Control Flow Documentation']
      }
    ],
    '.NET': [
      {
        name: 'C# Language',
        type: 'LANGUAGE',
        description: 'Modern, object-oriented programming language developed by Microsoft for the .NET platform.',
        details: 'C# combines the power of C++ with the simplicity of Visual Basic. It supports strong typing, imperative, declarative, functional, generic, and component-oriented programming.',
        sources: ['Microsoft C# Documentation', 'C# Language Specification', '.NET Foundation']
      },
      {
        name: 'Common Language Runtime',
        type: 'RUNTIME',
        description: 'The virtual machine component of .NET that manages memory, executes code, and provides services.',
        details: 'CLR provides memory management, exception handling, security, and garbage collection. It enables cross-language interoperability through Common Type System (CTS).',
        sources: ['Microsoft CLR Documentation', '.NET Architecture Guide']
      },
      {
        name: 'Base Class Library',
        type: 'LIBRARY',
        description: 'Comprehensive set of standard classes and functions available to all .NET languages.',
        details: 'BCL includes collections, I/O, threading, networking, reflection, serialization, and fundamental types. It provides consistent programming model across languages.',
        sources: ['Microsoft .NET API Reference', '.NET Base Class Library Documentation']
      },
      {
        name: 'Garbage Collector',
        type: 'COMPONENT',
        description: 'Automatic memory management system that reclaims memory from unreferenced objects.',
        details: 'The GC uses generational collection (Gen 0, 1, 2) and various modes including workstation and server GC. It helps prevent memory leaks and improves application performance.',
        sources: ['Microsoft GC Documentation', '.NET Memory Management Guide']
      },
      {
        name: 'LINQ',
        type: 'FEATURE',
        description: 'Language Integrated Query provides native query capabilities for collections and data sources.',
        details: 'LINQ enables SQL-like queries directly in C# and VB.NET. It supports query syntax and method syntax, working with IEnumerable and IQueryable interfaces.',
        sources: ['Microsoft LINQ Documentation', 'C# Programming Guide']
      },
      {
        name: 'ASP.NET Core',
        type: 'FRAMEWORK',
        description: 'Cross-platform, high-performance framework for building modern web applications and APIs.',
        details: 'ASP.NET Core supports MVC, Razor Pages, Blazor, and Web APIs. It features built-in dependency injection, middleware pipeline, and excellent performance.',
        sources: ['Microsoft ASP.NET Core Documentation', 'ASP.NET Core Fundamentals']
      }
    ],
    'AI': [
      {
        name: 'Machine Learning',
        type: 'CONCEPT',
        description: 'Branch of AI that enables systems to learn and improve from experience without explicit programming.',
        details: 'ML algorithms build mathematical models based on training data to make predictions or decisions. Includes supervised, unsupervised, and reinforcement learning paradigms.',
        sources: ['Pattern Recognition and Machine Learning - Bishop', 'The Elements of Statistical Learning', 'Google AI Research Papers']
      },
      {
        name: 'Neural Networks',
        type: 'ARCHITECTURE',
        description: 'Computing systems inspired by biological neural networks that process information using interconnected nodes.',
        details: 'Composed of layers of artificial neurons with weighted connections. Learns through backpropagation and gradient descent. Foundation for deep learning.',
        sources: ['Deep Learning - Ian Goodfellow', 'Neural Networks and Deep Learning - Michael Nielsen', 'MIT Deep Learning Course']
      },
      {
        name: 'Natural Language Processing',
        type: 'FIELD',
        description: 'AI field focused on enabling computers to understand, interpret, and generate human language.',
        details: 'Combines computational linguistics with machine learning. Includes tasks like tokenization, parsing, sentiment analysis, machine translation, and question answering.',
        sources: ['Speech and Language Processing - Jurafsky & Martin', 'Stanford NLP Course', 'ACL Conference Proceedings']
      },
      {
        name: 'Computer Vision',
        type: 'FIELD',
        description: 'Field that enables computers to extract meaningful information from digital images and videos.',
        details: 'Uses convolutional neural networks for tasks like image classification, object detection, segmentation, and facial recognition. Key architectures include ResNet, YOLO, and Vision Transformers.',
        sources: ['Computer Vision: Algorithms and Applications - Szeliski', 'CS231n Stanford Course', 'CVPR Conference Papers']
      },
      {
        name: 'Reinforcement Learning',
        type: 'METHOD',
        description: 'Learning paradigm where agents learn optimal behavior through trial and error interactions with an environment.',
        details: 'Based on reward signals and the goal of maximizing cumulative reward. Key concepts include policies, value functions, and Q-learning. Used in game playing, robotics, and autonomous systems.',
        sources: ['Reinforcement Learning: An Introduction - Sutton & Barto', 'DeepMind Research Papers', 'OpenAI Gym Documentation']
      },
      {
        name: 'Large Language Models',
        type: 'MODEL',
        description: 'Massive neural networks trained on vast text corpora to understand and generate human-like text.',
        details: 'Transformer-based architectures with billions of parameters. Examples include GPT, BERT, and T5. Capable of few-shot learning, reasoning, and diverse language tasks.',
        sources: ['Attention Is All You Need Paper', 'OpenAI GPT Papers', 'Google BERT Research', 'Anthropic Research Publications']
      }
    ],
    'Hot Peppers': [
      {
        name: 'Capsaicin',
        type: 'COMPOUND',
        description: 'Active compound in chili peppers that produces the burning sensation and binds to pain receptors.',
        details: 'Chemical formula C18H27NO3. Hydrophobic molecule that binds to TRPV1 receptors. Used medicinally for pain relief and has antimicrobial properties.',
        sources: ['Journal of Food Science', 'Pharmacological Reviews', 'Chile Pepper Institute Research']
      },
      {
        name: 'Scoville Scale',
        type: 'MEASUREMENT',
        description: 'Measurement of pungency (spiciness) of chili peppers based on capsaicinoid concentration.',
        details: 'Developed by Wilbur Scoville in 1912. Originally used organoleptic test, now measured using chromatography. Ranges from 0 (bell pepper) to over 3 million SHU.',
        sources: ['American Spice Trade Association', 'Journal of Chromatography', 'Scoville Organoleptic Test Paper']
      },
      {
        name: 'Carolina Reaper',
        type: 'VARIETY',
        description: 'World record holder for hottest pepper, averaging 1.64 million Scoville Heat Units.',
        details: 'Developed by Ed Currie of PuckerButt Pepper Company. Cross between Pakistani Naga and Red Habanero. Guinness World Record holder since 2013.',
        sources: ['Guinness World Records', 'PuckerButt Pepper Company', 'Chile Pepper Magazine']
      },
      {
        name: 'Habanero',
        type: 'VARIETY',
        description: 'Extremely hot pepper variety ranging from 100,000 to 350,000 SHU, originally from the Amazon.',
        details: 'Named after Havana (La Habana). Popular in Caribbean and Mexican cuisine. Contains high levels of capsaicin and vitamin C. Comes in various colors.',
        sources: ['International Journal of Food Sciences', 'Caribbean Agricultural Research', 'Mexico Agricultural Department']
      },
      {
        name: 'Jalapeño',
        type: 'VARIETY',
        description: 'Medium-hot pepper (2,500-8,000 SHU) widely used in Mexican cuisine and popular worldwide.',
        details: 'Named after Xalapa, Veracruz. Most popular chili in the US. When smoked and dried becomes chipotle. Rich in vitamins A, C, and potassium.',
        sources: ['USDA Agricultural Research Service', 'Mexican Culinary Institute', 'Journal of Agricultural and Food Chemistry']
      },
      {
        name: 'Ghost Pepper',
        type: 'VARIETY',
        description: 'Bhut jolokia from India, over 1 million SHU, formerly the world\'s hottest pepper.',
        details: 'Native to Northeast India, particularly Assam. Used as elephant deterrent and in military grade pepper spray. Held world record from 2007-2011.',
        sources: ['Defence Research and Development Organisation India', 'Asian Journal of Chemistry', 'New Mexico State University Chile Pepper Institute']
      }
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
      description: `Concept related to ${word}`,
      details: `This is a key concept in the context of ${topic}. Further research needed to expand this knowledge.`,
      sources: ['User Research', 'Domain Knowledge Base', `${topic} Documentation`]
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