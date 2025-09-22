import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import VisualizeTabContent from '../VisualizeTab';
import { apiService } from '../../services/apiService';

const VisualizeTab: React.FC = () => {
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
      console.log('Loaded graph data:', data);
      setGraphData(data);
    } catch (err) {
      setError(`Failed to load graph data: ${err.message}`);
      console.error('Error loading graph:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await apiService.getStats();
      console.log('Loaded stats:', statsData);
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
      setSearchResults(results.nodes || []);
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

  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        bgcolor: '#1a1a1a'
      }}>
        <Box sx={{ color: '#0078d4' }}>Loading graph data...</Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        bgcolor: '#1a1a1a'
      }}>
        <Box sx={{ color: '#ff6b6b' }}>{error}</Box>
      </Box>
    );
  }

  return (
    <VisualizeTabContent
      graphData={graphData}
      selectedNode={selectedNode}
      stats={stats}
      searchResults={searchResults}
      onNodeSelect={handleNodeSelect}
      onSearch={handleSearch}
      onSearchResultSelect={handleSearchResultSelect}
    />
  );
};

export default VisualizeTab;