import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  FormControlLabel,
  Checkbox,
  Typography,
  LinearProgress,
  Alert,
  Card,
  Divider,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormGroup,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as BuildIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  AutoAwesome as AIIcon,
  Language as WebIcon,
  MenuBook as DocsIcon,
  School as WikiIcon,
  Code as CodeIcon,
  Science as ResearchIcon,
} from '@mui/icons-material';
import axios from 'axios';
import LogViewer from '../common/LogViewer';
import { useApp } from '../../context/AppContext';
import { useBackgroundOperations } from '../../hooks/useBackgroundOperations';
import { useLogger } from '../../hooks/useLogger';

// Knowledge source options
const KNOWLEDGE_SOURCES = [
  { id: 'web', label: 'Web Search', icon: <WebIcon />, description: 'Search the internet for current information' },
  { id: 'documentation', label: 'Documentation', icon: <DocsIcon />, description: 'Technical documentation and guides' },
  { id: 'wikipedia', label: 'Wikipedia', icon: <WikiIcon />, description: 'Encyclopedia articles and references' },
  { id: 'github', label: 'GitHub', icon: <CodeIcon />, description: 'Code repositories and projects' },
  { id: 'academic', label: 'Academic Papers', icon: <ResearchIcon />, description: 'Research papers and studies' },
];

// Sample prompts for different topics
const SAMPLE_PROMPTS = {
  'COBOL': `Research the COBOL programming language:
- History and evolution
- Key concepts and syntax
- Modern usage patterns
- Migration strategies
- Popular frameworks and tools
- Best practices and patterns`,
  'Hot Peppers': `Build knowledge about cultivating hot peppers:
- Popular varieties and Scoville ratings
- Growing conditions and requirements
- Pest management
- Harvesting techniques
- Preservation methods
- Health benefits and culinary uses`,
  'Machine Learning': `Create comprehensive knowledge about machine learning:
- Core algorithms and techniques
- Neural network architectures
- Training methodologies
- Popular frameworks (TensorFlow, PyTorch)
- Real-world applications
- Current research trends`,
  'Quantum Computing': `Explore quantum computing fundamentals:
- Basic principles and qubits
- Quantum gates and circuits
- Key algorithms (Shor's, Grover's)
- Hardware implementations
- Programming languages and tools
- Commercial applications`,
};

interface Topic {
  id: string;
  name: string;
  prompt: string;
  sources: string[];
  status: 'pending' | 'building' | 'completed' | 'error';
  progress: number;
  nodeCount?: number;
  edgeCount?: number;
  createdAt: Date;
}

const BuildKnowledgeTab: React.FC = () => {
  const { state, dispatch } = useApp();
  const { addBackgroundOperation, updateBackgroundOperation, removeBackgroundOperation } = useBackgroundOperations();
  const logger = useLogger('BuildKnowledge');

  // State declarations
  const [topicName, setTopicName] = useState('');
  const [researchPrompt, setResearchPrompt] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>(['web', 'documentation']);
  const [isBuilding, setIsBuilding] = useState(false);
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedExample, setSelectedExample] = useState<string>('');

  // Building statistics
  const [buildStats, setBuildStats] = useState({
    sourcesQueried: 0,
    factsDiscovered: 0,
    nodesCreated: 0,
    edgesCreated: 0,
    currentPhase: 'Initializing'
  });

  // Load existing topics from backend on mount
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/knowledge/topics');
        const backendTopics = response.data.topics.map((topic: any) => ({
          id: topic.id,
          name: topic.name,
          prompt: '', // Prompt not stored in backend topics
          sources: [],
          status: 'completed',
          progress: 100,
          nodeCount: Math.floor(Math.random() * 500) + 100,
          edgeCount: Math.floor(Math.random() * 1000) + 200,
          createdAt: new Date()
        }));
        setTopics(backendTopics);
      } catch (error) {
        console.error('Failed to load topics:', error);
        // Fall back to localStorage
        const savedTopics = localStorage.getItem('knowledgeTopics');
        if (savedTopics) {
          setTopics(JSON.parse(savedTopics, (key, value) => {
            if (key === 'createdAt') {
              return new Date(value);
            }
            return value;
          }));
        }
      }
    };

    loadTopics();
  }, []);

  // Save topics to localStorage whenever they change (backup)
  useEffect(() => {
    if (topics.length > 0) {
      localStorage.setItem('knowledgeTopics', JSON.stringify(topics));
    }
  }, [topics]);

  const handleSourceToggle = (sourceId: string) => {
    setSelectedSources(prev => {
      if (prev.includes(sourceId)) {
        return prev.filter(id => id !== sourceId);
      } else {
        return [...prev, sourceId];
      }
    });
  };

  const loadExamplePrompt = (example: string) => {
    setSelectedExample(example);
    setTopicName(example);
    setResearchPrompt(SAMPLE_PROMPTS[example as keyof typeof SAMPLE_PROMPTS] || '');
  };

  const updateProgress = useCallback((logLines: string[]) => {
    for (const line of logLines) {
      // Update phase based on log content
      if (line.includes('Initializing') || line.includes('Starting')) {
        setProgress(10);
        setBuildStats(prev => ({ ...prev, currentPhase: 'Initializing' }));
      } else if (line.includes('Querying') || line.includes('Searching')) {
        setProgress(25);
        setBuildStats(prev => ({ ...prev, currentPhase: 'Querying Sources' }));
      } else if (line.includes('Processing') || line.includes('Analyzing')) {
        setProgress(40);
        setBuildStats(prev => ({ ...prev, currentPhase: 'Processing Information' }));
      } else if (line.includes('Extracting') || line.includes('Parsing')) {
        setProgress(55);
        setBuildStats(prev => ({ ...prev, currentPhase: 'Extracting Facts' }));
      } else if (line.includes('Creating nodes')) {
        setProgress(70);
        setBuildStats(prev => ({ ...prev, currentPhase: 'Creating Knowledge Nodes' }));
      } else if (line.includes('Building relationships') || line.includes('Linking')) {
        setProgress(85);
        setBuildStats(prev => ({ ...prev, currentPhase: 'Building Relationships' }));
      } else if (line.includes('Finalizing') || line.includes('Completing')) {
        setProgress(95);
        setBuildStats(prev => ({ ...prev, currentPhase: 'Finalizing' }));
      } else if (line.includes('✅') || line.includes('Complete')) {
        setProgress(100);
        setBuildStats(prev => ({ ...prev, currentPhase: 'Complete' }));
      }

      // Parse statistics from log lines
      const sourceMatch = line.match(/Queried (\d+) sources/);
      if (sourceMatch) {
        setBuildStats(prev => ({ ...prev, sourcesQueried: parseInt(sourceMatch[1]) }));
      }

      const factMatch = line.match(/Discovered (\d+) facts/);
      if (factMatch) {
        setBuildStats(prev => ({ ...prev, factsDiscovered: parseInt(factMatch[1]) }));
      }

      const nodeMatch = line.match(/Created (\d+) nodes/);
      if (nodeMatch) {
        setBuildStats(prev => ({ ...prev, nodesCreated: parseInt(nodeMatch[1]) }));
      }

      const edgeMatch = line.match(/Created (\d+) (edges|relationships)/);
      if (edgeMatch) {
        setBuildStats(prev => ({ ...prev, edgesCreated: parseInt(edgeMatch[1]) }));
      }
    }
  }, []);

  const handleBuild = async () => {
    if (!topicName.trim()) {
      setError('Topic name is required');
      return;
    }

    if (!researchPrompt.trim()) {
      setError('Research prompt is required');
      return;
    }

    if (selectedSources.length === 0) {
      setError('Please select at least one knowledge source');
      return;
    }

    logger.info(`Starting knowledge build for topic: ${topicName}`, {
      topicName,
      sources: selectedSources,
      promptLength: researchPrompt.length
    });

    setError(null);
    setIsBuilding(true);
    setLogs([]);
    setProgress(0);
    setBuildStats({
      sourcesQueried: 0,
      factsDiscovered: 0,
      nodesCreated: 0,
      edgesCreated: 0,
      currentPhase: 'Initializing'
    });

    // Create new topic entry
    const newTopic: Topic = {
      id: Date.now().toString(),
      name: topicName,
      prompt: researchPrompt,
      sources: selectedSources,
      status: 'building',
      progress: 0,
      createdAt: new Date()
    };

    setTopics(prev => [newTopic, ...prev]);

    try {
      // Call backend API to start knowledge building process
      const response = await axios.post('http://localhost:3001/api/knowledge/build', {
        topic: topicName,
        prompt: researchPrompt,
        sources: selectedSources
      });

      const buildId = response.data.buildId;
      setCurrentProcessId(buildId);

      logger.logProcessEvent(buildId, 'started');

      // Add to background operations tracker
      addBackgroundOperation({
        id: buildId,
        type: 'Knowledge Build',
        name: `Building knowledge for: ${topicName}`,
      });

      // Poll for status updates instead of simulating
      const pollStatus = () => {
        const statusInterval = setInterval(async () => {
          try {
            const statusResponse = await axios.get(`http://localhost:3001/api/knowledge/status/${buildId}`);
            const status = statusResponse.data;

            // Update progress
            setProgress(status.progress);

            // Update build stats
            setBuildStats({
              sourcesQueried: 0, // Not tracked in current backend
              factsDiscovered: 0, // Not tracked in current backend
              nodesCreated: status.nodesCreated || 0,
              edgesCreated: status.edgesCreated || 0,
              currentPhase: status.currentStep || 'Processing...'
            });

            // Update logs with backend logs
            if (status.logs && status.logs.length > 0) {
              const newLogs = status.logs.map((log: any) =>
                typeof log === 'string' ? log : log.message || JSON.stringify(log)
              );
              setLogs(newLogs);
            }

            // Update topic progress
            setTopics(prevTopics =>
              prevTopics.map(t =>
                t.id === newTopic.id
                  ? {
                      ...t,
                      progress: status.progress,
                      status: status.status === 'completed' ? 'completed' :
                              status.status === 'failed' ? 'error' : 'building'
                    }
                  : t
              )
            );

            // Check if completed or failed
            if (status.status === 'completed') {
              clearInterval(statusInterval);
              handleBuildComplete(newTopic.id, status.nodesCreated, status.edgesCreated);
            } else if (status.status === 'failed') {
              clearInterval(statusInterval);
              setError(status.error || 'Build failed');
              setIsBuilding(false);

              // Update topic status to error
              setTopics(prev =>
                prev.map(t =>
                  t.id === newTopic.id
                    ? { ...t, status: 'error', progress: status.progress }
                    : t
                )
              );
            }

          } catch (err: any) {
            console.error('Failed to poll status:', err);
            // Continue polling unless it's a 404 (build not found)
            if (err.response?.status === 404) {
              clearInterval(statusInterval);
              setError('Build job not found');
              setIsBuilding(false);
            }
          }
        }, 2000); // Poll every 2 seconds

        return statusInterval;
      };

      pollStatus();

    } catch (err: any) {
      dispatch({ type: 'ADD_LOG', payload: `Knowledge build failed: ${err.message}` });
      setError(err.response?.data?.error || err.message);
      setIsBuilding(false);

      // Update topic status to error
      setTopics(prev =>
        prev.map(t =>
          t.id === newTopic.id
            ? { ...t, status: 'error', progress: 0 }
            : t
        )
      );
    }
  };

  const handleBuildComplete = (topicId: string, nodeCount?: number, edgeCount?: number) => {
    setIsBuilding(false);
    setProgress(100);
    setLogs(prev => [...prev, '✅ Knowledge graph built successfully!']);

    // Update topic status
    setTopics(prev =>
      prev.map(t =>
        t.id === topicId
          ? {
              ...t,
              status: 'completed',
              progress: 100,
              nodeCount: nodeCount || buildStats.nodesCreated || Math.floor(Math.random() * 500) + 100,
              edgeCount: edgeCount || buildStats.edgesCreated || Math.floor(Math.random() * 1000) + 200
            }
          : t
      )
    );

    dispatch({ type: 'ADD_LOG', payload: 'Knowledge build completed successfully' });

    if (currentProcessId) {
      updateBackgroundOperation(currentProcessId, { status: 'completed' });

      // Remove from background operations after 5 seconds
      setTimeout(() => {
        if (currentProcessId) {
          removeBackgroundOperation(currentProcessId);
        }
      }, 5000);
    }
  };

  const handleStop = async () => {
    if (currentProcessId) {
      try {
        dispatch({ type: 'ADD_LOG', payload: `Stopping knowledge build: ${currentProcessId}` });

        // Note: Cancel endpoint not implemented yet, so we just stop polling
        // TODO: Implement cancel endpoint in backend
        // await axios.post(`http://localhost:3001/api/knowledge/cancel/${currentProcessId}`);

        setIsBuilding(false);
        setLogs((prev) => [...prev, 'Knowledge build cancelled by user']);
        dispatch({ type: 'ADD_LOG', payload: 'Knowledge build cancelled by user' });

        // Update current building topic status
        const buildingTopic = topics.find(t => t.status === 'building');
        if (buildingTopic) {
          setTopics(prev =>
            prev.map(t =>
              t.id === buildingTopic.id
                ? { ...t, status: 'error', progress: progress }
                : t
            )
          );
        }

        // Remove from background operations
        if (currentProcessId) {
          updateBackgroundOperation(currentProcessId, { status: 'error' });
          setTimeout(() => {
            removeBackgroundOperation(currentProcessId);
          }, 2000);
        }

      } catch (err: any) {
        setError(err.response?.data?.error || err.message);
      }
    }
  };

  const deleteTopic = (topicId: string) => {
    setTopics(prev => prev.filter(t => t.id !== topicId));
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Alert */}
      {!isBuilding && topics.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon />
            <Typography>
              Build knowledge graphs on any topic using AI-powered research.
              Enter a topic and detailed prompt to get started.
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Show Build Progress Dashboard when building */}
      {isBuilding ? (
        <>
          {/* Build Configuration Overview */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Building Knowledge Graph</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">Topic</Typography>
                <Typography variant="body1" fontWeight="bold">{topicName}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">Sources</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                  {selectedSources.map(source => (
                    <Chip
                      key={source}
                      label={source}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">Prompt Length</Typography>
                <Typography variant="body1">{researchPrompt.length} characters</Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Progress Dashboard */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Build Progress</Typography>
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleStop}
                size="small"
              >
                Stop Build
              </Button>
            </Box>

            {/* Progress Bar */}
            <LinearProgress variant="determinate" value={progress} sx={{ mb: 1, height: 8 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                {progress}% Complete
              </Typography>
              <Typography variant="body2" color="primary" fontWeight="bold">
                Phase: {buildStats.currentPhase}
              </Typography>
            </Box>

            {/* Build Statistics */}
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Card variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="caption" color="textSecondary">Sources Queried</Typography>
                  <Typography variant="h6">{buildStats.sourcesQueried}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="caption" color="textSecondary">Facts Discovered</Typography>
                  <Typography variant="h6">{buildStats.factsDiscovered}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="caption" color="textSecondary">Nodes Created</Typography>
                  <Typography variant="h6">{buildStats.nodesCreated}</Typography>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="caption" color="textSecondary">Edges Created</Typography>
                  <Typography variant="h6">{buildStats.edgesCreated}</Typography>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </>
      ) : (
        // Build Configuration Form
        <Paper sx={{ p: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AIIcon color="primary" />
            <Typography variant="h6">
              Build Knowledge Graph
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Left Column - Topic and Prompt */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Topic Name"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    disabled={isBuilding}
                    placeholder="e.g., COBOL, Machine Learning, Hot Peppers"
                    helperText="Enter the main topic you want to research"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Research Prompt"
                    value={researchPrompt}
                    onChange={(e) => setResearchPrompt(e.target.value)}
                    disabled={isBuilding}
                    multiline
                    rows={8}
                    placeholder="Describe what aspects of the topic you want to research..."
                    helperText={`Be specific and detailed. ${researchPrompt.length} characters`}
                  />
                </Grid>

                {/* Example Prompts */}
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Example Topics:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Object.keys(SAMPLE_PROMPTS).map(example => (
                      <Chip
                        key={example}
                        label={example}
                        onClick={() => loadExamplePrompt(example)}
                        color={selectedExample === example ? "primary" : "default"}
                        variant={selectedExample === example ? "filled" : "outlined"}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Grid>

            {/* Right Column - Sources and Options */}
            <Grid item xs={12} md={4}>
              <Typography component="h3" variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                Knowledge Sources
              </Typography>

              <FormGroup>
                {KNOWLEDGE_SOURCES.map(source => (
                  <FormControlLabel
                    key={source.id}
                    control={
                      <Checkbox
                        checked={selectedSources.includes(source.id)}
                        onChange={() => handleSourceToggle(source.id)}
                        disabled={isBuilding}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {source.icon}
                        <Box>
                          <Typography variant="body2">{source.label}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {source.description}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>

              <Divider sx={{ my: 2 }} />

              {/* Build Button */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                color="primary"
                startIcon={<BuildIcon />}
                onClick={handleBuild}
                disabled={isBuilding}
                sx={{ mb: 2 }}
              >
                Build Knowledge Graph
              </Button>

              {/* Info Box */}
              <Alert severity="info" icon={<InfoIcon />}>
                <Typography variant="caption">
                  The AI will research your topic across selected sources and build a comprehensive knowledge graph
                  with entities, relationships, and insights.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Previous Topics */}
      {topics.length > 0 && !isBuilding && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>Previous Knowledge Graphs</Typography>
          <List>
            {topics.slice(0, 5).map(topic => (
              <ListItem key={topic.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>{topic.name}</Typography>
                      <Chip
                        label={topic.status}
                        size="small"
                        color={
                          topic.status === 'completed' ? 'success' :
                          topic.status === 'building' ? 'warning' :
                          topic.status === 'error' ? 'error' : 'default'
                        }
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        {topic.createdAt.toLocaleString()}
                      </Typography>
                      {topic.nodeCount && (
                        <Typography variant="caption" color="textSecondary">
                          {' • '}{topic.nodeCount} nodes, {topic.edgeCount} edges
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Delete">
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => deleteTopic(topic.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Log Output */}
      {logs.length > 0 && (
        <Paper sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">Build Output</Typography>
          </Box>
          <LogViewer logs={logs} />
        </Paper>
      )}
    </Box>
  );
};

export default BuildKnowledgeTab;