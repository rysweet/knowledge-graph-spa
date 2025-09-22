import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  LinearProgress,
  Card,
  CardContent
} from '@mui/material';

const StatsPanel = ({ stats }) => {
  if (!stats) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Statistics
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  const { nodeCount, relCount, nodeTypes, relTypes } = stats;

  const getProgressValue = (count, total) => {
    return total > 0 ? (count / total) * 100 : 0;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Graph Statistics
      </Typography>

      {/* Overall Stats */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Total Entities
            </Typography>
            <Typography variant="h6" color="primary">
              {nodeCount}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Total Relationships
            </Typography>
            <Typography variant="h6" color="secondary">
              {relCount}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Entity Types */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Entity Types
        </Typography>
        <List dense>
          {nodeTypes.slice(0, 10).map((type) => (
            <ListItem key={type.type} sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {type.type}
                      </Typography>
                    </Box>
                    <Chip
                      label={type.count}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '11px', minWidth: '40px' }}
                    />
                  </Box>
                }
                secondary={
                  <LinearProgress
                    variant="determinate"
                    value={getProgressValue(type.count, nodeCount)}
                    sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                  />
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Relationship Types */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Relationship Types
        </Typography>
        <List dense>
          {relTypes.slice(0, 10).map((type) => (
            <ListItem key={type.type} sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {type.type}
                      </Typography>
                    </Box>
                    <Chip
                      label={type.count}
                      size="small"
                      variant="outlined"
                      color="secondary"
                      sx={{ fontSize: '11px', minWidth: '40px' }}
                    />
                  </Box>
                }
                secondary={
                  <LinearProgress
                    variant="determinate"
                    value={getProgressValue(type.count, relCount)}
                    color="secondary"
                    sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                  />
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Graph Density Info */}
      <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Graph density: {nodeCount > 1 ? ((relCount / (nodeCount * (nodeCount - 1))) * 100).toFixed(1) : 0}%
          <br />
          Avg connections per entity: {nodeCount > 0 ? (relCount * 2 / nodeCount).toFixed(1) : 0}
        </Typography>
      </Box>
    </Box>
  );
};

export default StatsPanel;