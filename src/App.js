import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Alert,
  CircularProgress
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  GetApp as ExportIcon,
  Code as CodeIcon,
  Create as CreateIcon,
  SmartToy as AgentIcon,
  Security as SecurityIcon,
  Description as DocsIcon,
  Receipt as LogsIcon,
  Terminal as CLIIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

import VisualizeTab from './components/VisualizeTab';
import { apiService } from './services/apiService';

// Dark theme matching Azure Tenant Grapher
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#0078d4',
    },
    secondary: {
      main: '#00bcf2',
    },
    background: {
      default: '#1a1a1a',
      paper: '#2d2d2d',
    },
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
    },
  },
  components: {
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minWidth: 100,
          fontWeight: 500,
          fontSize: '0.875rem',
          color: '#cccccc',
          '&.Mui-selected': {
            color: '#ffffff',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          backgroundColor: '#000000',
          borderBottom: '1px solid #333333',
        },
        indicator: {
          backgroundColor: '#0078d4',
          height: 3,
        },
      },
    },
  },
});

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      style={{ height: 'calc(100vh - 112px)', overflow: 'hidden' }}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState(2); // Start with Visualize tab
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  // Load initial data
  useEffect(() => {
    loadGraphData();
    loadStats();
  }, []);

  const loadGraphData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getGraph();
      setGraphData(data);
    } catch (err) {
      setError(`Failed to load graph data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await apiService.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleNodeSelect = async (nodeId) => {
    try {
      const nodeDetails = await apiService.getNodeDetails(nodeId);
      setSelectedNode(nodeDetails);
    } catch (err) {
      console.error('Failed to load node details:', err);
    }
  };

  const handleSearch = async (query, type) => {
    try {
      const results = await apiService.search(query, type);
      setSearchResults(results.nodes);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    }
  };

  const handleSearchResultSelect = (node) => {
    handleNodeSelect(node.id);
    // Highlight the node in the graph
    setGraphData(prevData => ({
      ...prevData,
      highlightedNode: node.id
    }));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const tabs = [
    { label: 'Status', icon: <DashboardIcon />, disabled: true },
    { label: 'Scan', icon: <SearchIcon />, disabled: true },
    { label: 'Visualize', icon: <VisibilityIcon />, disabled: false },
    { label: 'Export Spec', icon: <ExportIcon />, disabled: true },
    { label: 'Generate IaC', icon: <CodeIcon />, disabled: true },
    { label: 'Create Program', icon: <CreateIcon />, disabled: true },
    { label: 'Agent Mode', icon: <AgentIcon />, disabled: true },
    { label: 'Threat Model', icon: <SecurityIcon />, disabled: true },
    { label: 'Docs', icon: <DocsIcon />, disabled: true },
    { label: 'Logs', icon: <LogsIcon />, disabled: true },
    { label: 'CLI', icon: <CLIIcon />, disabled: true },
    { label: 'Config', icon: <SettingsIcon />, disabled: true },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#1a1a1a' }}>
        {/* Header Bar */}
        <Box sx={{
          bgcolor: '#000000',
          color: 'white',
          px: 3,
          py: 1.5,
          borderBottom: '1px solid #333333'
        }}>
          <Box sx={{
            fontSize: '1.25rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <VisibilityIcon sx={{ color: '#0078d4' }} />
            COBOL Knowledge Grapher
            {stats && (
              <Box sx={{
                ml: 'auto',
                fontSize: '0.875rem',
                color: '#cccccc',
                fontWeight: 400
              }}>
                {stats.nodeCount} nodes, {stats.relCount} relationships
              </Box>
            )}
          </Box>
        </Box>

        {/* Tab Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#000000' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              '& .MuiTab-root': {
                minHeight: 48,
                px: 2,
              }
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
                disabled={tab.disabled}
                sx={{
                  '&.Mui-disabled': {
                    color: '#666666',
                    opacity: 0.5,
                  }
                }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Global Error Alert */}
        {error && (
          <Alert
            severity="error"
            sx={{
              m: 2,
              bgcolor: '#4a1e1e',
              color: '#ff6b6b',
              '& .MuiAlert-icon': {
                color: '#ff6b6b'
              }
            }}
          >
            {error}
          </Alert>
        )}

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {/* Status Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: 3, color: 'text.secondary' }}>
              Status tab - Coming soon
            </Box>
          </TabPanel>

          {/* Scan Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ p: 3, color: 'text.secondary' }}>
              Scan tab - Coming soon
            </Box>
          </TabPanel>

          {/* Visualize Tab */}
          <TabPanel value={activeTab} index={2}>
            {loading ? (
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                bgcolor: '#1a1a1a'
              }}>
                <CircularProgress sx={{ color: '#0078d4' }} />
              </Box>
            ) : (
              <VisualizeTab
                graphData={graphData}
                selectedNode={selectedNode}
                stats={stats}
                searchResults={searchResults}
                onNodeSelect={handleNodeSelect}
                onSearch={handleSearch}
                onSearchResultSelect={handleSearchResultSelect}
              />
            )}
          </TabPanel>

          {/* Other tabs - placeholder content */}
          {tabs.slice(3).map((tab, index) => (
            <TabPanel key={index + 3} value={activeTab} index={index + 3}>
              <Box sx={{ p: 3, color: 'text.secondary' }}>
                {tab.label} - Coming soon
              </Box>
            </TabPanel>
          ))}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;