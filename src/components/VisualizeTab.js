import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  ButtonGroup,
  TextField,
  InputAdornment,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  FitScreen as FitIcon
} from '@mui/icons-material';

import GraphVisualization from './GraphVisualization';
import EntityDetails from './EntityDetails';

const VisualizeTab = ({
  graphData,
  selectedNode,
  stats,
  searchResults,
  onNodeSelect,
  onSearch,
  onSearchResultSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState(new Set());

  // COBOL entity types with colors matching Azure design
  const nodeTypes = [
    { type: 'STATEMENT', color: '#0078d4', count: stats?.nodeTypes?.find(nt => nt.type === 'STATEMENT')?.count || 0 },
    { type: 'DATA_TYPE', color: '#00bcf2', count: stats?.nodeTypes?.find(nt => nt.type === 'DATA_TYPE')?.count || 0 },
    { type: 'DIVISION', color: '#40e0d0', count: stats?.nodeTypes?.find(nt => nt.type === 'DIVISION')?.count || 0 },
    { type: 'SECTION', color: '#7b68ee', count: stats?.nodeTypes?.find(nt => nt.type === 'SECTION')?.count || 0 },
    { type: 'CLAUSE', color: '#ff6b35', count: stats?.nodeTypes?.find(nt => nt.type === 'CLAUSE')?.count || 0 },
    { type: 'FUNCTION', color: '#ffd23f', count: stats?.nodeTypes?.find(nt => nt.type === 'FUNCTION')?.count || 0 },
    { type: 'SPECIAL_REGISTER', color: '#ee6c4d', count: stats?.nodeTypes?.find(nt => nt.type === 'SPECIAL_REGISTER')?.count || 0 }
  ];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim(), 'all');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearch('', 'all');
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleFilter = (nodeType) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(nodeType)) {
      newFilters.delete(nodeType);
    } else {
      newFilters.add(nodeType);
    }
    setActiveFilters(newFilters);
    // TODO: Implement filter logic in graph visualization
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', bgcolor: '#1a1a1a' }}>
      {/* Left Sidebar */}
      <Box sx={{
        width: '25%',
        bgcolor: '#2d2d2d',
        borderRight: '1px solid #404040',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Graph Controls Section */}
        <Box sx={{ p: 2, borderBottom: '1px solid #404040' }}>
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2, fontSize: '1rem', fontWeight: 600 }}>
            Graph Controls
          </Typography>

          <ButtonGroup
            variant="outlined"
            size="small"
            fullWidth
            sx={{
              '& .MuiButton-root': {
                borderColor: '#404040',
                color: '#cccccc',
                '&:hover': {
                  borderColor: '#0078d4',
                  bgcolor: 'rgba(0, 120, 212, 0.1)'
                }
              }
            }}
          >
            <IconButton size="small" title="Zoom In">
              <ZoomInIcon />
            </IconButton>
            <IconButton size="small" title="Zoom Out">
              <ZoomOutIcon />
            </IconButton>
            <IconButton size="small" title="Center">
              <CenterIcon />
            </IconButton>
            <IconButton size="small" title="Fit to Screen">
              <FitIcon />
            </IconButton>
          </ButtonGroup>
        </Box>

        {/* Search Section */}
        <Box sx={{ p: 2, borderBottom: '1px solid #404040' }}>
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2, fontSize: '1rem', fontWeight: 600 }}>
            Search
          </Typography>

          <TextField
            fullWidth
            size="small"
            placeholder="Search COBOL entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: '#1a1a1a',
                '& fieldset': {
                  borderColor: '#404040',
                },
                '&:hover fieldset': {
                  borderColor: '#0078d4',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#0078d4',
                },
                '& input': {
                  color: '#ffffff',
                  '&::placeholder': {
                    color: '#888888',
                    opacity: 1,
                  }
                }
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={handleSearch}
                    sx={{ color: '#cccccc' }}
                  >
                    <SearchIcon />
                  </IconButton>
                  {searchQuery && (
                    <IconButton
                      size="small"
                      onClick={handleClearSearch}
                      sx={{ color: '#cccccc' }}
                    >
                      <ClearIcon />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
          />

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#cccccc', mb: 1 }}>
                Results ({searchResults.length})
              </Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                {searchResults.map((node) => (
                  <ListItem key={node.id} disablePadding>
                    <ListItemButton
                      onClick={() => onSearchResultSelect(node)}
                      sx={{
                        '&:hover': {
                          bgcolor: 'rgba(0, 120, 212, 0.1)'
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ color: '#ffffff', fontSize: '0.875rem' }}>
                            {node.label}
                          </Typography>
                        }
                        secondary={
                          <Chip
                            label={node.type}
                            size="small"
                            sx={{
                              bgcolor: nodeTypes.find(nt => nt.type === node.type)?.color || '#666666',
                              color: '#000000',
                              fontSize: '0.75rem',
                              height: 20
                            }}
                          />
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>

        {/* Node Types Section */}
        <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2, fontSize: '1rem', fontWeight: 600 }}>
            Node Types
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {nodeTypes.map((nodeType) => (
              <Chip
                key={nodeType.type}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: nodeType.color
                      }}
                    />
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {nodeType.type}
                    </Typography>
                    <Badge
                      badgeContent={nodeType.count}
                      color="primary"
                      sx={{
                        '& .MuiBadge-badge': {
                          bgcolor: '#404040',
                          color: '#ffffff',
                          fontSize: '0.7rem'
                        }
                      }}
                    />
                  </Box>
                }
                variant={activeFilters.has(nodeType.type) ? "filled" : "outlined"}
                clickable
                onClick={() => toggleFilter(nodeType.type)}
                sx={{
                  justifyContent: 'flex-start',
                  bgcolor: activeFilters.has(nodeType.type) ? `${nodeType.color}20` : 'transparent',
                  borderColor: nodeType.color,
                  color: '#ffffff',
                  '&:hover': {
                    bgcolor: `${nodeType.color}30`,
                  }
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Selected Node Details */}
        {selectedNode && (
          <Box sx={{
            borderTop: '1px solid #404040',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            <EntityDetails node={selectedNode} />
          </Box>
        )}
      </Box>

      {/* Main Graph Area */}
      <Box sx={{
        flex: 1,
        position: 'relative',
        bgcolor: '#000000',
        border: '2px solid #00ff41',
        borderRadius: '4px',
        m: 1
      }}>
        {/* Graph Statistics */}
        <Box sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000,
          bgcolor: 'rgba(45, 45, 45, 0.9)',
          border: '1px solid #404040',
          borderRadius: 1,
          p: 1.5
        }}>
          <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600, mb: 1 }}>
            Graph Statistics
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', display: 'block' }}>
            Nodes: {stats?.nodeCount || 0}
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', display: 'block' }}>
            Edges: {stats?.relCount || 0}
          </Typography>
        </Box>

        {/* Legend */}
        <Box sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 1000,
          bgcolor: 'rgba(45, 45, 45, 0.9)',
          border: '1px solid #404040',
          borderRadius: 1,
          p: 1.5,
          minWidth: 200
        }}>
          <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600, mb: 1 }}>
            Legend
          </Typography>

          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: '#cccccc', fontWeight: 600 }}>
              Node Types:
            </Typography>
            {nodeTypes.slice(0, 4).map((nodeType) => (
              <Box key={nodeType.type} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '2px',
                    bgcolor: nodeType.color
                  }}
                />
                <Typography variant="caption" sx={{ color: '#cccccc', fontSize: '0.75rem' }}>
                  {nodeType.type}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ bgcolor: '#404040', my: 1 }} />

          <Box>
            <Typography variant="caption" sx={{ color: '#cccccc', fontWeight: 600 }}>
              Edge Types:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 2,
                  bgcolor: '#0078d4'
                }}
              />
              <Typography variant="caption" sx={{ color: '#cccccc', fontSize: '0.75rem' }}>
                PRECEDES
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 2,
                  bgcolor: '#00bcf2'
                }}
              />
              <Typography variant="caption" sx={{ color: '#cccccc', fontSize: '0.75rem' }}>
                CONTAINS
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 2,
                  bgcolor: '#ff6b35'
                }}
              />
              <Typography variant="caption" sx={{ color: '#cccccc', fontSize: '0.75rem' }}>
                ALTERNATIVE_TO
              </Typography>
            </Box>
          </Box>
        </Box>

        <GraphVisualization
          data={graphData}
          onNodeSelect={onNodeSelect}
          highlightedNode={graphData.highlightedNode}
          activeFilters={activeFilters}
        />
      </Box>
    </Box>
  );
};

export default VisualizeTab;