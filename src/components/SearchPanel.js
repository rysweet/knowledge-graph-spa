import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  Chip,
  Divider,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

const SearchPanel = ({ onSearch, searchResults, onResultSelect, nodeTypes }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const handleSearch = () => {
    if (searchQuery.trim() || selectedType !== 'all') {
      onSearch(searchQuery.trim(), selectedType);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedType('all');
    onSearch('', 'all');
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Search COBOL Entities
      </Typography>

      {/* Search Input */}
      <TextField
        fullWidth
        size="small"
        label="Search by name or value"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyPress={handleKeyPress}
        sx={{ mb: 2 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={handleSearch}
                edge="end"
              >
                <SearchIcon />
              </IconButton>
              {(searchQuery || selectedType !== 'all') && (
                <IconButton
                  size="small"
                  onClick={handleClear}
                  edge="end"
                >
                  <ClearIcon />
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
      />

      {/* Type Filter */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Entity Type</InputLabel>
        <Select
          value={selectedType}
          label="Entity Type"
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <MenuItem value="all">All Types</MenuItem>
          {nodeTypes.map((typeInfo) => (
            <MenuItem key={typeInfo.type} value={typeInfo.type}>
              {typeInfo.type} ({typeInfo.count})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Search Results ({searchResults.length})
          </Typography>
          <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
            {searchResults.map((node) => (
              <ListItem key={node.id} disablePadding>
                <ListItemButton onClick={() => onResultSelect(node)}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" noWrap>
                          {node.label}
                        </Typography>
                        <Chip
                          label={node.type}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '10px' }}
                        />
                      </Box>
                    }
                    secondary={
                      node.properties.name !== node.label && node.properties.name
                        ? node.properties.name
                        : node.properties.value !== node.label && node.properties.value
                        ? node.properties.value
                        : null
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {searchResults.length === 0 && (searchQuery || selectedType !== 'all') && (
        <Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            No results found
          </Typography>
        </Box>
      )}

      {/* Quick Tips */}
      <Box sx={{ mt: 2 }}>
        <Divider sx={{ mb: 1 }} />
        <Typography variant="caption" color="text.secondary">
          <strong>Tips:</strong>
          <br />
          • Search by entity name or value
          <br />
          • Filter by entity type
          <br />
          • Click on results to view details
          <br />
          • Use the graph to explore relationships
        </Typography>
      </Box>
    </Box>
  );
};

export default SearchPanel;