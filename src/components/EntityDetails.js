import React from 'react';
import {
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

const EntityDetails = ({ node }) => {
  if (!node) return null;

  const { node: entityNode, neighbors } = node;

  const getRelationshipIcon = (direction) => {
    return direction === 'outgoing' ? '→' : '←';
  };

  const getRelationshipColor = (type) => {
    const colors = {
      'PRECEDES': 'primary',
      'CONTAINS': 'success',
      'ALTERNATIVE_TO': 'warning',
    };
    return colors[type] || 'default';
  };

  const groupedNeighbors = neighbors.reduce((groups, neighbor) => {
    const relType = neighbor.relationship.type;
    if (!groups[relType]) {
      groups[relType] = [];
    }
    groups[relType].push(neighbor);
    return groups;
  }, {});

  return (
    <Box sx={{ p: 2, bgcolor: '#2d2d2d' }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', fontSize: '1rem', fontWeight: 600 }}>
        Entity Details
      </Typography>

      {/* Main Entity Info */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#ffffff' }}>
            {entityNode.label}
          </Typography>
          <Chip
            label={entityNode.type}
            size="small"
            sx={{
              bgcolor: '#0078d4',
              color: '#ffffff',
              fontSize: '0.75rem'
            }}
          />
        </Box>

        {/* Entity Properties */}
        {Object.keys(entityNode.properties).length > 0 && (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              mb: 2,
              bgcolor: '#1a1a1a',
              border: '1px solid #404040'
            }}
          >
            <Table size="small">
              <TableBody>
                {Object.entries(entityNode.properties).map(([key, value]) => (
                  <TableRow key={key} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell
                      component="th"
                      scope="row"
                      sx={{
                        fontWeight: 'bold',
                        width: '30%',
                        color: '#cccccc',
                        borderColor: '#404040'
                      }}
                    >
                      {key}
                    </TableCell>
                    <TableCell sx={{ borderColor: '#404040' }}>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word', color: '#ffffff' }}>
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Labels */}
        {entityNode.labels && entityNode.labels.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="#cccccc" gutterBottom>
              Labels:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {entityNode.labels.map((label, index) => (
                <Chip
                  key={index}
                  label={label}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: '#404040',
                    color: '#cccccc',
                    fontSize: '0.75rem'
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 2, bgcolor: '#404040' }} />

      {/* Relationships */}
      <Typography variant="subtitle1" gutterBottom sx={{ color: '#ffffff' }}>
        Relationships ({neighbors.length})
      </Typography>

      {neighbors.length === 0 ? (
        <Typography variant="body2" color="#cccccc">
          No connected entities found.
        </Typography>
      ) : (
        Object.entries(groupedNeighbors).map(([relType, relNeighbors]) => (
          <Accordion
            key={relType}
            defaultExpanded={Object.keys(groupedNeighbors).length <= 2}
            sx={{
              bgcolor: '#1a1a1a',
              border: '1px solid #404040',
              '&:before': {
                display: 'none',
              },
              mb: 1
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#cccccc' }} />}
              sx={{
                bgcolor: '#2d2d2d',
                '&:hover': {
                  bgcolor: '#3d3d3d'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={relType}
                  size="small"
                  sx={{
                    bgcolor: '#0078d4',
                    color: '#ffffff',
                    fontSize: '0.75rem'
                  }}
                />
                <Typography variant="body2" color="#cccccc">
                  ({relNeighbors.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: '#1a1a1a' }}>
              <List dense>
                {relNeighbors.map((neighbor, index) => (
                  <ListItem key={`${neighbor.id}-${index}`} sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ color: '#00bcf2' }}>
                            {getRelationshipIcon(neighbor.relationship.direction)}
                          </Typography>
                          <Typography variant="body2" fontWeight="medium" sx={{ color: '#ffffff' }}>
                            {neighbor.label}
                          </Typography>
                          <Chip
                            label={neighbor.type}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: '10px',
                              borderColor: '#404040',
                              color: '#cccccc'
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: '#888888' }}>
                          {neighbor.relationship.direction === 'outgoing'
                            ? `${entityNode.label} ${relType.toLowerCase()} ${neighbor.label}`
                            : `${neighbor.label} ${relType.toLowerCase()} ${entityNode.label}`}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* Quick Stats */}
      <Box sx={{ mt: 2, p: 1, bgcolor: '#1a1a1a', borderRadius: 1, border: '1px solid #404040' }}>
        <Typography variant="caption" color="#cccccc">
          Entity ID: {entityNode.id} |
          Connected to {neighbors.length} entities |
          {Object.keys(groupedNeighbors).length} relationship types
        </Typography>
      </Box>
    </Box>
  );
};

export default EntityDetails;